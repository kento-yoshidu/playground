# ufodb-playground ロードマップ

`ufodb_v0`をWASMにして、ブラウザだけで動かすWebアプリ。UI・GUI操作はUFO Studioと同じものを`ufodb-design-system`から使う。

## 進め方の方針

- **UIの共有とWASMは別々に進める**: 最初からWASMを入れると、エラーが出たときに「`ufodb-design-system`の読み込み」と「WASMのビルド・初期化」のどちらが原因か切り分けにくい。まずはWASMなしの普通のVite + Reactアプリとして立ち上げ、`ufodb-design-system`のダミーコンポーネントが表示できることを確認してから、WASMを入れる
- **デプロイは早めに通す**: design_systemの`dist/`が`main`で公開されたので、git依存のままCI（GitHub Actions）でビルドできる。ダミーコンポーネントが表示できた時点でGitHub Pagesにデプロイし、以降は変更のたびに公開版でも確認できるようにする
- **UIの組み立てよりWASMを先に通す**: Dummyの表示とデプロイが通った時点で、いちばん不確実なWASM（`ufodb_v0`のWASMビルド、`wasm-pack`、ブラウザでの初期化、CIでのビルド）を最小構成で通す。本物のUIコンポーネントはdesign_system側で揃ってから組み立てる

## Phase 0: プロジェクト初期化

- [x] Vite + React + TypeScriptでプロジェクトを作成する（パッケージ名`ufodb-playground`）
- [x] 独立したgitリポジトリとしてコミットする
- [x] Reactのメジャーバージョンを19に揃える（`ufodb-design-system`の`peerDependencies`が`^19`のため）。Vite・TypeScriptはStudioと揃える必要はない（ライブラリはビルド済みの`dist/`を読むだけなので、利用側のVite・TSのバージョンには依存しない）。現状はdesign_systemと同じVite 8 / TS 6

## Phase 1: `ufodb-design-system`の読み込み確認

`ufodb-design-system`側ROADMAPのPhase 1で作ったダミーコンポーネントを表示する。

- [x] `pnpm add github:kento-yoshidu/ufodb_design_system`で追加する（`node_modules`をサブフォルダで作ってから移動していたため`ERR_PNPM_UNEXPECTED_VIRTUAL_STORE`が出た。`node_modules`を消して入れ直して解決）。`package.json`には`"ufodb-design-system": "github:kento-yoshidu/ufodb_design_system"`と入り、参照したコミットは`pnpm-lock.yaml`に記録される（方針は`CLAUDE.md`の「`ufodb-design-system`への依存」）
- [x] `import "ufodb-design-system/style.css"`を入れる（`main.tsx`）。`dist/index.js`はCSSを自分で読み込まないため、利用側で1回importする必要がある
- [x] `App.tsx`をテンプレートの内容から`<Dummy label="..." />`だけに置き換える
- [x] 確認すること:
  - [x] ダミーコンポーネントが表示され、ボタンを押すと数字が増える（hooksが動く = Reactが1つだけ読み込まれている）。`link:`ではなくgit依存なので、`node_modules/.pnpm`のReactは`react@19.3.0`の1つだけ
  - [x] CSS Modulesのスタイルと、CSS変数（デザイントークン）が効いている
  - [x] エディタでpropsの型が効く（`label`を省くと`Property 'label' is missing ... ts(2741)`になり、`Dummy.d.ts`の定義に飛べる）
  - [x] `pnpm build`（本番ビルド）が通る。出力のCSS（`dist/assets/index-*.css`）にdesign_systemのクラスと`--attention-color`が含まれている
  - [x] `pnpm preview`で本番ビルドも同じように表示される
- [ ] テンプレート由来の`index.css`・`App.css`・`src/assets/`・`public/icons.svg`などを整理する（全体の`button`や文字色のスタイルがdesign_system側の見た目と混ざるため。Phase 4で画面を組み立てる前に片付ける）

## Phase 2: GitHub Pagesへのデプロイ

