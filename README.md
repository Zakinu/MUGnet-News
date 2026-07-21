# MUGnet News

MUGnetと関連サイトが公開したニュース、作品情報、プレスリリース、インタビューを一元管理する公式公開アーカイブです。
1記事1 Markdownを正本として、人間と検索クローラーが読める静的HTML、機械利用向けJSON、RSS 2.0を生成し、GitHub Pagesで公開します。

## 公開サイト

- トップ: https://zakinu.github.io/MUGnet-News/
- News一覧: https://zakinu.github.io/MUGnet-News/news/
- Press & Interview: https://zakinu.github.io/MUGnet-News/press/
- Journey to die: https://zakinu.github.io/MUGnet-News/works/journey-to-die/
- 梵天世界の壊し方: https://zakinu.github.io/MUGnet-News/works/bonten/
- MUGnet公式サイト: https://mugnet.jp/

トップ、一覧、記事本文はJavaScriptを実行しなくてもHTMLだけで読めます。各ニュース記事は次の固定URLで公開されます。

```text
https://zakinu.github.io/MUGnet-News/news/<記事ID>/
```

各記事ページにはタイトル、概要、本文、公開日、内容更新日、公式リンク、掲載先、関連作品を表示します。`canonical`、meta description、Open Graph、Twitter Card、RSS autodiscovery、`NewsArticle` JSON-LDも生成します。

## JSON

既存のJSON形式と公開URLを維持しています。

### ニュース

- 最新20件: https://zakinu.github.io/MUGnet-News/data/news/latest.json
- 全記事: https://zakinu.github.io/MUGnet-News/data/news/all.json
- MUGnet: https://zakinu.github.io/MUGnet-News/data/news/mugnet.json
- Music Label: https://zakinu.github.io/MUGnet-News/data/news/music.json
- Zakinu: https://zakinu.github.io/MUGnet-News/data/news/zakinu.json
- Journey to die: https://zakinu.github.io/MUGnet-News/data/news/works/journey-to-die.json
- 梵天世界の壊し方: https://zakinu.github.io/MUGnet-News/data/news/works/bonten.json

サイト別JSONは`schemaVersion`、`site`、`articles`を持ちます。作品別JSONは`schemaVersion`、表示名を含む`work`、`articles`を持ちます。`latest.json`は全記事フィードと同じ記事構造で、`collection: "latest"`、`limit: 20`を持ちます。

### Press & Interview

- 全件: https://zakinu.github.io/MUGnet-News/data/press/all.json
- Journey to die: https://zakinu.github.io/MUGnet-News/data/press/works/journey-to-die.json
- 梵天世界の壊し方: https://zakinu.github.io/MUGnet-News/data/press/works/bonten.json

## JSON Schema・互換性

公開JSONはJSON Schema Draft 2020-12で検証できます。

- Newsフィード: https://zakinu.github.io/MUGnet-News/schema/news-feed.schema.json
- News記事: https://zakinu.github.io/MUGnet-News/schema/news-article.schema.json
- Pressフィード: https://zakinu.github.io/MUGnet-News/schema/press-feed.schema.json
- Press項目: https://zakinu.github.io/MUGnet-News/schema/press-entry.schema.json

リポジトリ内の正本は[`schema/`](schema/)です。ビルド時に`public/schema/`へコピーされます。

- 互換性ポリシー: [`docs/versioning.md`](docs/versioning.md)
- 変更履歴: [`CHANGELOG.md`](CHANGELOG.md)

現在の公開フィードは`schemaVersion: 1`です。利用側は未知のフィールドを無視し、任意フィールドが存在することを前提にせず、未対応の`schemaVersion`を既知の構造として処理しないでください。フィード本体への`$schema`フィールド追加は現時点では行っていません。

## RSS

