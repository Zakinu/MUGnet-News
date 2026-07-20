# MUGnet News

MUGnet関連の公式ニュースを、複数のWebサイトおよび外部サービスから共通利用するための公開ニュースデータ基盤です。

ニュースは1記事1 Markdownで管理し、GitHub Actionsによって静的JSON、作品別JSON、RSS 2.0へ変換してGitHub Pagesから配信します。

主な利用先は次のとおりです。

- MUGnet公式サイト
- Zakinuポートフォリオ
- MUGnet Music Label
- 各作品の公式サイト
- RSSリーダー
- Discord、Slack、Zapier、IFTTT等の外部連携
- AIを利用したニュース確認・整理・追加支援

ブラウザからGitHub APIや`raw.githubusercontent.com`へ直接接続する必要はありません。

## 目的

このリポジトリは、MUGnet関連の公式発表を一元管理し、同じ情報を複数のサイトへ安全かつ一貫して配信することを目的としています。

各サイトが個別にニュースを手入力するのではなく、Markdownを単一の情報源として管理し、サイト別・作品別のJSONおよびRSSを自動生成します。

また、AIによる定期的な公開情報の確認を想定しています。

AIはMUGnet公式サイト、公式X、BOOTH、MUGnet Music Label、作品公式サイト、公開GitHubリポジトリ、外部メディア等を確認し、既存データに未掲載の可能性が高いニュース候補を提示します。

候補の確認・承認は人間が行い、承認後に専用ブランチとDraft Pull Requestを使って追加します。

AIが候補の発見だけを根拠に、無断で公開データを変更したり、`main`へ直接push・マージしたりする運用は想定していません。

## 情報の流れ

