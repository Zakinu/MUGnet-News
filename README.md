# MUGnet News

MUGnet公式サイト、Zakinuポートフォリオ、MUGnet Music Labelで共用するニュースデータです。1記事1 Markdownで管理し、GitHub Pagesから静的JSONとして配信します。ブラウザからGitHub APIや`raw.githubusercontent.com`へ接続する必要はありません。

## 公開URL

- MUGnet: `https://zakinu.github.io/MUGnet-News/data/news/mugnet.json`
- Music Label: `https://zakinu.github.io/MUGnet-News/data/news/music.json`
- Zakinu: `https://zakinu.github.io/MUGnet-News/data/news/zakinu.json`
- 全記事: `https://zakinu.github.io/MUGnet-News/data/news/all.json`

JSONは`schemaVersion`、`site`、`articles`を持ちます。各記事には`id`、`date`、`title`、`summary`、`body`、`category`、`linkUrl`、`linkText`、`external`、`featured`、`sites`が入ります。

## ニュースを追加する

mainへ直接commitせず、専用ブランチとDraft PRを使います。

```bash
git switch main
git pull --ff-only
git switch -c news/2026-07-20-example
npm run add -- --title "お知らせのタイトル" --slug example --sites mugnet,zakinu
npm run build
npm run check
git add content/news public/data/news
git commit -m "お知らせを追加"
git push -u origin news/2026-07-20-example
gh pr create --draft --fill
```

対話入力を使わず、`--date`、`--category`、`--summary`、`--external-url`、`--link-text`、`--body`も指定できます。掲載先は`mugnet`、`music`、`zakinu`です。

このリポジトリは公開されています。未発表内容や`published: false`の下書き、APIキー、トークン、個人情報をcommitしないでください。下書きはローカルまたは非公開の場所で管理し、公開できる状態になってからPRを作成します。

## 検証内容

`npm run check`で次を確認します。

- 必須項目
- `YYYY-MM-DD`形式の実在する日付
- ファイル名と記事IDの一致
- 重複ID
- 未定義または重複した掲載先
- 危険なURL、外部URLとサイト内URLの混在
- 生HTML
- 公開リポジトリへの下書き混入
- 生成済みJSONがMarkdownと一致していること

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

取得に成功した場合だけコンテナをJSONの内容へ置き換えます。タイムアウト、HTTPエラー、不正なJSONの場合は、あらかじめHTMLへ埋め込んだ内容をそのまま残します。埋め込みがない場合はエラーメッセージを`textContent`で表示します。

既存サイトのカード用CSSはそのまま利用できます。クラス名が異なる場合は`createCard()`内のクラス名だけサイト側へ合わせてください。

## GitHub Pages

`.github/workflows/pages.yml`をGitHub Actions画面から手動実行すると、`public/`をGitHub Pagesへ公開します。pushやmainへのマージだけでは自動デプロイされません。Repository settings → Pages → Build and deploymentのSourceは「GitHub Actions」を使用します。公開処理に追加のAPIキーやSecretsは不要です。
