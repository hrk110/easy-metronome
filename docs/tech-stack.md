# 技術スタック選定理由

## 概要

easy-metronome は **Tauri + TypeScript** で実装する。

## 要件

- macOS でのスタンドアローン動作（優先）
- Windows でも動作すること
- メトロノームとして正確な音声タイミングが必要

## 選定: Tauri + TypeScript

### 音声精度

メトロノームの核心は「正確なタイミングでクリック音を鳴らす」ことである。
Web Audio API の `AudioContext` は JavaScript の `setTimeout` とは独立した専用クロックを持ち、スケジューリング精度が高い。これはメトロノームの実装において広く採用されている手法であり、Tauri のフロントエンドからそのまま利用できる。

### クロスプラットフォーム対応

Tauri はフロントエンドのレンダリングにシステム標準の WebView を使用する。

| OS | 使用 WebView |
|---|---|
| macOS | WKWebView |
| Windows | WebView2 (Chromium ベース) |

これにより、単一のコードベースで両 OS に対応できる。

### 軽量なバンドルサイズ

Electron はアプリに Chromium を同梱するためバンドルサイズが 150MB 前後になる。
Tauri はシステム WebView を利用するため、バンドルサイズは数 MB 程度に抑えられる。

### 開発体験

- フロントエンドは React / Vue / Svelte など任意の JS フレームワークが使える
- Rust（バックエンド）は OS 統合が必要な場合のみ触れば良く、シンプルなメトロノームであればフロントエンドだけで完結できる

## 不採用の選択肢

| 技術 | 不採用理由 |
|---|---|
| Electron | バンドルサイズが大きい（Tauri で同等のことができるため） |
| Flutter | 音声タイミングの精度がパッケージ依存で不安定 |
| Qt | C++ 習熟が必要でコストが高い |
| SwiftUI | Windows 非対応 |
