# AirGuard Admin SDK - コマンドリファレンス

このドキュメントでは、AirGuard Admin SDK の全ての CLI コマンドを詳しく説明します。

## 📋 コマンド一覧

### 🔍 ユーザー管理 (Users)

| コマンド                | 説明                            | 引数                    | 実装状況    |
| ----------------------- | ------------------------------- | ----------------------- | ----------- |
| `users list`            | スーパーユーザー一覧表示        | なし                    | 🚧 未実装   |
| `users view <uid>`      | 指定 UID のユーザークレーム表示 | `uid`: ユーザー ID      | 🚧 未実装   |
| `users get-uid <email>` | メールアドレスから UID 取得     | `email`: メールアドレス | ✅ 実装済み |

### 🏷️ クレーム管理 (Claims)

| コマンド                        | 説明                         | 引数               | 実装状況    |
| ------------------------------- | ---------------------------- | ------------------ | ----------- |
| `claims set-superuser <uid>`    | スーパーユーザークレーム設定 | `uid`: ユーザー ID | ✅ 実装済み |
| `claims remove-superuser <uid>` | スーパーユーザークレーム削除 | `uid`: ユーザー ID | ✅ 実装済み |
| `claims set-developer <uid>`    | デベロッパークレーム設定     | `uid`: ユーザー ID | ✅ 実装済み |
| `claims remove-developer <uid>` | デベロッパークレーム削除     | `uid`: ユーザー ID | ✅ 実装済み |

### ⚙️ システム管理 (System)

| コマンド                    | 説明                 | 引数 | 実装状況    |
| --------------------------- | -------------------- | ---- | ----------- |
| `system status`             | システム状態表示     | なし | ✅ 実装済み |
| `system maintenance-on`     | メンテナンス有効化   | なし | ✅ 実装済み |
| `system maintenance-off`    | メンテナンス無効化   | なし | ✅ 実装済み |
| `system maintenance-toggle` | メンテナンス切り替え | なし | ✅ 実装済み |
| `system init`               | システム初期化       | なし | ✅ 実装済み |

### 🏢 会社管理 (Companies)

| コマンド                                | 説明                                      | 引数                 | 実装状況    |
| --------------------------------------- | ----------------------------------------- | -------------------- | ----------- |
| `companies info <companyId>`            | 会社情報を表示                            | `companyId`: 会社 ID | ✅ 実装済み |
| `companies users <companyId>`           | 会社に紐づくユーザー一覧を表示            | `companyId`: 会社 ID | ✅ 実装済み |
| `companies maintenance-on <companyId>`  | 会社のメンテナンスモードを有効化          | `companyId`: 会社 ID | ✅ 実装済み |
|                                         | オプション: `--reason` メンテナンス理由   |                      |             |
| `companies maintenance-off <companyId>` | 会社のメンテナンスモードを無効化          | `companyId`: 会社 ID | ✅ 実装済み |
| `companies verify-users <companyId>`    | Authentication/Users 整合性検証           | `companyId`: 会社 ID | ✅ 実装済み |
| `companies repair-users <companyId>`    | 欠損 Users ドキュメント修復（Auth 削除）  | `companyId`: 会社 ID | ✅ 実装済み |
| `companies delete <companyId>`          | 会社とすべての関連データを削除（⚠️ 危険） | `companyId`: 会社 ID | ✅ 実装済み |
|                                         | 二重確認: yes/no + 会社 ID 入力           |                      |             |

### 💾 バックアップ・リストア (Backup)（⭐ NEW）