- [x] リポジトリ名を`ufodb_playground`にリネームする（Pagesの URL が`https://kento-yoshidu.github.io/<リポジトリ名>/`になり、Viteの`base`もこれに合わせるため、デプロイより先に済ませる）
- [x] ローカルの`origin`を新しいURLに変える（`git remote set-url origin git@github.com:kento-yoshidu/ufodb_playground.git`）。旧URL（`playground.git`）もGitHubのリダイレクトで当面は動くが、同じアカウントで`playground`という名前のリポジトリを新しく作るとリダイレクトが切れる
- [x] `vite.config.ts`に`base: "/ufodb_playground/"`を設定する（ビルド後の`index.html`のJS・CSS・faviconのパスが`/ufodb_playground/...`になることを確認済み）
- [x] GitHub Actionsで`pnpm install` → `pnpm build` → `dist/`をPagesにデプロイするworkflowを作る（`.github/workflows/actions.yaml`。`main`へのpushと手動実行で動く）
- [x] リポジトリ設定のPagesのSourceを「GitHub Actions」にする
- [x] 公開URL（https://kento-yoshidu.github.io/ufodb_playground/）でPhase 1と同じ確認をする（`main`へのマージで自動デプロイされ、CSS・`useState`が動くことを確認済み）
- [x] デプロイ手順と`base`の設定を`CLAUDE.md`に追記し、「未決定事項」のホスティング先を消す（テンプレートのままだった`README.md`もプロジェクトの説明に置き換えた）

## Phase 3: WASMの導入（最小構成で動かす）

UIはまだDummyしかないため、画面の組み立てより先に、いちばん不確実なWASMの部分を通しておく。まずサンプルのRustコードでWASMの流れを通し（3-1）、次に`ufodb_v0`につないで`make_set`と`groups`を確認用の画面で動かす（3-2）。

### 3-1: サンプルでWASMの流れを通す（`ufodb_v0`なし）

WASMの仕組み（ビルド → Reactから呼ぶ → CIでビルドしてPagesに公開）を、`ufodb_v0`を使わない小さなRustコードで先に一通り通す。`ufodb_v0`側の対応を待たずに始められ、問題が出たときに「WASMの仕組み」と「`ufodb_v0`のWASM対応」のどちらが原因か切り分けられる。ツール（Rust 1.97・`wasm32-unknown-unknown`ターゲット・`wasm-pack` 0.14）は手元にインストール済み。

- [x] `cargo new --lib wasm`で作り、`Cargo.toml`に`[lib] crate-type = ["cdylib"]`と`wasm-bindgen`の依存を追加する（`cdylib`がないと`.wasm`が出力されない）。既存のgitリポジトリ内で`cargo new`すると`.gitignore`が作られないため、ルートの`.gitignore`に`wasm/target`を追加した
- [x] 数値か文字列を受け渡すだけの関数を1つ、`#[wasm_bindgen]`を付けて公開する（`add(left: usize, right: usize) -> usize`）。`use wasm_bindgen::prelude::*;`が必要。`u64`/`i64`はJS側で`bigint`になるため、最初は`number`になる`u32`/`usize`などを使う
- [x] `wasm-pack build wasm --target web`でビルドし、`wasm/pkg/`に`.wasm`・`.js`（つなぎのコード）・`.d.ts`ができることを確認する。`pkg/`はビルド生成物なのでコミットしない（`wasm-pack`が`pkg/.gitignore`を置く）
- [x] Reactから`pkg/`の`.js`をimportし、`useEffect`で`await init()`してから関数を呼んで結果を表示する。`init()`が終わるまでは関数を呼べないので、準備完了のstateで表示を切り替える（`init()`を待たずにstateを`true`にすると、`Cannot read properties of undefined (reading 'add')`で`<App>`ごと描画が消える。`init().then(() => setWasmReady(true))`で解決）
- [ ] `pnpm dev`と`pnpm build` + `pnpm preview`で動くことを確認する（`base`が`/ufodb_playground/`でも`.wasm`が読み込めるか）
- [x] `pnpm dev`で`add(1, 2)`の結果（3）が表示されることを確認
- [x] CIに、Rustのセットアップ（`wasm32-unknown-unknown`ターゲット）・`wasm-pack`のインストール・`wasm-pack build wasm --target web`を`pnpm build`の前に追加する（`rustup target add` → `Swatinem/rust-cache` → `taiki-e/install-action`で`wasm-pack@0.14.0` → `wasm-pack build`）
- [ ] 公開URLでも動くことを確認する
- [ ] 状態を持つstruct（カウンターなど）を`#[wasm_bindgen]`で公開し、JSから`new`してメソッドを呼び、値が変わることを確認する（`Ufdb`と同じ「作って、操作して、中身を取り出す」形）

