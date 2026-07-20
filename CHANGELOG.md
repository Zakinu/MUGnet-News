# Changelog

MUGnet Newsの公開形式、生成基盤、互換性および主要な配信機能の変更を記録します。通常の記事追加や軽微な文章修正は対象外です。

## Unreleased

現時点で予告済みの破壊的変更はありません。

## schemaVersion 1 — 2026-07-20

### Added

- News、作品別News、Press & Interview、作品別PressのJSON Schemaを公開
- `schemaVersion`の運用、互換変更、破壊的変更、日付、欠損値、並び順を文書化
- 公開済みJSONをJSON Schemaで検証する自動テストを追加

### Compatibility

- 既存JSONのフィールド、値、並び順および公開URLは変更していません。
- フィード本体への`$schema`フィールド追加は行っていません。