| コマンド                          | 説明                                                    | 引数                                   | 実装状況    |
| --------------------------------- | ------------------------------------------------------- | -------------------------------------- | ----------- |
| `backup company <companyId>`      | 会社データをバックアップ（固定ファイル保存）            | `companyId`: 会社 ID                   | ✅ 実装済み |
|                                   | オプション: `-o, --output` 出力先指定                   |                                        |             |
| `backup snapshot <companyId>`     | スナップショット取得（自動で差分計算実行）              | `companyId`: 会社 ID                   | ✅ 実装済み |
|                                   | 保存先: `temporary/companies/{companyId}/snapshot.json` |                                        |             |
| `backup diff <companyId>`         | 差分計算（snapshot.json と最新バックアップを比較）      | `companyId`: 会社 ID                   | ✅ 実装済み |
|                                   | 出力先: `temporary/companies/{companyId}/diff/`         |                                        |             |
| `backup restore <companyId>`      | 差分ベースリストア（変更されたドキュメントのみ）        | `companyId`: 会社 ID                   | ✅ 実装済み |
|                                   | オプション: `--collections` コレクション指定（複数可）  |                                        |             |
|                                   | ⚠️ メンテナンスモード必須                               |                                        |             |
| `backup restore-full <companyId>` | フルバックアップリストア（全ドキュメント、緊急用）      | `companyId`: 会社 ID                   | ✅ 実装済み |
|                                   | オプション: `--collections` コレクション指定（複数可）  |                                        |             |
|                                   | ⚠️ メンテナンスモード必須                               |                                        |             |
| `backup list [companyId]`         | バックアップ一覧を表示                                  | `companyId`: 会社 ID（省略時は全会社） | ✅ 実装済み |
|                                   | オプション: `-o, --output` バックアップディレクトリ指定 |                                        |             |

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

#### 🚧 スーパーユーザー一覧表示（未実装）

```bash
# 本番環境でスーパーユーザーを一覧表示
# npm run cli users list  # 🚧 未実装
# node src/cli.js users list  # 🚧 未実装

# エミュレーター環境でスーパーユーザーを一覧表示
# npm run cli:emulator users list  # 🚧 未実装
# node src/cli.js --env emulator users list  # 🚧 未実装
```

**注意**: このコマンドは将来実装予定です。現在は動作しません。

#### 🚧 ユーザークレーム表示（未実装）

```bash
# 指定UIDのユーザークレームを表示
# npm run cli users view abc123def456  # 🚧 未実装
# npm run cli:emulator users view abc123def456  # 🚧 未実装

# 直接実行
# node src/cli.js users view abc123def456  # 🚧 未実装
# node src/cli.js --env emulator users view abc123def456  # 🚧 未実装
```

**注意**: このコマンドは将来実装予定です。現在は動作しません。

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

````
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

### クレーム管理

#### ✅ スーパーユーザークレーム設定

```bash
# スーパーユーザークレームを設定
npm run cli claims set-superuser abc123def456
npm run cli:emulator claims set-superuser abc123def456

# 直接実行
node src/cli.js claims set-superuser abc123def456
node src/cli.js --env emulator claims set-superuser abc123def456
```

**出力例:**
```
🔧 スーパーユーザークレームを設定中...
UID: abc123def456

✅ スーパーユーザークレームを設定しました
Email: admin@example.com
カスタムクレーム: {
  "isSuperUser": true,
  "companyId": "company123"
}

⚠️  ユーザーは次回ログイン時に新しい権限が適用されます
```

#### ✅ スーパーユーザークレーム削除

```bash
# スーパーユーザークレームを削除
npm run cli claims remove-superuser abc123def456
npm run cli:emulator claims remove-superuser abc123def456

# 直接実行
node src/cli.js claims remove-superuser abc123def456
node src/cli.js --env emulator claims remove-superuser abc123def456
```

**出力例:**
```
🔧 スーパーユーザークレームを削除中...
UID: abc123def456

✅ スーパーユーザークレームを削除しました
Email: admin@example.com
カスタムクレーム: {
  "companyId": "company123"
}

⚠️  ユーザーは次回ログイン時に権限が更新されます
```

#### ✅ デベロッパークレーム設定

```bash
# デベロッパークレームを設定
npm run cli claims set-developer abc123def456
npm run cli:emulator claims set-developer abc123def456

# 直接実行
node src/cli.js claims set-developer abc123def456
node src/cli.js --env emulator claims set-developer abc123def456
```

**出力例:**

```
🔧 開発者クレームを設定中...
UID: abc123def456

✅ 開発者クレームを設定しました
Email: developer@example.com
カスタムクレーム: {
  "isDeveloper": true,
  "companyId": "company123"
}

⚠️  ユーザーは次回ログイン時に新しい権限が適用されます
```

#### ✅ デベロッパークレーム削除

