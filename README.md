# わくわくミニゲーム

スマートフォン向けの子ども用ゲーム集。ホームのカードから「ピカッとひとふで」を開始します。電池からドラッグして全電球をつなぐ固定10問。上下左右だけ移動でき、障害物・再訪・斜めは禁止。指を離しても線の先端から再開できます。リセット・次の問題・最終クリアに対応し、最後に遊んだ問題だけ端末内に保存します。

HTML / CSS / JavaScriptのみ。npm・Node.js・ビルド・外部素材・CDN・バックエンドは不要です。

## ファイル構成

```text
index.html / style.css / app.js    ホーム・共通PWA登録
games/hitofude/
  index.html / style.css / game.js / stages.js
icons/icon-192.png / icon-512.png  オリジナルアイコン
manifest.json / service-worker.js PWA・オフラインキャッシュ
tests/index.html / tests.js       ブラウザ用ロジックテスト
docs/                            検証記録・解答経路
.nojekyll                        GitHub Pages用
```

## ローカル起動

ZIPを展開し、`index.html`があるフォルダで:

```sh
python3 -m http.server 8000
```

PCで `http://localhost:8000/` を開きます。`http://localhost:8000/tests/` で17項目の検証と全10問の解答探索を実行できます。Pythonは確認用サーバーだけに使います。

## GitHub Pagesで公開

このフォルダの**中身**をリポジトリのルートにアップロード。GitHubの **Settings → Pages → Deploy from a branch → main / (root) → Save** を選択します。表示されたHTTPSのURLをAndroid Chromeで開けば遊べます。リポジトリ名のサブディレクトリ配下でも動作する相対パスです。

## ホーム画面に追加・オフライン

Android Chromeで公開URLを一度開き、読み込みを待ってから、メニューの「アプリをインストール」または「ホーム画面に追加」を選びます。通常のブラウザでもインストールせず遊べます。

PWAはHTTPS（ローカルではlocalhost）で有効になります。初回キャッシュ完了後はホーム・全10問をオフラインで遊べます。端末のキャッシュを消した場合は再度オンラインで開いてください。スマートフォンからPCのLAN IPへHTTP接続した場合はゲームは遊べますが、PWA・オフライン機能は有効になりません。

新しいゲームは `games/ゲーム名/` とホームのカードを追加し、`service-worker.js`の`FILES`にも必要なファイルを追加します。公開ファイルを変更するときは同ファイルの`VERSION`を更新します。

## 確認状況

JavaScriptの17項目・全10問の解答・実際のゲーム操作ハンドラーとキャッシュ処理のモック検証は成功しました。Cloud環境のソケット制限でHTTPサーバーとChromiumを起動できず、描画・実機タッチ・PWAの実際のインストールは未確認です。詳細は [docs/TEST_REPORT.md](docs/TEST_REPORT.md) を参照してください。
