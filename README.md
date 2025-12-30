# AirGuard Admin SDK

Firebase Admin SDK を使用して AirGuard アプリの管理操作を行うための SDK です。

## 🚀 機能

- **ユーザー管理**: メールアドレスから UID 取得 ✅（一覧表示・クレーム表示は 🚧 未実装）
- **クレーム管理**: スーパーユーザー・デベロッパークレームの設定・削除（🚧 未実装）
- **システム管理**: メンテナンスモードの制御、システム設定管理 ✅
- **会社管理**: 会社情報表示、ユーザー一覧、会社データ一括削除 ✅
- **バックアップ・リストア**: 会社データの完全バックアップと復元 ✅
- **データマイグレーション**: 一度きりのデータ構造変更処理 ✅
- **環境対応**: Emulator・Dev・Prod 環境の切り替え対応 ✅
- **CLI**: 統一されたコマンドラインインターフェース ✅
- **プログラマティック API**: 他のプロジェクトから直接使用可能 ✅

## 📁 プロジェクト構造

```
├── README.md # プロジェクト概要
├── COMMANDS.md # 詳細なコマンドリファレンス
├── package.json # npm設定と依存関係
├── .gitignore # Git除外設定
├── air-guard-v2-dev-firebase-adminsdk-fbsvc-f072726bf8.json # Dev環境の秘密鍵
├── air-guard-v2-prod-firebase-adminsdk-xxxxx.json # Prod環境の秘密鍵（将来追加）
├── backups/ # バックアップファイル保存先
│ └── companies/
│ └── {companyId}/
│ └── backup_YYYY-MM-DD_HH-MM-SS.json
└── src/
├── index.js # メインエクスポート（プログラマティック使用）
├── cli.js # CLIエントリーポイント
├── firebaseAdmin.js # Firebase Admin SDK設定（環境切り替え対応）
├── constants/
│ └── collections.js # コレクション名定数
└── commands/ # 機能モジュール
├── users.js # ユーザー管理機能
├── claims.js # クレーム管理機能
├── system.js # システム管理機能
├── companies.js # 会社管理機能
└── backup.js # バックアップ・リストア機能（⭐ NEW）
```

## 🛠️ インストール・セットアップ

```bash
# 依存関係のインストール
npm install

# Firebase Admin SDK サービスアカウントキーを配置
# Dev環境: [air-guard-v2-dev-firebase-adminsdk-fbsvc-f072726bf8.json](http://_vscodecontentref_/8)
# Prod環境: air-guard-v2-prod-firebase-adminsdk-xxxxx.json（将来追加）
```

### 🌍 環境について

この SDK は 3 つの環境をサポートしています：

1. 🧪 Emulator 環境（ローカルテスト）
   用途: 開発・テスト・デバッグ
   接続先: Firebase Emulator（localhost）
   秘密鍵: Dev 環境の秘密鍵を使用
   データ: ローカルのみ、実データに影響なし
   表示: 🔌 Connecting to Firebase Emulator:

```
npm run cli:emulator <command>
```

2. 🔧 Dev 環境（開発用 Firebase）
   用途: 開発・統合テスト・基盤構築
   接続先: Firebase 開発プロジェクト
   秘密鍵: air-guard-v2-dev-firebase-adminsdk-fbsvc-f072726bf8.json
   データ: 開発用データ
   表示: ☁️ Connecting to Development Firebase environment.

```
npm run cli:dev <command>
```

3. 🚀 Prod 環境（本番用 Firebase - 将来実装）
   用途: 本番運用
   接続先: Firebase 本番プロジェクト
   秘密鍵: air-guard-v2-prod-firebase-adminsdk-xxxxx.json（準備中）
   データ: 実際のユーザーデータ
   表示: ☁️ Connecting to Production Firebase environment.

```
npm run cli:prod <command>
```

環境切り替えの仕組み
firebaseAdmin.js が環境変数を元に自動的に適切な秘密鍵を選択します：

