# 検証記録

2026-10-07。外部パッケージやブラウザの新規インストールなしで確認しました。

## 実行済み: PASS

- 全JavaScriptファイルの構文確認。
- ブラウザ用`tests/tests.js`と実際のゲームロジックを、環境に既存のJavaScriptエンジンで実行: **17 / 17 PASS**。
- 全10問について、電池から開始・全電球通過・上下左右の隣接のみ・障害物なし・再訪なしの経路を探索し、実際の`begin` / `move`でもクリアを確認。
- 軽量DOMモック上で実際の`game.js`を動かし、電池開始、盤面外・障害物・斜め・再訪の拒否、点灯SVGクラス、先端から再開、pointercancel、複数指、リセットを確認。
- 同じ操作ハンドラーで全10問を解き、次へ・最終メッセージ・もういちど・保存番号の復元・不正な保存番号への対応を確認。
- モックCache API上で実際のService Workerを実行。11個のキャッシュ対象ファイルが存在し、ネットワークなしで各リソースを返せることを確認。
- Service Workerのサブディレクトリ・クエリ付きURL・ゲームのディレクトリURLの解決、および他のアプリのキャッシュを削除しないことを確認。
- HTMLのリンク先、manifest、アイコンのPNG形式・192/512サイズ・相対パスを確認。

ゲーム本体にはテスト用ランタイムの依存はありません。ユーザーがロジックテストを再実行する際は、READMEの方法で`tests/index.html`をブラウザで開くだけです。

実行ログ: `logic-validation.log`、`ui-handler-validation.log`、`static-validation.log`。全問の解答（0始まりの行・列）: `stage-solutions.json`。

## 環境制約で未実行

- HTTPサーバー起動: `PermissionError: [Errno 1] Operation not permitted`。
- Chromium起動: Crashpadの`setsockopt: Operation not permitted`で終了。
- 実際のブラウザでのホーム表示・カード遷移・SVG描画・スクロール抑制。
- 320/390/430pxなどのスマートフォン幅およびPC・タブレットでの見た目。
- Android Chrome実機のタッチ操作、Safari / Edgeでの互換確認。
- PWAのインストールとService Workerによる実際のオフライン再読み込み。

モック上の検証を実機・ブラウザ確認済みとはしていません。新しい許可要求やダウンロードの再試行はせず、静的ファイル一式を提供します。
