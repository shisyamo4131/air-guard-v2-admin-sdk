# AirGuard Admin SDK - コマンドリファレンス

このドキュメントでは、AirGuard Admin SDK の全ての CLI コマンドを詳しく説明します。

## 📋 コマンド一覧

### 🔍 ユーザー管理 (Users)

| コマンド                | 説明                            | 引数                    |
| ----------------------- | ------------------------------- | ----------------------- |
| `users list`            | スーパーユーザー一覧表示        | なし                    |
| `users view <uid>`      | 指定 UID のユーザークレーム表示 | `uid`: ユーザー ID      |
| `users get-uid <email>` | メールアドレスから UID 取得     | `email`: メールアドレス |

### 🏷️ クレーム管理 (Claims)

| コマンド                        | 説明                         | 引数               |
| ------------------------------- | ---------------------------- | ------------------ |
| `claims set-superuser <uid>`    | スーパーユーザークレーム設定 | `uid`: ユーザー ID |
| `claims remove-superuser <uid>` | スーパーユーザークレーム削除 | `uid`: ユーザー ID |
| `claims set-developer <uid>`    | デベロッパークレーム設定     | `uid`: ユーザー ID |
| `claims remove-developer <uid>` | デベロッパークレーム削除     | `uid`: ユーザー ID |

### ⚙️ システム管理 (System)

| コマンド                    | 説明                 | 引数 |
| --------------------------- | -------------------- | ---- |
| `system status`             | システム状態表示     | なし |
| `system maintenance-on`     | メンテナンス有効化   | なし |
| `system maintenance-off`    | メンテナンス無効化   | なし |
| `system maintenance-toggle` | メンテナンス切り替え | なし |
| `system init`               | システム初期化       | なし |

### 🏢 会社管理 (Companies)

| コマンド                       | 説明                                      | 引数                 |
| ------------------------------ | ----------------------------------------- | -------------------- |
| `companies info <companyId>`   | 会社情報を表示                            | `companyId`: 会社 ID |
| `companies users <companyId>`  | 会社に紐づくユーザー一覧を表示            | `companyId`: 会社 ID |
| `companies delete <companyId>` | 会社とすべての関連データを削除（⚠️ 危険） | `companyId`: 会社 ID |
|                                | オプション: `-f, --force` 確認スキップ    | `companyId`: 会社 ID |

### 💾 バックアップ・リストア (Backup)（⭐ NEW）

| コマンド                     | 説明                                                    | 引数                                   |
| ---------------------------- | ------------------------------------------------------- | -------------------------------------- |
| `backup company <companyId>` | 会社データをバックアップ                                | `companyId`: 会社 ID                   |
|                              | オプション: `-o, --output` 出力先指定                   |                                        |
| `backup restore <companyId>` | インタラクティブリストア（ファイル選択）                | `companyId`: 会社 ID                   |
|                              | オプション: `-f, --file` ファイル指定                   |                                        |
|                              | オプション: `-o, --output` バックアップディレクトリ指定 |                                        |
| `backup list [companyId]`    | バックアップ一覧表示                                    | `companyId`: 会社 ID（省略時は全会社） |
|                              | オプション: `-o, --output` バックアップディレクトリ指定 |                                        |

## 🌟 基本的な使用方法

### 専用スクリプトを使用（推奨）

```bash
# 本番環境
npm run cli <command>

# エミュレーター環境
npm run cli:emulator <command>
```

### 直接実行

```bash
# 本番環境
node src/cli.js <command>

# エミュレーター環境
node src/cli.js --env emulator <command>
```

## 📖 詳細な使用例

### ユーザー管理

#### スーパーユーザー一覧表示

```bash
# 本番環境でスーパーユーザーを一覧表示
npm run cli users list
node src/cli.js users list

# エミュレーター環境でスーパーユーザーを一覧表示
npm run cli:emulator users list
node src/cli.js --env emulator users list
```

#### ユーザークレーム表示

```bash
# 指定UIDのユーザークレームを表示
npm run cli users view abc123def456
npm run cli:emulator users view abc123def456

# 直接実行
node src/cli.js users view abc123def456
node src/cli.js --env emulator users view abc123def456
```

#### メールアドレスから UID 取得

```bash
# メールアドレスからUIDを取得
npm run cli users get-uid user@example.com
npm run cli:emulator users get-uid test@local.com

# 直接実行
node src/cli.js users get-uid user@example.com
node src/cli.js --env emulator users get-uid test@local.com
```

