# AirG- **ユーザー管理**: スーパーユーザーのリスト表示、ユーザークレーム表示

- **クレーム管理**: スーパーユーザー・デベロッパークレームの設定・削除
- **システム管理**: メンテナンスモードの制御、システム設定管理
- **環境対応**: 本番環境とエミュレーター環境の両方に対応
- **CLI**: 統一されたコマンドラインインターフェース
- **プログラマティック API**: 他のプロジェクトから直接使用可能 Admin SDK

Firebase Admin SDK を使用して AirGuard アプリのユーザー管理を行うための SDK です。

## 🚀 機能

- **ユーザー管理**: スーパーユーザーのリスト表示、ユーザークレーム表示
- **クレーム管理**: スーパーユーザー・デベロッパークレームの設定・削除
- **環境対応**: 本番環境とエミュレーター環境の両方に対応
- **CLI**: 統一されたコマンドラインインターフェース
- **プログラマティック API**: 他のプロジェクトから直接使用可能

## 📁 プロジェクト構造

```
src/
├── index.js          # メインエクスポート（プログラマティック使用）
├── cli.js            # CLIエントリーポイント
├── firebaseAdmin.js  # Firebase Admin SDK設定
├── commands/         # 機能モジュール
    ├── users.js      # ユーザー管理機能
    ├── claims.js     # クレーム管理機能
    └── system.js     # システム管理機能
```

## 🛠️ インストール・セットアップ

```bash
# 依存関係のインストール
npm install

# Firebase Admin SDK サービスアカウントキーを配置
# air-guard-v2-dev-firebase-adminsdk-fbsvc-f072726bf8.json
```

## 💻 CLI 使用方法

### 基本コマンド

```bash
# ヘルプを表示
npm run cli -- --help

# サブコマンドのヘルプ
npm run cli -- users --help
npm run cli -- claims --help
npm run cli -- system --help
```

### ユーザー管理

```bash
# スーパーユーザーリストを表示
npm run cli -- users list

# 特定ユーザーのクレームを表示（UID指定）
npm run cli -- users view <user-uid>
```

### クレーム管理

```bash
# スーパーユーザークレームを設定
npm run cli -- claims set-superuser <uid-or-email>

# スーパーユーザークレームを削除
npm run cli -- claims remove-superuser <uid-or-email>

# デベロッパークレームを設定（要スーパーユーザー）
npm run cli -- claims set-developer <uid-or-email>

# デベロッパークレームを削除
npm run cli -- claims remove-developer <uid-or-email>
```

### 環境指定

#### 方法 1: 専用スクリプト（推奨）

```bash
# エミュレーター環境用
npm run cli:emulator system status
npm run cli:emulator users list

# 本番環境用
npm run cli:prod system status
npm run cli users list  # デフォルトで本番環境
```

#### 方法 2: 直接実行

```bash
# 本番環境
node src/cli.js system status

# エミュレーター環境
node src/cli.js --env emulator system status

# カスタムエミュレーターホスト
node src/cli.js --env emulator --emulator-host localhost:9099 system status
```

#### 方法 3: npm run (従来方式)

```bash
# ⚠️ 注意: この方式はnpm warningが出ます
npm run cli -- --env emulator users list
```

### システム管理

#### 本番環境

```bash
npm run cli system status
npm run cli system maintenance-on
npm run cli system maintenance-off
npm run cli system maintenance-toggle
npm run cli system init
```

#### エミュレーター環境

```bash
npm run cli:emulator system status
npm run cli:emulator system maintenance-on
npm run cli:emulator system maintenance-off
```

#### 直接実行

```bash
# 本番環境
node src/cli.js system status

# エミュレーター環境
node src/cli.js --env emulator system status
```

### 使用例

#### 推奨: 専用スクリプト使用

```bash
# 本番環境でスーパーユーザーをリスト
npm run cli users list

# エミュレーター環境でユーザークレームを確認
npm run cli:emulator users view abc123def456

# 本番環境でスーパーユーザークレームを設定
npm run cli claims set-superuser user@example.com

# エミュレーター環境でデベロッパークレームを設定
npm run cli:emulator claims set-developer abc123def456

# 本番環境でメンテナンスモードを有効化
npm run cli system maintenance-on

# エミュレーター環境でシステム状態を確認
npm run cli:emulator system status
```

