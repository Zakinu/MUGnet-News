# MUGnet News

MUGnet公式サイト、Zakinuポートフォリオ、MUGnet Music Labelで共用するニュースデータです。
1記事1 Markdownで管理し、GitHub Pagesから静的JSONとして配信します。
ブラウザからGitHub APIや`raw.githubusercontent.com`へ接続する必要はない設計です。

## 公開URL

- トップ：
`https://zakinu.githib.io/MUGnet-News/`
- MUGnet: `https://zakinu.github.io/MUGnet-News/data/news/mugnet.json`
- Music Label: `https://zakinu.github.io/MUGnet-News/data/news/music.json`
- Zakinu: `https://zakinu.github.io/MUGnet-News/data/news/zakinu.json`
- 全記事: `https://zakinu.github.io/MUGnet-News/data/news/all.json`
- Journey to die: `https://zakinu.github.io/MUGnet-News/data/news/works/journey-to-die.json`
- 梵天世界の壊し方: `https://zakinu.github.io/MUGnet-News/data/news/works/bonten.json`

既存のサイト別JSONは`schemaVersion`、`site`、`articles`を持ちます。各記事には`id`、`date`、`title`、`summary`、`body`、`category`、`linkUrl`、`linkText`、`external`、`featured`、`sites`、`works`が入ります。`works`の追加以外は既存形式を維持しています。

作品別JSONは`schemaVersion`、表示名を含む`work`、`articles`を持ちます。

## 作品タグ

作品IDと表示名は[`config/news-works.json`](config/news-works.json)で管理します。
現在の作品IDは次のとおりです。

- `journey-to-die`: Journey to die
- `bonten`: 梵天世界の壊し方

全記事で`works`は必須です。作品に関係する記事は固定IDを配列へ指定し、作品非依存の記事は空配列にします。
作品を追加するときは`config/news-works.json`へIDと表示名を追加してから記事へタグ付けします。

```yaml
sites: [mugnet]
works: [bonten]
```

```yaml
# 作品非依存
sites: [mugnet]
works: []
```

## ニュースを追加する

mainへ直接commitせず、専用ブランチとDraft PRを使います。

```bash
git switch main
git pull --ff-only
git switch -c news/2026-07-20-example
npm run add -- --title "お知らせのタイトル" --slug example --sites mugnet,zakinu --works bonten
npm run build
npm run check
git add content/news public/data/news
git commit -m "お知らせを追加"
git push -u origin news/2026-07-20-example
gh pr create --draft --fill
```

対話入力を使わず、`--date`、`--category`、`--summary`、`--external-url`、`--link-text`、`--body`も指定できます。掲載先は`mugnet`、`music`、`zakinu`です。`--works`はカンマ区切りで指定し、作品非依存の場合は`--works=`を指定します。

## RSS

サイト別および作品別のRSS 2.0を配信します。
記事URLは絶対URLへ正規化され、`guid`には記事IDを使用します。

- 全記事: `https://zakinu.github.io/MUGnet-News/feed.xml`
- MUGnet: `https://zakinu.github.io/MUGnet-News/mugnet.xml`
- Music Label: `https://zakinu.github.io/MUGnet-News/music.xml`
- Zakinu: `https://zakinu.github.io/MUGnet-News/zakinu.xml`
- Journey to die: `https://zakinu.github.io/MUGnet-News/works/journey-to-die.xml`
- 梵天世界の壊し方: `https://zakinu.github.io/MUGnet-News/works/bonten.xml`

作品別JSONの取得例：

```js
const response = await fetch('https://zakinu.github.io/MUGnet-News/data/news/works/bonten.json');
if (!response.ok) throw new Error(`Work news feed: ${response.status}`);
const feed = await response.json();
```

このリポジトリは公開されています。
未発表内容や`published: false`の下書き、APIキー、トークン、個人情報をcommitしないでください。
下書きはローカルまたは非公開の場所で管理し、公開できる状態になってからPRを作成します。

## 検証内容

`npm run check`で次を確認します。

- 必須項目
- `YYYY-MM-DD`形式の実在する日付
- ファイル名と記事IDの一致
- 重複ID
- 未定義または重複した掲載先
- `works`の省略、未定義作品ID、作品IDの重複
- 危険なURL、外部URLとサイト内URLの混在
- 生HTML
- 公開リポジトリへの下書き混入
- 生成済みJSONがMarkdownと一致していること
- JSONとRSSの記事集合・並び順が一致していること
- XML特殊文字がエスケープされ、RSSリンクが絶対URLであること

## 既存サイトから取得する

最低限の取得処理は次の形です。

```js
const response = await fetch('https://zakinu.github.io/MUGnet-News/data/news/mugnet.json');
if (!response.ok) throw new Error(`News feed: ${response.status}`);
const feed = await response.json();
```

表示時にJSON文字列を`innerHTML`へ渡さないでください。`textContent`を使い、リンクは`http:`、`https:`または安全なサイト内パスだけを許可します。

実装例は[`examples/news-feed-client.js`](examples/news-feed-client.js)にあります。次の2ファイルを各サイトへコピーし、初期化スクリプトを`type="module"`で読み込みます。

- MUGnet: `news-feed-client.js`と`mugnet.js`
- Music Label: `news-feed-client.js`と`music.js`
- Zakinu: `news-feed-client.js`と`zakinu.js`

```html
<div class="news-container" data-news-site="mugnet">
  <!-- 通信失敗時にも残す、直近ニュースまたは案内文 -->
  <p class="news-fallback">最新情報は公式Xでもご案内しています。</p>
</div>
<script type="module" src="mugnet.js"></script>
```

取得に成功した場合だけコンテナをJSONの内容へ置き換えます。タイムアウト、HTTPエラー、不正なJSONの場合は、あらかじめHTMLへ埋め込んだ内容をそのまま残します。
埋め込みがない場合はエラーメッセージを`textContent`で表示します。

既存サイトのカード用CSSはそのまま利用できます。
クラス名が異なる場合は`createCard()`内のクラス名だけサイト側へ合わせてください。

## GitHub Pages

`.github/workflows/pages.yml`が`main`へのpush（Pull Requestのマージを含む）を検知し、`public/`をGitHub Pagesへ自動公開します。必要な場合はGitHub Actions画面から手動実行することもできます。Repository settings → Pages → Build and deploymentのSourceは「GitHub Actions」を使用します。公開処理に追加のAPIキーやSecretsは不要です。
