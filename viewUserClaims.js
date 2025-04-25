// viewUserClaims.js
const admin = require("./firebaseAdmin"); // ★ 初期化モジュールをインポート

// --- Firebase初期化処理は削除 ---

async function main() {
  // 動的インポートを使用して inquirer を読み込む
  const inquirer = await import("inquirer");
  const prompt = inquirer.default.prompt || inquirer.prompt;

  if (typeof prompt !== "function") {
    console.error(
      "Could not find the prompt function from inquirer. Please check your inquirer installation and version."
    );
    process.exit(1);
  }

  console.log("\n--- View User Custom Claims ---");

  const answers = await prompt([
    // ... (inquirer の質問部分は変更なし) ...
    {
      type: "input",
      name: "email",
      message:
        "Enter the email address of the user whose claims you want to view:",
      validate: (value) => {
        const pass = value.match(
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        );
        if (pass) {
          return true;
        }
        return "Please enter a valid email address.";
      },
    },
  ]);

  const email = answers.email;

  try {
    console.log(`\nSearching for user with email: ${email}...`);
    // ★ インポートした admin を使用
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;
    console.log(`User found: UID = ${uid}`);

    const customClaims = userRecord.customClaims;

    if (customClaims && Object.keys(customClaims).length > 0) {
      console.log("\nCustom Claims:");
      console.log(JSON.stringify(customClaims, null, 2));
    } else {
      console.log("\nThis user has no custom claims set.");
    }
  } catch (error) {
    console.error("\n❌ Error processing request:");
    if (error.code === "auth/user-not-found") {
      console.error(
        `User with email ${email} not found in Firebase Authentication.`
      );
    } else {
      console.error("An unexpected error occurred:", error.message);
      console.error(error); // スタックトレースも表示
    }
  }
}

main();
