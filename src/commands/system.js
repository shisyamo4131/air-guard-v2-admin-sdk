/**
 * System Commands Module
 * システム管理関連のコマンド機能
 */

const admin = require("../firebaseAdmin");

/**
 * メンテナンスモードの状態を取得
 */
async function getMaintenanceStatus(options = {}) {
  try {
    console.log("\nシステムのメンテナンス状態を取得しています...");

    const db = admin.firestore();
    const systemDoc = await db.collection("System").doc("system").get();

    if (!systemDoc.exists) {
      console.log("⚠️  System/systemドキュメントが存在しません。");
      console.log("システムドキュメントを初期化する必要があります。");
      return null;
    }

    const data = systemDoc.data();
    const isMaintenance = data.isMaintenance || false;

    console.log(
      `📊 現在のメンテナンス状態: ${
        isMaintenance ? "🔧 メンテナンス中" : "✅ 稼働中"
      }`
    );
    console.log(
      `📅 最終更新: ${
        data.updatedAt
          ? data.updatedAt.toDate().toLocaleString("ja-JP")
          : "不明"
      }`
    );

    return isMaintenance;
  } catch (error) {
    console.error("\n❌ メンテナンス状態の取得中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * メンテナンスモードを有効にする
 */
async function enableMaintenance(options = {}) {
  try {
    console.log("\n🔧 メンテナンスモードを有効にしています...");

    const db = admin.firestore();
    const systemRef = db.collection("System").doc("system");

    // 現在の状態を確認
    const doc = await systemRef.get();
    if (doc.exists && doc.data().isMaintenance === true) {
      console.log("ℹ️  既にメンテナンスモードが有効です。");
      return;
    }

    // メンテナンスモードを有効にする
    await systemRef.set(
      {
        isMaintenance: true,
        updatedAt: admin.firestore.Timestamp.now(),
        lastMaintenanceBy: "admin-sdk",
      },
      { merge: true }
    );

    console.log("✅ メンテナンスモードが有効になりました。");
    console.log("🚫 ユーザーはシステムにアクセスできません。");
  } catch (error) {
    console.error("\n❌ メンテナンスモード有効化中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * メンテナンスモードを無効にする
 */
async function disableMaintenance(options = {}) {
  try {
    console.log("\n✅ メンテナンスモードを無効にしています...");

    const db = admin.firestore();
    const systemRef = db.collection("System").doc("system");

    // 現在の状態を確認
    const doc = await systemRef.get();
    if (doc.exists && doc.data().isMaintenance === false) {
      console.log("ℹ️  既にメンテナンスモードが無効です。");
      return;
    }

    // メンテナンスモードを無効にする
    await systemRef.set(
      {
        isMaintenance: false,
        updatedAt: admin.firestore.Timestamp.now(),
        lastMaintenanceBy: "admin-sdk",
      },
      { merge: true }
    );

    console.log("✅ メンテナンスモードが無効になりました。");
    console.log("🎉 ユーザーはシステムにアクセス可能です。");
  } catch (error) {
    console.error("\n❌ メンテナンスモード無効化中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * メンテナンスモードの切り替え（トグル）
 */
async function toggleMaintenance(options = {}) {
  try {
    console.log("\n🔄 メンテナンスモードを切り替えています...");

    const currentStatus = await getMaintenanceStatus(options);

    if (currentStatus === null) {
      console.log(
        "⚠️  システムドキュメントが存在しないため、メンテナンスモードを有効にします。"
      );
      await enableMaintenance(options);
    } else if (currentStatus === true) {
      await disableMaintenance(options);
    } else {
      await enableMaintenance(options);
    }
  } catch (error) {
    console.error("\n❌ メンテナンスモード切り替え中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * システムドキュメントを初期化
 */
async function initializeSystem(options = {}) {
  try {
    console.log("\n🚀 システムドキュメントを初期化しています...");

    const db = admin.firestore();
    const systemRef = db.collection("System").doc("system");

    // 既存ドキュメントの確認
    const doc = await systemRef.get();
    if (doc.exists) {
      console.log("ℹ️  System/systemドキュメントは既に存在します。");
      const data = doc.data();
      console.log(`現在の設定: isMaintenance = ${data.isMaintenance || false}`);
      return;
    }

    // システムドキュメントを初期化
    await systemRef.set({
      isMaintenance: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      version: "1.0.0",
      lastMaintenanceBy: "admin-sdk",
    });

    console.log("✅ システムドキュメントが初期化されました。");
    console.log("📋 初期設定: メンテナンスモード = 無効");
  } catch (error) {
    console.error("\n❌ システムドキュメント初期化中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

module.exports = {
  getMaintenanceStatus,
  enableMaintenance,
  disableMaintenance,
  toggleMaintenance,
  initializeSystem,
};