Emulator: FIREBASE_AUTH_EMULATOR_HOST または FIRESTORE_EMULATOR_HOST が設定されている場合
Dev: デフォルト、または FIREBASE_ENV=dev
Prod: FIREBASE_ENV=prod（将来実装）

## 💻 CLI 使用方法

### クイックスタート

```bash
# ヘルプを表示
npm run cli -- --help

# 環境を指定してコマンド実行（実装済みコマンド例）
npm run cli:emulator users get-uid test@example.com    # Emulator環境（安全）
npm run cli:dev system status                          # Dev環境
npm run cli:prod system status                         # Prod環境（将来実装）
```

```bash
# Emulator環境（開発・テスト - 推奨）
npm run cli:emulator system status
npm run cli:emulator companies info <companyId>

# Dev環境（開発用Firebase）
npm run cli:dev users list
npm run cli:dev system maintenance-on

# 直接実行
node src/cli.js --env emulator users list
node src/cli.js users list  # デフォルトはDev環境
```

### 🔗 詳細なコマンドリファレンス

**📋 [COMMANDS.md](./COMMANDS.md)** で全てのコマンドの詳細な使用方法と例を確認できます。

### 📋 主要コマンド

#### 👥 ユーザー管理

```bash
# npm run cli:emulator users list                    # 🚧 未実装
# npm run cli:emulator users view <uid>              # 🚧 未実装
npm run cli:emulator users get-uid <email>         # ✅ メールからUID取得
```

#### 🏷️ クレーム管理（🚧 全て未実装）

```bash
# npm run cli:emulator claims set-superuser <uid>    # 🚧 未実装
# npm run cli:emulator claims remove-superuser <uid> # 🚧 未実装
# npm run cli:emulator claims set-developer <uid>    # 🚧 未実装
# npm run cli:emulator claims remove-developer <uid> # 🚧 未実装
```

#### ⚙️ システム管理

```bash
npm run cli:emulator system status                 # システム状態確認
npm run cli:emulator system maintenance-on         # メンテナンス有効化
npm run cli:emulator system maintenance-off        # メンテナンス無効化
npm run cli:emulator system maintenance-toggle     # メンテナンス切り替え
npm run cli:emulator system init                   # システム初期化
```

#### 🏢 会社管理

```bash
npm run cli:emulator companies info <companyId>    # 会社情報表示
npm run cli:emulator companies users <companyId>   # 会社のユーザー一覧
npm run cli:emulator companies maintenance-on <companyId>   # メンテナンスモード有効化
npm run cli:emulator companies maintenance-off <companyId>  # メンテナンスモード無効化
npm run cli:emulator companies verify-users <companyId>     # Authentication/Users整合性検証
npm run cli:emulator companies repair-users <companyId>     # 欠損Usersドキュメント修復（Auth削除）
npm run cli:emulator companies delete <companyId>  # 会社データ一括削除（⚠️危険、二重確認）
```

#### 💾 バックアップ・リストア（⭐ NEW）

```bash
# 個別会社のバックアップ
npm run cli:emulator backup company <companyId>    # 会社データをバックアップ（タイムスタンプ付き）
npm run cli:emulator backup snapshot <companyId>   # スナップショット取得（差分自動計算）
npm run cli:emulator backup diff <companyId>       # 差分計算（スタンドアロン）

# リストア（メンテナンスモード必須）
npm run cli:emulator backup restore <companyId> --collections Customers Sites  # 差分ベースリストア（推奨）
npm run cli:emulator backup restore-full <companyId> --collections all        # フルバックアップリストア（緊急用）

# バックアップ一覧
npm run cli:emulator backup list                   # 全バックアップ一覧
npm run cli:emulator backup list <companyId>       # 会社のバックアップ一覧
```

詳細は COMMANDS.md をご覧ください。

## 🔧 プログラマティック使用

### クラス使用

