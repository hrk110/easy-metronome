# Easy Metronome

シンプルなメトロノームデスクトップアプリ。Tauri + Vanilla TypeScript 製。

A simple metronome desktop application built with Tauri and Vanilla TypeScript.

---

## 機能 / Features

### 拍子設定 / Time Signature
- 2、3、4、6 拍子を選択可能
- 1拍目（ダウンビート）にアクセントクリック音（高音）が鳴り、残りは通常音

- Select 2, 3, 4, or 6 beats per measure
- The downbeat (beat 1) plays a higher-pitched accent click; other beats play a normal click

### BPM 増減ボタン / BPM Step Buttons
- `−5` / `−1` / `+1` / `+5` ボタンをホバーするとテンポが変化
- ホバーし続けると 300ms ごとに繰り返し変化
- 範囲: 40〜240 BPM

- Hover over `−5` / `−1` / `+1` / `+5` buttons to change the tempo
- Holding the hover repeats the change every 300 ms
- Range: 40–240 BPM

### 音量調節 / Volume Control
- スライダーで 0〜100% の範囲でクリック音量を調節

- Adjust click volume from 0–100% using the slider

### スタート / ストップ / Start / Stop
- ボタン1つでメトロノームを開始・停止

- Single button to start and stop the metronome

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
