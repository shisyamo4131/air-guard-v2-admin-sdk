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

## 🔧 環境設定

### 本番環境

- Firebase Admin SDK が本番プロジェクトに接続
- サービスアカウントキーが必要
- 出力: `☁️ Connecting to Production Firebase environment.`

### エミュレーター環境

- Firebase Auth/Firestore エミュレーターに接続
- デフォルト接続先:
  - AUTH: `localhost:9099`
  - FIRESTORE: `localhost:8080`
- 出力: `🔌 Connecting to Firebase Emulator:`

## 🚨 実行時の注意事項

### 本番環境での実行

```bash
⚠️ 本番環境での実行時は十分注意してください
- ユーザークレームの変更は実際のユーザーに影響します
- メンテナンスモードの変更はアプリケーションに影響します
- 操作前に必ず確認を行ってください
```

### エミュレーター環境での実行

```bash
✅ エミュレーター環境では安全にテストできます
- 実際のデータに影響しません
- 開発・テスト用途に最適です
- Firebase エミュレーターの起動が必要です
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

# 直接実行
node src/cli.js users --help
node src/cli.js claims --help
node src/cli.js system --help
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
