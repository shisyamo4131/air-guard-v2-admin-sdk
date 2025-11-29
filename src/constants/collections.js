/**
 * Firestore Collections Constants
 * Firestoreコレクション名の定数定義
 */

/**
 * 会社のサブコレクション一覧
 * Companies/{companyId}/ 配下のサブコレクション名
 *
 * 新しいサブコレクションを追加する際は、この配列に追加してください。
 */
const COMPANY_SUBCOLLECTIONS = [
  "ArrangementNotifications",
  "Autonumbers",
  "Billings",
  "Customers",
  "Customers_archive",
  "Employees",
  "Employees_archive",
  "meta",
  "OperationResults",
  "Outsourcers",
  "Outsourcers_archive",
  "Sites",
  "Sites_archive",
  "SiteOperationSchedules",
  "Users",
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
