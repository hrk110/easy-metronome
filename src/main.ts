import { Metronome } from "./metronome";

const metronome = new Metronome();
let hoverIntervalMs = 500;

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

  // Hover interval slider
  const hoverIntervalSlider = document.getElementById("hover-interval-slider") as HTMLInputElement;
  const hoverIntervalValue = document.getElementById("hover-interval-value");
  hoverIntervalSlider.addEventListener("input", () => {
    hoverIntervalMs = parseInt(hoverIntervalSlider.value, 10);
    if (hoverIntervalValue) hoverIntervalValue.textContent = `${hoverIntervalMs}ms`;
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
  startStopBtn.addEventListener("click", () => {
    if (metronome.isRunning()) {
      metronome.stop();
      startStopBtn.textContent = "▶ スタート";
      startStopBtn.classList.remove("running");
      // Clear indicators
      document.querySelectorAll(".beat-dot").forEach((el) => el.classList.remove("active"));
    } else {
      metronome.start();
      startStopBtn.textContent = "■ ストップ";
      startStopBtn.classList.add("running");
    }
  });
});