```bash
# デベロッパークレームを削除
npm run cli claims remove-developer abc123def456
npm run cli:emulator claims remove-developer abc123def456

# 直接実行
node src/cli.js claims remove-developer abc123def456
node src/cli.js --env emulator claims remove-developer abc123def456
```

**出力例:**

```
🔧 開発者クレームを削除中...
UID: abc123def456

✅ 開発者クレームを削除しました
Email: developer@example.com
カスタムクレーム: {
  "companyId": "company123"
}

⚠️  ユーザーは次回ログイン時に権限が更新されます
```

````

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

#### メンテナンスモード制御

```bash
# メンテナンスモードを有効化
npm run cli:emulator companies maintenance-on Qa1JpI7dLMjIXeW3lB2m
npm run cli:dev companies maintenance-on Qa1JpI7dLMjIXeW3lB2m --reason "データリストア作業"

# メンテナンスモードを無効化
npm run cli:emulator companies maintenance-off Qa1JpI7dLMjIXeW3lB2m
npm run cli:dev companies maintenance-off Qa1JpI7dLMjIXeW3lB2m
```

**出力例:**

```
✅ メンテナンスモードを有効化しました
🏢 会社ID: Qa1JpI7dLMjIXeW3lB2m
📝 理由: データリストア作業
👤 実行者: admin@example.com
📅 開始時刻: 2025/11/30 12:00:00
```

#### Authentication/Users 整合性検証

```bash
# 整合性を検証（読み取り専用、安全）
npm run cli:emulator companies verify-users Qa1JpI7dLMjIXeW3lB2m
npm run cli:dev companies verify-users Qa1JpI7dLMjIXeW3lB2m
```

**機能:**

- Authentication ユーザーと Users ドキュメントの整合性を検証
- 孤立 Users ドキュメント検出（Authentication に存在しない UID）
- 欠損 Users ドキュメント検出（Authentication は存在するが Users がない）
- `isTemporary: true`の Users ドキュメントは検証対象外（Authentication 未作成のため正常）

**ユーザー登録フロー:**

1. 会社の Admin がユーザー管理で Users ドキュメント追加（`isTemporary: true`）
2. 利用者がサインアップ時に Authentication 作成、`isTemporary: false`に更新

#### 欠損 Users ドキュメントの修復

```bash
# 欠損Usersドキュメントを修復（Authenticationアカウント削除）
npm run cli:emulator companies repair-users Qa1JpI7dLMjIXeW3lB2m
npm run cli:dev companies repair-users Qa1JpI7dLMjIXeW3lB2m
```

**処理フロー:**

1. 整合性検証実行
2. 欠損 Users ドキュメントがない → 終了
3. 管理者アカウント（`isAdmin: true`）が存在するか確認
   - 存在しない → エラー（会社データ再構築が必要）
4. 各欠損ユーザーに companyId 確認後、Authentication アカウントを削除
5. 会社の Admin に再招待依頼

**出力例（成功）:**

```
🔧 欠損Usersドキュメントを修復しています... (ID: Qa1JpI7dLMjIXeW3lB2m)

🏢 会社: 株式会社唯心

🔍 整合性を検証しています...
[整合性検証出力...]

⚠️  欠損Usersドキュメント: 2件

🔍 管理者アカウントの存在を確認しています...
✅ 管理者アカウントが存在します。修復を続行します。

🗑️  2件のAuthenticationアカウントを削除します...
✅ 削除: user1@example.com (UID: abc123...)
✅ 削除: user2@example.com (UID: def456...)

✅ 修復が完了しました！

📊 修復サマリー:
  - 削除成功: 2件
  - 削除失敗: 0件

📋 削除されたAuthenticationアカウント:
  - user1@example.com (UID: abc123...)
  - user2@example.com (UID: def456...)

💡 次のステップ: 会社のAdminに以下のユーザーの再招待を依頼してください。
  - user1@example.com
  - user2@example.com
```

**出力例（管理者不在エラー）:**

```
⚠️  欠損Usersドキュメント: 3件

🔍 管理者アカウントの存在を確認しています...

❌ 管理者アカウント（isAdmin: true）が見つかりません。
   会社データの整合性が失われています。
   この会社データは再構築が必要です。

💡 対処方法: 新しい会社データを作成し、データを移行してください。
```

