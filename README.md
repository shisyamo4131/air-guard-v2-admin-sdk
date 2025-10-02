# AirGuard Admin SDK

Firebase Admin SDK を使用して AirGuard アプリのユーザー管理を行うための SDK です。

## 🚀 機能

- **ユーザー管理**: スーパーユーザーのリスト表示、ユーザークレーム表示、メールアドレスから UID 取得
- **クレーム管理**: スーパーユーザー・デベロッパークレームの設定・削除
- **システム管理**: メンテナンスモードの制御、システム設定管理
- **環境対応**: 本番環境とエミュレーター環境の両方に対応
- **CLI**: 統一されたコマンドラインインターフェース
- **プログラマティック API**: 他のプロジェクトから直接使用可能

## 📁 プロジェクト構造

```
├── README.md         # プロジェクト概要とクイックスタート
├── COMMANDS.md       # 詳細なコマンドリファレンス
├── package.json      # npm設定と依存関係
├── air-guard-v2-dev-firebase-adminsdk-fbsvc-f072726bf8.json  # サービスアカウントキー
└── src/
    ├── index.js          # メインエクスポート（プログラマティック使用）
    ├── cli.js            # CLIエントリーポイント
    ├── firebaseAdmin.js  # Firebase Admin SDK設定
    └── commands/         # 機能モジュール
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

### クイックスタート

```bash
# ヘルプを表示
npm run cli -- --help
node src/cli.js --help

# 環境を指定してコマンド実行
npm run cli users list                    # 本番環境
npm run cli:emulator users list           # エミュレーター環境
node src/cli.js --env emulator users list # 直接実行（エミュレーター）
```

### 🔗 詳細なコマンドリファレンス

**📋 [COMMANDS.md](./COMMANDS.md)** で全てのコマンドの詳細な使用方法と例を確認できます。

### 基本的な使用パターン

#### 🌟 推奨方法: 専用スクリプト

```bash
# エミュレーター環境用（開発・テスト）
npm run cli:emulator <command>

# 本番環境用（本番運用）
npm run cli <command>
```

#### 直接実行

```bash
# 本番環境（デフォルト）
node src/cli.js <command>

# エミュレーター環境
node src/cli.js --env emulator <command>
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
- 出力: `☁️ Connecting to Production Firebase environment.`

### エミュレーター環境

- Firebase Auth/Firestore エミュレーターに接続
- デフォルト接続先: `localhost:9099` (AUTH), `localhost:8080` (FIRESTORE)
- 出力: `🔌 Connecting to Firebase Emulator:`

詳細な環境設定と注意事項は **[COMMANDS.md](./COMMANDS.md)** をご覧ください。

## 🆚 新しい CLI 構造

### 最新の推奨使用方法

```bash
# ✅ 推奨: 専用スクリプト
npm run cli users list                    # 本番環境
npm run cli:emulator users get-uid <email> # エミュレーター環境

# ✅ 推奨: 直接実行
node src/cli.js users list                # 本番環境
node src/cli.js --env emulator users list # エミュレーター環境
```

### 主な変更点

- **統一された CLI**: 全ての機能が`src/cli.js`から利用可能
- **明確な環境切り替え**: `--env emulator`フラグまたは専用スクリプト
- **新機能追加**: `users get-uid <email>` コマンド
- **簡潔なコマンド**: npm scripts の簡素化
- **改良されたヘルプ**: より詳細な使用例とドキュメント
- **📋 専用ドキュメント**: [COMMANDS.md](./COMMANDS.md) でコマンドの詳細を管理

### 🆕 新機能: メールアドレスから UID 取得

```bash
# ユーザーのメールアドレスからUIDを取得
npm run cli users get-uid user@example.com
npm run cli:emulator users get-uid test@local.com
```

詳細な出力例と使用方法は **[COMMANDS.md](./COMMANDS.md)** をご覧ください。

## 📋 コマンドリファレンス

全てのコマンドの詳細な使用方法、引数、出力例については **[COMMANDS.md](./COMMANDS.md)** をご覧ください。

### 🎯 主要コマンド概要

- **👥 ユーザー管理**: `users list`, `users view <uid>`, `users get-uid <email>`
- **🏷️ クレーム管理**: `claims set-superuser <uid>`, `claims set-developer <uid>`
- **⚙️ システム管理**: `system status`, `system maintenance-on/off/toggle`

各コマンドの詳細な説明、パラメータ、使用例は [COMMANDS.md](./COMMANDS.md) で確認できます。

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
# CLIテスト - 基本ヘルプ
npm run cli -- --help
node src/cli.js --help

# 機能テスト（エミュレーター推奨）
npm run cli:emulator users list
npm run cli:emulator system status

# 本番環境テスト（注意して実行）
npm run cli users list
npm run cli system status
```

詳細なテスト手順とワークフローは **[COMMANDS.md](./COMMANDS.md)** をご覧ください。
