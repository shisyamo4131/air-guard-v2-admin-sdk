const admin = require("firebase-admin");

/**
 * スーパーユーザークレームを設定
 * @param {string} uid - ユーザーのUID
 */
async function setSuperUserClaim(uid) {
  try {
    console.log(`\n🔧 スーパーユーザークレームを設定中...`);
    console.log(`UID: ${uid}`);

    // 現在のカスタムクレームを取得
    const user = await admin.auth().getUser(uid);
    const currentClaims = user.customClaims || {};

    // スーパーユーザークレームを追加
    const newClaims = {
      ...currentClaims,
      isSuperUser: true,
    };

    // カスタムクレームを設定
    await admin.auth().setCustomUserClaims(uid, newClaims);

    console.log("\n✅ スーパーユーザークレームを設定しました");
    console.log(`Email: ${user.email}`);
    console.log(`カスタムクレーム:`, JSON.stringify(newClaims, null, 2));
    console.log("\n⚠️  ユーザーは次回ログイン時に新しい権限が適用されます");
  } catch (error) {
    console.error("\n❌ エラーが発生しました:", error.message);
    throw error;
  }
}

/**
 * スーパーユーザークレームを削除
 * @param {string} uid - ユーザーのUID
 */
async function removeSuperUserClaim(uid) {
  try {
    console.log(`\n🔧 スーパーユーザークレームを削除中...`);
    console.log(`UID: ${uid}`);

    // 現在のカスタムクレームを取得
    const user = await admin.auth().getUser(uid);
    const currentClaims = user.customClaims || {};

    // スーパーユーザークレームを削除
    const newClaims = { ...currentClaims };
    delete newClaims.isSuperUser;

    // カスタムクレームを設定
    await admin.auth().setCustomUserClaims(uid, newClaims);

    console.log("\n✅ スーパーユーザークレームを削除しました");
    console.log(`Email: ${user.email}`);
    console.log(`カスタムクレーム:`, JSON.stringify(newClaims, null, 2));
    console.log("\n⚠️  ユーザーは次回ログイン時に権限が更新されます");
  } catch (error) {
    console.error("\n❌ エラーが発生しました:", error.message);
    throw error;
  }
}

/**
 * 開発者クレームを設定
 * @param {string} uid - ユーザーのUID
 */
async function setDeveloperClaim(uid) {
  try {
    console.log(`\n🔧 開発者クレームを設定中...`);
    console.log(`UID: ${uid}`);

    // 現在のカスタムクレームを取得
    const user = await admin.auth().getUser(uid);
    const currentClaims = user.customClaims || {};

    // 開発者クレームを追加
    const newClaims = {
      ...currentClaims,
      isDeveloper: true,
    };

    // カスタムクレームを設定
    await admin.auth().setCustomUserClaims(uid, newClaims);

    console.log("\n✅ 開発者クレームを設定しました");
    console.log(`Email: ${user.email}`);
    console.log(`カスタムクレーム:`, JSON.stringify(newClaims, null, 2));
    console.log("\n⚠️  ユーザーは次回ログイン時に新しい権限が適用されます");
  } catch (error) {
    console.error("\n❌ エラーが発生しました:", error.message);
    throw error;
  }
}

/**
 * 開発者クレームを削除
 * @param {string} uid - ユーザーのUID
 */
async function removeDeveloperClaim(uid) {
  try {
    console.log(`\n🔧 開発者クレームを削除中...`);
    console.log(`UID: ${uid}`);

    // 現在のカスタムクレームを取得
    const user = await admin.auth().getUser(uid);
    const currentClaims = user.customClaims || {};

    // 開発者クレームを削除
    const newClaims = { ...currentClaims };
    delete newClaims.isDeveloper;

    // カスタムクレームを設定
    await admin.auth().setCustomUserClaims(uid, newClaims);

    console.log("\n✅ 開発者クレームを削除しました");
    console.log(`Email: ${user.email}`);
    console.log(`カスタムクレーム:`, JSON.stringify(newClaims, null, 2));
    console.log("\n⚠️  ユーザーは次回ログイン時に権限が更新されます");
  } catch (error) {
    console.error("\n❌ エラーが発生しました:", error.message);
    throw error;
  }
}

module.exports = {
  setSuperUserClaim,
  removeSuperUserClaim,
  setDeveloperClaim,
  removeDeveloperClaim,
};