```javascript
const { AirGuardAdminSDK } = require("air-guard-v2-admin-sdk");

const sdk = new AirGuardAdminSDK({ env: "emulator" });

async function example() {
  try {
    // ユーザー管理
    // await sdk.listSuperUsers(); // 🚧 未実装
    // await sdk.viewUserClaims("user-uid"); // 🚧 未実装
    await sdk.getUidByEmail("user@example.com"); // ✅ 実装済み

    // クレーム管理（🚧 全て未実装）
    // await sdk.setSuperUserClaim("user@example.com");
    // await sdk.setDeveloperClaim("user-uid");

    // システム管理（✅ 全て実装済み）
    await sdk.getMaintenanceStatus();
    await sdk.enableMaintenance();

    // 会社管理（✅ 全て実装済み）
    await sdk.getCompanyInfo("company-id-123");
    await sdk.listCompanyUsers("company-id-123");
    await sdk.enableCompanyMaintenance("company-id-123", "データリストア作業");
    await sdk.disableCompanyMaintenance("company-id-123");
    await sdk.verifyCompanyUsers("company-id-123");
    await sdk.repairCompanyUsers("company-id-123");
    await sdk.deleteCompany("company-id-123");

    // バックアップ・リストア（✅ 全て実装済み）
    await sdk.backupCompany("company-id-123");
    await sdk.snapshotCompany("company-id-123"); // スナップショット + 差分計算
    await sdk.diffBackup("company-id-123"); // 差分計算のみ
    await sdk.restoreDiff("company-id-123", ["Customers", "Sites"]); // 差分ベース
    await sdk.restoreFull("company-id-123", ["Customers"]); // フル（緊急用）
    await sdk.listBackups("company-id-123");

    // 環境切り替え
    sdk.setEnvironment("dev");
    // await sdk.listSuperUsers(); // 🚧 未実装
  } catch (error) {
    console.error("Error:", error.message);
  }
}
```

### 直接関数使用

```javascript
const { users, claims, system, companies } = require("air-guard-v2-admin-sdk");

async function example() {
  const options = { env: "emulator" };

  try {
    // ユーザー管理
    // await users.listSuperUsers(options); // 🚧 未実装
    await users.getUidByEmail("user@example.com", options); // ✅ 実装済み

    // クレーム管理（🚧 全て未実装）
    // await claims.setSuperUserClaim("user-uid", options);

    // システム管理（✅ 全て実装済み）
    await system.enableMaintenance(options);
    await system.getMaintenanceStatus(options);

    // 会社管理（✅ 全て実装済み）
    await companies.getCompanyInfo("company-id-123", options);
    await companies.enableMaintenanceMode("company-id-123", {
      ...options,
      reason: "データリストア作業",
    });
    await companies.disableMaintenanceMode("company-id-123", options);
    await companies.verifyUsers("company-id-123", options);
    await companies.repairUsers("company-id-123", options);
    await companies.deleteCompany("company-id-123", options);

    // バックアップ・リストア（✅ 全て実装済み）
    await backup.backupCompany("company-id-123", options);
    await backup.snapshotCompany("company-id-123", options);
    await backup.diffBackup("company-id-123", options);
    await backup.restoreDiff("company-id-123", ["Customers", "Sites"], options);
    await backup.restoreSelective("company-id-123", ["Customers"], options);
    await backup.listBackups("company-id-123", options);
  } catch (error) {
    console.error("Error:", error.message);
  }
}
```

### 💾 バックアップ・リストア機能（⭐ NEW）

#### 概要

会社データ（Firestore ドキュメント）のバックアップと、効率的な差分ベースリストアを提供します。

**主要機能:**

- 個別会社のバックアップ（タイムスタンプ付きファイル）
- スナップショット + 自動差分計算
- 差分ベースリストア（変更されたドキュメントのみ）
- フルバックアップリストア（緊急用、全ドキュメント）
- メンテナンスモードによる排他制御

