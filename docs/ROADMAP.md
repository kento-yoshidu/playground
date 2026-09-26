# ufodb-playground ロードマップ

`ufodb_v0`をWASMにして、ブラウザだけで動かすWebアプリ。UI・GUI操作はUFO Studioと同じものを`ufodb-design-system`から使う。

## 進め方の方針

- **UIの共有とWASMは別々に進める**: 最初からWASMを入れると、エラーが出たときに「`ufodb-design-system`の読み込み」と「WASMのビルド・初期化」のどちらが原因か切り分けにくい。まずはWASMなしの普通のVite + Reactアプリとして立ち上げ、`ufodb-design-system`のダミーコンポーネントが表示できることを確認してから、WASMを入れる
- **デプロイは早めに通す**: design_systemの`dist/`が`main`で公開されたので、git依存のままCI（GitHub Actions）でビルドできる。ダミーコンポーネントが表示できた時点でGitHub Pagesにデプロイし、以降は変更のたびに公開版でも確認できるようにする
- **WASMを入れる前は、データを`useState`の配列で代用する**: UIの組み立てだけを先に進められる

## Phase 0: プロジェクト初期化

- [x] Vite + React + TypeScriptでプロジェクトを作成する（パッケージ名`ufodb_playground`）
- [ ] 独立したgitリポジトリとしてコミットする
- [x] Reactのメジャーバージョンを19に揃える（`ufodb-design-system`の`peerDependencies`が`^19`のため）。Vite・TypeScriptはStudioと揃える必要はない（ライブラリはビルド済みの`dist/`を読むだけなので、利用側のVite・TSのバージョンには依存しない）。現状はdesign_systemと同じVite 8 / TS 6

## Phase 1: `ufodb-design-system`の読み込み確認

`ufodb-design-system`側ROADMAPのPhase 1で作ったダミーコンポーネントを表示する。

- [ ] `pnpm add github:kento-yoshidu/ufodb_design_system`で追加する。`package.json`には`"ufodb-design-system": "github:kento-yoshidu/ufodb_design_system"`と入り、参照したコミットは`pnpm-lock.yaml`に記録される（方針は`CLAUDE.md`の「`ufodb-design-system`への依存」）
- [ ] `import "ufodb-design-system/style.css"`を入れる
- [ ] 確認すること:
  - [ ] ダミーコンポーネントが表示され、ボタンを押すと数字が増える（hooksが動く = Reactが1つだけ読み込まれている）
  - [ ] CSS Modulesのスタイルと、CSS変数（デザイントークン）が効いている
  - [ ] エディタでpropsの型補完が効く
  - [ ] `pnpm build`（本番ビルド）→ `pnpm preview`でも同じように表示される

## Phase 2: GitHub Pagesへのデプロイ

- [ ] リポジトリ名を`ufodb_playground`にリネームする（Pagesの URL が`https://kento-yoshidu.github.io/<リポジトリ名>/`になり、Viteの`base`もこれに合わせるため、デプロイより先に済ませる）
- [ ] `vite.config.ts`に`base: "/ufodb_playground/"`を設定する
- [ ] GitHub Actionsで`pnpm install` → `pnpm build` → `dist/`をPagesにデプロイするworkflowを作る（リポジトリ設定のPagesのSourceを「GitHub Actions」にする）
- [ ] 公開URLでPhase 1と同じ確認をする
- [ ] デプロイ手順と`base`の設定を`CLAUDE.md`に追記し、「未決定事項」のホスティング先を消す

## Phase 3: WASMなしで画面を組み立てる

`ufodb-design-system`に本物のコンポーネント（`Header`・グループ一覧・`SidePanel`）が揃ってきたら、それを使って画面を組み立てる。

- [ ] データは`useState<string[][]>`で持ち、INSERT/MERGEはJS側で配列を書き換えるだけの仮実装にする（Union-Findの正しさはここでは問わない）
- [ ] Studioの画面と見比べて、同じ見た目・同じ操作感になっているか確認する。差がある場合は、Playground側で直さず`ufodb-design-system`側で直す
- [ ] design_system側の変更を取り込むときは、design_system側で`main`にマージしてから、こちらで`pnpm update ufodb-design-system`を実行してlockfileをコミットする。マージ前の変更を試したいときだけ、一時的に`link:../design_system`に切り替える（下の「メモ」参照）

## Phase 4: WASMの導入

- [ ] `wasm/`にRustのcrateを作り、`ufodb_v0`をgit依存（`default-features = false`）で参照する。ローカルの変更を試すときは`[patch]`で差し替える
- [ ] **前提となるブロッカー**: `ufodb_v0`のfeature分け（`storage`/`cli`）が未実装のため、現状はWASMでビルドできない依存（`directories`/`tiny_http`など）を引き込む。`ufodb_v0`側での対応待ち（`ufodb/docs/ROADMAP.md`の「Web Playground（WASM、別リポジトリ）との連携メモ」参照）
- [ ] `#[wasm_bindgen]`で`Ufdb`をラップした型を公開する（`make_set`/`unite`/`groups`など、Studioの`#[tauri::command]`と同じ粒度）。`groups()`は所有権のある型（`Vec<Vec<String>>`など）に変換して返す
- [ ] `wasm-pack build wasm --target web`でビルドし、フロントから`await init()`してから呼ぶ。初期化中のローディング表示を入れる
- [ ] Phase 3の仮実装をWASMの呼び出しに置き換える
- [ ] CI（Phase 2のworkflow）に`wasm-pack build`を追加する

## メモ: `link:`で一時的に参照するとき

design_systemの`main`にまだマージしていない変更をPlaygroundで試したいときは、`package.json`を一時的に`"ufodb-design-system": "link:../design_system"`に書き換える。

- `link:`だと、ライブラリ内の`import "react"`が`design_system/node_modules/react`を読みにいき、Reactが二重に読み込まれてhooksが壊れることがある。その場合は`vite.config.ts`に`resolve.dedupe: ["react", "react-dom"]`を入れる
- design_system側で`pnpm build`しないと`dist/`が更新されず、変更が反映されない
- 試し終わったら`github:`に戻し、`pnpm install`してlockfileの差分が残っていないことを確認する

## 検討事項（未定）

- 状態管理（操作のたびに`groups`を取り直す処理など）をStudioと共通化するかは、`ufodb-design-system`側ROADMAPのPhase 4で決める