**出力例:**

```
📧 メールアドレス: user@example.com
🔍 UIDを検索中...
✅ ユーザーが見つかりました:
🆔 UID: abc123def456ghi789
👤 表示名: 田中太郎
📬 メール認証: ✅ 済み
🚫 アカウント状態: ✅ 有効
🏷️ カスタムクレーム:
   superUser: true
   developer: false

📋 コピー用UID:
abc123def456ghi789
```

### クレーム管理

#### スーパーユーザークレーム設定

```bash
# スーパーユーザークレームを設定
npm run cli claims set-superuser abc123def456
npm run cli:emulator claims set-superuser abc123def456

# 直接実行
node src/cli.js claims set-superuser abc123def456
node src/cli.js --env emulator claims set-superuser abc123def456
```

#### スーパーユーザークレーム削除

```bash
# スーパーユーザークレームを削除
npm run cli claims remove-superuser abc123def456
npm run cli:emulator claims remove-superuser abc123def456
```

#### デベロッパークレーム設定

```bash
# デベロッパークレームを設定
npm run cli claims set-developer abc123def456
npm run cli:emulator claims set-developer abc123def456
```

#### デベロッパークレーム削除

```bash
# デベロッパークレームを削除
npm run cli claims remove-developer abc123def456
npm run cli:emulator claims remove-developer abc123def456
```

### システム管理

#### システム状態確認

```bash
# システムの現在の状態を確認
npm run cli system status
npm run cli:emulator system status

# 直接実行
node src/cli.js system status
node src/cli.js --env emulator system status
```

**出力例:**

```
🔌 Connecting to Firebase Emulator:
   - AUTH: localhost:9099
   - FIRESTORE: localhost:8080

システムのメンテナンス状態を取得しています...
📊 現在のメンテナンス状態: ✅ 稼働中
📅 最終更新: 2025/10/2 13:17:43
```

#### メンテナンスモード制御

```bash
# メンテナンスモードを有効化
npm run cli system maintenance-on
npm run cli:emulator system maintenance-on

# メンテナンスモードを無効化
npm run cli system maintenance-off
npm run cli:emulator system maintenance-off

# メンテナンスモードを切り替え
npm run cli system maintenance-toggle
npm run cli:emulator system maintenance-toggle
```

#### システム初期化

```bash
# システムドキュメントを初期化
npm run cli system init
npm run cli:emulator system init
```

### 会社管理

#### 会社情報の表示

```bash
# 会社情報を表示
npm run cli companies info company-id-123
npm run cli:emulator companies info company-id-123

# 直接実行
node src/cli.js companies info company-id-123
node src/cli.js --env emulator companies info company-id-123
```

#### 会社ユーザーの一覧

```bash
# 会社に紐づくユーザー一覧を表示
npm run cli:dev companies users company-id-123
npm run cli:emulator companies users company-id-123
```

#### 会社データの削除

```bash
# 会社データを削除（確認あり）
npm run cli:emulator companies delete company-id-123

# 会社データを強制削除（確認スキップ）
npm run cli:emulator companies delete company-id-123 --force
```

#### バックアップ・リストア

```bash
# 会社データをバックアップ
npm run cli:emulator backup company Qa1JpI7dLMjIXeW3lB2m
npm run cli:dev backup company Qa1JpI7dLMjIXeW3lB2m

# 出力先を指定してバックアップ
npm run cli:emulator backup company Qa1JpI7dLMjIXeW3lB2m -o ./custom-backups
```

##### 出力例

🔧 バックアップを開始します
📂 出力先: ./backups/companies/Qa1JpI7dLMjIXeW3lB2m/backup_2025-11-29_15-17-21.json

📦 会社データを収集しています... (ID: Qa1JpI7dLMjIXeW3lB2m)
📄 会社ドキュメントを取得中...
✅ 会社: 株式会社唯心

📚 サブコレクションを取得中...
✅ Customers: 15 ドキュメント
✅ Employees: 8 ドキュメント
✅ Users: 2 ドキュメント
⏭️ ArrangementNotifications: ドキュメントなし

👥 Authentication ユーザー情報を取得中...
✅ m-kaneko@yuisin.net (UID: GmYhoVNJNrKRV2TL188yl1SDcS6K)
✅ maruyama@yuisin.net (UID: OhAPJ75W0KdE3LtL4lpFVPRw6EvZ)