```text
公式サイト・公式X・BOOTH・外部メディア等
                  ↓
       AIによる定期確認と候補抽出
                  ↓
             人間による承認
                  ↓
       content/news/*.mdへ記事追加
                  ↓
             npm run build
                  ↓
       JSON・RSS・作品別データ生成
                  ↓
       npm run checkによる整合性確認
                  ↓
             Draft Pull Request
                  ↓
              人間がマージ
                  ↓
      GitHub Pagesへ自動デプロイ

情報の正本

ニュースデータの正本は次のMarkdownです。

content/news/*.md

public/data/news/以下のJSONおよびRSS/XMLは、Markdownから生成される公開用データです。

原則として生成済みJSONやRSSを直接編集しないでください。記事を変更した場合は、Markdownを修正したうえでnpm run buildを実行します。

公開URL

Web

トップ：
https://zakinu.github.io/MUGnet-News/


サイト別JSON

MUGnet：
https://zakinu.github.io/MUGnet-News/data/news/mugnet.json

Music Label：
https://zakinu.github.io/MUGnet-News/data/news/music.json

Zakinu：
https://zakinu.github.io/MUGnet-News/data/news/zakinu.json

全記事：
https://zakinu.github.io/MUGnet-News/data/news/all.json


作品別JSON

Journey to die：
https://zakinu.github.io/MUGnet-News/data/news/works/journey-to-die.json

梵天世界の壊し方：
https://zakinu.github.io/MUGnet-News/data/news/works/bonten.json


JSON形式

サイト別JSONは、主に次のプロパティを持ちます。

schemaVersion

site

articles


各記事は主に次のプロパティを持ちます。

id

date

title

summary

body

category

linkUrl

linkText

external

featured

sites

works


作品別JSONは、主に次のプロパティを持ちます。

schemaVersion

表示名を含むwork

articles


既存のサイト別JSON形式との互換性を維持しながら、作品単位で抽出するためのworksを追加しています。

掲載先と作品タグ

sitesとworksは異なる役割を持ちます。

sites：どのWebサイトへ掲載するか

works：どの作品に関係するか


例：

sites: [mugnet]
works: [bonten]

これは、MUGnet公式サイトへ掲載し、「梵天世界の壊し方」に関連する記事であることを示します。

MUGnet全体の運営告知など、特定作品に属さない記事は空配列にします。

sites: [mugnet]
works: []

作品サイトへ表示するために作品IDをsitesへ混在させないでください。

作品タグ

作品IDと表示名はconfig/news-works.jsonで管理します。

現在の作品IDは次のとおりです。

journey-to-die：Journey to die

bonten：梵天世界の壊し方


全記事でworksは必須です。

作品に関係する記事は固定IDを配列へ指定し、作品非依存の記事は空配列にします。

作品を追加するときは、先にconfig/news-works.jsonへIDと表示名を追加してから記事へタグ付けします。

表示名をそのまま識別子として使用せず、URLや機械処理に適した固定IDを使用してください。

ニュースを追加する

mainへ直接commitせず、専用ブランチとDraft Pull Requestを使用します。

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

git status
git diff --check

git add content/news public
git commit -m "お知らせを追加"
git push -u origin news/2026-07-20-example

gh pr create --draft --fill

対話入力を使わず、次の引数も指定できます。

--date

--category

--summary

--external-url

--link-text

--body


掲載先には次の値を使用します。

mugnet

music

zakinu


--worksはカンマ区切りで指定します。

作品非依存の記事では、空の作品指定を使用します。

--works=

記事追加後は、Markdownだけでなく、npm run buildで生成されたJSONおよびRSS/XMLも同じPull Requestへ含めてください。

Markdownだけをcommitすると、生成済みデータとの不一致によりCIが失敗します。

AIによる定期確認

このリポジトリは、ChatGPT等のAIを使った定期的なニュース確認を想定しています。

確認対象の例：

MUGnet公式サイト

MUGnet公式X

MUGnet公式BOOTH

MUGnet Music Label

各作品の公式サイト

MUGnet関連の公開GitHubリポジトリ

プレスリリース配信サイト

外部メディア

その他のMUGnet名義による公式発表


AIは公開済みのall.json等と照合し、未掲載の可能性が高い候補だけを提示します。

候補には、原則として次の情報を含めます。

推定公開日

タイトル案

概要案

カテゴリ

根拠となるURL

掲載対象sites

関連作品works

既存記事と重複していない理由

確信度


次の内容は原則として候補から除外します。

単なるサイト内部修正

誤字修正

sitemapや更新日時だけの変化

曖昧な予告

未確認情報

非公開情報

内部人事

既存記事と実質的に同一の内容


候補が提示された後、人間が「承認」または候補番号を指定して承認します。

承認後も、AIは次の手順を省略してはいけません。

1. mainを最新化


2. 専用ブランチを作成


3. 重複を再確認


4. Markdownを追加


5. npm run build


6. 生成済みJSON・RSSを差分へ含める


7. npm run check


8. git diff --check


9. commit・push


10. Draft Pull Requestを作成


11. CI結果を確認



AIはmainへ直接pushまたはマージしません。

RSS

サイト別および作品別のRSS 2.0を配信します。

記事URLは絶対URLへ正規化され、guidには変更されにくい記事IDを使用します。

サイト別RSS

全記事：
https://zakinu.github.io/MUGnet-News/feed.xml

MUGnet：
https://zakinu.github.io/MUGnet-News/mugnet.xml

Music Label：
https://zakinu.github.io/MUGnet-News/music.xml

Zakinu：
https://zakinu.github.io/MUGnet-News/zakinu.xml


作品別RSS

Journey to die：
https://zakinu.github.io/MUGnet-News/works/journey-to-die.xml

梵天世界の壊し方：
https://zakinu.github.io/MUGnet-News/works/bonten.xml


RSSは次のようなサービスから利用できます。

Feedly

Inoreader

DiscordのRSS Bot

SlackのRSS連携

Zapier

IFTTT

RSS対応の投稿・通知ツール


取得例

作品別JSON

const response = await fetch(
  'https://zakinu.github.io/MUGnet-News/data/news/works/bonten.json'
);

if (!response.ok) {
  throw new Error(`Work news feed: ${response.status}`);
}

const feed = await response.json();

サイト別JSON

const response = await fetch(
  'https://zakinu.github.io/MUGnet-News/data/news/mugnet.json'
);

if (!response.ok) {
  throw new Error(`News feed: ${response.status}`);
}

const feed = await response.json();

検証内容

npm run checkで主に次を確認します。

必須項目

YYYY-MM-DD形式の実在する日付

ファイル名と記事IDの一致

重複ID

未定義または重複した掲載先

worksの省略

未定義作品ID

作品IDの重複

危険なURL

外部URLとサイト内URLの混在

生HTML

公開リポジトリへの下書き混入

生成済みJSONがMarkdownと一致していること

JSONとRSSの記事集合が一致していること

JSONとRSSの並び順が一致していること

XML特殊文字が適切にエスケープされていること

RSSのリンクが絶対URLであること


検証で問題が見つかった場合は、エラーを握り潰して公開するのではなく、元のMarkdownまたは設定を修正してください。

既存サイトから取得する

表示時に、JSON由来の文字列をinnerHTMLへ直接渡さないでください。

本文、タイトル、概要等にはtextContentを使用し、リンクは次のいずれかだけを許可します。

http:

https:

安全なサイト内パス


実装例はexamples/news-feed-client.jsにあります。

次の2ファイルを各サイトへコピーし、初期化スクリプトをtype="module"で読み込みます。

MUGnet：news-feed-client.jsとmugnet.js

Music Label：news-feed-client.jsとmusic.js

Zakinu：news-feed-client.jsとzakinu.js


<div class="news-container" data-news-site="mugnet">
  <p class="news-fallback">
    最新情報は公式Xでもご案内しています。
  </p>
</div>

<script type="module" src="mugnet.js"></script>

取得に成功した場合だけ、コンテナをJSONの内容へ置き換えます。

次の場合は、あらかじめHTMLへ埋め込んだフォールバック内容を残します。

タイムアウト

HTTPエラー

不正なJSON

想定外のスキーマ

通信不能


埋め込み内容がない場合は、エラーメッセージをtextContentで表示します。

既存サイトのカード用CSSはそのまま利用できます。クラス名が異なる場合は、createCard()内のクラス名だけを各サイト側へ合わせてください。

公開リポジトリで扱わない情報

このリポジトリは公開されています。

次の情報をcommitしないでください。

未発表のニュース

公開前の作品情報

APIキー

アクセストークン

Cookie

認証情報

個人情報

内部人事

非公開URL

契約情報

公開前のプレスリリース

その他の機密情報


published: falseを設定しても、公開GitHubリポジトリへcommitした時点でファイル自体は閲覧可能になります。

そのため、下書きはローカル環境または非公開の場所で管理し、公開可能になってからPull Requestを作成してください。

GitHub Pages

.github/workflows/pages.ymlがmainへのpushを検知し、public/をGitHub Pagesへ自動公開します。

Pull Requestをマージした場合も、mainへのpushとしてデプロイが開始されます。

必要な場合は、GitHub Actions画面から手動実行できます。

GitHub側では次の設定を使用します。

Repository settings
└─ Pages
   └─ Build and deployment
      └─ Source: GitHub Actions

公開処理に追加のAPIキーやSecretsは不要です。

開発用コマンド

# 新しい記事の作成
npm run add

# JSON・RSS等の生成
npm run build

# スキーマ、記事、生成物の検証
npm run check

Pull Requestを作成する前に、少なくとも次を実行してください。

npm run build
npm run check
git diff --check
git status

ライセンスと利用

ニュース本文、作品名、ロゴ、画像、その他のコンテンツに関する権利は、それぞれの権利者に帰属します。

JSONおよびRSSの公開は、内容の著作権放棄を意味しません。

外部サービスから利用する場合は、記事タイトル、概要、公開日、公式リンク等を適切に表示し、内容を誤認させる改変や、公式発表と誤認される再配布を行わないでください。