- 全ニュース: https://zakinu.github.io/MUGnet-News/feed.xml
- MUGnet: https://zakinu.github.io/MUGnet-News/mugnet.xml
- Music Label: https://zakinu.github.io/MUGnet-News/music.xml
- Zakinu: https://zakinu.github.io/MUGnet-News/zakinu.xml
- Journey to die: https://zakinu.github.io/MUGnet-News/works/journey-to-die.xml
- 梵天世界の壊し方: https://zakinu.github.io/MUGnet-News/works/bonten.xml
- Press & Interview: https://zakinu.github.io/MUGnet-News/press.xml
- Journey to die Press: https://zakinu.github.io/MUGnet-News/press/works/journey-to-die.xml
- 梵天世界の壊し方 Press: https://zakinu.github.io/MUGnet-News/press/works/bonten.xml

RSSのフィードURLと記事リンクは絶対URLへ正規化され、`guid`には安定した記事IDを使用します。

## 検索エンジン・AI検索向け構成

- `sitemap.xml`: トップ、News一覧、Press一覧、作品別一覧、全公開記事を絶対URLで列挙
- `robots.txt`: 一般クローラー、OAI-SearchBot、GPTBotを許可し、sitemapを案内
- `llms.txt`: 公式アーカイブの目的と、主要なHTML・JSON・RSS・公式サイトを案内
- 記事別JSON-LD: `headline`、`description`、`datePublished`、`dateModified`、`publisher`、`author`、`mainEntityOfPage`、`url`
- HTMLメタデータ: 固有title、description、canonical、OGP、Twitter Card、RSS autodiscovery
- 日本語`lang`、UTF-8、適切な見出し、モバイル対応、キーボードで利用できる標準HTML

公開ファイル:

- Sitemap: https://zakinu.github.io/MUGnet-News/sitemap.xml
- Robots: https://zakinu.github.io/MUGnet-News/robots.txt
- llms.txt: https://zakinu.github.io/MUGnet-News/llms.txt

`config/feed-channels.json`の`publicBaseUrl`はビルド時に必ず末尾スラッシュ付きへ正規化します。これによりGitHub Pagesの`/MUGnet-News/`をcanonical、sitemap、RSS、JSON-LDから失わないようにしています。

## ライセンスと利用条件

このリポジトリには、コード、フィード情報、記事本文、画像・ロゴなど、異なる権利条件を持つ対象が含まれます。リポジトリ全体にMIT Licenseが一括適用されるわけではありません。

- コード: [`LICENSE`](LICENSE) — 対象となるソフトウェアコードはMIT License
- JSON・RSS等のフィード利用: [`DATA_USAGE.md`](DATA_USAGE.md)
- 記事本文・説明文: [`CONTENT_LICENSE.md`](CONTENT_LICENSE.md)
- 画像・ロゴ・作品素材: [`ASSET_POLICY.md`](ASSET_POLICY.md)
- 権利区分の概要: [`NOTICE.md`](NOTICE.md)

タイトル、概要、日付、URL等は、出典と原記事へのリンクを明示する条件で、検索、AI検索、RAG、フィードリーダー、通知サービス等から利用できます。記事本文の全文転載、画像の再配布、モデル学習・微調整用データセットへの収録などは、この許可には含まれません。詳細は各文書を確認してください。

`robots.txt`によるクローラーへの技術的なアクセス許可は、著作権その他の権利に関する追加のライセンスを意味しません。

## 正本と生成物

Git管理する正本は次です。

```text
content/news/*.md   ニュース
content/press/*.md  Press & Interview
config/             掲載先・作品・公開URL設定
schema/             JSON Schema
static/             画像・認証HTML・favicon・将来のCNAME等
```

`public/`は完全な生成物であり、Git管理しません。`npm run build`は毎回`public/`を削除してから、`static/`と`schema/`をコピーし、HTML・JSON・RSS・sitemap等を再生成します。`public/`を直接編集しても次回ビルドで失われます。

Pull Requestでは、GitHub Actionsが生成済み`public/`を`mugnet-news-public`というArtifactとして7日間保存します。生成結果を確認するときは、PRのActions実行からArtifactを取得してください。

## 記事メタデータ

ニュース例:

