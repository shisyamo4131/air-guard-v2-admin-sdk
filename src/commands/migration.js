/**
 * @file src/commands/migration.js
 * @description マイグレーション処理
 */

const admin = require("../firebaseAdmin");

/*****************************************************************************
 * FireModel と ServerAdapter のセットアップ
 *****************************************************************************/
const FireModel = require("@shisyamo4131/air-firebase-v2").default;
const ServerAdapter =
  require("@shisyamo4131/air-firebase-v2-server-adapter").default;

FireModel.setAdapter(new ServerAdapter(admin.firestore()));

/*****************************************************************************
 * schemas パッケージが利用できるかの確認用コード
 *****************************************************************************/
// const { Customer } = require("@shisyamo4131/air-guard-v2-schemas");

// async function test() {
//   const customer = new Customer();

//   console.log("instance created");

//   const exists = await customer.fetch({
//     prefix: "Companies/DU2gJlgO9HY1ny7xkA3m/",
//     docId: "LJ60NXbuJEj002mvP3eb",
//   });

//   console.log({ exists });
// }

/*****************************************************************************
 * MODULE IMPORT のサンプルコード
 *****************************************************************************/
// const {
//   syncOperationResultToDailyAttendances,
// } = require("../../../air-guard-v2/functions/modules/dailyAttendances/syncOperationResultToDailyAttendances.js");

/*****************************************************************************
 * MAIN MODULE
 *****************************************************************************/
async function runMigration() {
  // throw new Error("マイグレーション処理は現在定義されていません。");
  await runSiteConstructionPeriodMigration();
}

/*****************************************************************************
 * EXPORTS
 *****************************************************************************/
module.exports = { runMigration };

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

/**
 * Employee displayNameKana マイグレーション メイン処理
 *
 * すべての Companies/{companyId}/Employees ドキュメントの lastNameKana フィールドから
 * displayNameKana フィールドを生成する。
 */
