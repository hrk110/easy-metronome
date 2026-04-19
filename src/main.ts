import { getCurrentWindow } from "@tauri-apps/api/window";
import { Metronome } from "./metronome";

const metronome = new Metronome();
const hoverIntervalMs = 500;

function updateBpmDisplay(): void {
  const el = document.getElementById("bpm-value");
  if (el) el.textContent = String(metronome.getBpm());
}

function updateBeatIndicators(): void {
  const container = document.getElementById("beat-indicators");
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < metronome.getBeatsPerMeasure(); i++) {
    const dot = document.createElement("span");
    dot.className = "beat-dot";
    dot.dataset.beat = String(i);
    container.appendChild(dot);
  }
}

function highlightBeat(beat: number): void {
  document.querySelectorAll(".beat-dot").forEach((el) => {
    el.classList.remove("active");
  });
  const active = document.querySelector(`.beat-dot[data-beat="${beat}"]`);
  active?.classList.add("active");
}

metronome.onBeat = (beat) => highlightBeat(beat);

function updateTimesigCols(): void {
  const container = document.querySelector<HTMLElement>(".timesig-buttons");
  if (!container) return;
  const total = container.children.length;
  const width = container.clientWidth;
  const gap = 6;
  const minBtnW = 44;
  // Find the largest divisor of total that fits within the available width
  const divisors: number[] = [];
  for (let d = total; d >= 1; d--) {
    if (total % d === 0) divisors.push(d);
  }
  const cols = divisors.find((n) => width >= n * minBtnW + (n - 1) * gap) ?? 1;
  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
}

// ---------------------------------------------------------------------------
// Log panel
// ---------------------------------------------------------------------------
const MAX_LOG_ENTRIES = 40;

function addLogEntry(level: import("./metronome").LogLevel, message: string): void {
  const list = document.getElementById("debug-log-list");
  const summary = document.getElementById("debug-summary");
  if (!list || !summary) return;

  const now = new Date();
  const ts = now.toTimeString().slice(0, 8);
  const li = document.createElement("li");
  li.className = `log-${level}`;
  li.textContent = `[${ts}] ${message}`;
  list.appendChild(li);

  // Evict oldest entries
  while (list.children.length > MAX_LOG_ENTRIES) {
    list.removeChild(list.firstChild!);
  }

  // Auto-scroll
  list.scrollTop = list.scrollHeight;

  // Update summary badge with warn/error count
  const badCount = list.querySelectorAll(".log-warn, .log-error").length;
  summary.textContent = badCount > 0 ? `ログ (⚠ ${badCount})` : "ログ";
}

// ---------------------------------------------------------------------------

window.addEventListener("DOMContentLoaded", () => {
  updateBeatIndicators();

  // Responsive time signature grid
  updateTimesigCols();
  const timesigButtons = document.querySelector<HTMLElement>(".timesig-buttons");
  if (timesigButtons) {
    new ResizeObserver(updateTimesigCols).observe(timesigButtons);
  }

  // BPM hover buttons — change once on mouseenter, repeat on interval while hovered
  document.querySelectorAll<HTMLButtonElement>(".bpm-btn").forEach((btn) => {
    const delta = parseInt(btn.dataset.delta ?? "0", 10);
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const applyDelta = () => {
      metronome.setBpm(metronome.getBpm() + delta);
      updateBpmDisplay();
    };

    btn.addEventListener("mouseenter", () => {
      applyDelta();
      intervalId = setInterval(applyDelta, hoverIntervalMs);
    });

    btn.addEventListener("mouseleave", () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    });
  });

  // Time signature buttons
  document.querySelectorAll<HTMLButtonElement>(".sig-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sig-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const beats = parseInt(btn.dataset.beats ?? "4", 10);
      const accent = btn.dataset.accent !== "false";
      const beatMultiplier = parseFloat(btn.dataset.beatMultiplier ?? "1");
      const secondaryAccent = parseInt(btn.dataset.secondaryAccent ?? "-1", 10);
      metronome.setBeatsPerMeasure(beats);
      metronome.setAccentEnabled(accent);
      metronome.setBeatDurationMultiplier(beatMultiplier);
      metronome.setSecondaryAccentBeat(secondaryAccent);
      updateBeatIndicators();
    });
  });

  // Volume slider
  const volumeSlider = document.getElementById("volume-slider") as HTMLInputElement;
  const volumeValue = document.getElementById("volume-value");
  metronome.setVolume(parseInt(volumeSlider.value, 10) / 100);

  volumeSlider.addEventListener("input", () => {
    const vol = parseInt(volumeSlider.value, 10);
    metronome.setVolume(vol / 100);
    if (volumeValue) volumeValue.textContent = `${vol}%`;
  });

  // Start/Stop button
  const startStopBtn = document.getElementById("start-stop") as HTMLButtonElement;

  const toggleStartStop = () => {
    if (metronome.isRunning()) {
      metronome.stop();
      startStopBtn.textContent = "▶ スタート";
      startStopBtn.classList.remove("running");
      document.querySelectorAll(".beat-dot").forEach((el) => el.classList.remove("active"));
    } else {
      metronome.start();
      startStopBtn.textContent = "■ ストップ";
      startStopBtn.classList.add("running");
    }
  };

  startStopBtn.addEventListener("click", toggleStartStop);

  // Log callback
  metronome.onLog = addLogEntry;

  // Resume AudioContext on focus restore (screen unlock, app switch).
  // WebKit only allows ctx.resume() from a user-gesture context;
  // window focus qualifies.
  const handleResume = () => metronome.resumeIfSuspended();
  window.addEventListener("focus", handleResume);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) handleResume();
  });

  // Recreate AudioContext when the system audio device changes.
  // The existing context becomes silently invalid after a device switch.
  navigator.mediaDevices.addEventListener("devicechange", () => {
    if (metronome.isRunning()) {
      metronome.recreateAudioCtx();
    }
  });

  // Always on top toggle
  const alwaysOnTopCheckbox = document.getElementById("always-on-top") as HTMLInputElement;
  alwaysOnTopCheckbox.addEventListener("change", () => {
    getCurrentWindow().setAlwaysOnTop(alwaysOnTopCheckbox.checked);
  });

  // Keyboard shortcuts: Space = start/stop, hjkl = BPM (h:-5, j:-1, k:+1, l:+5)
  document.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    switch (e.key) {
      case " ":
        e.preventDefault();
        toggleStartStop();
        break;
      case "h":
        metronome.setBpm(metronome.getBpm() - 5);
        updateBpmDisplay();
        break;
      case "j":
        metronome.setBpm(metronome.getBpm() - 1);
        updateBpmDisplay();
        break;
      case "k":
        metronome.setBpm(metronome.getBpm() + 1);
        updateBpmDisplay();
        break;
      case "l":
        metronome.setBpm(metronome.getBpm() + 5);
        updateBpmDisplay();
        break;
      case "x":
        metronome.setBpm(metronome.getBpm() * 2);
        updateBpmDisplay();
        break;
      case "/":
        metronome.setBpm(Math.round(metronome.getBpm() / 2));
        updateBpmDisplay();
        break;
    }
  });
});