#### 直接実行

```bash
# 本番環境
node src/cli.js users list
node src/cli.js system maintenance-on

# エミュレーター環境
node src/cli.js --env emulator users list
node src/cli.js --env emulator system status
```

````

## 🔧 プログラマティック使用

### クラス使用

```javascript
const { AirGuardAdminSDK } = require("./src/index.js");

// インスタンス作成
const sdk = new AirGuardAdminSDK({
  env: "emulator",
  emulatorHost: "localhost:9099",
});

// 使用例
async function example() {
  try {
    // スーパーユーザーリストを取得
    await sdk.listSuperUsers();

    // ユーザークレームを表示
    await sdk.viewUserClaims("user-uid");

    // スーパーユーザークレームを設定
    await sdk.setSuperUserClaim("user@example.com");

    // 環境を変更
    sdk.setEnvironment("prod");
    await sdk.listSuperUsers();
  } catch (error) {
    console.error("Error:", error.message);
  }
}
````

### 直接関数使用

```javascript
const { users, claims } = require("./src/index.js");

async function example() {
  const options = { env: "emulator" };

  try {
    // ユーザー管理
    await users.listSuperUsers(options);
    await users.viewUserClaims("user-uid", options);

    // クレーム管理
    await claims.setSuperUserClaim("user@example.com", options);
    await claims.setDeveloperClaim("user-uid", { env: "prod" });
  } catch (error) {
    console.error("Error:", error.message);
  }
}
```

## 🔐 環境設定

### 本番環境

- Firebase Admin SDK が本番プロジェクトに接続
- サービスアカウントキーが必要

### エミュレーター環境

- `FIREBASE_AUTH_EMULATOR_HOST` 環境変数が自動設定
- デフォルト: `localhost:9099`

## 🆚 旧バージョンからの移行

### 旧形式（廃止予定）

```bash
npm run list:prod
npm run set:superuser:emulator
```

### 新形式（推奨）

```bash
npm run cli -- users list
npm run cli -- --env emulator claims set-superuser <uid>
```

## 📋 利用可能なコマンド一覧

| カテゴリ   | コマンド                        | 説明                     |
| ---------- | ------------------------------- | ------------------------ |
| **Users**  | `users list`                    | スーパーユーザー一覧表示 |
|            | `users view <uid>`              | ユーザークレーム表示     |
| **Claims** | `claims set-superuser <uid>`    | スーパーユーザー設定     |
|            | `claims remove-superuser <uid>` | スーパーユーザー削除     |
|            | `claims set-developer <uid>`    | デベロッパー設定         |
|            | `claims remove-developer <uid>` | デベロッパー削除         |
| **System** | `system status`                 | システム状態表示         |
|            | `system maintenance-on`         | メンテナンス有効化       |
|            | `system maintenance-off`        | メンテナンス無効化       |
|            | `system maintenance-toggle`     | メンテナンス切り替え     |
|            | `system init`                   | システム初期化           |

## 🐛 トラブルシューティング

### よくある問題

1. **Firebase 接続エラー**

   ```bash
   # サービスアカウントキーのパスを確認
   # firebaseAdmin.js内のパス設定を確認
   ```

2. **エミュレーター接続エラー**

   ```bash
   # Firebaseエミュレーターが起動していることを確認
   firebase emulators:start --only auth
   ```

3. **権限エラー**
   ```bash
   # サービスアカウントに適切な権限があることを確認
   # Firebase Authentication Admin権限が必要
   ```

## 📝 開発

### 新機能追加

1. `src/commands/` に新しいモジュールを追加
2. `src/cli.js` にコマンドを登録
3. `src/index.js` にプログラマティック API を追加

### テスト

```bash
# CLIテスト
npm run cli -- --help

# 機能テスト（エミュレーター推奨）
npm run cli -- --env emulator users list
```
