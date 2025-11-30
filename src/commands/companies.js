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
    console.log(
      `  🔧 メンテナンスモード: ${data.maintenanceMode ? "有効 🔴" : "無効 ✅"}`
    );
    if (data.maintenanceMode) {
      console.log(`     理由: ${data.maintenanceReason || "未設定"}`);
      console.log(
        `     開始日時: ${
          data.maintenanceStartedAt
            ? data.maintenanceStartedAt.toDate().toLocaleString("ja-JP")
            : "不明"
        }`
      );
    }

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
    for (const collection of COMPANY_SUBCOLLECTIONS) {
      const collectionName = collection.name;
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

        // Cloud Functions完了待機
        if (collection.waitAfterClear > 0) {
          console.log(
            `  ⏳ Cloud Functions処理待機中... (${collection.waitAfterClear}ms)`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, collection.waitAfterClear)
          );
        }
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

/**
 * 会社のメンテナンスモードを有効化
 */
async function enableMaintenanceMode(companyId, options = {}) {
  try {
    console.log(
      `\n🔧 メンテナンスモードを有効化しています... (ID: ${companyId})`
    );

    const db = admin.firestore();
    const companyRef = db
      .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
      .doc(companyId);

    // 会社の存在確認
    const companyDoc = await companyRef.get();
    if (!companyDoc.exists) {
      console.log(`❌ 会社ID ${companyId} が見つかりません。`);
      return { success: false, reason: "company-not-found" };
    }

    const companyData = companyDoc.data();

    // 既にメンテナンスモードの場合
    if (companyData.maintenanceMode === true) {
      console.log(`ℹ️  既にメンテナンスモードが有効になっています。`);
      console.log(`   理由: ${companyData.maintenanceReason || "未設定"}`);
      console.log(
        `   開始日時: ${
          companyData.maintenanceStartedAt
            ? companyData.maintenanceStartedAt.toDate().toLocaleString("ja-JP")
            : "不明"
        }`
      );
      return {
        success: true,
        alreadyEnabled: true,
        companyId,
        companyName: companyData.companyName,
      };
    }

    // メンテナンスモードを有効化
    const reason = options.reason || "データ復旧作業中";
    await companyRef.update({
      maintenanceMode: true,
      maintenanceReason: reason,
      maintenanceStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      maintenanceStartedBy: options.adminUid || "admin-sdk",
    });

    console.log("\n✅ メンテナンスモードを有効化しました。");
    console.log(`   会社名: ${companyData.companyName}`);
    console.log(`   理由: ${reason}`);
    console.log(
      `   ⚠️  ユーザーはアプリを使用できなくなります（アプリ側の実装後）`
    );

    return {
      success: true,
      companyId,
      companyName: companyData.companyName,
      reason,
    };
  } catch (error) {
    console.error("\n❌ メンテナンスモードの有効化中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * 会社のメンテナンスモードを解除
 */
async function disableMaintenanceMode(companyId, options = {}) {
  try {
    console.log(
      `\n🔧 メンテナンスモードを解除しています... (ID: ${companyId})`
    );

    const db = admin.firestore();
    const companyRef = db
      .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
      .doc(companyId);

    // 会社の存在確認
    const companyDoc = await companyRef.get();
    if (!companyDoc.exists) {
      console.log(`❌ 会社ID ${companyId} が見つかりません。`);
      return { success: false, reason: "company-not-found" };
    }

    const companyData = companyDoc.data();

    // 既にメンテナンスモードが無効の場合
    if (companyData.maintenanceMode !== true) {
      console.log(`ℹ️  メンテナンスモードは既に無効になっています。`);
      return {
        success: true,
        alreadyDisabled: true,
        companyId,
        companyName: companyData.companyName,
      };
    }

    // メンテナンスモードを解除
    await companyRef.update({
      maintenanceMode: false,
      maintenanceReason: admin.firestore.FieldValue.delete(),
      maintenanceStartedAt: admin.firestore.FieldValue.delete(),
      maintenanceStartedBy: admin.firestore.FieldValue.delete(),
      maintenanceEndedAt: admin.firestore.FieldValue.serverTimestamp(),
      maintenanceEndedBy: options.adminUid || "admin-sdk",
    });

    console.log("\n✅ メンテナンスモードを解除しました。");
    console.log(`   会社名: ${companyData.companyName}`);
    console.log(`   ✅ ユーザーは通常通りアプリを使用できます`);

    return {
      success: true,
      companyId,
      companyName: companyData.companyName,
    };
  } catch (error) {
    console.error("\n❌ メンテナンスモードの解除中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * AuthenticationとUsersドキュメントの整合性を検証
 */
async function verifyUsers(companyId, options = {}) {
  try {
    console.log(
      `\n🔍 Authentication/Users整合性を検証しています... (ID: ${companyId})`
    );

    const db = admin.firestore();
    const auth = admin.auth();

    // 会社の存在確認
    const companyDoc = await db
      .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
      .doc(companyId)
      .get();

    if (!companyDoc.exists) {
      console.log(`⚠️  会社ID ${companyId} が見つかりません。`);
      return null;
    }

    const companyData = companyDoc.data();
    console.log(`\n🏢 会社: ${companyData.companyName || companyId}`);

    // Usersコレクションを取得
    const usersSnapshot = await db
      .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
      .doc(companyId)
      .collection("Users")
      .get();

    const usersMap = new Map();
    const temporaryUsers = [];
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      // isTemporary: true のユーザーは除外（Authentication未作成のため）
      if (data.isTemporary === true) {
        temporaryUsers.push({ uid: doc.id, email: data.email });
      } else {
        usersMap.set(doc.id, data);
      }
    });

    console.log(`\n📊 Usersコレクション: ${usersMap.size}件`);
    if (temporaryUsers.length > 0) {
      console.log(
        `📊 一時ユーザー（isTemporary: true）: ${temporaryUsers.length}件（検証対象外）`
      );
    }

    // Authenticationユーザーを取得（companyIdでフィルタ）
    const authUsers = [];
    let nextPageToken;

    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      listUsersResult.users.forEach((userRecord) => {
        // customClaimsにcompanyIdが含まれているユーザーのみ
        if (
          userRecord.customClaims &&
          userRecord.customClaims.companyId === companyId
        ) {
          authUsers.push(userRecord);
        }
      });
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`📊 Authenticationユーザー: ${authUsers.length}件\n`);

    // 整合性チェック
    const orphanedUsers = []; // 孤立Usersドキュメント
    const missingUsers = []; // 欠損Usersドキュメント

    // 孤立Usersドキュメントをチェック
    for (const [uid, userData] of usersMap.entries()) {
      const authUser = authUsers.find((u) => u.uid === uid);
      if (!authUser) {
        orphanedUsers.push({ uid, email: userData.email, userData });
      }
    }

    // 欠損Usersドキュメントをチェック
    for (const authUser of authUsers) {
      if (!usersMap.has(authUser.uid)) {
        missingUsers.push({
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          customClaims: authUser.customClaims,
        });
      }
    }

    // 結果表示
    if (orphanedUsers.length === 0 && missingUsers.length === 0) {
      console.log("✅ 整合性: OK");
      console.log(
        "   すべてのAuthenticationとUsersドキュメントが一致しています。\n"
      );
      return { ok: true, orphanedUsers: [], missingUsers: [] };
    }

    console.log("⚠️  整合性の問題を検出しました:\n");

    if (orphanedUsers.length > 0) {
      console.log(`🔴 孤立Usersドキュメント: ${orphanedUsers.length}件`);
      console.log("   （Authenticationに存在しないUID）");
      orphanedUsers.forEach((user) => {
        console.log(`   - UID: ${user.uid}`);
        console.log(`     Email: ${user.email || "不明"}`);
      });
      console.log(
        "\n   💡 対処方法: 会社のAdminがアプリ上でユーザーを削除し、再作成"
      );
      console.log(
        "              Usersドキュメント削除時、Cloud FunctionsでAuthentication自動削除\n"
      );
    }

    if (missingUsers.length > 0) {
      console.log(`🔴 欠損Usersドキュメント: ${missingUsers.length}件`);
      console.log("   （Authenticationは存在するがUsersがない）");
      missingUsers.forEach((user) => {
        console.log(`   - UID: ${user.uid}`);
        console.log(`     Email: ${user.email || "不明"}`);
        console.log(`     DisplayName: ${user.displayName || "不明"}`);
      });
      console.log(
        "\n   💡 対処方法: `companies repair-users <companyId>` コマンドで自動修復\n"
      );
    }

    return {
      ok: false,
      orphanedUsers,
      missingUsers,
    };
  } catch (error) {
    console.error("\n❌ エラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * 欠損Usersドキュメントを修復（Authenticationアカウントを削除）
 */
async function repairUsers(companyId, options = {}) {
  try {
    console.log(
      `\n🔧 欠損Usersドキュメントを修復しています... (ID: ${companyId})`
    );

    const db = admin.firestore();
    const auth = admin.auth();

    // 会社の存在確認
    const companyDoc = await db
      .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
      .doc(companyId)
      .get();

    if (!companyDoc.exists) {
      console.log(`⚠️  会社ID ${companyId} が見つかりません。`);
      return null;
    }

    const companyData = companyDoc.data();
    console.log(`\n🏢 会社: ${companyData.companyName || companyId}`);

    // 1. 整合性検証を実行
    console.log(`\n🔍 整合性を検証しています...`);
    const verifyResult = await verifyUsers(companyId, options);

    if (!verifyResult) {
      console.log(`\n❌ 整合性検証に失敗しました。`);
      return null;
    }

    // 欠損Usersドキュメントがない場合
    if (verifyResult.ok || verifyResult.missingUsers.length === 0) {
      console.log(`\n✅ 欠損Usersドキュメントは見つかりませんでした。`);
      console.log(`   修復の必要はありません。\n`);
      return { repaired: 0, errors: [] };
    }

    const missingUsers = verifyResult.missingUsers;
    console.log(`\n⚠️  欠損Usersドキュメント: ${missingUsers.length}件`);

    // 2. 管理者アカウント（isAdmin: true）の存在確認
    console.log(`\n🔍 管理者アカウントの存在を確認しています...`);
    const usersSnapshot = await db
      .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
      .doc(companyId)
      .collection("Users")
      .get();

    const hasAdmin = Array.from(usersSnapshot.docs).some((doc) => {
      const data = doc.data();
      return data.isAdmin === true && data.isTemporary !== true;
    });

    if (!hasAdmin) {
      console.log(`\n❌ 管理者アカウント（isAdmin: true）が見つかりません。`);
      console.log(`   会社データの整合性が失われています。`);
      console.log(`   この会社データは再構築が必要です。`);
      console.log(
        `\n💡 対処方法: 新しい会社データを作成し、データを移行してください。\n`
      );
      return null;
    }

    console.log(`✅ 管理者アカウントが存在します。修復を続行します。`);

    // 3. 各欠損ユーザーのAuthenticationアカウントを削除
    console.log(
      `\n🗑️  ${missingUsers.length}件のAuthenticationアカウントを削除します...`
    );

    const deletedUsers = [];
    const errors = [];

    for (const user of missingUsers) {
      try {
        // companyIdの確認（安全装置）
        const userRecord = await auth.getUser(user.uid);
        if (
          !userRecord.customClaims ||
          userRecord.customClaims.companyId !== companyId
        ) {
          console.log(
            `⚠️  スキップ: ${user.email} (companyId不一致またはクレーム未設定)`
          );
          errors.push({
            uid: user.uid,
            email: user.email,
            reason: "companyId不一致",
          });
          continue;
        }

        // Authenticationアカウント削除
        await auth.deleteUser(user.uid);
        console.log(`✅ 削除: ${user.email} (UID: ${user.uid})`);
        deletedUsers.push(user);
      } catch (error) {
        console.log(`❌ エラー: ${user.email} - ${error.message}`);
        errors.push({
          uid: user.uid,
          email: user.email,
          reason: error.message,
        });
      }
    }

    // 4. 結果サマリー
    console.log(`\n✅ 修復が完了しました！`);
    console.log(`\n📊 修復サマリー:`);
    console.log(`  - 削除成功: ${deletedUsers.length}件`);
    console.log(`  - 削除失敗: ${errors.length}件`);

    if (deletedUsers.length > 0) {
      console.log(`\n📋 削除されたAuthenticationアカウント:`);
      deletedUsers.forEach((user) => {
        console.log(`  - ${user.email} (UID: ${user.uid})`);
      });
    }

    if (errors.length > 0) {
      console.log(`\n⚠️  エラーが発生したアカウント:`);
      errors.forEach((error) => {
        console.log(`  - ${error.email} (UID: ${error.uid}) - ${error.reason}`);
      });
    }

    console.log(
      `\n💡 次のステップ: 会社のAdminに以下のユーザーの再招待を依頼してください。`
    );
    deletedUsers.forEach((user) => {
      console.log(`  - ${user.email}`);
    });
    console.log();

    return {
      repaired: deletedUsers.length,
      errors: errors,
      deletedUsers: deletedUsers,
    };
  } catch (error) {
    console.error("\n❌ エラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

module.exports = {
  getCompanyInfo,
  listCompanyUsers,
  deleteCompany,
  enableMaintenanceMode,
  disableMaintenanceMode,
  verifyUsers,
  repairUsers,
};