**出力例（整合性 OK）:**

```
🔍 Authentication/Users整合性を検証しています... (ID: Qa1JpI7dLMjIXeW3lB2m)

🏢 会社: 株式会社唯心

📊 Usersコレクション: 2件
📊 Authenticationユーザー: 2件

✅ 整合性: OK
   すべてのAuthenticationとUsersドキュメントが一致しています。
```

**出力例（問題検出時）:**

```
🔍 Authentication/Users整合性を検証しています... (ID: Qa1JpI7dLMjIXeW3lB2m)

🏢 会社: 株式会社唯心

📊 Usersコレクション: 3件
📊 Authenticationユーザー: 2件

⚠️  整合性の問題を検出しました:

🔴 孤立Usersドキュメント: 1件
   （Authenticationに存在しないUID）
   - UID: abc123def456
     Email: old-user@example.com

   💡 対処方法: 会社のAdminがアプリ上でユーザーを削除し、再作成
              Usersドキュメント削除時、Cloud FunctionsでAuthentication自動削除

🔴 欠損Usersドキュメント: 1件
   （Authenticationは存在するがUsersがない）
   - UID: xyz789ghi012
     Email: new-user@example.com
     DisplayName: 新規ユーザー

   💡 対処方法: `companies repair-users <companyId>` コマンドで自動修復
```

#### 会社データの削除

```bash
# 会社データを削除（二重確認）
npm run cli:emulator companies delete company-id-123

# 確認プロンプト:
# 1. yes/no入力
# 2. 会社ID入力（確認）
```

**削除プロセス:**

1. 会社情報の表示
2. 「yes」または「no」の入力
3. 削除する会社 ID の再入力（誤削除防止）
4. 各サブコレクションの削除（Cloud Functions 待機時間を適用）
5. 会社ドキュメントの削除

#### バックアップ・リストア

##### 会社のバックアップ（固定ファイル）

```bash
# 会社データをバックアップ（タイムスタンプ付きファイル）
npm run cli:emulator backup company Qa1JpI7dLMjIXeW3lB2m
npm run cli:dev backup company Qa1JpI7dLMjIXeW3lB2m

# 出力先を指定してバックアップ
npm run cli:emulator backup company Qa1JpI7dLMjIXeW3lB2m -o ./custom-backups
```

**保存先:** `backups/companies/{companyId}/backup_YYYY-MM-DD_HH-MM-SS.json`

##### スナップショット取得（自動差分計算）

```bash
# 現在の状態をスナップショット取得（差分計算も自動実行）
npm run cli:emulator backup snapshot Qa1JpI7dLMjIXeW3lB2m
npm run cli:dev backup snapshot Qa1JpI7dLMjIXeW3lB2m
```

**保存先:** `temporary/companies/{companyId}/snapshot.json`（固定名、上書き）

**処理内容:**

1. 現在の会社データを取得
2. snapshot.json として保存
3. 自動的に差分計算（diffBackup）を実行
4. 差分データを`temporary/companies/{companyId}/diff/`に出力

##### 差分計算（スタンドアロン）

```bash
# 最新バックアップとスナップショットの差分を計算
npm run cli:emulator backup diff Qa1JpI7dLMjIXeW3lB2m
npm run cli:dev backup diff Qa1JpI7dLMjIXeW3lB2m
```

**出力先:** `temporary/companies/{companyId}/diff/`

- `summary.json` - 差分サマリー
- `{collection}.json` - 各コレクションの変更内容（added, modified, deleted）

**差分計算ロジック:**

- ドキュメント ID 比較で追加/削除を検出
- `updatedAt`タイムスタンプ比較で変更を検出
- 変更なしドキュメントは記録しない（効率化）

**出力例:**

```
🔍 差分を計算しています...
📊 差分サマリー:
  - Customers: 追加 1件, 変更 1件, 削除 1件
  - Sites: 追加 0件, 変更 2件, 削除 0件

✅ 差分データを保存しました
📂 保存先: temporary/companies/Qa1JpI7dLMjIXeW3lB2m/diff/
```

##### 差分ベースリストア（推奨）

