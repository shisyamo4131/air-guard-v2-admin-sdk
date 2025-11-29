/**
 * Backup Commands Module
 * バックアップ・リストア関連のコマンド機能
 */

const admin = require("../firebaseAdmin");
const {
  COMPANY_SUBCOLLECTIONS,
  TOP_LEVEL_COLLECTIONS,
} = require("../constants/collections");
const path = require("path");
const fs = require("fs").promises;
const inquirer = require("inquirer");

const DEFAULT_BACKUP_DIR = "./backups";

/**
 * 仮パスワードを生成
 */
function generateTemporaryPassword() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `Temp${timestamp}${random}!`;
}

/**
 * 日本時間(JST)のタイムスタンプを生成
 * フォーマット: YYYY-MM-DD_HH-MM-SS
 */
function getJSTTimestamp() {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // JST is UTC+9
  const jstDate = new Date(now.getTime() + jstOffset);

  return jstDate
    .toISOString()
    .replace(/:/g, "-")
    .split(".")[0]
    .replace("T", "_");
}

/**
 * Firestoreタイムスタンプを文字列に変換（バックアップ用）
 * オブジェクトを再帰的に処理し、Timestampを見つけたらISO文字列に変換
 */
function convertTimestampsToStrings(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Firestoreタイムスタンプの判定
  if (obj instanceof admin.firestore.Timestamp) {
    return {
      _timestamp: true,
      value: obj.toDate().toISOString(),
    };
  }

  // 配列の場合
  if (Array.isArray(obj)) {
    return obj.map((item) => convertTimestampsToStrings(item));
  }

  // オブジェクトの場合
  if (typeof obj === "object") {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertTimestampsToStrings(value);
    }
    return converted;
  }

  // プリミティブ型はそのまま返す
  return obj;
}

/**
 * 文字列をFirestoreタイムスタンプに変換（リストア用）
 * オブジェクトを再帰的に処理し、タイムスタンプマーカーを見つけたらTimestampに変換
 */
function convertStringsToTimestamps(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // タイムスタンプマーカーの判定
  if (
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    obj._timestamp === true &&
    obj.value
  ) {
    return admin.firestore.Timestamp.fromDate(new Date(obj.value));
  }

  // 配列の場合
  if (Array.isArray(obj)) {
    return obj.map((item) => convertStringsToTimestamps(item));
  }

  // オブジェクトの場合
  if (typeof obj === "object") {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertStringsToTimestamps(value);
    }
    return converted;
  }

  // プリミティブ型はそのまま返す
  return obj;
}

/**
 * Authenticationユーザー情報を取得
 */
async function getAuthUserInfo(uid) {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      disabled: userRecord.disabled,
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
      },
      customClaims: userRecord.customClaims || {},
    };
  } catch (error) {
    console.warn(
      `  ⚠️  Authentication情報取得失敗 (UID: ${uid}): ${error.message}`
    );
    return null;
  }
}

/**
 * 会社データを収集
 */
