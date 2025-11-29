# ✅ バックアップ・リストア（完了：2025-11-29）

## 実装内容

### 1. ストレージ抽象化レイヤー

抽象化レイヤーを導入し、保存先を設定で切り替え可能に実装済み。

**実装ファイル:**

- `src/storage/StorageAdapter.js` - 抽象基底クラス
- `src/storage/LocalStorageAdapter.js` - ローカルファイルシステム
- `src/storage/FirebaseStorageAdapter.js` - Firebase Storage
- `src/storage/index.js` - ファクトリー関数

**切り替え方法:**

- 環境変数 `STORAGE_TYPE` で指定（`local` | `firebase`）
- デフォルト: `local`

### 2. メタデータ管理

バックアップファイルにメタデータを含める実装完了。

**メタデータの二重保存:**

1. **JSON 内** (`metadata` + `data` 構造)
   - リストア時に使用
   - 後方互換性維持
2. **customMetadata**（Firebase Storage）
   - ダウンロード不要で高速取得
   - list 操作時のパフォーマンス向上

**メタデータ内容:**

- companyId, companyName
- timestamp（統一タイムスタンプ）
- totalDocuments, totalAuthUsers
- collections（カンマ区切り）
- savedAt, storage

### 3. 動作確認済み機能

- ✅ backup company: 新形式バックアップ作成
- ✅ backup all: 統一タイムスタンプ
- ✅ backup list: メタデータ高速取得
- ✅ backup restore: 新旧形式両対応
- ✅ backup restore-all: 全会社リストア

### 4. リリース準備完了

- ✅ 既存バックアップファイル全削除
- ✅ 後方互換性コード削除（シンプル化）
- ✅ メタデータ必須化

### 5. 今後の作業

- [ ] Firebase Storage 実環境テスト（バケット設定後）
- [ ] パフォーマンス測定（大量ファイル）
- [ ] COMMANDS.md/README.md 更新（STORAGE_TYPE 説明追加）
