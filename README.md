# Easy Metronome

シンプルなメトロノームデスクトップアプリ。Tauri + Vanilla TypeScript 製。

A simple metronome desktop application built with Tauri and Vanilla TypeScript.

---

## 機能 / Features

### 拍子設定 / Time Signature
- 2/4、3/4、4/4、5/4、6/4、7/4、6/8、アクセントなし から選択可能
- 1拍目（ダウンビート）にアクセントクリック音（高音）が鳴り、残りは通常音
- 6/8 は8分音符ベースの複合拍子として再生（beat 3 に中アクセント）
- ウィンドウ幅に応じてボタンが長方形グリッドで並ぶ（8→4→2→1 列）

- Select from 2/4, 3/4, 4/4, 5/4, 6/4, 7/4, 6/8, or no accent
- The downbeat plays a higher-pitched accent click; other beats play a normal click
- 6/8 plays as compound duple meter with an eighth-note pulse and a mid-accent on beat 3
- Buttons arrange in a rectangular grid that adapts to window width (8→4→2→1 columns)

### BPM 増減ボタン / BPM Step Buttons
- `−5` / `−1` / `+1` / `+5` ボタンをホバーするとテンポが変化
- ホバーし続けると「間隔」スライダーで設定した間隔ごとに繰り返し変化（デフォルト 500ms）
- 範囲: 40〜240 BPM

- Hover over `−5` / `−1` / `+1` / `+5` buttons to change the tempo
- Holding the hover repeats the change at the interval set by the slider (default 500 ms)
- Range: 40–240 BPM

### キーボードショートカット / Keyboard Shortcuts

| キー | 操作 |
| ---- | ---- |
| `Space` | スタート / ストップ |
| `h` | BPM −5 |
| `j` | BPM −1 |
| `k` | BPM +1 |
| `l` | BPM +5 |

スライダーにフォーカスがある場合はキー操作を無視します。

Keys are ignored when a slider is focused.

### 音量調節 / Volume Control
- スライダーで 0〜100% の範囲でクリック音量を調節

- Adjust click volume from 0–100% using the slider

### ホバー間隔調節 / Hover Repeat Interval

- BPM ボタンのホバー繰り返し間隔を 100〜1000ms の範囲で調節（100ms 刻み）

- Adjust the BPM button hover repeat interval from 100–1000 ms (in 100 ms steps)

### スタート / ストップ / Start / Stop
- ボタン（またはスペースバー）でメトロノームを開始・停止

- Start and stop the metronome with the button or Space key

### ビートインジケーター / Beat Indicator
- 現在の拍をリアルタイムにハイライト表示
- ダウンビートはゴールド、その他はブルーでハイライト

- Real-time highlight of the current beat
- Downbeat highlights in gold; other beats in blue

---

## 開発 / Development

### 必要環境 / Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

### セットアップ / Setup

```bash
npm install
```

### 開発サーバー起動 / Start Dev Server

```bash
npm run tauri dev
```

### ビルド / Build

```bash
npm run tauri build
```

---

## 技術スタック / Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 |
| Frontend | Vanilla TypeScript + Vite |
| Audio | Web Audio API (look-ahead scheduler) |
| Styling | Plain CSS with dark mode support |

詳細は [`docs/tech-stack.md`](docs/tech-stack.md) を参照。
