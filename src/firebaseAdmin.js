// firebaseAdmin.js
const admin = require("firebase-admin");
const path = require("path");

/**
 * 環境に応じた秘密鍵のパスを取得
 * @returns {string} サービスアカウントキーのパス
 */
function getServiceAccountPath() {
  // 環境変数またはコマンドライン引数から環境を判定
  const isEmulator =
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.FIRESTORE_EMULATOR_HOST;

  // エミュレーター環境の場合は秘密鍵不要（ダミーで初期化）
  if (isEmulator) {
    return null; // エミュレーターは秘密鍵不要
  }

  // NODE_ENV または FIREBASE_ENV で環境を判定
  const env = process.env.FIREBASE_ENV || process.env.NODE_ENV || "dev";

  switch (env.toLowerCase()) {
    case "production":
    case "prod":
      // 本番環境の秘密鍵（将来実装）
      return path.join(
        __dirname,
        "..",
        "air-guard-v2-prod-firebase-adminsdk-xxxxx.json"
      );

    case "development":
    case "dev":
    default:
      // Dev環境の秘密鍵（現在使用中）
      return path.join(
        __dirname,
        "..",
        "air-guard-v2-dev-firebase-adminsdk-fbsvc-f072726bf8.json"
      );
  }
}

/**
 * エミュレーター環境をチェックして接続先を表示する関数
 */
function logConnectionInfo() {
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const env = process.env.FIREBASE_ENV || process.env.NODE_ENV || "dev";

  if (authEmulatorHost || firestoreEmulatorHost) {
    console.log("🔌 Connecting to Firebase Emulator:");
    if (authEmulatorHost) {
      console.log(`   - AUTH: ${authEmulatorHost}`);
    }
    if (firestoreEmulatorHost) {
      console.log(`   - FIRESTORE: ${firestoreEmulatorHost}`);
    }
    console.log(`   - Service Account: Dev環境の秘密鍵使用`);
  } else {
    const envLabel = env === "prod" ? "Production" : "Development";
    console.log(`☁️ Connecting to ${envLabel} Firebase environment.`);
  }
}

let initializedAdmin;

// 初期化処理
if (admin.apps.length === 0) {
  try {
    const serviceAccountPath = getServiceAccountPath();

    if (serviceAccountPath) {
      // Dev/Prod環境：秘密鍵を使用
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Emulator環境：秘密鍵不要（ダミークレデンシャル）
      admin.initializeApp({
        projectId: "air-guard-v2-dev", // エミュレーター用のプロジェクトID
      });
    }

    console.log(
      "Firebase Admin SDK initialized successfully by firebaseAdmin.js."
    );

    // 接続先情報をログに出力（初期化時）
    logConnectionInfo();

    initializedAdmin = admin;
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK in firebaseAdmin.js:");
    console.error(
      "Please ensure the service account key path is correct and the file is valid."
    );
    console.error(error.message);
    process.exit(1);
  }
} else {
  console.log(
    "Firebase Admin SDK already initialized. Reusing existing instance."
  );
  initializedAdmin = admin.app();

  // 既に初期化済みの場合でも現在の接続先を表示
  logConnectionInfo();
}

module.exports = initializedAdmin;
