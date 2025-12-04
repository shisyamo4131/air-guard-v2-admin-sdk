# AirGuard Admin SDK - 設計思想・判断記録

このドキュメントは、AirGuard Admin SDK の設計判断、技術的制約、実装方針を記録します。新しい機能追加や保守作業の際に、過去の判断理由を理解するための参考資料として使用してください。

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [設計原則](#設計原則)
3. [ユーザーロールとアクセス制御](#ユーザーロールとアクセス制御)
4. [バックアップ・リストア機能](#バックアップリストア機能)
5. [Authentication/Users 整合性管理](#authenticationusers-整合性管理)
6. [データ移行機能](#データ移行機能)
7. [環境構成](#環境構成)
8. [Cloud Functions との連携](#cloud-functions-との連携)
9. [技術的制約と注意事項](#技術的制約と注意事項)

---

## プロジェクト概要

### 目的

AirGuard Admin SDK は Firebase Admin SDK を使用して、AirGuard アプリの**運用・保守**を行うための管理ツールです。

### スコープ

**✅ 対応範囲（運用・保守）:**

- バックアップ・リストア
- 整合性チェック（verify-users, repair-users）
- メンテナンスモード制御
- 会社データ削除（初期化）
- システム設定管理

**❌ 対応外（アプリ側で実装）:**

- データ移行（既存システムからの初期データ投入）
- 通常のユーザー登録・編集
- ビジネスロジックを伴うデータ操作

### 基本方針

1. **安全性最優先**: 削除・リストア操作には確認プロセスを必須とする
2. **環境分離**: Emulator / Dev / Prod を明確に分離
3. **監査証跡**: 重要な操作はログとメタデータで記録
4. **スキーマ検証の回避**: Admin SDK は Firestore ルール以外の検証を迂回するため、通常データ投入には使用しない

---

## 設計原則

### 1. マージ型リストアの採用

**決定内容:**

- リストアは既存データに差分を適用（削除なし）
- added, modified のみ処理、deleted は無視

**理由:**

- 誤ったバックアップからのリストアでもデータ消失を防ぐ
- 部分的な復旧が可能（特定コレクションのみ）
- BaaS 障害時の完全復旧は Firebase 公式機能を使用

**実装日:** 2025-11-29

---

### 2. Authentication/Users の自動除外

**決定内容:**

- バックアップ・リストア時に Authentication と Users コレクションを自動除外

**理由:**

- Authentication: パスワード情報は移行不可、セキュリティリスク
- Users: ユーザー管理は慎重な操作が必要、誤操作防止
- 整合性管理: verify-users / repair-users コマンドで個別対応

**実装日:** 2025-11-29

**関連コマンド:**

```bash
# 整合性チェック（読み取り専用）
npm run cli -- companies verify-users <companyId>

# 整合性修復（Authentication削除のみ）
npm run cli -- companies repair-users <companyId>
```

---

### 3. コレクション単位の処理

**決定内容:**

- バックアップ・リストアはコレクション単位で実行可能
- `--collections` オプションで選択的処理

**理由:**

- マスタデータとトランザクションデータの段階的処理
- Cloud Functions 完了待機の柔軟な制御
- 影響範囲の限定（リスク最小化）

**実装例:**

```bash
# Customersコレクションのみリストア
npm run cli -- backup restore <companyId> --collections Customers
```

**実装日:** 2025-11-29

---

## ユーザーロールとアクセス制御

### ロール定義

| ロール            | 説明             | Admin SDK   | アプリアクセス            | カスタムクレーム    |
| ----------------- | ---------------- | ----------- | ------------------------- | ------------------- |
| **Developer**     | 開発者（最上位） | ✅ 利用可能 | フルアクセス + 開発用機能 | `isDeveloper: true` |
| **Super User**    | システム管理者   | ✅ 利用可能 | フルアクセス              | `isSuperUser: true` |
| **Company Admin** | 会社管理者       | ❌ 利用不可 | フルアクセス（自社のみ）  | `isAdmin: true`     |
| **Regular User**  | 一般ユーザー     | ❌ 利用不可 | 限定アクセス              | -                   |

### ロールの権限詳細

#### Developer（開発者）

- **位置づけ**: 最上位の権限
- **Admin SDK**: 全機能利用可能
- **アプリアクセス**:
  - 全機能フルアクセス
  - 開発用テストページ表示
  - デバッグ機能の利用
- **カスタムクレーム**: `isDeveloper: true`
- **用途**: 開発・デバッグ・システム全体の管理

#### Super User（システム管理者）

- **位置づけ**: 運用管理者
- **Admin SDK**: 全機能利用可能
- **アプリアクセス**: 全機能フルアクセス（開発用機能を除く）
- **カスタムクレーム**: `isSuperUser: true`
- **用途**: 運用・保守・サポート業務

#### Company Admin（会社管理者）

- **位置づけ**: 会社ごとの管理者
- **Admin SDK**: 利用不可
- **アプリアクセス**: 自社データのフルアクセス
- **カスタムクレーム**: `isAdmin: true`, `companyId: "xxx"`
- **用途**: 自社のユーザー管理・データ管理

#### Regular User（一般ユーザー）

- **位置づけ**: 通常の利用者
- **Admin SDK**: 利用不可
- **アプリアクセス**: 限定的（自分のデータのみ）
- **カスタムクレーム**: `companyId: "xxx"`
- **用途**: 日常業務

### ユーザー登録フロー

```
1. Company Admin が Users ドキュメント作成
   ↓ (isTemporary: true を設定)
2. ユーザーがサインアップ
   ↓ (Authentication 作成)
3. Cloud Functions で isTemporary: false に更新
   ↓
4. 登録完了
```

### isTemporary フィールドの意味

- **isTemporary: true**: Authentication 未作成（登録進行中）
- **isTemporary: false**: Authentication 作成済み（登録完了）

**重要:** `isTemporary: true` は正常な状態であり、エラーではありません。verify-users コマンドでは自動的に除外されます。

**実装日:** 2025-11-30

---

## バックアップ・リストア機能

### アーキテクチャ

```
backups/
└── companies/
    └── {companyId}/
        ├── backup_YYYY-MM-DD_HH-MM-SS.json  # タイムスタンプ付きバックアップ
        └── snapshot.json                     # 最新状態（固定ファイル名、上書き）

temporary/
└── companies/
    └── {companyId}/
        └── diff/
            ├── summary.json    # 差分サマリー
            └── diff.json       # 詳細差分データ
```

### リストア方式の選択

#### 1. 差分ベースリストア（推奨）

**コマンド:**

```bash
npm run cli -- backup restore <companyId> --collections <コレクション名>
```

**処理フロー:**

```
1. スナップショット取得（現在の状態を snapshot.json に保存）
2. 差分計算（バックアップ vs スナップショット）
3. 差分データ保存（temporary/companies/{companyId}/diff/）
4. 変更分のみリストア（added, modified）
```

**特徴:**

- 効率的（変更分のみ処理）
- 差分確認可能（summary.json）
- unchanged はスキップ

#### 2. フルバックアップリストア（緊急用）

**コマンド:**

```bash
npm run cli -- backup restore-full <companyId> --collections <コレクション名>
```

**処理フロー:**

```
1. バックアップファイルから全ドキュメント読み込み
2. 全ドキュメントを Firestore に書き込み
```

**特徴:**

- 差分データが利用できない場合の緊急復旧用
- 全ドキュメント上書き（時間がかかる）

**実装日:** 2025-11-29

---

### スナップショット機能

**コマンド:**

```bash
npm run cli -- backup snapshot <companyId>
```

**目的:**

- リストア前の状態を固定ファイル名で保存（上書き型）
- 自動的に差分計算を実行
- 「何が変わるか」を事前確認

**実装日:** 2025-11-29

---

### メンテナンスモード

**目的:**

- リストア中のユーザーアクセス制御
- データ整合性の確保

**コマンド:**

```bash
# 有効化
npm run cli -- companies maintenance-on <companyId> --reason "リストア作業中"

# 無効化
npm run cli -- companies maintenance-off <companyId>
```

**設定内容:**

- `maintenanceMode`: true/false
- `maintenanceReason`: 理由文字列
- `maintenanceStartedAt`: 開始日時（Timestamp）
- `maintenanceStartedBy`: 実行者 UID

**実装日:** 2025-11-29

---

## Authentication/Users 整合性管理

### 問題の種類

#### 1. Orphaned Users（孤立した Users ドキュメント）

**状態:**

- Users ドキュメント: ✅ 存在
- Authentication: ❌ 存在しない

**原因:**

- Authentication が削除された
- 登録フローが中断された

**対処方法:**

- **Company Admin が対応**（アプリ内で削除 → 再招待）
- Admin SDK では対応しない（アプリ側の責務）

#### 2. Missing Users（Users ドキュメント欠損）

**状態:**

- Authentication: ✅ 存在
- Users ドキュメント: ❌ 存在しない

**原因:**

- Users ドキュメントが誤って削除された
- データ不整合

**対処方法:**

- **Super User が対応**（repair-users コマンド使用）
- Authentication を削除 → Company Admin が再招待

### 整合性チェックコマンド

#### verify-users（検証のみ）

**コマンド:**

```bash
npm run cli -- companies verify-users <companyId>
```

**処理内容:**

1. Users コレクション取得
2. isTemporary: true ユーザーを除外
3. Authentication と比較
4. 不整合を報告（削除・修正はしない）

**安全性:** 読み取り専用、実行しても影響なし

#### repair-users（修復）

**コマンド:**

```bash
npm run cli -- companies repair-users <companyId>
```

**処理内容:**

1. verify-users を実行
2. 管理者アカウント存在確認（isAdmin: true）
3. Missing Users 問題のみ対応
4. 該当 Authentication を削除
5. 削除リストを出力

**安全装置:**

- 管理者アカウント（isAdmin: true）が存在しない場合はエラー
- companyId in customClaims を確認

**実装日:** 2025-11-30

**重要な設計判断:**

- Orphaned Users は対応しない（アプリ側で対応）
- Users ドキュメント構造には触らない（削除リスク回避）
- Authentication 削除のみ実施（再招待で再構築）

---

## データ移行機能

### ⚠️ Admin SDK では実装しない（重要な決定）

**決定日:** 2025-11-30

**理由:**

1. **スキーマ検証の迂回**

   - Admin SDK は Firestore ルール以外の検証を経由しない
   - クラスのコンストラクタ、バリデーション、セッターを通らない

2. **ビジネスロジックの迂回**

   - 計算フィールドが更新されない
   - 依存関係のあるフィールドが不整合になる

3. **2 次災害のリスク**
   - 不正なデータ形式でも保存できてしまう
   - 後から発見されるバグの温床
   - データクレンジングコストが膨大

### 推奨実装方針

**AirGuard アプリ側で一括登録 UI を実装:**

```javascript
// AirGuardアプリ内（正規フロー）
import { Customer } from "@/models/Customer";

async function importCustomers(jsonData) {
  for (const item of jsonData.customers) {
    // クラスインスタンス生成（バリデーション実行）
    const customer = new Customer({
      code: item.code,
      name: item.name,
      // ...
    });

    // クラスのsaveメソッド使用（ビジネスロジック適用）
    await customer.save();
  }
}
```

**メリット:**

- スキーマ検証が確実
- ビジネスロジックが適用される
- エラーハンドリングが統一
- 2 次災害リスクの最小化

**Admin SDK の役割:**

- 運用・保守ツールとして完結
- データ投入はアプリ側の責務

---

## 環境構成

### 3 つの環境

| 環境            | 用途                 | 接続先        | 秘密鍵                     | コマンド               |
| --------------- | -------------------- | ------------- | -------------------------- | ---------------------- |
| **🧪 Emulator** | 開発・テスト         | localhost     | Dev 環境の秘密鍵           | `npm run cli:emulator` |
| **🔧 Dev**      | 統合テスト・基盤構築 | Firebase Dev  | `air-guard-v2-dev-*.json`  | `npm run cli:dev`      |
| **🚀 Prod**     | 本番運用             | Firebase Prod | `air-guard-v2-prod-*.json` | `npm run cli:prod`     |

### 環境切り替えの仕組み

**firebaseAdmin.js が自動判定:**

```javascript
// Emulator環境の検出
if (
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  process.env.FIRESTORE_EMULATOR_HOST
) {
  // Emulatorに接続
}

// Dev/Prod環境の判定
const env = process.env.FIREBASE_ENV || "dev";
```

**環境変数:**

- `FIREBASE_ENV=dev`: Dev 環境（デフォルト）
- `FIREBASE_ENV=prod`: Prod 環境
- `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`: Emulator
- `FIRESTORE_EMULATOR_HOST=localhost:8080`: Emulator

---

## Cloud Functions との連携

### ドキュメントトリガーの発火

**重要:** Admin SDK の `set()` / `update()` / `delete()` でも onCreate/onUpdate/onDelete トリガーは発火します。

### 待機時間の設定

**実装場所:** `src/constants/collections.js`

```javascript
export const COMPANY_SUBCOLLECTIONS = [
  {
    name: "Customers",
    waitAfterClear: 3000, // 削除後の待機時間
    waitAfterRestore: 5000, // リストア後の待機時間
  },
  {
    name: "OperationResults",
    waitAfterClear: 3000,
    waitAfterRestore: 5000,
  },
  // ...
];
```

### 待機時間の目安

- **トリガーなし:** 0ms
- **軽量な処理:** 1000 ～ 2000ms
- **重い処理:** 3000 ～ 5000ms
- **コールドスタート考慮:** 5000ms 以上

**考慮事項:**

- Cloud Functions のコールドスタート時間
- 処理の複雑さ（データベース読み書き、外部 API 呼び出し等）
- 依存する他のコレクションへの影響

---

## 技術的制約と注意事項

### 1. 二重確認プロセス

**対象コマンド:**

- `companies delete`（会社削除）

**実装内容:**

```bash
# 1回目: yes/no確認
本当に削除しますか？ (yes/no): yes

# 2回目: companyId入力確認
確認のため会社IDを入力してください: abc123xyz
```

**目的:** 取り消し不可能な操作の誤実行防止

---

### 2. バックアップファイルの管理

**保存形式:**

```json
{
  "metadata": {
    "companyId": "abc123",
    "companyName": "株式会社サンプル",
    "timestamp": "2025-11-30T10:00:00Z",
    "totalDocuments": 500,
    "totalAuthUsers": 10,
    "collections": ["Customers", "OperationResults"],
    "storage": "local",
    "savedAt": "..."
  },
  "data": {
    "customers": [...],
    "operationResults": [...]
  }
}
```

**ファイル名規則:**

- バックアップ: `backup_YYYY-MM-DD_HH-MM-SS.json`
- スナップショット: `snapshot.json`（固定、上書き）

**推奨管理:**

- 定期的な古いバックアップの削除
- 重要なバックアップは別途保管
- ストレージ容量の監視

---

### 3. コレクション追加時の作業

新しいサブコレクション（`Companies/{companyId}/NewCollection`）を追加する場合：

**1. 定数ファイルの更新:**

```javascript
// src/constants/collections.js
export const COMPANY_SUBCOLLECTIONS = [
  // ... 既存のコレクション
  {
    name: "NewCollection",
    waitAfterClear: 0, // Cloud Functions有無で調整
    waitAfterRestore: 0, // Cloud Functions有無で調整
    description: "新しいコレクションの説明",
  },
];
```

**2. Cloud Functions がある場合:**

- `waitAfterClear` と `waitAfterRestore` に適切な時間を設定
- 推奨: 3000 ～ 5000ms

**3. テスト:**

```bash
# Emulator環境でテスト
npm run cli:emulator backup company <companyId>
npm run cli:emulator backup restore <companyId> --collections NewCollection
```

---

### 4. セキュリティベストプラクティス

**秘密鍵の管理:**

- `.gitignore` で除外済み（`*-firebase-adminsdk-*.json`）
- 本番秘密鍵は厳重に管理
- 定期的なローテーション

**環境の分離:**

- 開発: Emulator 優先
- テスト: Dev 環境
- 本番: Prod 環境（慎重に）

**監査証跡:**

- 重要な操作はログ出力
- メタデータに実行者情報を記録

---

## 実装履歴

### 2025-11-29

- ✅ バックアップ・リストア基本機能
- ✅ ストレージ抽象化レイヤー
- ✅ メタデータ管理
- ✅ メンテナンスモード
- ✅ コレクション設定の構造化

### 2025-11-30

- ✅ 差分ベースリストア
- ✅ スナップショット機能
- ✅ フルバックアップリストア
- ✅ verify-users コマンド
- ✅ repair-users コマンド
- ✅ SDK API 同期
- ✅ DEV 環境での実運用テスト
- ✅ データ移行機能の実装見送り判断

---

## 今後の検討事項

### 短期

- [ ] Firebase Storage 実環境テスト
- [ ] verify-users / repair-users のユニットテスト
- [ ] エラーケースの網羅テスト

### 中期

- [ ] バッチ処理の最適化
- [ ] 大規模データセット対応
- [ ] パフォーマンス測定

### 長期

- [ ] バックアップの世代管理
- [ ] 自動バックアップスケジューリング
- [ ] Prod 環境の本格運用

---

## 参考資料

- [README.md](./README.md) - プロジェクト概要
- [COMMANDS.md](./COMMANDS.md) - コマンドリファレンス
- [toDo.md](./toDo.md) - 実装状況
- [src/constants/collections.js](./src/constants/collections.js) - コレクション定義
- [src/commands/](./src/commands/) - 各機能の実装

---

**最終更新:** 2025-11-30  
**管理者:** AirGuard 開発チーム
