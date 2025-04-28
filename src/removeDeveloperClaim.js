// removeDeveloperClaim.js
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

  console.log("\n--- Set 'isDeveloper' Claim to false for User ---"); // タイトルを変更

  const answers = await prompt([
    {
      type: "input",
      name: "email",
      message: "Enter the email address of the user to modify:", // メッセージを一般化
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
        `Set the 'isDeveloper: false' claim for user ${answers.email}? (This will effectively remove developer privileges if the claim exists)`, // 確認メッセージを更新
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

    // ★★★ isSuperUser チェックを削除 ★★★
    // isDeveloper を false に設定するのに isSuperUser である必要はないため

    // 3. 既存のクレームに isDeveloper: false を追加（または上書き）
    const updatedClaims = {
      ...existingClaims,
      isDeveloper: false, // ★★★ ここを isDeveloper: false に変更 ★★★
    };

    // 4. 更新されたカスタムクレームを設定
    console.log(`Setting updated claims: ${JSON.stringify(updatedClaims)}...`);
    await admin.auth().setCustomUserClaims(uid, updatedClaims);

    console.log(
      `\n✅ Successfully set 'isDeveloper: false' claim for user ${email} (UID: ${uid}).` // 成功メッセージを更新
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
