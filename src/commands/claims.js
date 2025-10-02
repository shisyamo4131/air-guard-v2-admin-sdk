const admin = require('firebase-admin');

async function setSuperUserClaim(uid) {
  console.log('スーパーユーザークレーム設定機能はまだ実装されていません。');
}

async function removeSuperUserClaim(uid) {
  console.log('スーパーユーザークレーム削除機能はまだ実装されていません。');
}

async function setDeveloperClaim(uid) {
  console.log('開発者クレーム設定機能はまだ実装されていません。');
}

async function removeDeveloperClaim(uid) {
  console.log('開発者クレーム削除機能はまだ実装されていません。');
}

module.exports = {
  setSuperUserClaim,
  removeSuperUserClaim,
  setDeveloperClaim,
  removeDeveloperClaim
};
