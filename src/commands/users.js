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

// メールアドレスからUIDを取得
async function getUidByEmail(email) {
  try {
    console.log(`📧 メールアドレス: ${email}`);
    console.log("🔍 UIDを検索中...");

    const user = await admin.auth().getUserByEmail(email);

    console.log("✅ ユーザーが見つかりました:");
    console.log(`🆔 UID: ${user.uid}`);
    console.log(`👤 表示名: ${user.displayName || "なし"}`);
    console.log(
      `📬 メール認証: ${user.emailVerified ? "✅ 済み" : "❌ 未認証"}`
    );
    console.log(`🚫 アカウント状態: ${user.disabled ? "❌ 無効" : "✅ 有効"}`);

    if (user.customClaims && Object.keys(user.customClaims).length > 0) {
      console.log("🏷️ カスタムクレーム:");
      Object.entries(user.customClaims).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    } else {
      console.log("🏷️ カスタムクレーム: なし");
    }

    // コピー用にUIDだけを別途表示
    console.log("");
    console.log("📋 コピー用UID:");
    console.log(user.uid);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      console.error(
        `❌ エラー: メールアドレス '${email}' のユーザーが見つかりませんでした。`
      );
    } else {
      console.error("❌ UID取得に失敗しました:", error.message);
    }
    process.exit(1);
  }
}

module.exports = {
  listSuperUsers,
  viewUserClaims,
  viewUserClaimsByEmail,
  getUidByEmail,
};