```bash
# 差分データからリストア（変更されたドキュメントのみ）
npm run cli:emulator backup restore Qa1JpI7dLMjIXeW3lB2m --collections Customers Sites
npm run cli:dev backup restore Qa1JpI7dLMjIXeW3lB2m --collections Customers

# 全コレクションをリストア
npm run cli:emulator backup restore Qa1JpI7dLMjIXeW3lB2m --collections all
```

**前提条件:**

- メンテナンスモードが有効であること
- `temporary/companies/{companyId}/diff/`に差分データが存在すること

**処理内容:**

1. メンテナンスモード確認
2. 差分データ読み込み
3. added: ドキュメント作成
4. modified: ドキュメント更新
5. deleted: ドキュメント削除（復元）
6. unchanged: スキップ（効率化）
7. Cloud Functions 待機時間適用

**Authentication/Users 除外:**

- Users コレクションは自動的にリストア対象から除外
- Authentication 情報は一切変更されない（安全性確保）

**出力例:**

```
🔧 差分ベースリストアを開始します
🏢 会社ID: Qa1JpI7dLMjIXeW3lB2m
📊 差分データ:
  - スナップショット: 2025/11/30 12:17:12
  - バックアップ: 2025/11/30 12:09:11

✅ メンテナンスモードを確認しました

📁 Customers (3件)
  - 追加: 1件
  - 変更: 1件
  - 削除復元: 1件
⏳ Cloud Functions処理待機中... (5000ms)
✅ Customers: 3件リストア完了

✅ リストア完了！
📊 統計: 追加 1件, 変更 1件, 削除復元 1件
```

##### フルバックアップリストア（緊急用）

```bash
# 全ドキュメントをバックアップからリストア（非効率、緊急時用）
npm run cli:emulator backup restore-full Qa1JpI7dLMjIXeW3lB2m --collections Customers Sites
npm run cli:dev backup restore-full Qa1JpI7dLMjIXeW3lB2m --collections all
```

**差分リストアとの違い:**

- データソース: バックアップファイル（`backups/companies/{companyId}/backup_*.json`）
- 処理方法: 全ドキュメントを書き込み（変更なしも含む）
- 用途: 緊急時、差分データが利用できない場合

**Authentication/Users 除外:**

- フルリストアでも Users コレクションは自動除外
- Authentication 情報は変更されない

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

【リストアモード】
- 差分ベースリストア（推奨）: 変更されたドキュメントのみ処理（効率的）
- フルバックアップリストア（緊急用）: 全ドキュメント書き込み（非効率）

【安全機能】
- メンテナンスモード必須: リストア前に必ず有効化
- Authentication/Users除外: 自動的にリストア対象から除外
- 二重確認: 会社削除時は二段階確認プロセス

【データ処理】
- マージ型リストア: 既存データに差分を適用（削除なし）
- Cloud Functions待機: 適切な待機時間で依存関係を考慮
- Timestamp保持: updatedAtなどのタイムスタンプを正確に復元

【ワークフロー】
1. メンテナンスモード有効化
2. スナップショット取得（差分自動計算）
3. 差分確認（summary.json）
4. 差分ベースリストア
5. メンテナンスモード無効化

【バックアップ管理】
- 定期バックアップ推奨: 重要な操作前に必ず実行
- 機密情報を含む: バックアップファイルの取り扱いに注意
- ストレージ管理: 古いバックアップの定期的な整理
```

## 🆘 ヘルプの表示

````bash
# 全体のヘルプ
npm run cli -- --help
node src/cli.js --help

# 各カテゴリのヘルプ
npm run cli -- users --help
npm run cli -- claims --help
npm run cli -- system --help
npm run cli -- companies --help
### 新しいスーパーユーザーの設定（🚧 一部未実装）

```bash
# 1. メールアドレスからUIDを取得（✅ 実装済み）
npm run cli users get-uid user@example.com

# 2. 取得したUIDでスーパーユーザークレームを設定（🚧 未実装）
# npm run cli claims set-superuser abc123def456

# 3. 設定されたクレームを確認（🚧 未実装）
# npm run cli users view abc123def456
````

**注意**: 現在はステップ 1 のみ利用可能です。ステップ 2 と 3 は将来実装予定です。

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