#### バックアップ対象

- **会社ドキュメント**: `Companies/{companyId}`
- **サブコレクション**: 10 コレクション（Customers, Sites, Employees, Outsourcers, SiteOperationSchedules, OperationResults, Billings, ArrangementNotifications, Autonumbers, Users）
- **保存先**: `backups/companies/{companyId}/backup_YYYY-MM-DD_HH-MM-SS.json`（JST）
- **フォーマット**: JSON（Timestamp は ISO 文字列に変換）

#### スナップショットと差分

- **スナップショット**: 現在の状態を固定ファイル名で保存 (`temporary/companies/{companyId}/snapshot.json`)
- **差分計算**: スナップショットと最新バックアップを比較し、added/modified/deleted/unchanged を検出
- **差分データ**: `temporary/companies/{companyId}/diff/` に保存（summary.json + 各コレクション.json）
- **updatedAt 比較**: タイムスタンプで変更を検出（同じ ID でも更新されたドキュメントを識別）

#### リストア動作

**差分ベースリストア（推奨）:**

- データソース: `temporary/companies/{companyId}/diff/` の差分データ
- 処理: added（作成）、modified（更新）、deleted（復元）のみ、unchanged（スキップ）
- 効率: 変更されたドキュメントのみ処理
- 安全: Authentication/Users は自動除外

**フルバックアップリストア（緊急用）:**

- データソース: `backups/companies/{companyId}/backup_*.json`
- 処理: バックアップ内の全ドキュメントを書き込み
- 用途: 差分データが利用できない場合の緊急復旧
- 安全: Authentication/Users は自動除外

**共通の安全機能:**

1. メンテナンスモード必須（リストア前に有効化）
2. Authentication/Users コレクション自動除外
3. マージ型リストア（既存データに差分を適用、削除なし）
4. Cloud Functions 待機時間適用（依存関係を考慮）

##### 使用例

**基本ワークフロー:**

```bash
# 1. 定期バックアップ（タイムスタンプ付きファイル）
npm run cli:emulator backup company Qa1JpI7dLMjIXeW3lB2m

# 2. メンテナンスモード有効化
npm run cli:emulator companies maintenance-on Qa1JpI7dLMjIXeW3lB2m --reason "データリストア作業"

# 3. スナップショット取得（差分も自動計算）
npm run cli:emulator backup snapshot Qa1JpI7dLMjIXeW3lB2m

# 4. 差分ベースリストア（変更されたドキュメントのみ）
npm run cli:emulator backup restore Qa1JpI7dLMjIXeW3lB2m --collections Customers Sites

# 5. メンテナンスモード無効化
npm run cli:emulator companies maintenance-off Qa1JpI7dLMjIXeW3lB2m
```

**緊急時（フルバックアップリストア）:**

```bash
# メンテナンスモード有効化
npm run cli:emulator companies maintenance-on Qa1JpI7dLMjIXeW3lB2m --reason "緊急データ復旧"

# フルバックアップリストア（全ドキュメント）
npm run cli:emulator backup restore-full Qa1JpI7dLMjIXeW3lB2m --collections all

# メンテナンスモード無効化
npm run cli:emulator companies maintenance-off Qa1JpI7dLMjIXeW3lB2m
```

**バックアップ管理:**

```bash
# バックアップ一覧
npm run cli:emulator backup list
npm run cli:emulator backup list Qa1JpI7dLMjIXeW3lB2m

# 差分確認
cat temporary/companies/Qa1JpI7dLMjIXeW3lB2m/diff/summary.json
```

##### 重要な注意事項

