// Look-ahead scheduler (Chris Wilson pattern), audio output via Rust/cpal.
// Using performance.now() for timing avoids any dependency on WebKit's
// AudioContext, which gets suspended by macOS after screen lock.

import { invoke } from "@tauri-apps/api/core";

const SCHEDULE_AHEAD_MS = 100; // schedule this far ahead
const LOOKAHEAD_MS = 25;       // scheduler poll interval

export class Metronome {
  private bpm: number = 120;
  private beatsPerMeasure: number = 4;
  private accentEnabled: boolean = true;
  private beatDurationMultiplier: number = 1.0;
  private secondaryAccentBeat: number = -1;
  private currentBeat: number = 0;
  private nextNoteTime: number = 0; // performance.now() ms
  private timerID: ReturnType<typeof setTimeout> | null = null;

  onBeat?: (beat: number) => void;

  private scheduleNote(beat: number, delayMs: number): void {
    let frequencyHz: number;
    if (beat === 0 && this.accentEnabled) {
      frequencyHz = 1000;
    } else if (beat === this.secondaryAccentBeat && this.accentEnabled) {
      frequencyHz = 700;
    } else {
      frequencyHz = 440;
    }
    // Fire-and-forget: Rust schedules the click into the cpal stream buffer.
    invoke("schedule_click", { frequencyHz, delayMs }).catch(() => {});
  }

  private scheduler(): void {
    const now = performance.now();

    // After screen lock, performance.now() advances but nextNoteTime does not
    // (JS timers may be throttled). Resync to avoid a burst of queued notes.
    if (this.nextNoteTime < now) {
      this.nextNoteTime = now + 50;
    }

    while (this.nextNoteTime < now + SCHEDULE_AHEAD_MS) {
      const delayMs = this.nextNoteTime - now; // always >= 0 after resync

      this.scheduleNote(this.currentBeat, delayMs);

      const beat = this.currentBeat;
      setTimeout(() => this.onBeat?.(beat), delayMs);

      const msPerBeat = (60_000 / this.bpm) * this.beatDurationMultiplier;
      this.nextNoteTime += msPerBeat;
      this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
    }

    this.timerID = setTimeout(() => this.scheduler(), LOOKAHEAD_MS);
  }

  start(): void {
    if (this.timerID !== null) return;
    this.currentBeat = 0;
    this.nextNoteTime = performance.now() + 50;
    this.scheduler();
  }

  stop(): void {
    if (this.timerID !== null) {
      clearTimeout(this.timerID);
      this.timerID = null;
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
    invoke("set_click_volume", { volume: Math.max(0, Math.min(1, volume)) }).catch(() => {});
  }

  isRunning(): boolean {
    return this.timerID !== null;
  }
}
