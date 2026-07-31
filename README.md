# next-moodle

Moodleを公式Web Service APIのまま利用し、学生向けフロントエンドを高密度なNext.jsワークスペースへ置き換えるBFFアプリです。トークンは暗号化されたHttpOnly Cookieから外へ出さず、Moodle由来HTMLとファイルはサーバー境界で検証します。

## 学生ワークスペース

- ダッシュボード、コース、教材、活動完了、課題提出、カレンダー、通知
- 成績、参加者、プロフィール、プライベートファイル、バッジ、学習プラン
- 会話一覧、メッセージ送信、通知既読化
- 標準活動を `/activities/[cmid]` の共通ワークスペースへ統合
- 端末内PDFツールと、任意の文章補助

ログイン時にMoodleが返す関数一覧から、機能ごとの `available` / `adapter_required` / `unavailable` を生成します。関数名の一覧はCookieへ保存せず、SHA-256と小さな能力マニフェストだけを8時間保持します。

## 開発を始める

`.env.example` を参考に、ローカル専用の `.env.local` に次のサーバー環境変数を設定します。

| 変数 | 用途 |
| --- | --- |
| `APP_NAME` | 画面に表示するアプリ名。 |
| `APP_LOCALE` | 日時と数値のロケール。既定値は `ja-JP`。 |
| `APP_TIME_ZONE` | Moodleの日時を表示するIANAタイムゾーン。 |
| `MOODLE_BASE_URL` | MoodleのHTTPS origin。末尾に `/login/index.php` は付けません。 |
| `MOODLE_SERVICE` | Moodle管理者が許可したWeb Service名。通常は `moodle_mobile_app`。 |
| `MOODLE_REQUIRE_COMPANION` | `true`なら補助契約v2の5関数が揃うまで完全置換Readyにしません。 |
| `MOODLE_TEACHER_ROLE_SHORTNAMES` | 先生連絡で宛先候補にするMoodleロールのshortname。 |
| `SESSION_PASSWORD` | 32バイト以上のランダムな暗号化Cookie秘密鍵。 |
| `AI_ASSIST_ENABLED` | `true`のときだけ文章補助を有効化。既定値は`false`。 |
| `AI_BASE_URL` | OpenAI互換の`/v1` API URL。OpenAI、LM Studio、Ollamaを設定できます。 |
| `AI_API_KEY` | APIキー。LM Studio／Ollamaのローカル構成では空欄にできます。 |
| `AI_MODEL` | 利用するチャット補完モデル名。 |
| `AI_SAFETY_SECRET` | 利用回数制御用の不透明な利用者識別子を作る、32バイト以上の秘密鍵。 |
| `AI_PRIVACY_NOTICE_URL` | 端末上の同意画面から案内する任意のHTTPSプライバシー説明。 |

秘密鍵は次で生成できます。

```sh
openssl rand -hex 48
```

その後、依存関係を入れて起動します。

```sh
bun install
bun run dev
```

`configuration_error` が出る場合は、起動中のプロセスが `MOODLE_BASE_URL` と `SESSION_PASSWORD` を読み込んでいません。 `.env.local` を保存した後、開発サーバーを再起動してください。Moodleのユーザー名やパスワードを環境変数へ保存する必要はありません。

1つのデプロイは1つの信頼済みMoodleへ接続します。利用者が接続先URLを入力する構成や、Moodle画面のスクレイピングは採用していません。

## Moodle側の設定

専用Web Serviceへ、利用する機能の公式関数だけを許可してください。権限のない機能は画面上で明示的に無効になります。学生向けUIを完全置換する構成では、`moodle-plugin/local_nextmoodle` の補助プラグインと契約v2の5関数が必須です。補助契約は任意HTMLを受け取らず、許可された操作と型付き表示ブロックに限定しています。補助サービスはインストール直後は無効なので、Moodle管理者が専用Web Serviceへ明示的に追加してください。

接続診断は、補助契約だけでなく公開コースの活動種別を横断確認します。公式アダプターまたは補助アダプターに解決できない活動が1件でもあればReadyにせず、活動名や学生データを出さずにモジュール種別と件数だけを表示します。

標準 Web Service にない活動（例: Questionnaire、出席、学内独自活動）は、本アプリで活動状態と教材を表示した上で、接続中 Moodle と同一オリジンの検証済み URL だけを別タブで開きます。トークン、パスワード、任意の外部 URL は引き渡しません。

ローカルのMock Moodleは実在組織と無関係な2ユーザー分のfixtureを提供し、成績、教材、完了更新、課題提出、メッセージ、通知を実環境へ更新せず検証できます。

## 文章補助

文章補助は提出エディタの任意機能です。利用者が端末ごとに同意するまで通信しません。補助案は自動挿入せず、利用者が確認してから挿入します。本文の不足点確認または補足案の作成に、課題名、課題文、本文の最大6,000文字だけを使用します。Moodleトークン、パスワード、添付ファイル、コース一覧は送信しません。

通信先はOpenAI互換の`POST /v1/chat/completions`です。OpenAIのほか、同じインターフェースを公開するLM Studio（例: `http://127.0.0.1:1234/v1`）およびOllama（例: `http://127.0.0.1:11434/v1`）をサーバー環境変数だけで利用できます。ローカルHTTPはloopbackアドレスだけを許可し、外部通信先はHTTPSを必須にしています。

## 検証

```sh
bun run lint
bunx tsc --noEmit
bun test
bun run build
bun run test:e2e
bun run react:doctor
bun audit
```

実サイトとの read-only 契約テストは、通常はスキップされます。明示的に実行する場合だけ `MOODLE_LIVE_INTEGRATION=1`、`MOODLE_LIVE_BASE_URL`、`MOODLE_LIVE_USERNAME`、`MOODLE_LIVE_PASSWORD`（任意で `MOODLE_LIVE_SERVICE`）を CI のシークレットとして設定してください。取得した Moodle データは fixture やログへ保存しません。