```yaml
---
id: 2026-07-20-example
title: "お知らせ"
date: 2026-07-20
category: "お知らせ"
summary: "概要"
url: ""
externalUrl: "https://mugnet.jp/"
linkText: "公式情報を見る"
published: true
featured: false
sites: [mugnet]
works: [bonten]
createdAt: 2026-07-20
updatedAt: 2026-07-20
contentUpdatedAt: 2026-07-20
metadataUpdatedAt: 2026-07-20
---
```

`sites`は掲載先、`works`は関連作品です。掲載先IDは[`config/news-sites.json`](config/news-sites.json)、記事ページで使う表示名・publisher・authorは[`config/feed-channels.json`](config/feed-channels.json)、作品IDと表示名は[`config/news-works.json`](config/news-works.json)で管理します。未知の掲載先IDは検証で拒否されます。作品非依存の記事は`works: []`にします。

記事画像は`static/assets/news/<記事ID>/`へ配置し、`thumbnail`にはGitHub Pages上の絶対URLを指定します。ビルド時に同じパスで`public/assets/`へコピーされます。第三者の個人情報、肖像、権利未確認の画像は公開リポジトリへ追加しません。

```yaml
thumbnail: "https://zakinu.github.io/MUGnet-News/assets/news/<記事ID>/thumbnail.jpg"
```

- `contentUpdatedAt`: 本文、概要、事実関係、重要なリンクなど、読者が参照する内容を変更した日
- `metadataUpdatedAt`: 作品・掲載先の紐付け、分類、画像参照など、内部メタデータだけを変更した日
- `updatedAt`: 後方互換のため維持する従来フィールド。新規の処理では上記2項目を優先

JSON-LDの`dateModified`、記事画面の内容更新日、sitemapの`lastmod`には`contentUpdatedAt`を使用します。未設定の既存記事は`updatedAt`、`createdAt`、`date`の順でフォールバックします。各更新日は実在する`YYYY-MM-DD`形式とし、`createdAt`より前にはできません。

Press記事で`includeInNews: true`を指定する場合は、同じIDの公開News記事が必要です。

このリポジトリは公開されています。未発表情報、認証情報、個人情報をcommitしないでください。`published: false`でもGitHub上のファイル自体は公開されるため、下書きは非公開の場所で管理します。

## ニュースを追加する

mainへ直接commitせず、専用ブランチとDraft Pull Requestを使います。

```bash
git switch main
git pull --ff-only
git switch -c news/2026-07-20-example

npm ci
npm run add -- \
  --title "お知らせのタイトル" \
  --slug example \
  --sites mugnet,zakinu \
  --works bonten

npm run check
git diff --check

git add content config schema static scripts test .github README.md CHANGELOG.md package.json package-lock.json
git commit -m "お知らせを追加"
git push -u origin news/2026-07-20-example
gh pr create --draft --fill
```

`--works=`で作品非依存の記事を作成できます。`--date`、`--category`、`--summary`、`--external-url`、`--link-text`、`--body`も指定できます。

## 検証

```bash
npm ci
npm run check
git diff --check
```

`npm run check`は、入力検証、クリーンビルド、JSON/RSS整合、JSON Schema、静的HTML、canonical、JSON-LD、sitemap、下書き除外、`/MUGnet-News/`の保持、静的ファイルのコピー、`public/`がGit管理されていないことを検査します。

## 既存サイトから取得する

```js
const response = await fetch(
  'https://zakinu.github.io/MUGnet-News/data/news/mugnet.json'
);
if (!response.ok) throw new Error(`News feed: ${response.status}`);
const feed = await response.json();
```

表示時にJSON文字列を`innerHTML`へ直接渡さず、`textContent`を使ってください。リンクは`http:`、`https:`または安全なサイト内パスだけを許可します。実装例は[`examples/news-feed-client.js`](examples/news-feed-client.js)にあります。

## GitHub Pages

`.github/workflows/pages.yml`が`main`へのpushを検知し、依存関係をインストールして`npm run check`によるクリーンビルドと全検証を実行した後、生成された`public/`をGitHub Pagesへ直接デプロイします。Repository settings → Pages → Build and deploymentのSourceは「GitHub Actions」を使用します。mainへのpush・マージは人間が行います。
