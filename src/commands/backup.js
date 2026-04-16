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
const { createStorageAdapterFromEnv } = require("../storage");

const DEFAULT_BACKUP_DIR = "./backups";

/**
 * ストレージタイプに応じたパスを生成
 * Firebase Storageの場合: backups/companies/...
 * Local Storageの場合: companies/... (basePathが./backupsのため)
 */
function getStoragePath(...pathSegments) {
  const storageType = process.env.STORAGE_TYPE || "local";
  const segments =
    storageType === "firebase"
      ? ["backups", ...pathSegments]
      : [...pathSegments];
  return path.join(...segments).replace(/\\/g, "/");
}

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
      `  ⚠️  Authentication情報取得失敗 (UID: ${uid}): ${error.message}`,
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

  for (const collection of COMPANY_SUBCOLLECTIONS) {
    const collectionName = collection.name;
    const snapshot = await db
      .collection(
        `${TOP_LEVEL_COLLECTIONS.COMPANIES}/${companyId}/${collectionName}`,
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
        0,
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
    // StorageAdapterを取得（環境変数から自動判定、またはオプション指定）
    const storage = createStorageAdapterFromEnv(options.storage);

    const outputDir = options.output || DEFAULT_BACKUP_DIR;
    // タイムスタンプがオプションで指定されていればそれを使用、なければ新規生成
    const timestamp = options.timestamp || getJSTTimestamp();
    const filename = `backup_${timestamp}.json`;
    const relativePath = getStoragePath("companies", companyId, filename);

    console.log(`\n🔧 バックアップを開始します`);
    console.log(`📂 出力先: ${relativePath}`);

    // バックアップデータ収集
    const backupData = await collectCompanyData(companyId);

    // メタデータを準備
    // 環境判定: EMULATOR > FIREBASE_ENV
    let environment;
    if (process.env.IS_EMULATOR === "true") {
      environment = "EMULATOR";
    } else if (process.env.FIREBASE_ENV === "prod") {
      environment = "PROD";
    } else if (process.env.FIREBASE_ENV === "dev") {
      environment = "DEV";
    } else {
      environment = "UNKNOWN";
    }

    const metadata = {
      companyId: companyId,
      companyName: backupData.company.companyName,
      timestamp: timestamp,
      totalDocuments: backupData.metadata.totalDocuments,
      totalAuthUsers: backupData.metadata.totalAuthUsers,
      collections: backupData.metadata.collections.join(","),
      environment: environment, // EMULATOR, DEV, PROD
    };

    // StorageAdapterで保存
    await storage.save(relativePath, backupData, metadata);

    // ファイルサイズ計算（JSON文字列から概算）
    const jsonContent = JSON.stringify(backupData, null, 2);
    const fileSizeKB = (Buffer.byteLength(jsonContent, "utf8") / 1024).toFixed(
      2,
    );

    console.log("\n✅ バックアップが完了しました！");
    console.log(`📄 ファイル: ${relativePath}`);
    console.log(`📊 ファイルサイズ: ${fileSizeKB} KB (概算)`);
    console.log(`\n📈 バックアップ統計:`);
    console.log(`  - 会社名: ${backupData.company.companyName}`);
    console.log(`  - 総ドキュメント数: ${backupData.metadata.totalDocuments}`);
    console.log(
      `  - Authenticationユーザー数: ${backupData.metadata.totalAuthUsers}`,
    );
    console.log(
      `  - コレクション数: ${backupData.metadata.collections.length}`,
    );

    return {
      success: true,
      filepath: relativePath,
      backupData: backupData,
    };
  } catch (error) {
    console.error("\n❌ バックアップ中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * 会社の現在状態をスナップショット取得（リストア前の差分確認用）
 * temporary/companies/{companyId}/snapshot.json に保存
 */
async function snapshotCompany(companyId, options = {}) {
  try {
    const db = admin.firestore();

    console.log(`\n📸 スナップショット取得を開始します (ID: ${companyId})`);

    // 1. メンテナンスモードの確認
    console.log("\n🔍 メンテナンスモード状態を確認中...");
    const companyDoc = await db
      .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
      .doc(companyId)
      .get();

    if (!companyDoc.exists) {
      throw new Error(`会社ID ${companyId} が見つかりません。`);
    }

    const companyData = companyDoc.data();
    const isMaintenanceMode = companyData.maintenanceMode === true;

    if (!isMaintenanceMode) {
      console.log("\n❌ メンテナンスモードが有効になっていません。");
      console.log(
        "⚠️  リストア作業中はユーザーの操作を排他する必要があります。\n",
      );
      console.log("メンテナンスモードを有効化してから再実行してください:");
      console.log(`   npm run cli companies maintenance-on ${companyId}\n`);
      return {
        success: false,
        reason: "maintenance-mode-required",
        companyId,
        companyName: companyData.companyName,
      };
    }

    console.log("✅ メンテナンスモード: 有効");
    console.log(`   理由: ${companyData.maintenanceReason || "未設定"}`);
    console.log(
      `   開始: ${
        companyData.maintenanceStartedAt
          ? companyData.maintenanceStartedAt.toDate().toLocaleString("ja-JP")
          : "不明"
      }`,
    );

    // 2. StorageAdapterを取得
    const storage = createStorageAdapterFromEnv(options.storage);

    // 3. スナップショット保存先（固定ファイル名）
    const relativePath = getStoragePath(
      "temporary",
      "companies",
      companyId,
      "snapshot.json",
    );

    console.log(`\n📂 保存先: ${relativePath}`);

    // 既存のスナップショットファイルがあるか確認
    const existingSnapshot = await storage.exists(relativePath);
    if (existingSnapshot) {
      console.log("ℹ️  既存のスナップショットを上書きします");
    }

    // 4. 現在のデータを収集
    const snapshotData = await collectCompanyData(companyId);

    // 5. メタデータを準備
    let environment;
    if (process.env.IS_EMULATOR === "true") {
      environment = "EMULATOR";
    } else if (process.env.FIREBASE_ENV === "prod") {
      environment = "PROD";
    } else if (process.env.FIREBASE_ENV === "dev") {
      environment = "DEV";
    } else {
      environment = "UNKNOWN";
    }

    const metadata = {
      companyId: companyId,
      companyName: snapshotData.company.companyName,
      timestamp: getJSTTimestamp(),
      totalDocuments: snapshotData.metadata.totalDocuments,
      totalAuthUsers: snapshotData.metadata.totalAuthUsers,
      collections: snapshotData.metadata.collections.join(","),
      environment: environment,
      isSnapshot: true, // スナップショットであることを示すフラグ
    };

    // 6. StorageAdapterで保存
    await storage.save(relativePath, snapshotData, metadata);

    // ファイルサイズ計算
    const jsonContent = JSON.stringify(snapshotData, null, 2);
    const fileSizeKB = (Buffer.byteLength(jsonContent, "utf8") / 1024).toFixed(
      2,
    );

    console.log("\n✅ スナップショット取得が完了しました！");
    console.log(`📄 ファイル: ${relativePath}`);
    console.log(`📊 ファイルサイズ: ${fileSizeKB} KB (概算)`);
    console.log(`\n📈 スナップショット統計:`);
    console.log(`  - 会社名: ${snapshotData.company.companyName}`);
    console.log(
      `  - 総ドキュメント数: ${snapshotData.metadata.totalDocuments}`,
    );
    console.log(
      `  - Authenticationユーザー数: ${snapshotData.metadata.totalAuthUsers}`,
    );
    console.log(
      `  - コレクション数: ${snapshotData.metadata.collections.length}`,
    );

    // 7. 自動的に差分を計算
    console.log("\n" + "═".repeat(60));
    console.log("🔄 差分を自動計算しています...");
    console.log("═".repeat(60));

    const diffResult = await diffBackup(companyId, options);

    return {
      success: true,
      filepath: relativePath,
      snapshotData: snapshotData,
      companyName: snapshotData.company.companyName,
      diffResult: diffResult,
    };
  } catch (error) {
    console.error("\n❌ スナップショット取得中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * バックアップファイルを選択してリストア
 */
async function restoreCompanyInteractive(companyId, options = {}) {
  try {
    // StorageAdapterを取得
    const storage = createStorageAdapterFromEnv(options.storage);

    const outputDir = options.output || DEFAULT_BACKUP_DIR;
    const companyPattern = getStoragePath(
      "companies",
      companyId,
      "backup_*.json",
    );

    console.log(`\n📋 会社 ${companyId} のバックアップを検索中...\n`);

    // バックアップファイル一覧取得（メタデータ込み）
    const backupFiles = await storage.list(companyPattern, {
      includeMetadata: true,
    });

    if (backupFiles.length === 0) {
      console.error(`❌ 会社 ${companyId} のバックアップが見つかりません。`);
      return;
    }

    // バックアップファイルの詳細情報を準備
    const choices = [];
    for (const fileInfo of backupFiles.sort((a, b) =>
      b.path.localeCompare(a.path),
    )) {
      let metadata = fileInfo.metadata;
      const filename = path.basename(fileInfo.path);

      // customMetadataがない場合（Storage Emulatorなど）、ファイルから取得
      if (!metadata || !metadata.timestamp) {
        const loaded = await storage.load(fileInfo.path);
        metadata = loaded.metadata;
      }

      const displayInfo = `${filename} - ${metadata.timestamp} (${metadata.totalDocuments}ドキュメント, ${metadata.totalAuthUsers}ユーザー)`;

      choices.push({
        name: displayInfo,
        value: fileInfo.path,
        short: filename,
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
    // StorageAdapterを取得
    const storage = createStorageAdapterFromEnv(options.storage);

    console.log(`\n🔧 リストアを開始します`);
    console.log(`📂 バックアップファイル: ${backupFile}`);

    // バックアップファイル読み込み
    console.log("\n📖 バックアップファイルを読み込んでいます...");
    const loaded = await storage.load(backupFile);
    const backupData = loaded.data;
    const metadata = loaded.metadata;

    const { companyId, company, subCollections, authUsers } = backupData;

    console.log(`\n🏢 会社情報:`);
    console.log(`  - 会社名: ${company.companyName}`);
    console.log(`  - 会社ID: ${companyId}`);
    console.log(
      `  - バックアップ日時: ${new Date(backupData.backupDate).toLocaleString(
        "ja-JP",
      )}`,
    );

    // 環境チェック
    const currentEnv =
      process.env.IS_EMULATOR === "true"
        ? "EMULATOR"
        : process.env.FIREBASE_ENV === "prod"
          ? "PROD"
          : process.env.FIREBASE_ENV === "dev"
            ? "DEV"
            : "UNKNOWN";

    const backupEnv = metadata?.environment || "UNKNOWN";

    if (currentEnv !== backupEnv && backupEnv !== "UNKNOWN") {
      console.log(`\n⚠️  環境の不一致を検出:`);
      console.log(`  - リストア先環境: ${currentEnv}`);
      console.log(`  - バックアップ元環境: ${backupEnv}`);
      console.log(`  ⚠️  異なる環境間でのリストアを実行しようとしています。`);

      if (!options.skipConfirmation) {
        const readline = require("readline").createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const shouldContinue = await new Promise((resolve) => {
          readline.question(
            `\n異なる環境間でリストアを続行しますか？ (yes/no): `,
            (answer) => {
              readline.close();
              resolve(answer.toLowerCase() === "yes");
            },
          );
        });

        if (!shouldContinue) {
          console.log("\n❌ リストアをキャンセルしました。");
          return;
        }
      }
    }

    const db = admin.firestore();

    // 0. 既存データの削除確認（skipConfirmationオプションがfalseの場合のみ）
    if (!options.skipConfirmation) {
      // 環境判定（本番環境かどうか）
      const isProd =
        process.env.FIREBASE_ENV === "prod" || options.env === "prod";

      console.log("\n⚠️  既存データの削除について:");
      console.log(
        "  リストアを実行すると、既存のデータは完全に置き換えられます。",
      );

      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // 1回目の確認
      const shouldDelete = await new Promise((resolve) => {
        readline.question(
          `\n既存データを削除してリストアしますか？ (yes/no): `,
          (answer) => {
            resolve(answer.toLowerCase() === "yes");
          },
        );
      });

      if (!shouldDelete) {
        readline.close();
        console.log("\n❌ リストアをキャンセルしました。");
        return;
      }

      // 本番環境の場合は2回目の確認
      if (isProd) {
        const shouldDeleteAgain = await new Promise((resolve) => {
          readline.question(
            `\n🚨 本番環境です！本当にリストアを実行しますか？この操作は取り消せません。 (yes/no): `,
            (answer) => {
              readline.close();
              resolve(answer.toLowerCase() === "yes");
            },
          );
        });

        if (!shouldDeleteAgain) {
          console.log("\n❌ リストアをキャンセルしました。");
          return;
        }
      } else {
        readline.close();
      }
    }

    // 1. 既存のサブコレクションを削除（全て）
    console.log("\n🗑️  既存データを削除中...");
    for (const collection of COMPANY_SUBCOLLECTIONS) {
      const collectionName = collection.name;
      const snapshot = await db
        .collection(
          `${TOP_LEVEL_COLLECTIONS.COMPANIES}/${companyId}/${collectionName}`,
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

          // Cloud Functions完了待機
          if (collection.waitAfterClear > 0) {
            console.log(
              `  ⏳ Cloud Functions処理待機中... (${collection.waitAfterClear}ms)`,
            );
            await new Promise((resolve) =>
              setTimeout(resolve, collection.waitAfterClear),
            );
          }
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

    // 4. サブコレクションをリストア（定義順序に従う）
    console.log("\n📚 サブコレクションをリストア中...");
    let restoredDocs = 0;

    for (const collection of COMPANY_SUBCOLLECTIONS) {
      const collectionName = collection.name;
      const documents = subCollections[collectionName];

      if (!documents || documents.length === 0) continue;

      console.log(`  📁 ${collectionName} (${documents.length}件)...`);

      const batch = db.batch();
      let batchCount = 0;

      for (const doc of documents) {
        const docRef = db
          .collection(
            `${TOP_LEVEL_COLLECTIONS.COMPANIES}/${companyId}/${collectionName}`,
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

      // Cloud Functions完了待機
      if (collection.waitAfterRestore > 0) {
        console.log(
          `  ⏳ Cloud Functions処理待機中... (${collection.waitAfterRestore}ms)`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, collection.waitAfterRestore),
        );
      }
    }

    // 6. Authenticationユーザーをリストア（最後に実行してCloud Functionsの削除を回避）
    console.log("\n👥 Authenticationユーザーをリストア中...");
    console.log(
      `  バックアップには ${authUsers.length} 人のユーザーが含まれています`,
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
          `  ⚠️  ${authUser.email} - リストア失敗: ${error.message}`,
        );
        skippedUsers.push(authUser.email);
      }
    }

    console.log("\n✅ リストアが完了しました！");
    console.log(`\n📈 リストア統計:`);
    console.log(`  - 会社名: ${company.companyName}`);
    console.log(`  - 総ドキュメント数: ${restoredDocs}`);
    console.log(
      `  - Authenticationユーザー数: ${restoredUsers.length}/${authUsers.length}`,
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

      // 仮パスワードをファイルに保存
      const passwordsData = {
        restoredAt: new Date().toISOString(),
        companyId: companyId,
        companyName: company.companyName,
        users: restoredUsers,
      };

      const passwordsPath = getStoragePath(
        "temporary",
        "companies",
        companyId,
        "restored_users_passwords.json",
      );

      await storage.save(passwordsPath, passwordsData);
      console.log(`\n💾 仮パスワードをファイルに保存しました:`);
      console.log(`   ${passwordsPath}`);
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
 * スナップショットと直近バックアップの差分を表示
 */
async function diffBackup(companyId, options = {}) {
  try {
    const db = admin.firestore();
    const storage = createStorageAdapterFromEnv(options.storage);

    console.log(`\n📊 差分を確認しています... (ID: ${companyId})`);

    // 1. メンテナンスモード状態を確認
    console.log("\n🔍 メンテナンスモード状態を確認中...");
    const companyDoc = await db
      .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
      .doc(companyId)
      .get();

    if (!companyDoc.exists) {
      throw new Error(`会社ID ${companyId} が見つかりません。`);
    }

    const companyData = companyDoc.data();
    const isMaintenanceMode = companyData.maintenanceMode === true;

    if (isMaintenanceMode) {
      console.log("✅ メンテナンスモード: 有効");
    } else {
      console.log("⚠️  メンテナンスモード: 無効");
      console.log(
        "   リストア実行前にメンテナンスモードを有効化してください。",
      );
    }

    // 2. スナップショットファイルの確認
    console.log("\n📸 スナップショットファイルを確認中...");
    const snapshotPath = getStoragePath(
      "temporary",
      "companies",
      companyId,
      "snapshot.json",
    );

    const snapshotExists = await storage.exists(snapshotPath);
    if (!snapshotExists) {
      console.log("\n❌ スナップショットファイルが見つかりません。");
      console.log("先にスナップショットを取得してください:");
      console.log(`   npm run cli backup snapshot ${companyId}\n`);
      return {
        success: false,
        reason: "snapshot-not-found",
      };
    }

    const snapshotData = await storage.load(snapshotPath);
    console.log("✅ スナップショット: 取得済み");
    console.log(
      `   取得日時: ${new Date(snapshotData.data.backupDate).toLocaleString(
        "ja-JP",
      )}`,
    );

    // 3. 直近の確定バックアップを取得
    console.log("\n📦 直近の確定バックアップを検索中...");
    const backupPattern = getStoragePath(
      "companies",
      companyId,
      "backup_*.json",
    );
    const backupFiles = await storage.list(backupPattern, {
      includeMetadata: true,
    });

    if (backupFiles.length === 0) {
      console.log("\n⚠️  確定バックアップが見つかりません。");
      console.log("比較対象のバックアップがないため、差分は表示できません。");
      console.log("\n現在のスナップショット情報:");
      console.log(
        `  - 総ドキュメント数: ${snapshotData.data.metadata.totalDocuments}`,
      );
      console.log(
        `  - コレクション数: ${snapshotData.data.metadata.collections.length}`,
      );
      return {
        success: false,
        reason: "no-backup-found",
        snapshotData: snapshotData.data,
      };
    }

    // 最新のバックアップを取得（ファイル名でソート）
    const latestBackup = backupFiles.sort((a, b) =>
      b.path.localeCompare(a.path),
    )[0];
    const backupData = await storage.load(latestBackup.path);
    console.log("✅ 直近バックアップ: 取得済み");
    console.log(
      `   取得日時: ${new Date(backupData.data.backupDate).toLocaleString(
        "ja-JP",
      )}`,
    );
    console.log(`   ファイル: ${path.basename(latestBackup.path)}`);

    // 4. 差分を計算
    console.log("\n🔍 差分を計算中...");

    const snapshot = snapshotData.data;
    const backup = backupData.data;

    const allCollections = new Set([
      ...Object.keys(snapshot.subCollections),
      ...Object.keys(backup.subCollections),
    ]);

    const collectionDiffs = [];
    let totalAdded = 0;
    let totalDeleted = 0;
    let totalModified = 0;

    // コレクション別に詳細な差分を計算
    for (const collectionName of Array.from(allCollections).sort()) {
      const snapshotDocs = snapshot.subCollections[collectionName] || [];
      const backupDocs = backup.subCollections[collectionName] || [];

      const snapshotMap = new Map(snapshotDocs.map((d) => [d.docId, d]));
      const backupMap = new Map(backupDocs.map((d) => [d.docId, d]));

      const added = [];
      const deleted = [];
      const modified = [];
      const unchanged = [];

      // 追加と変更を検出
      for (const [docId, snapshotDoc] of snapshotMap) {
        if (!backupMap.has(docId)) {
          // 追加されたドキュメント
          added.push({
            docId,
            data: snapshotDoc.data,
          });
        } else {
          const backupDoc = backupMap.get(docId);

          // updatedAt で比較
          if (
            snapshotDoc.data.updatedAt &&
            snapshotDoc.data.updatedAt._timestamp &&
            backupDoc.data.updatedAt &&
            backupDoc.data.updatedAt._timestamp
          ) {
            const snapshotTime = new Date(snapshotDoc.data.updatedAt.value);
            const backupTime = new Date(backupDoc.data.updatedAt.value);

            if (snapshotTime > backupTime) {
              modified.push({
                docId,
                beforeUpdatedAt: backupTime.toISOString(),
                afterUpdatedAt: snapshotTime.toISOString(),
                data: snapshotDoc.data,
              });
            } else {
              unchanged.push(docId);
            }
          } else {
            // updatedAt がない場合は変更なしとみなす
            unchanged.push(docId);
          }
        }
      }

      // 削除を検出
      for (const [docId, backupDoc] of backupMap) {
        if (!snapshotMap.has(docId)) {
          deleted.push({
            docId,
            data: backupDoc.data,
          });
        }
      }

      totalAdded += added.length;
      totalDeleted += deleted.length;
      totalModified += modified.length;

      collectionDiffs.push({
        collection: collectionName,
        added,
        deleted,
        modified,
        unchanged,
        summary: {
          addedCount: added.length,
          deletedCount: deleted.length,
          modifiedCount: modified.length,
          unchangedCount: unchanged.length,
          totalBefore: backupDocs.length,
          totalAfter: snapshotDocs.length,
        },
      });
    }

    // 5. 差分データをファイルに保存
    console.log("\n💾 差分データを保存中...");
    const diffBasePath = getStoragePath(
      "temporary",
      "companies",
      companyId,
      "diff",
    );

    // 各コレクションの差分を個別ファイルに保存
    for (const collectionDiff of collectionDiffs) {
      if (
        collectionDiff.added.length > 0 ||
        collectionDiff.deleted.length > 0 ||
        collectionDiff.modified.length > 0
      ) {
        const diffFilePath = getStoragePath(
          diffBasePath,
          `${collectionDiff.collection}.json`,
        );
        await storage.save(
          diffFilePath,
          {
            collection: collectionDiff.collection,
            snapshotDate: snapshot.backupDate,
            backupDate: backup.backupDate,
            companyId: companyId,
            companyName: snapshot.company.companyName,
            added: collectionDiff.added,
            deleted: collectionDiff.deleted,
            modified: collectionDiff.modified,
            summary: collectionDiff.summary,
          },
          {
            companyId: companyId,
            collection: collectionDiff.collection,
            addedCount: collectionDiff.added.length,
            deletedCount: collectionDiff.deleted.length,
            modifiedCount: collectionDiff.modified.length,
          },
        );
        console.log(`  ✅ ${collectionDiff.collection}.json`);
      }
    }

    // サマリーファイルを保存
    const summaryPath = getStoragePath(diffBasePath, "summary.json");
    await storage.save(
      summaryPath,
      {
        companyId: companyId,
        companyName: snapshot.company.companyName,
        snapshotDate: snapshot.backupDate,
        backupDate: backup.backupDate,
        isMaintenanceMode: isMaintenanceMode,
        collections: collectionDiffs.map((cd) => ({
          collection: cd.collection,
          summary: cd.summary,
        })),
        totalSummary: {
          totalAdded: totalAdded,
          totalDeleted: totalDeleted,
          totalModified: totalModified,
          totalDocsBefore: backup.metadata.totalDocuments,
          totalDocsAfter: snapshot.metadata.totalDocuments,
        },
      },
      {
        companyId: companyId,
        totalAdded: totalAdded,
        totalDeleted: totalDeleted,
        totalModified: totalModified,
      },
    );
    console.log(`  ✅ summary.json`);
    console.log(`\n📂 差分保存先: ${diffBasePath}/`);

    // 6. ターミナルに差分サマリーを表示
    console.log("\n" + "═".repeat(60));
    console.log("📈 差分サマリー");
    console.log("═".repeat(60));

    console.log(`\n🏢 会社情報:`);
    console.log(`   会社名: ${snapshot.company.companyName}`);
    console.log(
      `   スナップショット: ${new Date(snapshot.backupDate).toLocaleString(
        "ja-JP",
      )}`,
    );
    console.log(
      `   直近バックアップ: ${new Date(backup.backupDate).toLocaleString(
        "ja-JP",
      )}`,
    );

    console.log(`\n📚 コレクション別差分:`);
    console.log("─".repeat(60));

    for (const collectionDiff of collectionDiffs) {
      const { collection, summary } = collectionDiff;
      const changes = [];

      if (summary.addedCount > 0) changes.push(`📈 +${summary.addedCount}`);
      if (summary.deletedCount > 0) changes.push(`📉 -${summary.deletedCount}`);
      if (summary.modifiedCount > 0)
        changes.push(`📝 ${summary.modifiedCount}件変更`);

      const status = changes.length > 0 ? changes.join(", ") : "➡️  変化なし";

      console.log(
        `  ${collection.padEnd(30)} ${String(summary.totalBefore).padStart(
          5,
        )} → ${String(summary.totalAfter).padStart(5)} ${status}`,
      );
    }

    // Authentication ユーザーの差分
    console.log(`\n👥 Authenticationユーザー:`);
    const snapshotAuthCount = snapshot.authUsers.length;
    const backupAuthCount = backup.authUsers.length;
    const authDiff = snapshotAuthCount - backupAuthCount;

    let authStatus = "";
    if (authDiff > 0) {
      authStatus = `📈 +${authDiff}`;
    } else if (authDiff < 0) {
      authStatus = `📉 ${authDiff}`;
    } else {
      authStatus = "➡️  変化なし";
    }

    console.log(
      `  Authenticationユーザー         ${String(backupAuthCount).padStart(
        5,
      )} → ${String(snapshotAuthCount).padStart(5)} ${authStatus}`,
    );

    // 総ドキュメント数
    const totalSnapshotDocs = snapshot.metadata.totalDocuments;
    const totalBackupDocs = backup.metadata.totalDocuments;
    const totalDocDiff = totalSnapshotDocs - totalBackupDocs;

    console.log("\n" + "═".repeat(60));
    console.log(
      `📊 総ドキュメント数: ${totalBackupDocs} → ${totalSnapshotDocs}`,
    );
    if (totalDocDiff > 0) {
      console.log(`   📈 +${totalDocDiff} ドキュメント増加`);
    } else if (totalDocDiff < 0) {
      console.log(`   📉 ${Math.abs(totalDocDiff)} ドキュメント減少`);
    } else {
      console.log(`   ➡️  変化なし`);
    }

    console.log(
      `   詳細: 追加 ${totalAdded}件, 削除 ${totalDeleted}件, 変更 ${totalModified}件`,
    );
    console.log("═".repeat(60));

    // 次のステップの案内
    if (totalAdded > 0 || totalDeleted > 0 || totalModified > 0) {
      console.log("\n💡 次のステップ:");
      console.log(
        `   リストア実行: npm run cli backup restore ${companyId} --collections <コレクション名>`,
      );
      console.log(
        `   例: npm run cli backup restore ${companyId} --collections Customers,Employees`,
      );
    } else {
      console.log("\n✅ 差分がありません。リストアの必要はありません。");
    }

    if (!isMaintenanceMode) {
      console.log(
        "\n⚠️  リストア実行前に必ずメンテナンスモードを有効化してください:",
      );
      console.log(`   npm run cli companies maintenance-on ${companyId}`);
    }

    return {
      success: true,
      companyId,
      companyName: snapshot.company.companyName,
      isMaintenanceMode,
      snapshotDate: snapshot.backupDate,
      backupDate: backup.backupDate,
      collectionDiffs,
      totalAdded,
      totalDeleted,
      totalModified,
      diffBasePath,
    };
  } catch (error) {
    console.error("\n❌ 差分確認中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * バックアップ一覧を表示
 */
async function listBackups(companyId = null, options = {}) {
  try {
    // StorageAdapterを取得
    const storage = createStorageAdapterFromEnv(options.storage);

    const outputDir = options.output || DEFAULT_BACKUP_DIR;

    console.log("\n📋 バックアップ一覧を取得しています...\n");

    if (companyId) {
      // 特定の会社のバックアップを表示
      const companyPattern = path.join("companies", companyId, "backup_*.json");
      const backupFiles = await storage.list(companyPattern, {
        includeMetadata: true,
      });

      if (backupFiles.length === 0) {
        console.log(`会社 ${companyId} のバックアップが見つかりません。`);
        return [];
      }

      console.log(
        `🏢 会社 ${companyId} のバックアップ (${backupFiles.length}件):\n`,
      );

      for (const fileInfo of backupFiles.sort((a, b) =>
        b.path.localeCompare(a.path),
      )) {
        const filename = path.basename(fileInfo.path);
        let metadata = fileInfo.metadata;

        // customMetadataがない場合（Storage Emulatorなど）、ファイルから取得
        if (!metadata || !metadata.timestamp) {
          const loaded = await storage.load(fileInfo.path);
          metadata = loaded.metadata;
        }

        console.log(`  📄 ${filename}`);
        console.log(`     日時: ${metadata.timestamp}`);
        console.log(`     ドキュメント数: ${metadata.totalDocuments}`);
        console.log(`     ユーザー数: ${metadata.totalAuthUsers}`);
        console.log("");
      }

      return backupFiles.map((f) => path.basename(f.path));
    } else {
      // 全会社のバックアップを表示
      const allPattern = getStoragePath("companies", "**", "backup_*.json");
      const allBackups = await storage.list(allPattern, {
        includeMetadata: true,
      });

      if (allBackups.length === 0) {
        console.log("バックアップが見つかりません。");
        return [];
      }

      // 会社ごとにグループ化
      const companiesMap = new Map();
      for (const fileInfo of allBackups) {
        // Firebase Storageは常に/区切りなので、path.sepではなく/で分割
        const parts = fileInfo.path.split("/");
        const companyId = parts[parts.indexOf("companies") + 1];

        if (!companiesMap.has(companyId)) {
          companiesMap.set(companyId, []);
        }
        companiesMap.get(companyId).push(fileInfo);
      }

      console.log(`📊 バックアップが存在する会社 (${companiesMap.size}社):\n`);

      for (const [companyId, files] of companiesMap.entries()) {
        const latestFile = files.sort((a, b) =>
          b.path.localeCompare(a.path),
        )[0];
        let metadata = latestFile.metadata;

        // customMetadataがない場合（Storage Emulatorなど）、ファイルから取得
        if (!metadata || !metadata.companyName) {
          const loaded = await storage.load(latestFile.path);
          metadata = loaded.metadata;
        }

        console.log(`  🏢 ${companyId}`);
        console.log(`     会社名: ${metadata.companyName}`);
        console.log(`     バックアップ数: ${files.length}件`);
        console.log(`     最新: ${metadata.timestamp}`);
        console.log("");
      }

      return Array.from(companiesMap.keys());
    }
  } catch (error) {
    console.error("\n❌ バックアップ一覧取得中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * 選択的リストア（コレクション指定）
 * Authentication/Usersは除外される
 */
async function restoreSelective(companyId, options = {}) {
  try {
    const db = admin.firestore();
    const storage = createStorageAdapterFromEnv(options.storage);

    console.log(`\n🔧 選択的リストアを開始します (ID: ${companyId})`);

    // 1. メンテナンスモード確認
    console.log("\n🔍 メンテナンスモード状態を確認中...");
    const companyDoc = await db
      .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
      .doc(companyId)
      .get();

    if (!companyDoc.exists) {
      throw new Error(`会社ID ${companyId} が見つかりません。`);
    }

    const companyData = companyDoc.data();
    const isMaintenanceMode = companyData.maintenanceMode === true;

    if (!isMaintenanceMode) {
      console.log("\n❌ メンテナンスモードが有効になっていません。");
      console.log(
        "⚠️  リストア作業中はユーザーの操作を排他する必要があります。",
      );
      console.log("\nメンテナンスモードを有効化してから再実行してください:");
      console.log(`   npm run cli companies maintenance-on ${companyId}\n`);
      return { success: false, reason: "maintenance-mode-required" };
    }

    console.log("✅ メンテナンスモード: 有効");

    // 2. リストア対象のコレクションを取得
    const targetCollections = options.collections
      ? options.collections.split(",").map((c) => c.trim())
      : [];

    if (targetCollections.length === 0) {
      console.log("\n❌ リストア対象のコレクションが指定されていません。");
      console.log(
        "--collections オプションでコレクション名を指定してください。",
      );
      console.log(`例: --collections Customers,Sites\n`);
      return { success: false, reason: "no-collections-specified" };
    }

    // Authentication/Usersを除外
    const excludedCollections = ["Users"];
    const filteredCollections = targetCollections.filter(
      (col) => !excludedCollections.includes(col),
    );

    if (filteredCollections.length !== targetCollections.length) {
      console.log("\n⚠️  以下のコレクションは除外されました:");
      targetCollections
        .filter((col) => excludedCollections.includes(col))
        .forEach((col) => console.log(`  - ${col} (Authentication/Users関連)`));
    }

    if (filteredCollections.length === 0) {
      console.log("\n❌ リストア可能なコレクションがありません。\n");
      return { success: false, reason: "no-valid-collections" };
    }

    console.log("\n📋 リストア対象コレクション:");
    filteredCollections.forEach((col) => console.log(`  - ${col}`));

    // 3. バックアップファイルの選択
    const backupPattern = getStoragePath(
      "companies",
      companyId,
      "backup_*.json",
    );
    const backupFiles = await storage.list(backupPattern, {
      includeMetadata: true,
    });

    if (backupFiles.length === 0) {
      console.log(`\n❌ 会社 ${companyId} のバックアップが見つかりません。\n`);
      return { success: false, reason: "no-backup-found" };
    }

    // 最新のバックアップを取得
    const latestBackup = backupFiles.sort((a, b) =>
      b.path.localeCompare(a.path),
    )[0];

    console.log(
      `\n📦 バックアップファイル: ${path.basename(latestBackup.path)}`,
    );

    // 4. バックアップデータを読み込み
    const loaded = await storage.load(latestBackup.path);
    const backupData = loaded.data;
    const { subCollections } = backupData;

    console.log(
      `   バックアップ日時: ${new Date(backupData.backupDate).toLocaleString(
        "ja-JP",
      )}`,
    );

    // 5. リストア実行
    console.log("\n📚 コレクションをリストア中...");
    let restoredDocs = 0;
    const restoredCollections = [];

    for (const collection of COMPANY_SUBCOLLECTIONS) {
      const collectionName = collection.name;

      // 対象コレクションでない場合はスキップ
      if (!filteredCollections.includes(collectionName)) {
        continue;
      }

      const documents = subCollections[collectionName];

      if (!documents || documents.length === 0) {
        console.log(`  ⏭️  ${collectionName}: バックアップにデータなし`);
        continue;
      }

      console.log(`  📁 ${collectionName} (${documents.length}件)...`);

      let batch = db.batch();
      let batchCount = 0;

      for (const doc of documents) {
        const docRef = db
          .collection(
            `${TOP_LEVEL_COLLECTIONS.COMPANIES}/${companyId}/${collectionName}`,
          )
          .doc(doc.docId);

        const restoredData = convertStringsToTimestamps(doc.data);
        batch.set(docRef, restoredData, { merge: true }); // マージモード
        batchCount++;
        restoredDocs++;

        // Firestoreバッチは500件まで
        if (batchCount >= 500) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      console.log(`  ✅ ${collectionName}: ${documents.length}件リストア完了`);
      restoredCollections.push(collectionName);

      // Cloud Functions完了待機
      if (collection.waitAfterRestore > 0) {
        console.log(
          `  ⏳ Cloud Functions処理待機中... (${collection.waitAfterRestore}ms)`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, collection.waitAfterRestore),
        );
      }
    }

    console.log("\n✅ 選択的リストアが完了しました！");
    console.log(`\n📈 リストア統計:`);
    console.log(`  - 会社名: ${backupData.company.companyName}`);
    console.log(
      `  - リストアしたコレクション数: ${restoredCollections.length}`,
    );
    console.log(`  - 総ドキュメント数: ${restoredDocs}`);
    console.log(`\n📋 リストアしたコレクション:`);
    restoredCollections.forEach((col) => console.log(`  - ${col}`));

    console.log(`\n💡 次のステップ:`);
    console.log(
      `   メンテナンスモード解除: npm run cli companies maintenance-off ${companyId}\n`,
    );

    return {
      success: true,
      companyId: companyId,
      companyName: backupData.company.companyName,
      restoredCollections: restoredCollections,
      restoredDocuments: restoredDocs,
    };
  } catch (error) {
    console.error("\n❌ リストア中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * 差分ベースリストア
 * 差分データ（added, modified, deleted）のみをリストア
 * Authentication/Usersは除外される
 */
async function restoreDiff(companyId, options = {}) {
  try {
    const db = admin.firestore();
    const storage = createStorageAdapterFromEnv(options.storage);

    console.log(`\n🔧 差分ベースリストアを開始します (ID: ${companyId})`);

    // 1. メンテナンスモード確認
    console.log("\n🔍 メンテナンスモード状態を確認中...");
    const companyDoc = await db
      .collection(TOP_LEVEL_COLLECTIONS.COMPANIES)
      .doc(companyId)
      .get();

    if (!companyDoc.exists) {
      throw new Error(`会社ID ${companyId} が見つかりません。`);
    }

    const companyData = companyDoc.data();
    const isMaintenanceMode = companyData.maintenanceMode === true;

    if (!isMaintenanceMode) {
      console.log("\n❌ メンテナンスモードが有効になっていません。");
      console.log(
        "⚠️  リストア作業中はユーザーの操作を排他する必要があります。",
      );
      console.log("\nメンテナンスモードを有効化してから再実行してください:");
      console.log(`   npm run cli companies maintenance-on ${companyId}\n`);
      return { success: false, reason: "maintenance-mode-required" };
    }

    console.log("✅ メンテナンスモード: 有効");

    // 2. 差分データの確認
    console.log("\n📊 差分データを確認中...");
    const diffDir = getStoragePath("temporary", "companies", companyId, "diff");
    const summaryPath = getStoragePath(diffDir, "summary.json");

    const summaryExists = await storage.exists(summaryPath);
    if (!summaryExists) {
      console.log("\n❌ 差分データが見つかりません。");
      console.log("先にスナップショットを取得してください:");
      console.log(`   npm run cli backup snapshot ${companyId}\n`);
      return { success: false, reason: "diff-not-found" };
    }

    const summaryData = await storage.load(summaryPath);
    const summary = summaryData.data;

    console.log("✅ 差分データ: 取得済み");
    console.log(
      `   スナップショット日時: ${new Date(summary.snapshotDate).toLocaleString(
        "ja-JP",
      )}`,
    );
    console.log(
      `   バックアップ日時: ${new Date(summary.backupDate).toLocaleString(
        "ja-JP",
      )}`,
    );

    // 3. リストア対象のコレクションを取得
    const targetCollections = options.collections
      ? options.collections.split(",").map((c) => c.trim())
      : [];

    if (targetCollections.length === 0) {
      console.log("\n❌ リストア対象のコレクションが指定されていません。");
      console.log(
        "--collections オプションでコレクション名を指定してください。",
      );
      console.log(`例: --collections Customers,Sites\n`);
      return { success: false, reason: "no-collections-specified" };
    }

    // Authentication/Usersを除外
    const excludedCollections = ["Users"];
    const filteredCollections = targetCollections.filter(
      (col) => !excludedCollections.includes(col),
    );

    if (filteredCollections.length !== targetCollections.length) {
      console.log("\n⚠️  以下のコレクションは除外されました:");
      targetCollections
        .filter((col) => excludedCollections.includes(col))
        .forEach((col) => console.log(`  - ${col} (Authentication/Users関連)`));
    }

    if (filteredCollections.length === 0) {
      console.log("\n❌ リストア可能なコレクションがありません。\n");
      return { success: false, reason: "no-valid-collections" };
    }

    console.log("\n📋 リストア対象コレクション:");
    filteredCollections.forEach((col) => console.log(`  - ${col}`));

    // 4. 差分ベースでリストア実行
    console.log("\n📚 差分データをリストア中...");
    let totalRestored = 0;
    const restoredCollections = [];
    const stats = {
      added: 0,
      modified: 0,
      deleted: 0,
    };

    for (const collection of COMPANY_SUBCOLLECTIONS) {
      const collectionName = collection.name;

      // 対象コレクションでない場合はスキップ
      if (!filteredCollections.includes(collectionName)) {
        continue;
      }

      // 差分ファイルの存在確認
      const diffFilePath = getStoragePath(diffDir, `${collectionName}.json`);
      const diffFileExists = await storage.exists(diffFilePath);

      if (!diffFileExists) {
        console.log(`  ⏭️  ${collectionName}: 差分なし`);
        continue;
      }

      // 差分データを読み込み
      const diffData = await storage.load(diffFilePath);
      const { added, modified, deleted } = diffData.data;

      const totalChanges = added.length + modified.length + deleted.length;
      if (totalChanges === 0) {
        console.log(`  ⏭️  ${collectionName}: 差分なし`);
        continue;
      }

      console.log(
        `  📁 ${collectionName} (追加:${added.length}, 変更:${modified.length}, 削除:${deleted.length})...`,
      );

      let batch = db.batch();
      let batchCount = 0;
      let collectionRestored = 0;

      // added: スナップショットから取得して書き込み
      for (const doc of added) {
        const docRef = db
          .collection(
            `${TOP_LEVEL_COLLECTIONS.COMPANIES}/${companyId}/${collectionName}`,
          )
          .doc(doc.docId);

        const restoredData = convertStringsToTimestamps(doc.data);
        batch.set(docRef, restoredData);
        batchCount++;
        collectionRestored++;
        stats.added++;

        if (batchCount >= 500) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }

      // modified: スナップショットから取得して書き込み
      for (const doc of modified) {
        const docRef = db
          .collection(
            `${TOP_LEVEL_COLLECTIONS.COMPANIES}/${companyId}/${collectionName}`,
          )
          .doc(doc.docId);

        const restoredData = convertStringsToTimestamps(doc.data);
        batch.set(docRef, restoredData);
        batchCount++;
        collectionRestored++;
        stats.modified++;

        if (batchCount >= 500) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }

      // deleted: バックアップから取得して書き込み（復元）
      for (const doc of deleted) {
        const docRef = db
          .collection(
            `${TOP_LEVEL_COLLECTIONS.COMPANIES}/${companyId}/${collectionName}`,
          )
          .doc(doc.docId);

        const restoredData = convertStringsToTimestamps(doc.data);
        batch.set(docRef, restoredData);
        batchCount++;
        collectionRestored++;
        stats.deleted++;

        if (batchCount >= 500) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      console.log(
        `  ✅ ${collectionName}: ${collectionRestored}件リストア完了`,
      );
      totalRestored += collectionRestored;
      restoredCollections.push(collectionName);

      // Cloud Functions完了待機
      if (collection.waitAfterRestore > 0) {
        console.log(
          `  ⏳ Cloud Functions処理待機中... (${collection.waitAfterRestore}ms)`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, collection.waitAfterRestore),
        );
      }
    }

    console.log("\n✅ 差分ベースリストアが完了しました！");
    console.log(`\n📈 リストア統計:`);
    console.log(`  - 会社名: ${summary.companyName}`);
    console.log(
      `  - リストアしたコレクション数: ${restoredCollections.length}`,
    );
    console.log(`  - 総ドキュメント数: ${totalRestored}`);
    console.log(
      `  - 内訳: 追加 ${stats.added}件, 変更 ${stats.modified}件, 削除復元 ${stats.deleted}件`,
    );
    console.log(`\n📋 リストアしたコレクション:`);
    restoredCollections.forEach((col) => console.log(`  - ${col}`));

    console.log(`\n💡 次のステップ:`);
    console.log(
      `   メンテナンスモード解除: npm run cli companies maintenance-off ${companyId}\n`,
    );

    return {
      success: true,
      companyId: companyId,
      companyName: summary.companyName,
      restoredCollections: restoredCollections,
      restoredDocuments: totalRestored,
      stats: stats,
    };
  } catch (error) {
    console.error("\n❌ リストア中にエラーが発生しました:");
    console.error(error.message);
    throw error;
  }
}

/**
 * 最新バックアップから会社データを完全リストア（companyIdベース）
 */
async function restoreCompanyFromLatestBackup(companyId, options = {}) {
  try {
    const storage = createStorageAdapterFromEnv(options.storage);

    console.log(`\n🔍 会社 ${companyId} の最新バックアップを検索中...`);

    // 最新のバックアップファイルを取得
    const backupPattern = getStoragePath(
      "companies",
      companyId,
      "backup_*.json",
    );
    const backupFiles = await storage.list(backupPattern, {
      includeMetadata: true,
    });

    if (backupFiles.length === 0) {
      console.log(`\n❌ 会社 ${companyId} のバックアップが見つかりません。`);
      console.log("先にバックアップを取得してください:");
      console.log(`   npm run cli backup company ${companyId}\n`);
      return { success: false, reason: "no-backup-found" };
    }

    // 最新のバックアップを取得（ファイル名でソート）
    const latestBackup = backupFiles.sort((a, b) =>
      b.path.localeCompare(a.path),
    )[0];

    console.log(`✅ 最新バックアップ: ${path.basename(latestBackup.path)}`);

    // restoreCompany関数を呼び出し
    return await restoreCompany(latestBackup.path, options);
  } catch (error) {
    console.error(`\n❌ リストア中にエラーが発生しました:`, error.message);
    throw error;
  }
}

module.exports = {
  backupCompany,
  snapshotCompany,
  diffBackup,
  restoreSelective,
  restoreDiff,
  listBackups,
  restoreCompanyFromLatestBackup,
};
