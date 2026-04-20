// Look-ahead scheduler based on Chris Wilson's Web Audio API metronome pattern.
// https://www.html5rocks.com/en/tutorials/audio/scheduling/

const SCHEDULE_AHEAD_TIME = 0.1; // seconds to schedule ahead
const LOOKAHEAD_MS = 25;         // scheduler interval in ms
const STUCK_LOG_INTERVAL_MS = 5000; // minimum ms between "waiting" log spam

export type LogLevel = "info" | "warn" | "error";

export class Metronome {
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  private bpm: number = 120;
  private beatsPerMeasure: number = 4;
  private accentEnabled: boolean = true;
  private beatDurationMultiplier: number = 1.0;
  private secondaryAccentBeat: number = -1;
  private currentBeat: number = 0;
  private nextNoteTime: number = 0;
  private timerID: ReturnType<typeof setTimeout> | null = null;
  private lastStuckLogTime: number = 0;

  private _volume: number = 0.8;
  onBeat?: (beat: number) => void;
  onLog?: (level: LogLevel, message: string) => void;

  private log(level: LogLevel, message: string): void {
    this.onLog?.(level, message);
  }

  private createContext(): AudioContext {
    const ctx = new AudioContext();
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = this._volume;
    this.gainNode.connect(ctx.destination);
    this.log("info", `AudioContext created (sampleRate: ${ctx.sampleRate} Hz)`);
    return ctx;
  }

  private getAudioCtx(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      this.audioCtx = this.createContext();
    }
    return this.audioCtx;
  }

  // Must be called from a user-gesture handler (click).
  // Creates a brand-new AudioContext and immediately calls resume() while still
  // inside the gesture stack — the only reliable way in WebKit.
  resetAudioContext(): void {
    const old = this.audioCtx;
    this.audioCtx = null;
    this.gainNode = null;
    this.nextNoteTime = 0;
    if (old) old.close().catch(() => {});

    // Both new AudioContext() and resume() must happen inside the click handler.
    const ctx = this.getAudioCtx();
    ctx
      .resume()
      .then(() => this.log("info", `AudioContext reset → ${ctx.state}`))
      .catch((e) => this.log("error", `reset resume() failed: ${e}`));
  }

  // Call when the device changes (devicechange event).
  recreateAudioCtx(): void {
    const old = this.audioCtx;
    this.audioCtx = null;
    this.gainNode = null;
    this.nextNoteTime = 0;
    if (old) old.close().catch(() => {});
    this.log("info", "AudioContext discarded for device change (will recreate on next tick)");
  }

  // Attempt resume from a user-gesture context (focus / visibilitychange).
  // May silently fail in WebKit — resetAudioContext() is more reliable.
  resumeIfSuspended(): void {
    const ctx = this.audioCtx;
    if (!ctx || ctx.state === "running") return;
    this.log("info", `Attempting resume (state: ${ctx.state})`);
    ctx
      .resume()
      .then(() => this.log("info", `AudioContext resumed → ${this.audioCtx?.state ?? "gone"}`))
      .catch((e) => this.log("error", `resume() failed: ${e}`));
  }

  private scheduleNote(beat: number, time: number): void {
    const ctx = this.getAudioCtx();
    const gain = this.gainNode!;

    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();

    osc.connect(envelope);
    envelope.connect(gain);

    if (beat === 0 && this.accentEnabled) {
      osc.frequency.value = 1000;
    } else if (beat === this.secondaryAccentBeat && this.accentEnabled) {
      osc.frequency.value = 700;
    } else {
      osc.frequency.value = 440;
    }

    envelope.gain.setValueAtTime(1.0, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  private scheduler(): void {
    const ctx = this.getAudioCtx();

    // Context closed externally (aggressive memory management, device removed, etc.)
    if (ctx.state === "closed") {
      this.log("warn", "AudioContext was closed — will recreate");
      this.audioCtx = null;
      this.gainNode = null;
      this.nextNoteTime = 0;
      this.timerID = setTimeout(() => this.scheduler(), LOOKAHEAD_MS);
      return;
    }

    // Suspended or interrupted — cannot schedule; wait for resumeIfSuspended()
    if (ctx.state !== "running") {
      const now = Date.now();
      if (now - this.lastStuckLogTime > STUCK_LOG_INTERVAL_MS) {
        this.lastStuckLogTime = now;
        this.log("warn", `AudioContext not running (state: ${ctx.state}) — waiting for user gesture to resume`);
      }
      this.timerID = setTimeout(() => this.scheduler(), LOOKAHEAD_MS);
      return;
    }

    // Resync after a suspension: ctx.currentTime may have advanced while frozen,
    // or may be behind nextNoteTime — clamp to avoid a burst of queued notes.
    if (this.nextNoteTime < ctx.currentTime) {
      this.log("info", `Resynced nextNoteTime (+${(ctx.currentTime - this.nextNoteTime).toFixed(3)} s drift)`);
      this.nextNoteTime = ctx.currentTime + 0.05;
    }

    while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);

      const beat = this.currentBeat;
      const noteTime = this.nextNoteTime;
      const delay = Math.max(0, (noteTime - ctx.currentTime) * 1000);
      setTimeout(() => this.onBeat?.(beat), delay);

      const secondsPerBeat = (60.0 / this.bpm) * this.beatDurationMultiplier;
      this.nextNoteTime += secondsPerBeat;
      this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
    }

    this.timerID = setTimeout(() => this.scheduler(), LOOKAHEAD_MS);
  }

  start(): void {
    if (this.timerID !== null) return;

    const ctx = this.getAudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    this.currentBeat = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;
    this.log("info", `Started at ${this.bpm} BPM`);
    this.scheduler();
  }

  stop(): void {
    if (this.timerID !== null) {
      clearTimeout(this.timerID);
      this.timerID = null;
      this.log("info", "Stopped");
    }
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(40, Math.min(240, bpm));
  }

  getBpm(): number {
    return this.bpm;
  }

  setBeatsPerMeasure(beats: number): void {
    this.beatsPerMeasure = beats;
    this.currentBeat = 0;
  }

  setAccentEnabled(enabled: boolean): void {
    this.accentEnabled = enabled;
  }

  setBeatDurationMultiplier(multiplier: number): void {
    this.beatDurationMultiplier = multiplier;
  }

  setSecondaryAccentBeat(beat: number): void {
    this.secondaryAccentBeat = beat;
  }

  getBeatsPerMeasure(): number {
    return this.beatsPerMeasure;
  }

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this._volume;
    }
  }

  isRunning(): boolean {
    return this.timerID !== null;
  }
}
