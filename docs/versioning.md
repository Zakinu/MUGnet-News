# JSONフィードの互換性ポリシー

最終更新日: 2026-07-21

この文書は、MUGnet Newsが公開するJSONフィードの`schemaVersion`、互換性、日付、欠損値、並び順および変更通知の方針を定めます。

## 1. 対象

対象は、次の公開JSONです。

- `data/news/*.json`
- `data/news/works/*.json`
- `data/press/*.json`
- `data/press/works/*.json`

Markdownのfront matter、HTML、RSSおよびリポジトリ内部の設定ファイルには、この互換性ポリシーを直接適用しません。

## 2. schemaVersion

現在の公開フィードは`schemaVersion: 1`です。

`schemaVersion`は公開JSONの契約上のメジャーバージョンを示します。npmパッケージのバージョン、記事の更新日、リポジトリのリリース番号とは別です。

利用側は、対応していない`schemaVersion`を受け取った場合、既知の構造として処理せず、明示的にエラーまたは非対応として扱ってください。

## 3. schemaVersion 1で互換とみなす変更

次の変更は、既存フィールドの意味と型を維持する限り、`schemaVersion`を上げずに行うことがあります。

- 任意フィールドの追加
- 新しいサイトID、作品ID、カテゴリ、Press種別の追加
- 新しい作品別・用途別フィードURLの追加
- 説明文、JSON Schema、README等の明確化
- 記事データの追加、訂正、更新または削除

利用側は未知のフィールドを無視し、未知の分類値を表示不能なエラーにせず、文字列として保持または安全にフォールバックしてください。

## 4. 破壊的変更

次の変更には原則として`schemaVersion`の更新が必要です。

- 必須フィールドの削除または名称変更
- 既存フィールドの型または意味の変更
- 任意フィールドの必須化
- ルートオブジェクト、`articles`、`entries`または`work`の構造変更
- 記事IDまたは日付の表現形式変更
- 並び順の契約変更

破壊的変更を行う場合は、可能な範囲で旧バージョンとの併存期間、移行方法および終了予定を`CHANGELOG.md`とREADMEで案内します。

## 5. 必須・任意・欠損値

JSON Schemaの`required`に含まれるフィールドは常に出力します。それ以外は任意フィールドです。

- 任意フィールドが未設定の場合、そのフィールド自体を省略します。
- 現行の生成処理は、任意フィールドの未設定を`null`では出力しません。
- `thumbnail`、`createdAt`、`updatedAt`、`contentUpdatedAt`、`metadataUpdatedAt`等が存在するとは限りません。
- News記事では`body`、`linkUrl`、`linkText`は必須ですが、本文またはリンクがない場合は空文字列になることがあります。
- Press & Interview項目では`body`と`linkUrl`は必須です。`body`は空文字列になる場合がありますが、`linkUrl`は空文字列を許可せず、安全な`http`または`https`の絶対URLである必要があります。
- 空文字列、フィールド欠落、`null`を同一視しないでください。

## 6. 日付

`date`、`createdAt`、`updatedAt`、`contentUpdatedAt`、`metadataUpdatedAt`は`YYYY-MM-DD`形式の暦日です。時刻またはタイムゾーン付き日時ではありません。

- `date`: 発表、公開または出来事を記録する記事上の日付
- `createdAt`: MUGnet News上で記事データを作成した日
- `contentUpdatedAt`: 本文、概要、事実関係または重要なリンクなど、読者が参照する内容を更新した日
- `metadataUpdatedAt`: 作品・掲載先の紐付け、分類、画像参照など、内部メタデータを整理した日
- `updatedAt`: 後方互換のため維持する従来の一般更新日。新規利用では`contentUpdatedAt`または`metadataUpdatedAt`を優先

HTMLの表示、JSON-LDの`dateModified`、sitemapの`lastmod`には、`contentUpdatedAt`を優先して使用します。未設定の既存記事は、`updatedAt`、`createdAt`、`date`の順でフォールバックします。`metadataUpdatedAt`だけを変更しても、検索エンジン向けの内容更新日は変わりません。

## 7. IDと並び順

- `id`は記事またはPress項目の安定識別子です。
- URLや表示名ではなく、`id`を重複排除と更新判定に使用してください。
- 配列は`date`の降順です。
- 同じ`date`では`id`の昇順です。
- 配列位置を永続的な識別子として使用しないでください。

## 8. 用途別フィード

`data/news/latest.json`は`data/news/all.json`と同じ記事構造を使い、公開日順の最新20件だけを収録します。

- `collection`: `latest`
- `limit`: `20`
- `site`: `all`
- `articles`: 最大20件

これは追加の用途別フィードであり、`data/news/all.json`の公開URLや内容を置き換えません。

## 9. JSON Schema

公開スキーマは次のURLです。

- `schema/news-feed.schema.json`
- `schema/news-article.schema.json`
- `schema/press-feed.schema.json`
- `schema/press-entry.schema.json`

スキーマはJSON Schema Draft 2020-12を使用します。将来の任意フィールド追加を許容するため、未知のプロパティは拒否しません。

フィード本体への`$schema`フィールド追加は、既存利用者への影響を別途検討した上で行います。現時点では追加していません。

## 10. 変更履歴

公開形式に関する変更は[`CHANGELOG.md`](../CHANGELOG.md)へ記録します。単純な記事追加や文章修正は、形式へ影響しない限り個別には記録しません。
