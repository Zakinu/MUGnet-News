# Changelog

MUGnet Newsの公開形式、生成基盤、互換性および主要な配信機能の変更を記録します。通常の記事追加や軽微な文章修正は対象外です。

## Unreleased

### Added

- ニュース一覧と作品別一覧へ、キーワード、年、カテゴリ、掲載元、作品によるクライアント側検索・絞り込みを追加
- MUGnet News専用favicon、ブランドヘッダー、記事カード、モバイル対応スタイルを追加
- 検索条件をURLクエリへ反映し、共有・再読込できるように変更

### Changed

- 生成済みHTML、JSON、RSS、sitemap等をGit管理から外し、GitHub ActionsでクリーンビルドしてPagesへ直接デプロイ
- 手動管理する画像、Search Console認証ファイル等を`static/`へ分離
- Pull Requestの検証結果として生成済み`public/`をActions Artifactへ保存
- 一般閲覧用のニュース導線と、JSON・RSS等の開発者向け導線を視覚的に分離

### Compatibility

- 検索機能はJavaScriptによるプログレッシブエンハンスメントです。JavaScript無効時も全記事の静的HTMLを表示します。
- 公開URL、JSON形式、RSS形式、記事IDは変更しません。
- Gitリポジトリ内の生成物配置だけを変更します。

## schemaVersion 1 — 2026-07-20

### Added

- News、作品別News、Press & Interview、作品別PressのJSON Schemaを公開
- `schemaVersion`の運用、互換変更、破壊的変更、日付、欠損値、並び順を文書化
- 公開済みJSONをJSON Schemaで検証する自動テストを追加

### Compatibility

- 既存JSONのフィールド、値、並び順および公開URLは変更していません。
- フィード本体への`$schema`フィールド追加は行っていません。
