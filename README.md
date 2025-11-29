# AirGuard Admin SDK

Firebase Admin SDK を使用して AirGuard アプリの管理操作を行うための SDK です。

## 🚀 機能

- **ユーザー管理**: スーパーユーザーのリスト表示、ユーザークレーム表示、メールアドレスから UID 取得
- **クレーム管理**: スーパーユーザー・デベロッパークレームの設定・削除
- **システム管理**: メンテナンスモードの制御、システム設定管理
- **会社管理**: 会社情報表示、ユーザー一覧、会社データ一括削除
- **バックアップ・リストア**: 会社データの完全バックアップと復元（⭐ NEW）
- **環境対応**: Emulator・Dev・Prod 環境の切り替え対応
- **CLI**: 統一されたコマンドラインインターフェース
- **プログラマティック API**: 他のプロジェクトから直接使用可能

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

# 環境を指定してコマンド実行
npm run cli:emulator users list    # Emulator環境（安全）
npm run cli:dev users list          # Dev環境
npm run cli:prod users list         # Prod環境（将来実装）
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
npm run cli:emulator users list                    # スーパーユーザー一覧
npm run cli:emulator users view <uid>              # ユーザー情報表示
npm run cli:emulator users get-uid <email>         # メールからUID取得
```

#### 🏷️ クレーム管理

```bash
npm run cli:emulator claims set-superuser <uid>    # スーパーユーザー設定
npm run cli:emulator claims remove-superuser <uid> # スーパーユーザー削除
npm run cli:emulator claims set-developer <uid>    # デベロッパー設定
npm run cli:emulator claims remove-developer <uid> # デベロッパー削除
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
npm run cli:emulator companies delete <companyId>  # 会社データ一括削除（⚠️危険）
npm run cli:emulator companies delete <companyId> --force  # 確認スキップ
```

#### 💾 バックアップ・リストア（⭐ NEW）

```bash
npm run cli:emulator backup company <companyId>    # 会社データをバックアップ
npm run cli:emulator backup restore <companyId>    # インタラクティブリストア
npm run cli:emulator backup restore <companyId> -f <file>  # ファイル指定リストア
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
    await sdk.listSuperUsers();
    await sdk.viewUserClaims("user-uid");
    await sdk.getUidByEmail("user@example.com");

    // クレーム管理
    await sdk.setSuperUserClaim("user@example.com");
    await sdk.setDeveloperClaim("user-uid");

    // システム管理
    await sdk.getMaintenanceStatus();
    await sdk.enableMaintenance();

    // 会社管理
    await sdk.getCompanyInfo("company-id-123");
    await sdk.listCompanyUsers("company-id-123");
    await sdk.deleteCompany("company-id-123");

    // バックアップ・リストア（⭐ NEW）
    await sdk.backupCompany("company-id-123");
    await sdk.restoreCompany(
      "./backups/companies/company-id-123/backup_2025-11-29_15-17-21.json"
    );
    await sdk.restoreCompanyInteractive("company-id-123");

    // 環境切り替え
    sdk.setEnvironment("dev");
    await sdk.listSuperUsers();
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
    await users.listSuperUsers(options);
    await users.getUidByEmail("user@example.com", options);

    // クレーム管理
    await claims.setSuperUserClaim("user-uid", options);

    // システム管理
    await system.enableMaintenance(options);

    // 会社管理
    await companies.getCompanyInfo("company-id-123", options);
    await companies.deleteCompany("company-id-123", options);

    // バックアップ・リストア（⭐ NEW）
    await backup.backupCompany("company-id-123", options);
    await backup.restoreCompany(
      "./backups/companies/company-id-123/backup_2025-11-29_15-17-21.json",
      options
    );
    await backup.listBackups("company-id-123", options);
  } catch (error) {
    console.error("Error:", error.message);
  }
}
```

### 💾 バックアップ・リストア機能（⭐ NEW）

#### 概要

会社データ（Firestore ドキュメント + Authentication ユーザー）を完全にバックアップし、後から復元できます。

#### バックアップ対象

会社ドキュメント: Companies/{companyId}
全サブコレクション: 14 コレクション（Customers, Employees, Users, etc.）
Authentication ユーザー: メタデータ、カスタムクレーム
バックアップファイル
保存先: ./backups/companies/{companyId}/
ファイル名: backup_YYYY-MM-DD_HH-MM-SS.json（JST）
フォーマット: JSON（Timestamp は ISO 文字列に変換）

#### リストア動作

⚠️ 完全置換モード: リストア実行時、既存データは全て削除され、バックアップ時点のデータで完全に置き換えられます。

1. 既存の Firestore サブコレクションを全削除
2. 既存の Authentication ユーザーを全削除
3. バックアップデータで復元
4. 仮パスワード生成（ユーザーにパスワードリセット依頼が必要）

##### 使用例

```bash
# バックアップ作成
npm run cli:emulator backup company Qa1JpI7dLMjIXeW3lB2m

# インタラクティブリストア（ファイル選択）
npm run cli:emulator backup restore Qa1JpI7dLMjIXeW3lB2m

# ファイル指定リストア
npm run cli:emulator backup restore Qa1JpI7dLMjIXeW3lB2m -f ./backups/companies/Qa1JpI7dLMjIXeW3lB2m/backup_2025-11-29_15-17-21.json

# バックアップ一覧
npm run cli:emulator backup list
npm run cli:emulator backup list Qa1JpI7dLMjIXeW3lB2m
```

##### 従業な注意事項

- データの完全置換: バックアップ取得後に追加したデータもリストア時に削除される
- 仮パスワード: リストアした Authentication ユーザーには仮パスワードが設定される
- UID 保持: 元の UID が保持されるため、データの参照関係は維持される
- タイムスタンプ: JST（日本標準時）でファイル名が生成される

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

- **完全置換**: リストアは既存データを完全に削除して置き換える
- **仮パスワード**: リストア後、ユーザーはパスワードリセットが必要
- **定期バックアップ**: 重要な操作前には必ずバックアップを取得
- **バックアップ管理**: 古いバックアップファイルの定期的な整理を推奨

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
   const COMPANY_SUBCOLLECTIONS = [
     "ArrangementNotifications",
     "Autonumbers",
     // ... 既存のコレクション
     "NewCollection", // 新しいコレクションを追加
   ];
   ```

### テスト

```bash
# CLIテスト
npm run cli -- --help

# Emulator環境でのテスト（推奨 - 安全）
npm run cli:emulator users list
npm run cli:emulator system status
npm run cli:emulator companies info <companyId>

# Dev環境でのテスト
npm run cli:dev users list
npm run cli:dev system status

# 本番環境テスト（注意して実行）
npm run cli:prod users list
npm run cli:prod system status
```

詳細なテスト手順とワークフローは **[COMMANDS.md](./COMMANDS.md)** をご覧ください。

## 📜 ライセンス

ISC

---

**📖 詳細なドキュメント**: [COMMANDS.md](./COMMANDS.md)  
**🐛 問題報告**: GitHub Issues  
**💬 質問・相談**: GitHub Discussions
