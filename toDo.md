# ✅ 初期化処理（完了：2025-11-30）

## 実装内容

### 1. コレクション設定の構造化

- `COMPANY_SUBCOLLECTIONS`をオブジェクト配列に変更
- 各コレクションに`waitAfterClear`（初期化後待機時間）と`waitAfterRestore`（リストア後待機時間）を設定
- Cloud Functions 依存関係を考慮した処理順序を定義

### 2. 削除処理の実装

- **コマンド**: `companies delete <companyId>`
- 二重確認プロセス（yes/no + 会社 ID 入力）
- 処理順序: Authentication → サブコレクション → 会社ドキュメント
- Cloud Functions 待機時間を適用（Customers: 3000ms, OperationResults: 3000ms）

### 3. 動作確認

- ✅ DEV 環境で実運用テスト完了
- ✅ Cloud Functions 待機時間が正常に機能
- ✅ 二重確認プロセスが安全性を確保

# ✅ リストア（完了：2025-11-30）

## 実装内容

### 1. 差分ベースリストア（推奨）

- **コマンド**: `backup restore <companyId> --collections <コレクション名>`
- スナップショット取得 → 差分計算 → 変更分のみリストア
- added, modified, deleted のみ処理、unchanged はスキップ
- updatedAt タイムスタンプで変更検出
- Authentication/Users 自動除外
- メンテナンスモード必須
- Cloud Functions 待機時間適用

### 2. フルバックアップリストア（緊急用）

- **コマンド**: `backup restore-full <companyId> --collections <コレクション名>`
- バックアップファイルから全ドキュメント書き込み
- 差分データが利用できない場合の緊急復旧用
- Authentication/Users 自動除外
- メンテナンスモード必須

### 3. スナップショット + 差分計算

- **コマンド**: `backup snapshot <companyId>`
- 現在の状態を固定ファイル名で保存（上書き）
- 自動的に差分計算を実行
- 差分データを`temporary/companies/{companyId}/diff/`に出力

### 4. メンテナンスモード

- **コマンド**: `companies maintenance-on/off <companyId>`
- リストア時の排他制御
- maintenanceMode, maintenanceReason, maintenanceStartedAt/By を記録

### 5. 動作確認

- ✅ DEV 環境で実運用テスト完了
- ✅ 削除されたドキュメントの復元成功
- ✅ マージ型リストア（既存データに差分適用、削除なし）
- ✅ Cloud Functions 待機時間が正常に機能

## 設計方針（実装済み）

- BaaS の障害等で必要な完全復旧は Firebase 公式バックアップ・リストアを利用
- 会社個別のリストアに限定、コレクション単位で実行
- リストア前にスナップショット取得し、差分を確認
- マージ型リストア（既存データに差分を適用、削除なし）
- Authentication/Users は自動除外（安全性確保）

# ✅ バックアップ・リストア（完了：2025-11-29）

## 実装内容

### 1. ストレージ抽象化レイヤー

- `src/storage/StorageAdapter.js` - 抽象基底クラス
- `src/storage/LocalStorageAdapter.js` - ローカルファイルシステム
- `src/storage/FirebaseStorageAdapter.js` - Firebase Storage
- `src/storage/index.js` - ファクトリー関数
- 環境変数 `STORAGE_TYPE` で切り替え（`local` | `firebase`）

### 2. メタデータ管理

- バックアップファイル内にメタデータ構造（metadata + data）
- Firebase Storage customMetadata による高速取得
- companyId, companyName, timestamp, totalDocuments 等を記録

### 3. 動作確認

- ✅ backup company: 会社単位バックアップ作成
- ✅ backup list: メタデータ取得
- ✅ backup restore: 新旧形式両対応
- ✅ DEV 環境での実運用テスト完了（2025-11-30）

# ✅ Authentication/Users 整合性機能（完了：2025-11-30）

## 実装内容

### 1. ユーザーロール定義

- **Super User**: Admin SDK 利用可能、全機能アクセス
- **Company Admin**: アプリ内フルアクセス、Admin SDK 利用不可
- **Regular User**: アプリ内限定アクセス

### 2. ユーザー登録フロー

1. Company Admin が Users ドキュメント作成（isTemporary: true）
2. ユーザーがサインアップ → Authentication 作成
3. isTemporary: false に更新

### 3. 整合性検証（verify-users）

- **コマンド**: `companies verify-users <companyId>`
- isTemporary: true ユーザーを除外（登録進行中のため正常）
- Authentication 有・Users 無（Missing Users）を検出
- Users 有・Authentication 無（Orphaned Users）を検出
- companyId in customClaims 確認で安全性確保

### 4. 整合性修復（repair-users）

- **コマンド**: `companies repair-users <companyId>`
- Missing Users 問題のみ対応（Orphaned Users はアプリで対応）
- isAdmin: true アカウント存在確認（安全装置）
- Authentication 削除 → Company Admin が再招待
- companyId in customClaims 確認で安全性確保

### 5. SDK API 同期

- `AirGuardAdminSDK` クラスに全 CLI 機能を公開
- verifyCompanyUsers, repairCompanyUsers メソッド追加
- snapshotCompany, diffBackup, restoreDiff, restoreFull メソッド追加
- enableCompanyMaintenance, disableCompanyMaintenance メソッド追加
- 直接エクスポート（companies, backup 名前空間）も更新

### 6. ドキュメント更新

- README.md: ユーザーロール、登録フロー、整合性チェック説明追加
- COMMANDS.md: verify-users, repair-users の詳細ドキュメント追加
- 出力例、エラーケース、注意事項を明記

### 7. 動作確認

- ✅ DEV 環境で verify-users 動作確認
- ✅ isTemporary 除外ロジック正常動作
- ✅ repair-users による Authentication 削除確認
- ✅ SDK API メソッド公開確認

# 🔄 今後の拡張予定

### 1. リストア機能拡張

- [ ] `--from YYYY-MM-DD` オプション（日付フィルタ）
- [ ] `--dry-run` オプション（リストアプレビュー）

### 2. バッチ処理

- [ ] 複数会社の一括操作機能

### 3. パフォーマンス最適化

- [ ] 大規模データセット対応
- [ ] Firebase Storage 実環境テスト

### 4. テスト整備

- [ ] verify-users / repair-users のユニットテスト
- [ ] エッジケース網羅テスト
