// firebaseAdmin.js
const admin = require("firebase-admin");

// --- 設定 ---
const serviceAccountPath =
  "./air-guard-v2-dev-firebase-adminsdk-fbsvc-f072726bf8"; // ★★★ 実際のパスに修正してください ★★★
// -------------

let initializedAdmin;

// エミュレーターホストの環境変数をチェック
const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
// 必要に応じて他のエミュレーター（Firestoreなど）の環境変数もチェック
// const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

if (admin.apps.length === 0) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log(
      "Firebase Admin SDK initialized successfully by firebaseAdmin.js."
    );

    // 接続先情報をログに出力
    if (authEmulatorHost) {
      console.log(
        `🔌 Connecting to Firebase AUTH Emulator at ${authEmulatorHost}`
      );
    }
    // if (firestoreEmulatorHost) { // 他のエミュレーターも使う場合
    //   console.log(`🔌 Connecting to Firebase FIRESTORE Emulator at ${firestoreEmulatorHost}`);
    // }
    if (!authEmulatorHost /* && !firestoreEmulatorHost など */) {
      console.log("☁️ Connecting to Production Firebase environment.");
    }

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
}

module.exports = initializedAdmin;
