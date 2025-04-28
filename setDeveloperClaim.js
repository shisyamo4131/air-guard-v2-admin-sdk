// setDeveloperClaim.js
const admin = require("./firebaseAdmin"); // 初期化済み Admin SDK インスタンスをインポート

async function main() {
  // 動的インポートを使用して inquirer を読み込む
  const inquirer = await import("inquirer");
  const prompt = inquirer.default.prompt || inquirer.prompt; // 互換性のため

  if (typeof prompt !== "function") {
    console.error(
      "Could not find the prompt function from inquirer. Please check your inquirer installation and version."
    );
    process.exit(1);
  }

  console.log("\n--- Add 'isDeveloper' Claim to Existing SuperUser ---"); // タイトルを少し変更

  const answers = await prompt([
    {
      type: "input",
      name: "email",
      message: "Enter the email address of the SuperUser to modify:", // メッセージを少し変更
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
      type: "confirm",
      name: "confirm",
      message: (answers) =>
        `Add the 'isDeveloper: true' claim to user ${answers.email}? (Requires existing isSuperUser claim)`, // 確認メッセージを更新
      default: false,
    },
  ]);

  if (!answers.confirm) {
    console.log("Operation cancelled.");
    return;
  }

  const email = answers.email;

  try {
    // 1. メールアドレスでユーザーを検索
    console.log(`\nFinding user with email: ${email}...`);
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;
    console.log(`User found: UID = ${uid}`);

    // 2. 既存のカスタムクレームを取得
    const existingClaims = userRecord.customClaims || {};
    console.log("Existing claims:", existingClaims);

    // ★★★ isSuperUser クレームのチェックを追加 ★★★
    if (!existingClaims.isSuperUser) {
      console.error(
        `\n❌ Error: User ${email} does not have the 'isSuperUser: true' claim.`
      );
      console.error("Cannot add 'isDeveloper' claim to a non-SuperUser.");
      return; // isSuperUser でない場合は処理を中断
    }
    // ★★★ チェックここまで ★★★

    // 3. 既存のクレームに isDeveloper: true を追加（または上書き）
    const updatedClaims = {
      ...existingClaims,
      isDeveloper: true,
    };

    // 4. 更新されたカスタムクレームを設定
    console.log(`Setting updated claims: ${JSON.stringify(updatedClaims)}...`);
    await admin.auth().setCustomUserClaims(uid, updatedClaims);

    console.log(
      `\n✅ Successfully set 'isDeveloper: true' claim for SuperUser ${email} (UID: ${uid}).`
    );
    console.log("Final claims:", updatedClaims);
  } catch (error) {
    console.error("\n❌ Error processing request:");
    if (error.code === "auth/user-not-found") {
      console.error(`   Error: User with email ${email} not found.`);
    } else {
      console.error(`   Error Code: ${error.code || "N/A"}`);
      console.error(`   Error Message: ${error.message}`);
      // console.error(error); // 詳細なスタックトレースが必要な場合
    }
  }
}

main();
