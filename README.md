# わくわくミニゲーム

スマートフォン向けの子ども用ゲーム集。ホームのカードから「ピカッとひとふで」を開始します。電池からドラッグして、通行可能なすべてのマスを一度ずつ通る固定10問。電池以外の通行可能マスはすべて電球で、通ると点灯します。電池も通過済みに数え、障害物はクリア条件に含みません。上下左右だけ移動でき、障害物・再訪・斜めは禁止。指を離しても線の先端から再開できます。リセット・次の問題・最終クリアに対応し、最後に遊んだ問題だけ端末内に保存します。1～3問は非常に簡単、4～7問は簡単、8～10問は小さな4×4盤面で少し考える構成です。

HTML / CSS / JavaScriptのみ。npm・Node.js・ビルド・外部素材・CDN・バックエンドは不要です。

## ファイル構成

```text
index.html / style.css / app.js    ホーム・共通PWA登録
games/hitofude/
  index.html / style.css / game.js / stages.js
icons/icon-192.png / icon-512.png  オリジナルアイコン
manifest.json / service-worker.js PWA・オフラインキャッシュ
index (2).html / tests.js         ブラウザ用ロジックテスト
TEST_REPORT.md / stage-solutions.json  検証記録・全10問の解答経路
```

## ローカル起動

ZIPを展開し、`index.html`があるフォルダで:

```sh
python3 -m http.server 8000
```

PCで `http://localhost:8000/` を開きます。`http://localhost:8000/index%20%282%29.html` で19項目の検証と全10問の全マス解答探索を実行できます。Pythonは確認用サーバーだけに使います。

## GitHub Pagesで公開

このフォルダの**中身**をリポジトリのルートにアップロード。GitHubの **Settings → Pages → Deploy from a branch → main / (root) → Save** を選択します。表示されたHTTPSのURLをAndroid Chromeで開けば遊べます。リポジトリ名のサブディレクトリ配下でも動作する相対パスです。

## ホーム画面に追加・オフライン

Android Chromeで公開URLを一度開き、読み込みを待ってから、メニューの「アプリをインストール」または「ホーム画面に追加」を選びます。通常のブラウザでもインストールせず遊べます。

PWAはHTTPS（ローカルではlocalhost）で有効になります。初回キャッシュ完了後はホーム・全10問をオフラインで遊べます。端末のキャッシュを消した場合は再度オンラインで開いてください。スマートフォンからPCのLAN IPへHTTP接続した場合はゲームは遊べますが、PWA・オフライン機能は有効になりません。

新しいゲームは `games/ゲーム名/` とホームのカードを追加し、`service-worker.js`の`FILES`にも必要なファイルを追加します。公開ファイルを変更するときは同ファイルの`VERSION`を更新します。

## 確認状況

JavaScriptの19項目・全10問の全マス解答を検証済みです。HTTPサーバーとChromiumで、全問のドラッグ操作、リセット、次へ、保存問題の復元、タッチ操作のエミュレーション、実際のService Workerによるオフライン動作を確認しました。物理端末のタッチとPWAインストールは未確認です。詳細は [TEST_REPORT.md](TEST_REPORT.md) を参照してください。
