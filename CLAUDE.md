# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

easy-metronome — a simple metronome desktop application built with Tauri + Vanilla TypeScript.
Runs on macOS and Windows. Uses Web Audio API (look-ahead scheduler) for precise click timing.

## Commands

```bash
# Development (starts Vite dev server + Tauri window)
npm run tauri dev

# Production build
npm run tauri build

# Frontend only (Vite dev server, no Tauri window)
npm run dev

# Type-check & build frontend
npm run build
```

## Architecture

```
index.html          – App shell / HTML structure
src/
  main.ts           – DOM wiring: BPM hover buttons, time sig, volume, start/stop
  metronome.ts      – Metronome engine (Web Audio API look-ahead scheduler)
  styles.css        – All styles (dark-mode via prefers-color-scheme)
src-tauri/
  src/main.rs       – Tauri entry point (minimal, no custom commands)
  tauri.conf.json   – App name, window size, bundle config
docs/
  tech-stack.md     – Technology selection rationale
```

### Metronome engine (`src/metronome.ts`)

Uses the Chris Wilson look-ahead scheduler pattern:
- `AudioContext.currentTime`-based scheduling (not `setTimeout` for timing)
- 25 ms `setTimeout` loop reads 100 ms ahead and pre-schedules `OscillatorNode`s
- Beat 0 (downbeat): 1000 Hz accent; other beats: 440 Hz
- `onBeat` callback fires at the scheduled beat time for UI highlight
