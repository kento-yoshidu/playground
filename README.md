# ufodb-playground

`ufodb_v0`（Union-Find DB）をブラウザだけで試せるWebアプリ。UFO Studio（デスクトップアプリ）と同じUI・同じGUI操作を、インストールなしで使える。

公開URL: https://kento-yoshidu.github.io/ufodb_playground/

- サーバーを持たず、`ufodb_v0`をWebAssemblyにしてブラウザのタブ内で動かす
- データは保存しない。リロードやタブを閉じると消える
- UIコンポーネントは[`ufodb-design-system`](https://github.com/kento-yoshidu/ufodb_design_system)を使う

現在の進捗は[`docs/ROADMAP.md`](docs/ROADMAP.md)を参照。

## 開発

```
pnpm install
pnpm dev      # 開発サーバー（http://localhost:5173/ufodb_playground/）
pnpm build    # 本番ビルド（dist/に出力）
pnpm preview  # 本番ビルドの確認
```

`main`にマージすると、GitHub ActionsでGitHub Pagesに自動デプロイされる。
