/**
 * Firestore Collections Constants
 * Firestoreコレクション名の定数定義
 */

/**
 * 会社のサブコレクション一覧
 * Companies/{companyId}/ 配下のサブコレクション名
 *
 * 処理順序: 配列の順番に従って処理されます
 * waitAfterClear: 初期化(全削除)後の待機時間(ms) - Cloud Functionsの完了を待つ
 * waitAfterRestore: リストア後の待機時間(ms) - Cloud Functionsの完了を待つ
 *
 * Cloud Functionsトリガーの依存関係:
 * - Customers → Sites.customer プロパティ同期
 * - OperationResults → Billings 自動生成
 */
const COMPANY_SUBCOLLECTIONS = [
  {
    name: "Customers",
    waitAfterClear: 3000, // Sitesへの伝播待機
    waitAfterRestore: 5000, // コールドスタート考慮
    description: "取引先マスタ（Sitesトリガー元）",
  },
  {
    name: "Customers_archive",
    waitAfterClear: 0,
    waitAfterRestore: 0,
    description: "取引先アーカイブ",
  },
  {
    name: "Sites",
    waitAfterClear: 0,
    waitAfterRestore: 0,
    description: "現場マスタ（Customersから同期）",
  },
  {
    name: "Sites_archive",
    waitAfterClear: 0,
    waitAfterRestore: 0,
    description: "現場アーカイブ",
  },
  {
    name: "Employees",
    waitAfterClear: 0,
    waitAfterRestore: 0,
    description: "従業員マスタ",
  },
  {
    name: "Employees_archive",
    waitAfterClear: 0,
    waitAfterRestore: 0,
    description: "従業員アーカイブ",
  },
  {
    name: "Outsourcers",
    waitAfterClear: 0,
    waitAfterRestore: 0,
    description: "外注先マスタ",
  },
  {
    name: "Outsourcers_archive",
    waitAfterClear: 0,
    waitAfterRestore: 0,
    description: "外注先アーカイブ",
  },
  {
    name: "SiteOperationSchedules",
    waitAfterClear: 0,
    waitAfterRestore: 0,
    description: "現場稼働予定",
  },
  {
    name: "OperationResults",
    waitAfterClear: 3000, // Billings同期待機
    waitAfterRestore: 5000, // コールドスタート考慮
    description: "稼働実績（Billingsトリガー元）",
  },
  {
    name: "Billings",
    waitAfterClear: 0,
    waitAfterRestore: 0,
    description: "請求データ（OperationResultsから自動生成）",
  },
  {
    name: "ArrangementNotifications",
    waitAfterClear: 0,
    waitAfterRestore: 0,
    description: "配置通知",
  },
  {
    name: "Autonumbers",
    waitAfterClear: 0,
    waitAfterRestore: 0,
    description: "採番管理",
  },
  {
    name: "Users",
    waitAfterClear: 0,
    waitAfterRestore: 0,
    description: "ユーザー情報（最後に処理）",
  },
];

/**
 * トップレベルコレクション名
 */
const TOP_LEVEL_COLLECTIONS = {
  COMPANIES: "Companies",
  SYSTEM: "System",
  ADMIN_USERS: "admin_users",
};

module.exports = {
  COMPANY_SUBCOLLECTIONS,
  TOP_LEVEL_COLLECTIONS,
};