async function collectCompanyData(companyId) {
  const db = admin.firestore();

  console.log(`\n📦 会社データを収集しています... (ID: ${companyId})`);

  // 1. 会社ドキュメントを取得
  console.log("  📄 会社ドキュメントを取得中...");
  const companyDoc = await db
    .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
    .doc(companyId)
    .get();

  if (!companyDoc.exists) {
    throw new Error(`会社ID ${companyId} が見つかりません。`);
  }

  const companyData = companyDoc.data();
  console.log(`  ✅ 会社: ${companyData.companyName}`);

  // 2. サブコレクションを取得
  console.log("\n  📚 サブコレクションを取得中...");
  const subCollections = {};

  for (const collectionName of COMPANY_SUBCOLLECTIONS) {
    const snapshot = await db
      .collection(
        `${TOP_LEVEL_COLLECTIONS.COMPANIES}/${companyId}/${collectionName}`
      )
      .get();

    if (!snapshot.empty) {
      subCollections[collectionName] = snapshot.docs.map((doc) => ({
        docId: doc.id,
        data: convertTimestampsToStrings(doc.data()), // タイムスタンプを文字列に変換
      }));
      console.log(`  ✅ ${collectionName}: ${snapshot.size} ドキュメント`);
    } else {
      console.log(`  ⏭️  ${collectionName}: ドキュメントなし`);
    }
  }

  // 3. Authenticationユーザー情報を取得
  console.log("\n  👥 Authenticationユーザー情報を取得中...");
  const authUsers = [];

  if (subCollections.Users) {
    for (const userDoc of subCollections.Users) {
      if (!userDoc.data.isTemporary) {
        const authInfo = await getAuthUserInfo(userDoc.docId);
        if (authInfo) {
          authUsers.push(authInfo);
          console.log(`  ✅ ${authInfo.email} (UID: ${authInfo.uid})`);
        }
      } else {
        console.log(`  ⏭️  ${userDoc.data.email} (仮登録ユーザー)`);
      }
    }
  }

  return {
    backupDate: new Date().toISOString(),
    companyId: companyId,
    company: convertTimestampsToStrings(companyData), // タイムスタンプを文字列に変換
    subCollections: subCollections,
    authUsers: authUsers,
    metadata: {
      totalDocuments: Object.values(subCollections).reduce(
        (sum, docs) => sum + docs.length,
        0
      ),
      totalAuthUsers: authUsers.length,
      collections: Object.keys(subCollections),
    },
  };
}

/**
 * 会社データをバックアップ
 */