✅ バックアップが完了しました！
📄 ファイル: ./backups/companies/Qa1JpI7dLMjIXeW3lB2m/backup_2025-11-29_15-17-21.json
📊 ファイルサイズ: 45.23 KB

📈 バックアップ統計:

- 会社名: 株式会社唯心
- 総ドキュメント数: 43
- Authentication ユーザー数: 2
- コレクション数: 6

#### インタラクティブリストア

```bash
# バックアップファイルを選択してリストア
npm run cli:emulator backup restore Qa1JpI7dLMjIXeW3lB2m
npm run cli:dev backup restore Qa1JpI7dLMjIXeW3lB2m
```

📋 会社 Qa1JpI7dLMjIXeW3lB2m のバックアップを検索中...

? リストアするバックアップファイルを選択してください: (Use arrow keys)
❯ backup_2025-11-29_15-17-21.json - 2025/11/29 15:17:21 (43 ドキュメント, 2 ユーザー)
backup_2025-11-28_10-30-15.json - 2025/11/28 10:30:15 (40 ドキュメント, 2 ユーザー)
backup_2025-11-27_18-45-00.json - 2025/11/27 18:45:00 (38 ドキュメント, 1 ユーザー)

? このバックアップからリストアしますか？ (y/N)

#### ファイル指定リストア

```bash
# バックアップファイルを直接指定してリストア
npm run cli:emulator backup restore Qa1JpI7dLMjIXeW3lB2m -f ./backups/companies/Qa1JpI7dLMjIXeW3lB2m/backup_2025-11-29_15-17-21.json

# カスタムディレクトリからリストア
npm run cli:emulator backup restore Qa1JpI7dLMjIXeW3lB2m -f ./custom-backups/companies/Qa1JpI7dLMjIXeW3lB2m/backup_2025-11-29_15-17-21.json -o ./custom-backups
```

##### 出力例

🔧 リストアを開始します
📂 バックアップファイル: ./backups/companies/Qa1JpI7dLMjIXeW3lB2m/backup_2025-11-29_15-17-21.json

📖 バックアップファイルを読み込んでいます...

🏢 会社情報:

- 会社名: 株式会社唯心
- 会社 ID: Qa1JpI7dLMjIXeW3lB2m
- バックアップ日時: 2025/11/29 15:17:21

⚠️ 既存データの削除について:
リストアを実行すると、既存のデータは完全に置き換えられます。

既存データを削除してリストアしますか？ (yes/no): yes

🗑️ 既存データを削除中...
✅ Customers: 15 件削除
✅ Employees: 8 件削除
✅ Users: 2 件削除

🗑️ 既存 Authentication ユーザーを削除中...
✅ m-kaneko@yuisin.net を削除
✅ maruyama@yuisin.net を削除

📄 会社ドキュメントをリストア中...
✅ 会社ドキュメントを作成しました

📚 サブコレクションをリストア中...
📁 Customers (15 件)...
✅ Customers: 15 件リストア完了
📁 Employees (8 件)...
✅ Employees: 8 件リストア完了

👥 Authentication ユーザーをリストア中...
バックアップには 2 人のユーザーが含まれています
⚙️ m-kaneko@yuisin.net を作成中...
✅ m-kaneko@yuisin.net (仮パスワード: Temp1732855041abc123def!)
⚙️ maruyama@yuisin.net を作成中...
✅ maruyama@yuisin.net (仮パスワード: Temp1732855042xyz789ghi!)

📁 Users コレクションをリストア中...
✅ Users: 2 件リストア完了

✅ リストアが完了しました！

📈 リストア統計:

- 会社名: 株式会社唯心
- 総ドキュメント数: 43
- Authentication ユーザー数: 2/2

🔑 リストアしたユーザーの仮パスワード:

- m-kaneko@yuisin.net: Temp1732855041abc123def!
- maruyama@yuisin.net: Temp1732855042xyz789ghi!

⚠️ ユーザーにパスワードリセットを依頼してください。

#### バックアップ一覧の表示

```bash
# 全会社のバックアップ一覧
npm run cli:emulator backup list
npm run cli:dev backup list

# 特定会社のバックアップ一覧
npm run cli:emulator backup list Qa1JpI7dLMjIXeW3lB2m
npm run cli:dev backup list Qa1JpI7dLMjIXeW3lB2m

# カスタムディレクトリから一覧表示
npm run cli:emulator backup list -o ./custom-backups
```

##### 出力例

📋 バックアップ一覧を取得しています...