### エミュレーター環境でのテスト

```bash
# エミュレーター環境でテストユーザーを管理
npm run cli:emulator users get-uid test@example.com  # ✅ 実装済み
# npm run cli:emulator claims set-superuser test-uid-123  # 🚧 未実装
# npm run cli:emulator users view test-uid-123  # 🚧 未実装
npm run cli:emulator system maintenance-toggle  # ✅ 実装済み
```

**注意**: クレーム管理とユーザー表示機能は将来実装予定です。 run cli system status

# 4. メンテナンスモードを無効化

npm run cli system maintenance-off

````

### エミュレーター環境でのテスト

```bash
# エミュレーター環境でテストユーザーを作成・管理
npm run cli:emulator users get-uid test@example.com
npm run cli:emulator claims set-superuser test-uid-123
npm run cli:emulator users view test-uid-123
npm run cli:emulator system maintenance-toggle
````

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

```bash
# 1. 現在の会社データをバックアップ（タイムスタンプ付きファイル）
npm run cli:dev backup company Qa1JpI7dLMjIXeW3lB2m

# 2. バックアップ一覧で確認
npm run cli:dev backup list Qa1JpI7dLMjIXeW3lB2m
```

#### 差分ベースリストアの手順（推奨）

```bash
# 1. メンテナンスモードを有効化
npm run cli:dev companies maintenance-on Qa1JpI7dLMjIXeW3lB2m --reason "データリストア作業"

# 2. スナップショット取得（差分も自動計算される）
npm run cli:dev backup snapshot Qa1JpI7dLMjIXeW3lB2m

# 3. 差分サマリーを確認（任意）
# temporary/companies/Qa1JpI7dLMjIXeW3lB2m/diff/summary.json を確認

# 4. 差分ベースリストア実行
npm run cli:dev backup restore Qa1JpI7dLMjIXeW3lB2m --collections Customers Sites

# または全コレクション
npm run cli:dev backup restore Qa1JpI7dLMjIXeW3lB2m --collections all

# 5. メンテナンスモードを無効化
npm run cli:dev companies maintenance-off Qa1JpI7dLMjIXeW3lB2m
```

#### フルバックアップリストアの手順（緊急用）

```bash
# 1. メンテナンスモードを有効化
npm run cli:dev companies maintenance-on Qa1JpI7dLMjIXeW3lB2m --reason "緊急データ復旧"

# 2. バックアップ一覧を確認
npm run cli:dev backup list Qa1JpI7dLMjIXeW3lB2m

# 3. フルバックアップリストア実行
npm run cli:dev backup restore-full Qa1JpI7dLMjIXeW3lB2m --collections Customers Sites

# 4. メンテナンスモードを無効化
npm run cli:dev companies maintenance-off Qa1JpI7dLMjIXeW3lB2m
```

#### 重要な変更前のバックアップ

```bash
# 1. 変更前にバックアップを取得
npm run cli:dev backup company Qa1JpI7dLMjIXeW3lB2m

# 2. 変更作業を実施
# 何か重要な変更を実施...

# 3. 問題があれば差分ベースリストアで復旧
npm run cli:dev companies maintenance-on Qa1JpI7dLMjIXeW3lB2m
npm run cli:dev backup snapshot Qa1JpI7dLMjIXeW3lB2m
npm run cli:dev backup restore Qa1JpI7dLMjIXeW3lB2m --collections all
npm run cli:dev companies maintenance-off Qa1JpI7dLMjIXeW3lB2m
```

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

#### 差分データの確認

```bash
# 差分サマリーを確認
cat temporary/companies/Qa1JpI7dLMjIXeW3lB2m/diff/summary.json

# 特定コレクションの差分詳細を確認
cat temporary/companies/Qa1JpI7dLMjIXeW3lB2m/diff/Customers.json
```

**summary.json 構造:**

```json
{
  "companyId": "Qa1JpI7dLMjIXeW3lB2m",
  "snapshotDate": "2025-11-30T03:17:12.123Z",
  "backupDate": "2025-11-30T03:09:11.456Z",
  "collections": {
    "Customers": {
      "added": 1,
      "modified": 1,
      "deleted": 1,
      "unchanged": 12
    }
  }
}
```

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