async function backupCompany(companyId, options = {}) {
  try {
    const outputDir = options.output || DEFAULT_BACKUP_DIR;
    const timestamp = getJSTTimestamp();
    const filename = `backup_${timestamp}.json`;
    const companyBackupDir = path.join(outputDir, "companies", companyId);
    const filepath = path.join(companyBackupDir, filename);

    console.log(`\n🔧 バックアップを開始します`);
    console.log(`📂 出力先: ${filepath}`);

    // バックアップデータ収集
    const backupData = await collectCompanyData(companyId);

    // ディレクトリ作成
    await fs.mkdir(companyBackupDir, { recursive: true });

    // JSONファイルに保存
    const jsonContent = JSON.stringify(backupData, null, 2);
    await fs.writeFile(filepath, jsonContent, "utf-8");

    // ファイルサイズ取得
    const stats = await fs.stat(filepath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    console.log("\n✅ バックアップが完了しました！");
    console.log(`📄 ファイル: ${filepath}`);
    console.log(`📊 ファイルサイズ: ${fileSizeKB} KB`);
    console.log(`\n📈 バックアップ統計:`);
    console.log(`  - 会社名: ${backupData.company.companyName}`);
    console.log(`  - 総ドキュメント数: ${backupData.metadata.totalDocuments}`);
    console.log(
      `  - Authenticationユーザー数: ${backupData.metadata.totalAuthUsers}`
    );
    console.log(
      `  - コレクション数: ${backupData.metadata.collections.length}`
    );

    return {
      success: true,
      filepath: filepath,
      backupData: backupData,
    };
  } catch (error) {
    console.error("\n❌ バックアップ中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * バックアップファイルを選択してリストア
 */
async function restoreCompanyInteractive(companyId, options = {}) {
  try {
    const outputDir = options.output || DEFAULT_BACKUP_DIR;
    const companyBackupDir = path.join(outputDir, "companies", companyId);

    console.log(`\n📋 会社 ${companyId} のバックアップを検索中...\n`);

    // バックアップファイル一覧取得
    try {
      await fs.access(companyBackupDir);
    } catch {
      console.error(`❌ 会社 ${companyId} のバックアップが見つかりません。`);
      return;
    }

    const files = await fs.readdir(companyBackupDir);
    const backupFiles = files.filter(
      (f) => f.startsWith("backup_") && f.endsWith(".json")
    );

    if (backupFiles.length === 0) {
      console.error(`❌ 会社 ${companyId} のバックアップが見つかりません。`);
      return;
    }

    // バックアップファイルの詳細情報を取得
    const choices = [];
    for (const file of backupFiles.sort().reverse()) {
      const filepath = path.join(companyBackupDir, file);
      const content = await fs.readFile(filepath, "utf-8");
      const data = JSON.parse(content);

      choices.push({
        name: `${file} - ${new Date(data.backupDate).toLocaleString(
          "ja-JP"
        )} (${data.metadata.totalDocuments}ドキュメント, ${
          data.metadata.totalAuthUsers
        }ユーザー)`,
        value: filepath,
        short: file,
      });
    }

    // ユーザーに選択させる
    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "backupFile",
        message: "リストアするバックアップファイルを選択してください:",
        choices: choices,
        pageSize: 10,
      },
      {
        type: "confirm",
        name: "confirm",
        message: "このバックアップからリストアしますか？",
        default: false,
      },
    ]);

    if (!answers.confirm) {
      console.log("\n❌ リストアをキャンセルしました。");
      return;
    }

    // リストア実行
    await restoreCompany(answers.backupFile, options);
  } catch (error) {
    console.error("\n❌ エラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * バックアップからデータをリストア
 */
async function restoreCompany(backupFile, options = {}) {
  try {
    console.log(`\n🔧 リストアを開始します`);
    console.log(`📂 バックアップファイル: ${backupFile}`);

    // バックアップファイル読み込み
    console.log("\n📖 バックアップファイルを読み込んでいます...");
    const content = await fs.readFile(backupFile, "utf-8");
    const backupData = JSON.parse(content);

    const { companyId, company, subCollections, authUsers } = backupData;

    console.log(`\n🏢 会社情報:`);
    console.log(`  - 会社名: ${company.companyName}`);
    console.log(`  - 会社ID: ${companyId}`);
    console.log(
      `  - バックアップ日時: ${new Date(backupData.backupDate).toLocaleString(
        "ja-JP"
      )}`
    );

    const db = admin.firestore();

    // 0. 既存データの削除確認
    console.log("\n⚠️  既存データの削除について:");
    console.log(
      "  リストアを実行すると、既存のデータは完全に置き換えられます。"
    );

    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const shouldDelete = await new Promise((resolve) => {
      readline.question(
        `\n既存データを削除してリストアしますか？ (yes/no): `,
        (answer) => {
          readline.close();
          resolve(answer.toLowerCase() === "yes");
        }
      );
    });

    if (!shouldDelete) {
      console.log("\n❌ リストアをキャンセルしました。");
      return;
    }

    // 1. 既存のサブコレクションを削除（全て）
    console.log("\n🗑️  既存データを削除中...");
    for (const collectionName of COMPANY_SUBCOLLECTIONS) {
      const snapshot = await db
        .collection(
          `${TOP_LEVEL_COLLECTIONS.COMPANIES}/${companyId}/${collectionName}`
        )
        .get();

      if (!snapshot.empty) {
        const batch = db.batch();
        let count = 0;

        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          count++;
        });

        if (count > 0) {
          await batch.commit();
          console.log(`  ✅ ${collectionName}: ${count}件削除`);
        }
      }
    }

    // 2. 既存のAuthenticationユーザーを削除
    console.log("\n🗑️  既存Authenticationユーザーを削除中...");
    if (subCollections.Users) {
      for (const userDoc of subCollections.Users) {
        try {
          await admin.auth().deleteUser(userDoc.docId);
          console.log(`  ✅ ${userDoc.data.email || userDoc.docId} を削除`);
        } catch (error) {
          if (error.code === "auth/user-not-found") {
            console.log(`  ⏭️  ${userDoc.docId} - 既に削除済み`);
          } else {
            console.warn(`  ⚠️  ${userDoc.docId} - 削除失敗: ${error.message}`);
          }
        }
      }
    }

    // 3. 会社ドキュメントをリストア
    console.log("\n📄 会社ドキュメントをリストア中...");
    const restoredCompanyData = convertStringsToTimestamps(company);
    await db
      .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
      .doc(companyId)
      .set(restoredCompanyData);
    console.log(`  ✅ 会社ドキュメントを作成しました`);

    // 4. サブコレクションをリストア（Usersは後でリストア）
    console.log("\n📚 サブコレクションをリストア中...");
    let restoredDocs = 0;

    for (const [collectionName, documents] of Object.entries(subCollections)) {
      if (!documents || documents.length === 0) continue;
      if (collectionName === "Users") continue; // Usersは後でリストア

      console.log(`  📁 ${collectionName} (${documents.length}件)...`);

      const batch = db.batch();
      let batchCount = 0;

      for (const doc of documents) {
        const docRef = db
          .collection(
            `${TOP_LEVEL_COLLECTIONS.COMPANIES}/${companyId}/${collectionName}`
          )
          .doc(doc.docId);

        const restoredData = convertStringsToTimestamps(doc.data);
        batch.set(docRef, restoredData);
        batchCount++;
        restoredDocs++;

        // Firestoreバッチは500件まで
        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      console.log(`  ✅ ${collectionName}: ${documents.length}件リストア完了`);
    }

    // 5. Authenticationユーザーをリストア
    console.log("\n👥 Authenticationユーザーをリストア中...");
    console.log(
      `  バックアップには ${authUsers.length} 人のユーザーが含まれています`
    );

    const restoredUsers = [];
    const skippedUsers = [];

    for (const authUser of authUsers) {
      try {
        // 仮パスワード生成
        const tempPassword = generateTemporaryPassword();

        console.log(`  ⚙️  ${authUser.email} を作成中...`);

        // ユーザー作成データを準備
        const createUserData = {
          uid: authUser.uid,
          email: authUser.email,
          emailVerified: authUser.emailVerified,
          password: tempPassword,
          disabled: authUser.disabled,
        };

        // displayNameがある場合のみ追加
        if (authUser.displayName) {
          createUserData.displayName = authUser.displayName;
        }

        // photoURLが有効なURLの場合のみ追加
        if (authUser.photoURL && authUser.photoURL.trim() !== "") {
          createUserData.photoURL = authUser.photoURL;
        }

        // ユーザー作成（元のUIDを保持）
        await admin.auth().createUser(createUserData);

        // カスタムクレーム設定
        if (
          authUser.customClaims &&
          Object.keys(authUser.customClaims).length > 0
        ) {
          await admin
            .auth()
            .setCustomUserClaims(authUser.uid, authUser.customClaims);
        }

        console.log(`  ✅ ${authUser.email} (仮パスワード: ${tempPassword})`);
        restoredUsers.push({
          email: authUser.email,
          uid: authUser.uid,
          tempPassword: tempPassword,
        });
      } catch (error) {
        console.warn(
          `  ⚠️  ${authUser.email} - リストア失敗: ${error.message}`
        );
        skippedUsers.push(authUser.email);
      }
    }

    // 6. Usersコレクションをリストア
    console.log("\n📁 Usersコレクションをリストア中...");
    if (subCollections.Users && subCollections.Users.length > 0) {
      const batch = db.batch();
      for (const doc of subCollections.Users) {
        const docRef = db
          .collection(`${TOP_LEVEL_COLLECTIONS.COMPANIES}/${companyId}/Users`)
          .doc(doc.docId);
        const restoredData = convertStringsToTimestamps(doc.data);
        batch.set(docRef, restoredData);
        restoredDocs++;
      }
      await batch.commit();
      console.log(`  ✅ Users: ${subCollections.Users.length}件リストア完了`);
    }

    console.log("\n✅ リストアが完了しました！");
    console.log(`\n📈 リストア統計:`);
    console.log(`  - 会社名: ${company.companyName}`);
    console.log(`  - 総ドキュメント数: ${restoredDocs}`);
    console.log(
      `  - Authenticationユーザー数: ${restoredUsers.length}/${authUsers.length}`
    );
    if (skippedUsers.length > 0) {
      console.log(`  - スキップしたユーザー: ${skippedUsers.length}件`);
    }

    if (restoredUsers.length > 0) {
      console.log(`\n🔑 リストアしたユーザーの仮パスワード:`);
      restoredUsers.forEach((user) => {
        console.log(`  - ${user.email}: ${user.tempPassword}`);
      });
      console.log(`\n⚠️  ユーザーにパスワードリセットを依頼してください。`);
    }

    return {
      success: true,
      companyId: companyId,
      companyName: company.companyName,
      restoredDocuments: restoredDocs,
      restoredUsers: restoredUsers,
      skippedUsers: skippedUsers,
    };
  } catch (error) {
    console.error("\n❌ リストア中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * バックアップ一覧を表示
 */
async function listBackups(companyId = null, options = {}) {
  try {
    const outputDir = options.output || DEFAULT_BACKUP_DIR;
    const companiesDir = path.join(outputDir, "companies");

    console.log("\n📋 バックアップ一覧を取得しています...\n");

    try {
      await fs.access(companiesDir);
    } catch {
      console.log("バックアップが見つかりません。");
      return [];
    }

    if (companyId) {
      // 特定の会社のバックアップを表示
      const companyBackupDir = path.join(companiesDir, companyId);
      try {
        const files = await fs.readdir(companyBackupDir);
        const backupFiles = files.filter(
          (f) => f.startsWith("backup_") && f.endsWith(".json")
        );

        if (backupFiles.length === 0) {
          console.log(`会社 ${companyId} のバックアップが見つかりません。`);
          return [];
        }

        console.log(
          `🏢 会社 ${companyId} のバックアップ (${backupFiles.length}件):\n`
        );

        for (const file of backupFiles.sort().reverse()) {
          const filepath = path.join(companyBackupDir, file);
          const stats = await fs.stat(filepath);
          const content = await fs.readFile(filepath, "utf-8");
          const data = JSON.parse(content);

          console.log(`  📄 ${file}`);
          console.log(
            `     日時: ${new Date(data.backupDate).toLocaleString("ja-JP")}`
          );
          console.log(`     サイズ: ${(stats.size / 1024).toFixed(2)} KB`);
          console.log(`     ドキュメント数: ${data.metadata.totalDocuments}`);
          console.log(`     ユーザー数: ${data.metadata.totalAuthUsers}`);
          console.log("");
        }

        return backupFiles;
      } catch (error) {
        console.log(`会社 ${companyId} のバックアップが見つかりません。`);
        return [];
      }
    } else {
      // 全会社のバックアップを表示
      const companies = await fs.readdir(companiesDir);

      if (companies.length === 0) {
        console.log("バックアップが見つかりません。");
        return [];
      }

      console.log(`📊 バックアップが存在する会社 (${companies.length}社):\n`);

      for (const companyId of companies) {
        const companyBackupDir = path.join(companiesDir, companyId);
        const files = await fs.readdir(companyBackupDir);
        const backupFiles = files.filter(
          (f) => f.startsWith("backup_") && f.endsWith(".json")
        );

        if (backupFiles.length > 0) {
          const latestFile = backupFiles.sort().reverse()[0];
          const filepath = path.join(companyBackupDir, latestFile);
          const content = await fs.readFile(filepath, "utf-8");
          const data = JSON.parse(content);

          console.log(`  🏢 ${companyId}`);
          console.log(`     会社名: ${data.company.companyName}`);
          console.log(`     バックアップ数: ${backupFiles.length}件`);
          console.log(
            `     最新: ${new Date(data.backupDate).toLocaleString("ja-JP")}`
          );
          console.log("");
        }
      }

      return companies;
    }
  } catch (error) {
    console.error("\n❌ バックアップ一覧取得中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

module.exports = {
  backupCompany,
  restoreCompany,
  restoreCompanyInteractive,
  listBackups,
};
