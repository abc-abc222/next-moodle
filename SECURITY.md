# セキュリティポリシー / Security Policy

next-moodle は、Moodle の認証情報、学習データ、提出物を扱うため、安全な非公開報告を重視しています。

next-moodle handles Moodle credentials, learning data, and submissions. Please report suspected vulnerabilities privately and responsibly.

## サポート対象

セキュリティ修正の対象は、`main` ブランチの最新状態だけです。過去のコミット、フォーク、変更済みの配布物へのバックポートは保証しません。

| 対象 | サポート |
| --- | --- |
| 最新の `main` | 対象 |
| 過去のコミット、フォーク、非公式配布物 | 対象外 |

## 脆弱性を報告する

[GitHub Security Advisory から非公開で報告](https://github.com/james-yusuke/next-moodle/security/advisories/new)してください。脆弱性の詳細、再現手順、実データを公開 Issue、Discussion、Pull Request へ投稿しないでください。

報告には、可能な範囲で次を含めてください。

- 影響を受ける機能、ルート、バージョンまたはコミット
- 最小限の再現手順または安全な概念実証
- 想定される影響と攻撃条件
- 分かる場合は、緩和策または修正案

Moodle の実アカウント、パスワード、トークン、Cookie、API キー、提出物、個人情報は送らないでください。再現には架空の値またはこのリポジトリの mock fixture を使用してください。

## 対象となる問題の例

- セッション、Cookie、ログイン、認証・認可の回避
- Moodle 由来 HTML のサニタイズや表示境界の回避
- 認証済みファイルプロキシ、アップロード、ダウンロードの越権アクセス
- BFF または Route Handler の権限確認、同一オリジン確認、入力検証の回避
- Moodle トークン、資格情報、学習データ、文章補助へ送信する本文の漏えい

Moodle 本体、Next.js、または他の依存関係だけに存在し、next-moodle で追加の影響を生じない問題は、それぞれの提供元のセキュリティ窓口へ報告してください。next-moodle の構成や実装によって悪用可能になる場合は、この窓口へ報告できます。

## 対応の流れ

受領後、内容を非公開で確認し、影響範囲と修正方針を調査します。必要に応じて報告者と追加情報を確認し、修正と検証が完了してから公開時期を調整します。応答時間や修正期限は保証しませんが、調査中の情報は公開せず、協調的な開示に努めます。

## English summary

Only the latest state of `main` is supported. Use [GitHub Private Vulnerability Reporting](https://github.com/james-yusuke/next-moodle/security/advisories/new), never a public issue, for suspected vulnerabilities. Do not include real credentials, tokens, cookies, Moodle records, submissions, or personal data. Reports should describe the affected area, minimal reproduction, impact, and any suggested mitigation. Issues that exist only in an upstream project should be reported upstream unless next-moodle introduces additional impact.