- **マージ型リストア**: 既存データに差分を適用(既存データを削除しない)
- **メンテナンスモード必須**: リストア前に必ず有効化(排他制御)
- **Authentication/Users 除外**: 自動的にリストア対象から除外(安全性確保)
- **差分検出**: updatedAt タイムスタンプで変更を正確に検出
- **Cloud Functions 待機**: Customers/OperationResults は適切な待機時間を適用
- **タイムスタンプ形式**: JST(日本標準時)で `YYYY-MM-DD_HH-MM-SS` 形式
- **効率的な復旧**: 差分ベースリストアは変更されたドキュメントのみ処理

##### Authentication/Users の整合性について

**整合性検証機能**: 未実装（将来実装予定）

**用語定義:**

- **スーパーユーザー**: サービス提供側の管理者（Admin SDK 使用可能）
- **会社の Admin**: 各会社の管理者（アプリ上で自社データの全権限、Admin SDK 使用不可）
- **利用者**: 会社に所属する一般ユーザー
- **一時ユーザー**: `isTemporary: true`の Users ドキュメント（Authentication 未作成）

**ユーザー登録フロー:**

1. 会社の Admin がユーザー管理で Users ドキュメントを追加（`isTemporary: true`）
2. 利用者がサインアップで Authentication 作成後、`isTemporary: false`に更新

**整合性の問題と対処方法:**

1. **孤立 Users ドキュメント**（Authentication に存在しない UID）

   - **対処**: 会社の Admin がアプリ上で対象ユーザーを削除し、再作成
   - Users ドキュメント削除時、Cloud Functions の onDelete トリガーで Authentication 自動削除
   - 新規ユーザーとして招待・作成することで整合性を復旧

2. **欠損 Users ドキュメント**（Authentication は存在するが Users がない）
   - **症状**: ログイン可能だが権限情報が取得できず、アプリが正常動作しない
   - **検証**: `companies verify-users <companyId>` で整合性チェック（✅ 実装済み）
   - **修復**: `companies repair-users <companyId>` で Authentication アカウント削除（✅ 実装済み）
   - **前提条件**: `isAdmin: true`の管理者アカウントが存在すること（不在時は会社データ再構築が必要）
   - **後処理**: 会社の Admin に再招待依頼

**検証対象外:**

- `isTemporary: true`の Users ドキュメント（Authentication 未作成のため正常）

**注意**: リストアコマンドは Users コレクションと Authentication 情報を一切変更しないため、手動での整合性確保が必要です。

## 🐛 トラブルシューティング

### よくある問題

1. **Firebase 接続エラー**

   ```bash
   # サービスアカウントキーのパスを確認
   # firebaseAdmin.js内のパス設定を確認
   # 環境に応じた正しい秘密鍵が配置されているか確認
   ```

2. **エミュレーター接続エラー**

   ```bash
   # Firebaseエミュレーターが起動していることを確認
   firebase emulators:start --only auth,firestore

   # エミュレーターのポートを確認
   # AUTH: localhost:9099
   # FIRESTORE: localhost:8080
   ```

3. **権限エラー**

   ```bash
   # サービスアカウントに適切な権限があることを確認
   # 必要な権限:
   # - Firebase Authentication Admin
   # - Cloud Firestore Admin
   ```

4. **環境切り替えエラー**

   ```bash
   # 環境変数が正しく設定されているか確認
   echo $FIREBASE_ENV

   # 秘密鍵ファイルが存在するか確認
   ls -la air-guard-v2-*-firebase-adminsdk-*.json
   ```

5. **バックアップ・リストアエラー**

   ```bash
   # バックアップディレクトリの存在確認
   ls -la ./backups/companies/

   # バックアップファイルの整合性確認
   cat ./backups/companies/{companyId}/backup_*.json | jq .

   # inquirerバージョン確認（v8.2.5推奨）
   npm list inquirer
   ```

## ⚠️ 重要な注意事項

### セキュリティ

- **秘密鍵の管理**: `.gitignore`に秘密鍵を追加済み（`*-firebase-adminsdk-*.json`）
- **環境の分離**: 必ず適切な環境を選択してコマンド実行
- **本番環境**: Prod 環境での操作は特に慎重に