📊 バックアップが存在する会社 (3 社):

🏢 Qa1JpI7dLMjIXeW3lB2m
会社名: 株式会社唯心
バックアップ数: 5 件
最新: 2025/11/29 15:17:21

🏢 company-id-456
会社名: テスト株式会社
バックアップ数: 3 件
最新: 2025/11/28 10:30:15

🏢 company-id-789
会社名: サンプル企業
バックアップ数: 2 件
最新: 2025/11/27 18:45:00

##### 出力例（特定会社）

📋 バックアップ一覧を取得しています...

🏢 会社 Qa1JpI7dLMjIXeW3lB2m のバックアップ (5 件):

📄 backup_2025-11-29_15-17-21.json
日時: 2025/11/29 15:17:21
サイズ: 45.23 KB
ドキュメント数: 43
ユーザー数: 2

📄 backup_2025-11-28_10-30-15.json
日時: 2025/11/28 10:30:15
サイズ: 42.15 KB
ドキュメント数: 40
ユーザー数: 2

📄 backup_2025-11-27_18-45-00.json
日時: 2025/11/27 18:45:00
サイズ: 38.90 KB
ドキュメント数: 38
ユーザー数: 1

## 🔧 環境設定

### エミュレーター環境

- Firebase Auth/Firestore エミュレーターに接続
- デフォルト接続先:
  - AUTH: `localhost:9099`
  - FIRESTORE: `localhost:8080`
- 出力: `🔌 Connecting to Firebase Emulator:`

### 開発環境

- Firebase Admin SKD が開発プロジェクトに接続
- サービスアカウントキーが必要
- 出力: `☁️ Connecting to Development Firebase environment.`

### 本番環境

- Firebase Admin SDK が本番プロジェクトに接続
- サービスアカウントキーが必要
- 出力: `☁️ Connecting to Production Firebase environment.`

## 🚨 実行時の注意事項

### エミュレーター環境での実行

```bash
✅ エミュレーター環境では安全にテストできます
- 実際のデータに影響しません
- 開発・テスト用途に最適です
- Firebase エミュレーターの起動が必要です
```

### 開発/本番環境での実行

```bash
⚠️ Dev/Prod環境での実行時は十分注意してください
- ユーザークレームの変更は実際のユーザーに影響します
- メンテナンスモードの変更はアプリケーションに影響します
- リストアは既存データを完全に置き換えます
- 操作前に必ず確認を行ってください
```

### バックアップ・リストアの注意事項

```bash
⚠️ バックアップ・リストアの重要事項
- リストアは完全置換モード（既存データを全削除）
- バックアップ取得後に追加したデータもリストア時に削除される
- Authenticationユーザーには仮パスワードが設定される
- ユーザーにパスワードリセットの依頼が必要
- 重要な操作前には必ずバックアップを取得
- バックアップファイルには機密情報が含まれる
```

## 🆘 ヘルプの表示

```bash
# 全体のヘルプ
npm run cli -- --help
node src/cli.js --help

# 各カテゴリのヘルプ
npm run cli -- users --help
npm run cli -- claims --help
npm run cli -- system --help
npm run cli -- companies --help
npm run cli -- backup --help

# 直接実行
node src/cli.js users --help
node src/cli.js claims --help
node src/cli.js system --help
node src/cli.js companies --help
node src/cli.js backup --help
```

## 🔄 よく使用するワークフロー

### 新しいスーパーユーザーの設定

```bash
# 1. メールアドレスからUIDを取得
npm run cli users get-uid user@example.com

# 2. 取得したUIDでスーパーユーザークレームを設定
npm run cli claims set-superuser abc123def456

# 3. 設定されたクレームを確認
npm run cli users view abc123def456
```

### メンテナンスモードの管理

```bash
# 1. 現在の状態を確認
npm run cli system status

# 2. メンテナンスモードを有効化
npm run cli system maintenance-on

# 3. 状態を再確認
npm run cli system status

# 4. メンテナンスモードを無効化
npm run cli system maintenance-off
```

### エミュレーター環境でのテスト

```bash
# エミュレーター環境でテストユーザーを作成・管理
npm run cli:emulator users get-uid test@example.com
npm run cli:emulator claims set-superuser test-uid-123
npm run cli:emulator users view test-uid-123
npm run cli:emulator system maintenance-toggle
```

### Dev 環境の会社データリセット

