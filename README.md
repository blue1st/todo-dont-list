# Todo & Don't List

「やるべきこと（Todo）」と「やってはいけないこと（Don't）」を管理するためのシンプルなアプリケーションです。
Nuxt 3 で構築されており、PWA（Progressive Web App）として動作するため、オフラインでも利用可能です。

[Application URL](https://blue1st.github.io/todo-dont-list/)

## 特徴

- **Todo (Do) タスクの管理**: 通常のタスク管理機能です。完了したタスクにチェックを入れることができます。
- **Don't タスクの管理**: 「SNSを見ない」「お菓子を食べない」といった、悪い習慣を断つためのタスクです。
    - ボタンを押すと、指定した時間（例: 30分、1時間）の間、そのタスクが「抑制（Suppression）」状態になります。
    - 抑制期間中はカウントダウンが表示され、再実行（ボタン押下）ができなくなります。
- **柔軟な時間指定**: Don't タスクの抑制時間は、分 (`m`)、時間 (`h`)、日 (`d`) で指定可能です（例: `30m`, `1h`, `0.5d`）。
- **データ永続化**: データはブラウザの IndexedDB (Dexie.js) に保存されるため、リロードしても消えません。
- **PWA 対応**: アプリとしてインストール可能で、オフラインでも動作します。

## 技術スタック

- **Framework**: [Nuxt 3](https://nuxt.com/)
- **UI Library**: Vue.js 3
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **PWA**: [@vite-pwa/nuxt](https://vite-pwa-org.netlify.app/)
- **Hosting**: GitHub Pages

## 開発環境のセットアップ

依存関係をインストールします:

```bash
npm install
```

開発サーバーを起動します:

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## プロダクションビルド

```bash
npm run build
```

## デプロイ

このプロジェクトは GitHub Actions を使用して GitHub Pages に自動デプロイされるように設定されています。
`main` ブランチにプッシュすると、自動的にビルドとデプロイが行われます。