### データ削除

- **`companies delete`コマンド**: 取り消しできない操作
- **確認プロンプト**: デフォルトで確認あり、`--force`で強制実行可能
- **テスト推奨**: 必ず Emulator 環境でテストしてから Dev/Prod 環境で実行

### バックアップ・リストア

- **マージ型リストア**: 既存データに差分を適用（削除なし）
- **メンテナンスモード必須**: リストア前に必ず有効化
- **Authentication/Users 除外**: 自動的にリストア対象から除外
- **差分ベースリストア**: 変更されたドキュメントのみ処理（効率的）
- **フルバックアップリストア**: 緊急時用、全ドキュメント書き込み
- **定期バックアップ**: 重要な操作前には必ずバックアップを取得
- **バックアップ管理**: 古いバックアップファイルの定期的な整理を推奨
- **差分確認**: summary.json で変更内容を事前確認可能

### データ移行

- **⚠️ Admin SDK では対応不可**: データ移行機能は実装されていません
- **理由**: スキーマ検証やビジネスロジックを迂回するリスクが大きく、データ不整合の原因となります
- **推奨方法**: AirGuard アプリ側で一括登録 UI を実装し、クラスインスタンス経由で正規フローを通してデータを投入してください
- **Admin SDK の役割**: 運用・保守ツール（バックアップ、整合性チェック、メンテナンスモード制御等）に特化

### 環境の選択

```bash
# ✅ 開発・テスト: Emulator環境を使用（推奨）
npm run cli:emulator <command>

# ✅ 統合テスト・基盤構築: Dev環境を使用
npm run cli:dev <command>

# ⚠️ 本番運用: Prod環境を使用（将来実装、慎重に）
npm run cli:prod <command>
```

## 📝 開発

### 新機能追加の手順

1. `src/commands/` に新しいモジュールを追加
2. `src/cli.js` にコマンドを登録
3. `src/index.js` にプログラマティック API を追加
4. `COMMANDS.md` にドキュメントを追加

### サブコレクション追加の手順

会社に新しいサブコレクション（`Companies/{companyId}/NewCollection`）を追加する場合：

1. **定数ファイルの更新**: `src/constants/collections.js` の `COMPANY_SUBCOLLECTIONS` 配列に追加

   ```javascript
   export const COMPANY_SUBCOLLECTIONS = [
     // ... 既存のコレクション
     {
       name: "NewCollection",
       waitAfterClear: 0, // 初期化後の待機時間(ms)
       waitAfterRestore: 0, // リストア後の待機時間(ms)
       description: "新しいコレクションの説明",
     },
   ];
   ```

   **Cloud Functions トリガーがある場合**: `waitAfterClear`と`waitAfterRestore`に適切な待機時間を設定してください（コールドスタートを考慮して 3000 ～ 5000ms 推奨）

### テスト

```bash
# CLIテスト
npm run cli -- --help

# Emulator環境でのテスト（推奨 - 安全）
npm run cli:emulator users get-uid test@example.com  # ✅ 実装済み
npm run cli:emulator system status                   # ✅ 実装済み
npm run cli:emulator companies info <companyId>      # ✅ 実装済み
npm run cli:emulator backup company <companyId>      # ✅ 実装済み

# Dev環境でのテスト
npm run cli:dev users get-uid user@example.com       # ✅ 実装済み
npm run cli:dev system status                        # ✅ 実装済み

# 本番環境テスト（注意して実行）
# npm run cli:prod users get-uid user@example.com    # 将来実装
# npm run cli:prod system status                     # 将来実装
```

詳細なテスト手順とワークフローは **[COMMANDS.md](./COMMANDS.md)** をご覧ください。

## 📜 ライセンス

ISC

---

**📖 詳細なドキュメント**: [COMMANDS.md](./COMMANDS.md)  
**🐛 問題報告**: GitHub Issues  
**💬 質問・相談**: GitHub Discussions