```bash
# エミュレーター環境で会社データを完全リセット
# 1. 会社情報を確認
npm run cli:emulator companies info company-dev-123

# 2. ユーザー一覧を確認
npm run cli:emulator companies users company-dev-123

# 3. 会社データを削除（確認あり）
npm run cli:emulator companies delete company-dev-123

# または強制削除（確認スキップ）
npm run cli:emulator companies delete company-dev-123 --force
```

### バックアップ・リストアのワークフロー

#### 定期バックアップの取得

# 1. 現在の会社データをバックアップ

npm run cli:dev backup company Qa1JpI7dLMjIXeW3lB2m

# 2. バックアップ一覧で確認

npm run cli:dev backup list Qa1JpI7dLMjIXeW3lB2m

#### データ復旧の手順

# 1. バックアップ一覧を確認

npm run cli:dev backup list Qa1JpI7dLMjIXeW3lB2m

# 2. インタラクティブリストアでファイル選択

npm run cli:dev backup restore Qa1JpI7dLMjIXeW3lB2m

# 3. 確認して実行

# yes と入力して既存データを削除・リストア

# 4. リストア完了後、仮パスワードをユーザーに通知

# 出力された仮パスワードをユーザーに送信

#### 重要な変更前のバックアップ

# 1. 変更前にバックアップを取得

npm run cli:dev backup company Qa1JpI7dLMjIXeW3lB2m

# 2. 変更作業を実施

npm run cli:dev companies delete some-data

# 3. 問題があればリストアで復旧

npm run cli:dev backup restore Qa1JpI7dLMjIXeW3lB2m -f ./backups/companies/Qa1JpI7dLMjIXeW3lB2m/backup_2025-11-29_15-17-21.json

#### Emulator 環境でのテスト復旧

# 1. Emulator 環境でバックアップ作成

npm run cli:emulator backup company test-company-id

# 2. データを変更（テスト）

npm run cli:emulator companies delete test-company-id --force

# 3. リストアでデータ復旧テスト

npm run cli:emulator backup restore test-company-id

# 4. 復旧確認

npm run cli:emulator companies info test-company-id
npm run cli:emulator companies users test-company-id

#### 環境間でのデータ移行（将来実装）

# Dev 環境からバックアップ取得

npm run cli:dev backup company Qa1JpI7dLMjIXeW3lB2m

# バックアップファイルをコピー

cp ./backups/companies/Qa1JpI7dLMjIXeW3lB2m/backup_2025-11-29_15-17-21.json ./migration/

# Prod 環境へリストア（将来実装）

# npm run cli:prod backup restore Qa1JpI7dLMjIXeW3lB2m -f ./migration/backup_2025-11-29_15-17-21.json

### バックアップファイルの構造

```json
{
  "backupDate": "2025-11-29T06:17:21.123Z",
  "companyId": "Qa1JpI7dLMjIXeW3lB2m",
  "company": {
    "companyName": "株式会社唯心",
    "createdAt": {
      "_timestamp": true,
      "value": "2025-01-15T02:30:00.000Z"
    }
    // ... その他の会社データ
  },
  "subCollections": {
    "Users": [
      {
        "docId": "GmYhoVNJNrKRV2TL188yl1SDcS6K",
        "data": {
          "email": "m-kaneko@yuisin.net",
          "isTemporary": false
          // ... その他のユーザーデータ
        }
      }
    ],
    "Customers": [
      // ... 顧客データ
    ]
    // ... その他のサブコレクション
  },
  "authUsers": [
    {
      "uid": "GmYhoVNJNrKRV2TL188yl1SDcS6K",
      "email": "m-kaneko@yuisin.net",
      "emailVerified": true,
      "displayName": "金子",
      "photoURL": "",
      "disabled": false,
      "metadata": {
        "creationTime": "Thu, 24 Oct 2024 23:30:15 GMT",
        "lastSignInTime": "Fri, 29 Nov 2024 06:15:30 GMT"
      },
      "customClaims": {
        "superUser": true
      }
    }
  ],
  "metadata": {
    "totalDocuments": 43,
    "totalAuthUsers": 2,
    "collections": ["Users", "Customers", "Employees", "WorkSites"]
  }
}
```

#### Timestamp の変換

- バックアップ時: Firestore Timestamp → {\_timestamp: true, value: "ISO 文字列"}
- リストア時: {\_timestamp: true, value: "ISO 文字列"} → Firestore Timestamp

この形式により、JSON 形式で保存しながらも、リストア時にタイムスタンプ型を正確に復元できます。
