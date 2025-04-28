// (旧: listAdminUsers.js) -> 新しいファイル名で保存してください (例: listSuperUsers.js)
const admin = require("./firebaseAdmin"); // 初期化済み Admin SDK インスタンスをインポート

/**
 * isSuperUser: true のカスタムクレームを持つユーザーをリストアップする関数
 */
async function listSuperUsers() {
  // 関数名も変更
  console.log(
    "isSuperUser: true のカスタムクレームを持つユーザーを検索しています..."
  ); // メッセージ変更
  const superUsers = []; // 変数名も変更 (isAdmin: true -> isSuperUser: true)
  let nextPageToken; // ページネーショントークン

  try {
    // listUsers は一度に最大1000件のユーザーを取得します。
    // ユーザー数が1000を超える場合、pageToken を使用して繰り返し取得する必要があります。
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);

      listUsersResult.users.forEach((userRecord) => {
        // ユーザーのカスタムクレームを確認
        // ★★★ 変更点: isAdmin -> isSuperUser ★★★
        if (
          userRecord.customClaims &&
          userRecord.customClaims.isSuperUser === true
        ) {
          // isSuperUser が true であればリストに追加
          superUsers.push({
            // 変数名変更
            uid: userRecord.uid,
            email: userRecord.email || "メールアドレスなし",
            displayName: userRecord.displayName || "表示名なし",
          });
        }
      });

      // 次のページのトークンを取得
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken); // 次のページが存在する限りループを続ける

    // 結果の表示
    if (superUsers.length > 0) {
      // 変数名変更
      // ★★★ メッセージ変更 ★★★
      console.log(
        `\nisSuperUser: true のユーザーが ${superUsers.length} 人見つかりました:`
      );
      superUsers.forEach((user, index) => {
        // 変数名変更
        console.log(`${index + 1}. UID: ${user.uid}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Display Name: ${user.displayName}`);
        console.log("---");
      });
    } else {
      // ★★★ メッセージ変更 ★★★
      console.log(
        "\nisSuperUser: true のカスタムクレームを持つユーザーは見つかりませんでした。"
      );
    }
  } catch (error) {
    console.error(
      "\nユーザーリストの取得中にエラーが発生しました:",
      error.code,
      error.message
    );
  }
}

// スクリプトを実行
listSuperUsers(); // 関数呼び出しも変更
