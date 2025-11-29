/**
 * Companies Commands Module
 * 会社管理関連のコマンド機能
 */

const admin = require("../firebaseAdmin");
const {
  COMPANY_SUBCOLLECTIONS,
  TOP_LEVEL_COLLECTIONS,
} = require("../constants/collections");

/**
 * 会社情報を取得して表示
 */
async function getCompanyInfo(companyId, options = {}) {
  try {
    console.log(`\n📋 会社情報を取得しています... (ID: ${companyId})`);

    const db = admin.firestore();
    const companyDoc = await db
      .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
      .doc(companyId)
      .get();

    if (!companyDoc.exists) {
      console.log(`⚠️  会社ID ${companyId} が見つかりません。`);
      return null;
    }

    const data = companyDoc.data();
    console.log("\n✅ 会社情報:");
    console.log(`  📛 会社名: ${data.companyName || "未設定"}`);
    console.log(`  📛 会社名カナ: ${data.companyNameKana || "未設定"}`);
    console.log(
      `  📅 作成日: ${
        data.createdAt
          ? data.createdAt.toDate().toLocaleString("ja-JP")
          : "不明"
      }`
    );
    console.log(
      `  📅 更新日: ${
        data.updatedAt
          ? data.updatedAt.toDate().toLocaleString("ja-JP")
          : "不明"
      }`
    );

    return data;
  } catch (error) {
    console.error("\n❌ 会社情報の取得中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * 会社に紐づくユーザー一覧を取得
 */
async function listCompanyUsers(companyId, options = {}) {
  try {
    console.log(
      `\n👥 会社のユーザー一覧を取得しています... (ID: ${companyId})`
    );

    const auth = admin.auth();
    const db = admin.firestore();

    // Firestoreから会社のユーザードキュメントを取得
    const usersSnapshot = await db
      .collection(`${TOP_LEVEL_COLLECTIONS.COMPANIES}/${companyId}/Users`)
      .get();

    if (usersSnapshot.empty) {
      console.log("ℹ️  この会社にユーザーは登録されていません。");
      return [];
    }

    console.log(
      `\n📊 合計 ${usersSnapshot.size} 名のユーザーが見つかりました:\n`
    );

    const users = [];
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      users.push({
        uid: doc.id,
        email: userData.email,
        displayName: userData.displayName,
        isAdmin: userData.isAdmin,
        isTemporary: userData.isTemporary,
        disabled: userData.disabled,
      });

      console.log(`  👤 ${userData.email}`);
      console.log(`     UID: ${doc.id}`);
      console.log(`     表示名: ${userData.displayName || "未設定"}`);
      console.log(`     管理者: ${userData.isAdmin ? "はい" : "いいえ"}`);
      console.log(`     仮登録: ${userData.isTemporary ? "はい" : "いいえ"}`);
      console.log(`     無効化: ${userData.disabled ? "はい" : "いいえ"}`);
      console.log("");
    }

    return users;
  } catch (error) {
    console.error("\n❌ ユーザー一覧の取得中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * 会社データとユーザーを一括削除
 *
 * ⚠️ 危険な操作: この操作は取り消せません
 *
 * 削除される内容:
 * 1. Authenticationから該当companyIdを持つ全ユーザー
 * 2. Firestore Companies/{companyId} ドキュメントと全サブコレクション
 */
async function deleteCompany(companyId, options = {}) {
  try {
    console.log(
      `\n⚠️  警告: 会社データの一括削除を開始します (ID: ${companyId})`
    );
    console.log("この操作は取り消せません！\n");

    const db = admin.firestore();
    const auth = admin.auth();

    // 1. 会社情報の確認
    const companyInfo = await getCompanyInfo(companyId, options);
    if (!companyInfo) {
      console.log("❌ 会社が見つからないため、処理を中断します。");
      return { success: false, reason: "company-not-found" };
    }

    // 2. 削除対象ユーザーの取得
    console.log("\n🔍 削除対象ユーザーを検索しています...");
    const users = await listCompanyUsers(companyId, options);

    if (users.length === 0) {
      console.log("ℹ️  削除対象のユーザーはいません。");
    } else {
      console.log(`\n🗑️  ${users.length} 名のユーザーを削除します...\n`);

      // 3. Authenticationからユーザーを削除
      for (const user of users) {
        try {
          // 仮登録ユーザー(isTemporary=true)はAuthenticationに存在しない可能性がある
          if (!user.isTemporary) {
            await auth.deleteUser(user.uid);
            console.log(`  ✅ Authentication削除: ${user.email} (${user.uid})`);
          } else {
            console.log(`  ⏭️  スキップ(仮登録): ${user.email} (${user.uid})`);
          }
        } catch (error) {
          if (error.code === "auth/user-not-found") {
            console.log(
              `  ⚠️  Authentication未登録: ${user.email} (${user.uid})`
            );
          } else {
            console.error(`  ❌ 削除失敗: ${user.email} - ${error.message}`);
          }
        }
      }
    }

    // 4. Firestoreサブコレクションを削除
    console.log("\n🗑️  Firestoreサブコレクションを削除しています...");

    // 定数ファイルからサブコレクションリストを取得
    for (const collectionName of COMPANY_SUBCOLLECTIONS) {
      const collectionRef = db.collection(
        `${TOP_LEVEL_COLLECTIONS.COMPANIES}/${companyId}/${collectionName}`
      );
      const snapshot = await collectionRef.get();

      if (!snapshot.empty) {
        console.log(
          `  🗑️  ${collectionName}: ${snapshot.size} ドキュメント削除中...`
        );

        // バッチ削除（500件ずつ）
        const batchSize = 500;
        let batch = db.batch();
        let count = 0;

        for (const doc of snapshot.docs) {
          batch.delete(doc.ref);
          count++;

          if (count >= batchSize) {
            await batch.commit();
            batch = db.batch();
            count = 0;
          }
        }

        // 残りを削除
        if (count > 0) {
          await batch.commit();
        }

        console.log(`  ✅ ${collectionName}: 削除完了`);
      } else {
        console.log(`  ⏭️  ${collectionName}: ドキュメントなし`);
      }
    }

    // 5. 会社ドキュメント本体を削除
    console.log("\n🗑️  会社ドキュメントを削除しています...");
    await db
      .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
      .doc(companyId)
      .delete();
    console.log("  ✅ 会社ドキュメント削除完了");

    console.log("\n✅ 会社データの一括削除が完了しました。");
    console.log(`📊 削除サマリー:`);
    console.log(`  - 会社ID: ${companyId}`);
    console.log(`  - 削除ユーザー数: ${users.length} 名`);
    console.log(
      `  - 削除サブコレクション数: ${COMPANY_SUBCOLLECTIONS.length} 種類`
    );

    return {
      success: true,
      companyId,
      deletedUsers: users.length,
      deletedCollections: COMPANY_SUBCOLLECTIONS.length,
    };
  } catch (error) {
    console.error("\n❌ 会社データ削除中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

module.exports = {
  getCompanyInfo,
  listCompanyUsers,
  deleteCompany,
};