async function runEmployeeDisplayNameKanaMigration() {
  console.log("🚀 Employee displayNameKana マイグレーション開始\n");
  console.log("=".repeat(60));

  const startTime = Date.now();
  const summary = { total: 0, updated: 0, skipped: 0, errors: 0 };

  try {
    const db = admin.firestore();

    // コレクショングループで全 Employees を取得
    console.log("\n📂 全 Employees ドキュメント取得中...");
    const employeesSnapshot = await db.collectionGroup("Employees").get();

    if (employeesSnapshot.empty) {
      console.log("  ℹ️  Employees ドキュメントなし");
      console.log("\n" + "=".repeat(60));
      console.log("📊 マイグレーション完了（処理対象なし）");
      console.log("=".repeat(60));
      return;
    }

    console.log(
      `  ℹ️  ${employeesSnapshot.size} 件のドキュメントを処理します\n`,
    );

    for (const doc of employeesSnapshot.docs) {
      summary.total++;
      const data = doc.data();
      const { lastNameKana } = data;

      // lastNameKana がない場合はスキップ
      if (!lastNameKana) {
        console.log(`  ⏭️  ${doc.ref.path}: lastNameKana なし、スキップ`);
        summary.skipped++;
        continue;
      }

      try {
        const displayNameKana = lastNameKana;
        await doc.ref.update({ displayNameKana });
        console.log(
          `  ✅ ${doc.ref.path}: "${lastNameKana}" → "${displayNameKana}"`,
        );
        summary.updated++;
      } catch (error) {
        console.error(`  ❌ ${doc.ref.path}: エラー - ${error.message}`);
        summary.errors++;
      }
    }

    // 結果サマリー表示
    console.log("\n" + "=".repeat(60));
    console.log("📊 Employee displayNameKana マイグレーション完了\n");
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

/**
 * Operation.securityType マイグレーション
 *
 * 対象:
 *   - Companies/{companyId}/Sites
 *   - Companies/{companyId}/SiteOperationSchedules
 *   - Companies/{companyId}/OperationResults
 *
 * Sites.securityType が存在しない場合は "UNSET" を設定する。
 * SiteOperationSchedules および OperationResults の securityType は、
 * 対応する Site.securityType で更新する。
 */
async function runOperationSecurityTypeMigration() {
  console.log("🚀 Operation.securityType マイグレーション開始\n");
  console.log("=".repeat(60));

  const startTime = Date.now();

  const summary = {
    sites: {
      total: 0,
      updated: 0,
      errors: 0,
    },
    schedules: {
      total: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    },
    results: {
      total: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    },
  };

  try {
    const db = admin.firestore();

    /**********************************************************************
     * Sites
     **********************************************************************/
    console.log("\n📂 全 Sites ドキュメント取得中...");

    const siteSnapshot = await db.collectionGroup("Sites").get();

    const siteMap = new Map();

    for (const doc of siteSnapshot.docs) {
      summary.sites.total++;

      const companyId = doc.ref.parent.parent.id;
      const siteId = doc.id;

      let { securityType } = doc.data();

      if (!securityType) {
        securityType = "UNSET";

        try {
          await doc.ref.update({ securityType });

          console.log(`  ✅ ${doc.ref.path}: securityType = "UNSET" を追加`);

          summary.sites.updated++;
        } catch (error) {
          console.error(`  ❌ ${doc.ref.path}: ${error.message}`);
          summary.sites.errors++;
          continue;
        }
      }

      siteMap.set(`${companyId}/${siteId}`, securityType);
    }

    console.log(`  ℹ️  ${summary.sites.total} 件の Site を読み込みました。`);

    /**********************************************************************
     * SiteOperationSchedules
     **********************************************************************/
    console.log("\n📂 SiteOperationSchedules 更新中...");

    const scheduleSnapshot = await db
      .collectionGroup("SiteOperationSchedules")
      .get();

    for (const doc of scheduleSnapshot.docs) {
      summary.schedules.total++;

      const companyId = doc.ref.parent.parent.id;
      const { siteId } = doc.data();

      const securityType = siteMap.get(`${companyId}/${siteId}`);

      if (!securityType) {
        console.warn(`  ⏭️ ${doc.ref.path}: Site が見つからないためスキップ`);
        summary.schedules.skipped++;
        continue;
      }

      try {
        await doc.ref.update({ securityType });

        console.log(`  ✅ ${doc.ref.path}: securityType = "${securityType}"`);

        summary.schedules.updated++;
      } catch (error) {
        console.error(`  ❌ ${doc.ref.path}: ${error.message}`);

        summary.schedules.errors++;
      }
    }

    /**********************************************************************
     * OperationResults
     **********************************************************************/
    console.log("\n📂 OperationResults 更新中...");

    const resultSnapshot = await db.collectionGroup("OperationResults").get();

    for (const doc of resultSnapshot.docs) {
      summary.results.total++;

      const companyId = doc.ref.parent.parent.id;
      const { siteId } = doc.data();

      const securityType = siteMap.get(`${companyId}/${siteId}`);

      if (!securityType) {
        console.warn(`  ⏭️ ${doc.ref.path}: Site が見つからないためスキップ`);
        summary.results.skipped++;
        continue;
      }

      try {
        await doc.ref.update({ securityType });

        console.log(`  ✅ ${doc.ref.path}: securityType = "${securityType}"`);

        summary.results.updated++;
      } catch (error) {
        console.error(`  ❌ ${doc.ref.path}: ${error.message}`);

        summary.results.errors++;
      }
    }

    /**********************************************************************
     * サマリー
     **********************************************************************/
    console.log("\n" + "=".repeat(60));
    console.log("📊 Operation.securityType マイグレーション完了\n");

    console.log("【Sites】");
    console.log(`  合計:       ${summary.sites.total} 件`);
    console.log(`  更新:       ${summary.sites.updated} 件`);
    console.log(`  エラー:     ${summary.sites.errors} 件`);

    console.log("\n【SiteOperationSchedules】");
    console.log(`  合計:       ${summary.schedules.total} 件`);
    console.log(`  更新:       ${summary.schedules.updated} 件`);
    console.log(`  スキップ:   ${summary.schedules.skipped} 件`);
    console.log(`  エラー:     ${summary.schedules.errors} 件`);

    console.log("\n【OperationResults】");
    console.log(`  合計:       ${summary.results.total} 件`);
    console.log(`  更新:       ${summary.results.updated} 件`);
    console.log(`  スキップ:   ${summary.results.skipped} 件`);
    console.log(`  エラー:     ${summary.results.errors} 件`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n⏱️  処理時間: ${duration} 秒`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ マイグレーション失敗:", error);
    throw error;
  }
}

/**
 * Site hasConstructionPeriod マイグレーション メイン処理
 *
 * すべての Companies/{companyId}/Sites ドキュメントに
 * hasConstructionPeriodStartAt
 * hasConstructionPeriodEndAt
 * を追加・更新する。
 */
async function runSiteConstructionPeriodMigration() {
  console.log("🚀 Site hasConstructionPeriod マイグレーション開始\n");
  console.log("=".repeat(60));

  const startTime = Date.now();
  const summary = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    const db = admin.firestore();

    console.log("\n📂 全 Sites ドキュメント取得中...");
    const snapshot = await db.collectionGroup("Sites").get();

    if (snapshot.empty) {
      console.log("  ℹ️  Sites ドキュメントなし");
      return;
    }

    console.log(`  ℹ️  ${snapshot.size} 件のドキュメントを処理します\n`);

    for (const doc of snapshot.docs) {
      summary.total++;

      const data = doc.data();

      const updateData = {
        hasConstructionPeriodStartAt: !!data.constructionPeriodStartAt,
        hasConstructionPeriodEndAt: !!data.constructionPeriodEndAt,
      };

      // 既に値が一致している場合は更新しない
      if (
        data.hasConstructionPeriodStartAt ===
          updateData.hasConstructionPeriodStartAt &&
        data.hasConstructionPeriodEndAt ===
          updateData.hasConstructionPeriodEndAt
      ) {
        console.log(`  ⏭️  ${doc.ref.path}: 更新不要`);
        summary.skipped++;
        continue;
      }

      try {
        await doc.ref.update(updateData);

        console.log(
          `  ✅ ${doc.ref.path}: start=${updateData.hasConstructionPeriodStartAt}, end=${updateData.hasConstructionPeriodEndAt}`,
        );

        summary.updated++;
      } catch (error) {
        console.error(`  ❌ ${doc.ref.path}: ${error.message}`);
        summary.errors++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 Site hasConstructionPeriod マイグレーション完了\n");
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
