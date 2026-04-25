# Easy Metronome

シンプルなメトロノームデスクトップアプリ。Tauri + Vanilla TypeScript 製。

A simple metronome desktop application built with Tauri and Vanilla TypeScript.

---

## 機能 / Features

### 拍子設定 / Time Signature

- 2/4、3/4、4/4、5/4、6/4、7/4、6/8、アクセントなし から選択可能
- 1 拍目（ダウンビート）にアクセントクリック音（高音）が鳴り、残りは通常音
- 6/8 は 8 分音符ベースの複合拍子として再生（beat 3 に中アクセント）
- ウィンドウ幅に応じてボタンが長方形グリッドで並ぶ（8→4→2→1 列）

- Select from 2/4, 3/4, 4/4, 5/4, 6/4, 7/4, 6/8, or no accent
- The downbeat plays a higher-pitched accent click; other beats play a normal click
- 6/8 plays as compound duple meter with an eighth-note pulse and a mid-accent on beat 3
- Buttons arrange in a rectangular grid that adapts to window width (8→4→2→1 columns)

### BPM 増減ボタン / BPM Step Buttons

- `−5` / `−1` / `+1` / `+5` ボタンをホバーすると即座にテンポが変化し、500ms ごとに繰り返し変化
- 範囲: 40〜240 BPM

- Hover over `−5` / `−1` / `+1` / `+5` to change the tempo immediately, then repeat every 500 ms while held
- Range: 40–240 BPM

### キーボードショートカット / Keyboard Shortcuts

| キー    | 操作                  |
| ------- | --------------------- |
| `Space` | スタート / ストップ   |
| `h`     | BPM −5                |
| `j`     | BPM −1                |
| `k`     | BPM +1                |
| `l`     | BPM +5                |
| `x`     | BPM を 2 倍           |
| `/`     | BPM を ½ に           |

入力フィールドにフォーカスがある場合はキー操作を無視します。

Keys are ignored when an input field is focused.

### 音量調節 / Volume Control

- スライダーで 0〜100% の範囲でクリック音量を調節

- Adjust click volume from 0–100% using the slider

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

### ディスク使用量の削減 / Reducing Disk Usage

Rust のビルド成果物（`src-tauri/target/`）は数 GB になることがあります。不要になったら以下で削除できます。

Rust build artifacts in `src-tauri/target/` can grow to several GB. Remove them when not needed:

```bash
cd src-tauri && cargo clean
```

次回のビルドや `npm run tauri dev` 実行時に自動で再生成されます（初回は数分かかります）。

The artifacts are regenerated automatically on the next build or `npm run tauri dev` run (first build takes a few minutes).

---

## 技術スタック / Tech Stack

| Layer         | Technology                                            |
| ------------- | ----------------------------------------------------- |
| Desktop shell | Tauri v2                                              |
| Frontend      | Vanilla TypeScript + Vite                             |
| Audio         | Rust/cpal — CoreAudio on macOS (look-ahead scheduler) |
| Styling       | Plain CSS with dark mode support                      |

詳細は [`docs/tech-stack.md`](docs/tech-stack.md) を参照。
