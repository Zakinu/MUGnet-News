# Changelog

MUGnet Newsの公開形式、生成基盤、互換性および主要な配信機能の変更を記録します。通常の記事追加や軽微な文章修正は対象外です。

## Unreleased

### Changed

- 生成済みHTML、JSON、RSS、sitemap等をGit管理から外し、GitHub ActionsでクリーンビルドしてPagesへ直接デプロイ
- 手動管理する画像、Search Console認証ファイル等を`static/`へ分離
- Pull Requestの検証結果として生成済み`public/`をActions Artifactへ保存

### Compatibility

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
