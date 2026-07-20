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

各記事ページにはタイトル、概要、本文、公開日、更新日、公式リンク、掲載先、関連作品を表示します。掲載先は`mugnet`などの内部IDではなく、設定済みの人間向け名称で表示します。`canonical`、meta description、Open Graph、Twitter Card、RSS autodiscovery、`NewsArticle` JSON-LDも生成します。

## JSON

既存のJSON形式と公開URLを維持しています。

### ニュース

- 全記事: https://zakinu.github.io/MUGnet-News/data/news/all.json
- MUGnet: https://zakinu.github.io/MUGnet-News/data/news/mugnet.json
- Music Label: https://zakinu.github.io/MUGnet-News/data/news/music.json
- Zakinu: https://zakinu.github.io/MUGnet-News/data/news/zakinu.json
- Journey to die: https://zakinu.github.io/MUGnet-News/data/news/works/journey-to-die.json
- 梵天世界の壊し方: https://zakinu.github.io/MUGnet-News/data/news/works/bonten.json

サイト別JSONは`schemaVersion`、`site`、`articles`を持ちます。作品別JSONは`schemaVersion`、表示名を含む`work`、`articles`を持ちます。

### Press & Interview

- 全件: https://zakinu.github.io/MUGnet-News/data/press/all.json
- Journey to die: https://zakinu.github.io/MUGnet-News/data/press/works/journey-to-die.json
- 梵天世界の壊し方: https://zakinu.github.io/MUGnet-News/data/press/works/bonten.json

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
- 記事別JSON-LD: `headline`、`description`、`datePublished`、`dateModified`、`publisher`、`mainEntityOfPage`、`url`
- HTMLメタデータ: 固有title、description、canonical、OGP、Twitter Card、RSS autodiscovery
- 日本語`lang`、UTF-8、適切な見出し、モバイル対応、キーボードで利用できる標準HTML

公開ファイル:

- Sitemap: https://zakinu.github.io/MUGnet-News/sitemap.xml
- Robots: https://zakinu.github.io/MUGnet-News/robots.txt
- llms.txt: https://zakinu.github.io/MUGnet-News/llms.txt

`config/feed-channels.json`の`publicBaseUrl`はビルド時に必ず末尾スラッシュ付きへ正規化します。これによりGitHub Pagesの`/MUGnet-News/`をcanonical、sitemap、RSS、JSON-LDから失わないようにしています。

## 情報の正本

```text
content/news/*.md   ニュース
content/press/*.md  Press & Interview
```

`public/`以下は生成物です。Markdownまたは設定を変更して`npm run build`を実行し、生成物も同じPull Requestへ含めてください。生成物を直接編集しないでください。

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
---
```

`sites`は掲載先、`works`は関連作品です。掲載先IDは[`config/news-sites.json`](config/news-sites.json)、記事ページで使う表示名（`title`）は[`config/feed-channels.json`](config/feed-channels.json)、作品IDと表示名は[`config/news-works.json`](config/news-works.json)で管理します。未知の掲載先IDは検証で拒否され、表示名がない場合だけIDへフォールバックします。作品非依存の記事は`works: []`にします。

Press記事で`includeInNews: true`を指定する場合は、同じIDの公開News記事が必要です。`createdAt`と`updatedAt`は実在する`YYYY-MM-DD`形式とし、`updatedAt`を`createdAt`より前にはできません。

このリポジトリは公開されています。未発表情報、認証情報、個人情報をcommitしないでください。`published: false`でもGitHub上のファイル自体は公開されるため、下書きは非公開の場所で管理します。

## ニュースを追加する

mainへ直接commitせず、専用ブランチとDraft Pull Requestを使います。

```bash
git switch main
git pull --ff-only
git switch -c news/2026-07-20-example

npm run add -- \
  --title "お知らせのタイトル" \
  --slug example \
  --sites mugnet,zakinu \
  --works bonten

npm run build
npm run check
npm test
git diff --check

git add content public
git commit -m "お知らせを追加"
git push -u origin news/2026-07-20-example
gh pr create --draft --fill
```

`--works=`で作品非依存の記事を作成できます。`--date`、`--category`、`--summary`、`--external-url`、`--link-text`、`--body`も指定できます。

## 検証

```bash
npm run build
npm run check
npm test
git diff --check
```

検証対象には必須項目、日付と更新順、ID重複、掲載先・作品ID、URL安全性、生HTML、`includeInNews`の対応、JSON/RSSの整合、静的HTML、canonical、JSON-LD、sitemap、下書き除外、`/MUGnet-News/`の保持が含まれます。

`npm run check`は、削除・改名後に残った生成対象外のJSON、RSS、記事HTMLもエラーにします。通常の`npm run build`は、生成管理ディレクトリ内の不要ファイルだけを安全に削除します。

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

`.github/workflows/pages.yml`が`main`へのpushを検知し、`public/`をGitHub Pagesへ公開します。Repository settings → Pages → Build and deploymentのSourceは「GitHub Actions」を使用します。mainへのpush・マージは人間が行います。
