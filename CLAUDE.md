# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

`ufodb-playground`（リポジトリ: `ufodb_playground`。現在は`playground`で、リネーム予定）: `ufodb_v0`（Union-Find DB）をブラウザだけで試せるWebアプリ。UFO Studio（Tauri製デスクトップアプリ）と同じUI・同じGUI操作を、インストールなしで提供する。

- **サーバーを持たない**: `ufodb_v0`をWebAssemblyにコンパイルし、ブラウザのタブ内で動かす。サーバーの役割はHTML/JS/`.wasm`の静的ファイルを配ることだけ
- **永続化しない**: データはタブ内のメモリにだけあり、リロードやタブを閉じると消える
- **GUI操作のみ**: Studioと同じフォーム操作（INSERT/MERGEなど）を提供する。コマンド（UFQL）を直接入力して実行する機能は想定しない
- **TCP接続・ユーザーアカウントは対象外**: ブラウザはTCPの生ソケットを開けないため、`ufodb_v0`のTCPサーバー機能はここでは扱わない

実装計画・進捗のフェーズ分けは`docs/ROADMAP.md`を参照。最初はWASMなしで`ufodb-design-system`のダミーコンポーネントを表示するところから始め、WASMはUIの共有が確認できてから入れる。

## 構成・アーキテクチャ

<!-- ディレクトリ名はリポジトリ作成後に実際の構成に合わせて更新する -->

- `wasm/` — Rustのcrate。`ufodb_v0`を依存に持ち、`#[wasm_bindgen]`で`Ufdb`の操作をJSに公開する薄いラッパー。Studioの`src-tauri/src/lib.rs`（`#[tauri::command]`）にあたる
  - `Ufdb::groups()`のように借用（`&String`）や`HashMap`を返すメソッドは、そのままJSに渡せないため、所有権のある型（`Vec<Vec<String>>`など）に変換して返す
- `src/` — React + TypeScript（Vite）。UIコンポーネントは`ufodb-design-system`から使い、このリポジトリではWASMとの接続と画面の組み立てを行う
  - WASMは最初に`await init()`が必要。初期化が終わるまでのローディング表示を考慮する

Studioとの対応関係:

| 役割 | Studio | Playground |
|---|---|---|
| Rust側の窓口 | `#[tauri::command]` | `#[wasm_bindgen]` |
| 呼び出し方 | `await invoke("make_set", { key })` | WASMの関数を直接呼ぶ |
| `Ufdb`の場所 | ネイティブのRustプロセス | ブラウザのタブ内（WASM） |

## `ufodb_v0`への依存

- `wasm/Cargo.toml`では、`ufodb_v0`をgit依存（`https://github.com/kento-yoshidu/toy_ufdb`）で参照する（publicなのでCIでも認証不要）。必要に応じて`tag`/`rev`でバージョンを固定する
- ローカルで`ufodb_v0`の変更を試すときは、Cargoの`[patch]`でローカルのパスに差し替える
- `ufodb_v0`本体（コア機能・公開API・`Cargo.toml`）の変更はこのリポジトリでは行わない。Playgroundで必要になった公開APIが無い場合や、WASMでビルドできない依存がある場合は、`toy_ufdb`側で対応してもらう
- `ufodb_v0`の`storage`/`db`モジュールはファイルI/O（`std::fs`）を使うため、WASM上では呼ばない

## `ufodb-design-system`への依存

- CIでビルドするため、git依存（`"ufodb-design-system": "github:kento-yoshidu/ufodb_design_system"`）で参照する。design_system側がビルド済みの`dist/`をコミットしているので、インストール時のビルドは不要
- `#<タグ/コミット>`は付けない。インストール時のコミットが`pnpm-lock.yaml`に記録されて固定されるので、lockfileは必ずコミットする。design_systemの更新を取り込むときは`pnpm update ufodb-design-system`を実行し、lockfileの変更をコミットする
- design_system側の未コミットの変更を試すときは、一時的に`link:../design_system`に切り替える。`link:`ではReactが二重に読み込まれることがあるため、`vite.config.ts`の`resolve.dedupe: ["react", "react-dom"]`を入れておく

## 未決定事項

- **ホスティング先**: 未定（GitHub Pagesなどの静的ホスティングを想定）。決まったらViteの`base`設定とデプロイ手順をここに追記する

## コマンド

<!-- リポジトリ作成後に実際のscriptsに合わせて更新する -->

- `wasm-pack build wasm --target web` — WASMのビルド
- `pnpm install`
- `pnpm dev` — 開発サーバー
- `pnpm build` — 本番ビルド（静的ファイルを`dist/`に出力）
- `cargo test`（`wasm/`内で実行）

## 関連リポジトリ

- `toy_ufdb`（`ufodb_v0`本体）: Union-Find DBのコア。git依存で参照
- `ufodb_design_system`（パッケージ名`ufodb-design-system`）: 共通のReactコンポーネントとデザイントークン。UIの変更は基本的にそちらで行う
- `ufodb_studio`（UFO Studio）: 同じUIを使うTauri製デスクトップアプリ

## 作業の進め方

このリポジトリの実装コード（`src/`・`wasm/`など）は基本的にユーザー自身が書く。ユーザーから明示的に依頼されない限り、実装コードを直接編集・作成しない。Claude Codeの役割は:

- 設計上の相談（WASMの公開API、状態の持ち方、ビルド構成など）に応答する。コードを渡すのではなく、考え方を説明する
- ユーザーが書いたコードのレビュー・指摘
- ドキュメント（`README.md` / `docs/ROADMAP.md` / `CLAUDE.md`）の作成・更新
- `wasm-pack build` / `cargo test` / `pnpm build`などによるビルド・動作確認