### 3-2: `ufodb_v0`につなぐ

前提（`ufodb_v0`側の対応）:

- [ ] **ブロッカー**: `ufodb_v0`の`lib`が`wasm32-unknown-unknown`でビルドできない。`open`/`tiny_http`（`main.rs`の`SNAPSHOT`でしか使わない）が`[dependencies]`にあり、libのビルドにも巻き込まれるため。2026-09-26時点で`cargo check --lib --target wasm32-unknown-unknown`が`open`クレートの`compile_error!`（`open is not supported on this platform`）で失敗することを確認。コアのコードは変更不要で、`Cargo.toml`の依存をfeature（`storage`/`cli`）で分ければ通る見込み（`ufodb/docs/ROADMAP.md`の「Web Playground（WASM、別リポジトリ）との連携メモ」参照）
- [ ] `ufodb/`で`cargo check --lib --target wasm32-unknown-unknown --no-default-features`が通ることを確認する（`wasm32-unknown-unknown`ターゲットは手元にインストール済み）

Playground側（3-1のサンプルの中身を`Ufdb`に置き換える）:

- [ ] `wasm/Cargo.toml`に`ufodb_v0`を追加する。最初はローカルの`ufodb`をpath依存か`[patch]`で参照し、`ufodb_v0`側の変更が`main`に入ったらgit依存（`default-features = false`）に切り替える
- [ ] `#[wasm_bindgen]`で`Ufdb`をラップした型を公開する。最初は`new`/`make_set`/`groups`だけ。`groups()`は借用（`HashMap<usize, Vec<&String>>`）を返すため、所有権のある型（`Vec<Vec<String>>`など）に変換して返す
- [ ] 公開URLで`make_set`/`groups`が動くことを確認する
- [ ] 残りの操作（`unite`/`same`/`size`/`unmerge`など、Studioの`#[tauri::command]`と同じ粒度）を公開する

## Phase 4: 画面を組み立てる

`ufodb-design-system`に本物のコンポーネント（`Header`・グループ一覧・`SidePanel`）が揃ってきたら、それを使って画面を組み立て、Phase 3のWASMの呼び出しにつなぐ。

- [ ] テンプレート由来のファイルを整理しておく（Phase 1の最後の項目）
- [ ] Studioの画面と見比べて、同じ見た目・同じ操作感になっているか確認する。差がある場合は、Playground側で直さず`ufodb-design-system`側で直す
- [ ] design_system側の変更を取り込むときは、design_system側で`main`にマージしてから、こちらで`pnpm update ufodb-design-system`を実行してlockfileをコミットする。マージ前の変更を試したいときだけ、一時的に`link:../design_system`に切り替える（下の「メモ」参照）

## メモ: `link:`で一時的に参照するとき

design_systemの`main`にまだマージしていない変更をPlaygroundで試したいときは、`package.json`を一時的に`"ufodb-design-system": "link:../design_system"`に書き換える。

- `link:`だと、ライブラリ内の`import "react"`が`design_system/node_modules/react`を読みにいき、Reactが二重に読み込まれてhooksが壊れることがある。その場合は`vite.config.ts`に`resolve.dedupe: ["react", "react-dom"]`を入れる
- design_system側で`pnpm build`しないと`dist/`が更新されず、変更が反映されない
- 試し終わったら`github:`に戻し、`pnpm install`してlockfileの差分が残っていないことを確認する

## 検討事項（未定）

- 状態管理（操作のたびに`groups`を取り直す処理など）をStudioと共通化するかは、`ufodb-design-system`側ROADMAPのPhase 4で決める
