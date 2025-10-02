// firebaseAdmin.js
const admin = require("firebase-admin");

// --- 設定 ---
const serviceAccountPath =
  "../air-guard-v2-dev-firebase-adminsdk-fbsvc-f072726bf8";
// -------------

let initializedAdmin;

/**
 * エミュレーター環境をチェックして接続先を表示する関数
 */
function logConnectionInfo() {
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

  if (authEmulatorHost || firestoreEmulatorHost) {
    console.log("🔌 Connecting to Firebase Emulator:");
    if (authEmulatorHost) {
      console.log(`   - AUTH: ${authEmulatorHost}`);
    }
    if (firestoreEmulatorHost) {
      console.log(`   - FIRESTORE: ${firestoreEmulatorHost}`);
    }
  } else {
    console.log("☁️ Connecting to Production Firebase environment.");
  }
}

// 初期化処理
if (admin.apps.length === 0) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
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
