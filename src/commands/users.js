const admin = require("firebase-admin");

async function listSuperUsers() {
  console.log("スーパーユーザー一覧機能はまだ実装されていません。");
}

async function viewUserClaims(uid) {
  console.log("ユーザークレーム表示機能はまだ実装されていません。");
}

async function viewUserClaimsByEmail(email) {
  console.log("メールアドレスによるクレーム表示機能はまだ実装されていません。");
}

module.exports = {
  listSuperUsers,
  viewUserClaims,
  viewUserClaimsByEmail,
};
