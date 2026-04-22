// Audio engine using cpal (native CoreAudio on macOS, WASAPI on Windows).
// cpal::Stream is !Send, so it lives on a dedicated audio thread.
// Tauri commands communicate via Arc-shared state (click events, volume).

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::f32::consts::PI;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use tauri::State;

// ---------------------------------------------------------------------------
// Shared state (Send + Sync — safe to access from Tauri command threads)
// ---------------------------------------------------------------------------

struct ClickEvent {
    start_sample: u64,
    frequency: f32,
}

#[derive(Clone)]
struct Shared {
    events: Arc<Mutex<Vec<ClickEvent>>>,
    samples_written: Arc<AtomicU64>,
    volume: Arc<Mutex<f32>>,
    sample_rate: Arc<Mutex<f32>>,
}

impl Shared {
    fn new() -> Self {
        Shared {
            events: Arc::new(Mutex::new(Vec::new())),
            samples_written: Arc::new(AtomicU64::new(0)),
            volume: Arc::new(Mutex::new(0.8)),
            sample_rate: Arc::new(Mutex::new(44100.0)),
        }
    }

    fn schedule_click(&self, frequency: f32, delay_ms: f64) {
        let sample_rate = *self.sample_rate.lock().unwrap();
        let delay_samples = (delay_ms.max(0.0) / 1000.0 * sample_rate as f64) as u64;
        let current = self.samples_written.load(Ordering::Relaxed);
        if let Ok(mut evts) = self.events.lock() {
            evts.push(ClickEvent {
                start_sample: current + delay_samples,
                frequency,
            });
        }
    }

    fn set_volume(&self, volume: f32) {
        *self.volume.lock().unwrap() = volume.clamp(0.0, 1.0);
    }
}

// ---------------------------------------------------------------------------
// Audio thread — owns the cpal::Stream for its entire lifetime
// ---------------------------------------------------------------------------

fn run_audio_thread(shared: Shared, keep_alive: mpsc::Receiver<()>) {
    let _stream = build_stream(&shared);
    // Block until the app exits (all Sender<()> clones are dropped).
    while keep_alive.recv().is_ok() {}
}

fn build_stream(shared: &Shared) -> Option<cpal::Stream> {
    let host = cpal::default_host();
    let device = host.default_output_device()?;

    // Prefer F32; CoreAudio always offers it on macOS.
    let config = device
        .supported_output_configs()
        .ok()
        .and_then(|cfgs| {
            cfgs.filter(|c| c.sample_format() == cpal::SampleFormat::F32)
                .max_by_key(|c| c.max_sample_rate())
        })
        .map(|r| r.with_max_sample_rate())
        .or_else(|| device.default_output_config().ok())?;

    if config.sample_format() != cpal::SampleFormat::F32 {
        eprintln!("easy-metronome: no F32 output config available");
        return None;
    }

    let sample_rate = config.sample_rate().0 as f32;
    *shared.sample_rate.lock().unwrap() = sample_rate;
    let channels = config.channels() as usize;
    let click_samples = (sample_rate * 0.06) as u64; // 60 ms click

    let events = Arc::clone(&shared.events);
    let samples_written = Arc::clone(&shared.samples_written);
    let volume_arc = Arc::clone(&shared.volume);
    let mut current_sample = 0u64;

    let stream = device
        .build_output_stream(
            &config.into(),
            move |data: &mut [f32], _| {
                let frames = data.len() / channels;
                let vol = volume_arc.try_lock().map(|v| *v).unwrap_or(0.8);

                if let Ok(mut evts) = events.try_lock() {
                    for frame_idx in 0..frames {
                        let s = current_sample + frame_idx as u64;
                        let mut sample_val = 0.0f32;

                        for event in evts.iter() {
                            if s >= event.start_sample {
                                let offset = s - event.start_sample;
                                if offset < click_samples {
                                    let t = offset as f32 / sample_rate;
                                    sample_val +=
                                        (-t * 50.0).exp() * (2.0 * PI * event.frequency * t).sin();
                                }
                            }
                        }

                        sample_val = (sample_val * vol).clamp(-1.0, 1.0);
                        for ch in 0..channels {
                            data[frame_idx * channels + ch] = sample_val;
                        }
                    }

                    current_sample += frames as u64;
                    samples_written.store(current_sample, Ordering::Relaxed);

                    // Remove fully-played events.
                    let buf_start = current_sample.saturating_sub(frames as u64);
                    evts.retain(|e| e.start_sample + click_samples > buf_start);
                } else {
                    // Lock contention: silence this buffer.
                    data.fill(0.0);
                    current_sample += frames as u64;
                    samples_written.store(current_sample, Ordering::Relaxed);
                }
            },
            |err| eprintln!("easy-metronome cpal error: {err}"),
            None,
        )
        .ok()?;

    stream.play().ok()?;
    Some(stream)
}

// ---------------------------------------------------------------------------
// Tauri managed state
// ---------------------------------------------------------------------------

struct AppState {
    shared: Shared,
    _keep_alive_tx: mpsc::Sender<()>,
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn schedule_click(frequency_hz: f32, delay_ms: f64, state: State<AppState>) {
    state.shared.schedule_click(frequency_hz, delay_ms);
}

#[tauri::command]
fn set_click_volume(volume: f32, state: State<AppState>) {
    state.shared.set_volume(volume);
}

// ---------------------------------------------------------------------------
// App entry
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared = Shared::new();
    let (tx, rx) = mpsc::channel::<()>();

    let shared_thread = shared.clone();
    std::thread::spawn(move || run_audio_thread(shared_thread, rx));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            shared,
            _keep_alive_tx: tx,
        })
        .invoke_handler(tauri::generate_handler![schedule_click, set_click_volume])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
