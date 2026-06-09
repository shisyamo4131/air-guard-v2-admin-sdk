/**
 * @file src/commands/migration.js
 * @description マイグレーション処理
 */

const admin = require("../firebaseAdmin");

module.exports = {
  runMigration,
  // runCustomerAbbreviationMigration,
};

function runMigration() {
  throw new Error("マイグレーション処理は現在定義されていません。");
}

// ============================================================================
// Customer abbreviation マイグレーション
// ※参考コードとして残していますが、現時点では実行されません。
// ============================================================================

/**
 * Customer の name から abbreviation を生成する
 * @param {string} name - 顧客名
 * @returns {string} - 略称
 */
function generateAbbreviation(name) {
  if (!name || typeof name !== "string") {
    return "";
  }

  // 1. 「株式会社」「有限会社」を削除
  let result = name.replace(/株式会社/g, "").replace(/有限会社/g, "");

  // 2. 前後の空白（半角・全角）を削除
  result = result.replace(/^[\s\u3000]+|[\s\u3000]+$/g, "");

  return result;
}

/**
 * Customer abbreviation マイグレーション メイン処理
 *
 * すべての Companies/{companyId}/Customers ドキュメントの name フィールドから
 * abbreviation フィールドを生成する。
 */
async function runCustomerAbbreviationMigration() {
  console.log("🚀 Customer abbreviation マイグレーション開始\n");
  console.log("=".repeat(60));

  const startTime = Date.now();
  const summary = { total: 0, updated: 0, skipped: 0, errors: 0 };

  try {
    const db = admin.firestore();

    // コレクショングループで全 Customers を取得
    console.log("\n📂 全 Customers ドキュメント取得中...");
    const customersSnapshot = await db.collectionGroup("Customers").get();

    if (customersSnapshot.empty) {
      console.log("  ℹ️  Customers ドキュメントなし");
      console.log("\n" + "=".repeat(60));
      console.log("📊 マイグレーション完了（処理対象なし）");
      console.log("=".repeat(60));
      return;
    }

    console.log(
      `  ℹ️  ${customersSnapshot.size} 件のドキュメントを処理します\n`,
    );

    for (const doc of customersSnapshot.docs) {
      summary.total++;
      const data = doc.data();
      const { name } = data;

      // name がない場合はスキップ
      if (!name) {
        console.log(`  ⏭️  ${doc.ref.path}: name なし、スキップ`);
        summary.skipped++;
        continue;
      }

      try {
        const abbreviation = generateAbbreviation(name);
        await doc.ref.update({ abbreviation });
        console.log(`  ✅ ${doc.ref.path}: "${name}" → "${abbreviation}"`);
        summary.updated++;
      } catch (error) {
        console.error(`  ❌ ${doc.ref.path}: エラー - ${error.message}`);
        summary.errors++;
      }
    }

    // 結果サマリー表示
    console.log("\n" + "=".repeat(60));
    console.log("📊 Customer abbreviation マイグレーション完了\n");
    console.log("【処理結果サマリー】");
    console.log(`  合計:       ${summary.total} 件`);
    console.log(`  更新:       ${summary.updated} 件`);
    console.log(`  スキップ:   ${summary.skipped} 件`);
    console.log(`  エラー:     ${summary.errors} 件`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  処理時間: ${duration} 秒`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ マイグレーション失敗:", error);
    throw error;
  }
}
