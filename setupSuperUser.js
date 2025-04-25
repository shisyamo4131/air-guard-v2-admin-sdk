// setupSuperUser.js
const admin = require("./firebaseAdmin"); // ★ 初期化モジュールをインポート
// const inquirer = require('inquirer'); // CommonJS スタイル (古いバージョンや設定による)

// --- Firebase初期化処理は削除 ---

async function main() {
  // 動的インポートを使用して inquirer を読み込む (ES Modules スタイル推奨)
  const inquirer = await import("inquirer");
  const prompt = inquirer.default.prompt || inquirer.prompt; // 互換性のため

  if (typeof prompt !== "function") {
    console.error(
      "Could not find the prompt function from inquirer. Please check your inquirer installation and version."
    );
    process.exit(1);
  }

  console.log("\n--- Create New SuperUser Account ---");

  const answers = await prompt([
    // ... (inquirer の質問部分は変更なし) ...
    {
      type: "input",
      name: "email",
      message: "Enter the email address for the new SuperUser:",
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
    {
      type: "password", // パスワード入力用
      name: "password",
      message: "Enter the password for the new SuperUser:",
      mask: "*", // 入力文字を隠す
      validate: (value) => {
        if (value.length < 6) {
          // Firebaseのデフォルト最小長に合わせる
          return "Password must be at least 6 characters long.";
        }
        return true;
      },
    },
    {
      type: "confirm",
      name: "confirm",
      message: (answers) =>
        `Create a new SuperUser with email ${answers.email}?`,
      default: false,
    },
  ]);

  if (!answers.confirm) {
    console.log("Operation cancelled.");
    return;
  }

  const email = answers.email;
  const password = answers.password;

  try {
    // 1. まずメールアドレスが既に存在しないか確認
    console.log(`\nChecking if email ${email} already exists...`);
    try {
      // ★ インポートした admin を使用
      await admin.auth().getUserByEmail(email);
      // ここに到達した場合、ユーザーは既に存在する
      console.error(`\n❌ Error: User with email ${email} already exists.`);
      console.error(
        "Please use a different email address or delete the existing user."
      );
      return; // 処理中断
    } catch (error) {
      // ユーザーが存在しない場合のエラー (auth/user-not-found) は期待通りなので無視
      if (error.code !== "auth/user-not-found") {
        // それ以外の予期せぬエラーは再スロー
        throw error;
      }
      // ユーザーが存在しないことが確認できた
      console.log(`Email ${email} is available.`);
    }

    // 2. 新しいユーザーを作成
    console.log(`\nCreating new user with email: ${email}...`);
    // ★ インポートした admin を使用
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      // emailVerified: false, // 必要に応じて設定
      // displayName: 'Super User', // 必要に応じて設定
      // disabled: false, // 必要に応じて設定
    });
    const uid = userRecord.uid;
    console.log(`User created successfully: UID = ${uid}`);

    // 3. 作成したユーザーに isSuperUser: true のカスタムクレームを設定
    console.log("Setting SuperUser custom claim...");
    const superUserClaims = {
      isSuperUser: true,
      // companyId は設定しない
    };
    // ★ インポートした admin を使用
    await admin.auth().setCustomUserClaims(uid, superUserClaims);

    console.log(
      `\n✅ Successfully created new SuperUser account for ${email} (UID: ${uid}) with isSuperUser=true claim.`
    );
    console.log("The user can now log in with the provided credentials.");
  } catch (error) {
    console.error("\n❌ Error processing request:");
    console.error("An unexpected error occurred:", error.message);
    console.error(error);
  }
}

main();
