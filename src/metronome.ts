// Look-ahead scheduler based on Chris Wilson's Web Audio API metronome pattern.
// https://www.html5rocks.com/en/tutorials/audio/scheduling/

const SCHEDULE_AHEAD_TIME = 0.1; // seconds to schedule ahead
const LOOKAHEAD_MS = 25;         // scheduler interval in ms

export class Metronome {
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  private bpm: number = 120;
  private beatsPerMeasure: number = 4;
  private accentEnabled: boolean = true;
  private currentBeat: number = 0;
  private nextNoteTime: number = 0;
  private timerID: ReturnType<typeof setTimeout> | null = null;

  private _volume: number = 0.8;
  onBeat?: (beat: number) => void;

  private getAudioCtx(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = this._volume;
      this.gainNode.connect(this.audioCtx.destination);
    }
    return this.audioCtx;
  }

  private scheduleNote(beat: number, time: number): void {
    const ctx = this.getAudioCtx();
    const gain = this.gainNode!;

    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();

    osc.connect(envelope);
    envelope.connect(gain);

    // Accent on beat 0 (first beat of measure)
    osc.frequency.value = (beat === 0 && this.accentEnabled) ? 1000 : 440;

    envelope.gain.setValueAtTime(1.0, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  private scheduler(): void {
    const ctx = this.getAudioCtx();

    while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);

      const beat = this.currentBeat;
      const noteTime = this.nextNoteTime;
      const delay = Math.max(0, (noteTime - ctx.currentTime) * 1000);
      setTimeout(() => this.onBeat?.(beat), delay);

      // Advance to next beat
      const secondsPerBeat = 60.0 / this.bpm;
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
