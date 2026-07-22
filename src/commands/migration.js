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
const {
  Article,
  Customer,
  Employee,
  OperationResult,
  Outsourcer,
  Site,
} = require("@shisyamo4131/air-guard-v2-schemas");

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
  await runTokenMapMigration();
}

/*****************************************************************************
 * EXPORTS
 *****************************************************************************/
module.exports = { runMigration, runBillingCalculationMigration };

// ============================================================================
// Billing 消費税計算バージョン マイグレーション
// ============================================================================

const BILLING_CALCULATION_VERSION = 2;
const BILLING_MIGRATION_BATCH_SIZE = 300;
const BILLING_MIGRATION_BATCH_WAIT_MS = 3000;
const OBSOLETE_OPERATION_RESULT_FIELDS = [
  "tax",
  "billingAmount",
  "unroundedTaxAmount",
];

/**
 * OperationResult に billingCalculationVersion を設定して旧プロパティを削除し、
 * OperationResult 更新トリガーによる Billing の再同期を要求します。
 *
 * @param {string|null} companyId - 対象会社ID。未指定の場合は全会社
 * @param {Object} options
 * @param {boolean} options.apply - true の場合のみ Firestore を更新
 */
async function runBillingCalculationMigration(
  companyId = null,
  { apply = false } = {},
) {
  if (companyId !== null && typeof companyId !== "string") {
    throw new Error("companyId must be a string or null");
  }

  const db = admin.firestore();
  const query = companyId
    ? db.collection(`Companies/${companyId}/OperationResults`)
    : db.collectionGroup("OperationResults");
  const snapshot = await query.get();
  const targets = snapshot.docs.filter((doc) => {
    const data = doc.data();
    return (
      data.billingCalculationVersion !== BILLING_CALCULATION_VERSION ||
      typeof data.taxRate !== "number" ||
      OBSOLETE_OPERATION_RESULT_FIELDS.some((field) =>
        Object.prototype.hasOwnProperty.call(data, field),
      )
    );
  });

  console.log("\n🚀 Billing 消費税計算バージョン マイグレーション");
  console.log(`対象会社: ${companyId || "すべての会社"}`);
  console.log(`モード: ${apply ? "更新" : "ドライラン"}`);
  console.log(`OperationResult総数: ${snapshot.size}件`);
  console.log(`更新対象: ${targets.length}件`);

  if (!apply || targets.length === 0) {
    if (!apply) {
      console.log(
        "\nℹ️  ドライランのため更新していません。末尾に apply を指定すると更新します。",
      );
    }
    return {
      companyId,
      targetVersion: BILLING_CALCULATION_VERSION,
      mode: apply ? "apply" : "dry-run",
      total: snapshot.size,
      target: targets.length,
      updated: 0,
    };
  }

  let updated = 0;
  for (
    let offset = 0;
    offset < targets.length;
    offset += BILLING_MIGRATION_BATCH_SIZE
  ) {
    const chunk = targets.slice(
      offset,
      offset + BILLING_MIGRATION_BATCH_SIZE,
    );
    const batch = db.batch();

    chunk.forEach((doc) => {
      const operationResult = new OperationResult({
        ...doc.data(),
        docId: doc.id,
        billingCalculationVersion: BILLING_CALCULATION_VERSION,
      });
      const updateData = operationResult.toObject();

      OBSOLETE_OPERATION_RESULT_FIELDS.forEach((field) => {
        updateData[field] = admin.firestore.FieldValue.delete();
      });

      batch.set(doc.ref, updateData, { merge: true });
    });

    await batch.commit();
    updated += chunk.length;
    console.log(`✅ ${updated}/${targets.length}件 更新`);

    if (updated < targets.length) {
      await new Promise((resolve) =>
        setTimeout(resolve, BILLING_MIGRATION_BATCH_WAIT_MS),
      );
    }
  }

  console.log("\n✅ マイグレーション書き込み完了");
  console.log(
    "OperationResult更新トリガーによるBilling再同期の完了をFunctionsログで確認してください。",
  );

  return {
    companyId,
    targetVersion: BILLING_CALCULATION_VERSION,
    mode: "apply",
    total: snapshot.size,
    target: targets.length,
    updated,
  };
}

// ============================================================================
// tokenMap マイグレーション
// ============================================================================

const TOKEN_MAP_MIGRATION_TARGETS = [
  { collectionName: "Articles", Model: Article },
  { collectionName: "Customers", Model: Customer },
  { collectionName: "Employees", Model: Employee },
  { collectionName: "Outsourcers", Model: Outsourcer },
  { collectionName: "Sites", Model: Site },
];

/**
 * 2つの tokenMap が同じ内容か確認します。
 *
 * @param {Object|null|undefined} currentTokenMap - 現在保存されている tokenMap
 * @param {Object|null} nextTokenMap - スキーマから再生成した tokenMap
 * @returns {boolean} 同じ内容の場合は true
 */
function tokenMapsAreEqual(currentTokenMap, nextTokenMap) {
  if (currentTokenMap == null || nextTokenMap == null) {
    return currentTokenMap == null && nextTokenMap == null;
  }

  if (
    typeof currentTokenMap !== "object" ||
    typeof nextTokenMap !== "object"
  ) {
    return false;
  }

  const currentKeys = Object.keys(currentTokenMap).sort();
  const nextKeys = Object.keys(nextTokenMap).sort();

  if (currentKeys.length !== nextKeys.length) return false;

  return currentKeys.every(
    (key, index) =>
      key === nextKeys[index] &&
      currentTokenMap[key] === nextTokenMap[key],
  );
}

/**
 * tokenFields が定義されている全スキーマについて tokenMap を再生成します。
 * tokenMap 以外のフィールドは更新しません。
 */
async function runTokenMapMigration() {
  console.log("🚀 tokenMap マイグレーション開始\n");
  console.log("=".repeat(60));

  const startTime = Date.now();
  const db = admin.firestore();
  const summary = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    collections: {},
  };

  try {
    for (const { collectionName, Model } of TOKEN_MAP_MIGRATION_TARGETS) {
      console.log(`\n📂 ${collectionName} ドキュメント取得中...`);

      const snapshot = await db.collectionGroup(collectionName).get();
      const collectionSummary = {
        total: snapshot.size,
        updated: 0,
        skipped: 0,
        errors: 0,
      };
      summary.collections[collectionName] = collectionSummary;
      summary.total += snapshot.size;

      if (snapshot.empty) {
        console.log(`  ℹ️  ${collectionName} ドキュメントなし`);
        continue;
      }

      console.log(`  ℹ️  ${snapshot.size} 件のドキュメントを処理します`);

      for (const doc of snapshot.docs) {
        try {
          const data = doc.data();
          const instance = new Model({
            ...data,
            docId: doc.id,
          });
          const nextTokenMap = instance.tokenMap;

          if (tokenMapsAreEqual(data.tokenMap, nextTokenMap)) {
            console.log(`  ⏭️  ${doc.ref.path}: 更新不要`);
            collectionSummary.skipped++;
            summary.skipped++;
            continue;
          }

          await doc.ref.update({ tokenMap: nextTokenMap });

          console.log(`  ✅ ${doc.ref.path}: tokenMap を更新`);
          collectionSummary.updated++;
          summary.updated++;
        } catch (error) {
          console.error(`  ❌ ${doc.ref.path}: ${error.message}`);
          collectionSummary.errors++;
          summary.errors++;
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 tokenMap マイグレーション完了\n");

    for (const [collectionName, result] of Object.entries(
      summary.collections,
    )) {
      console.log(`【${collectionName}】`);
      console.log(`  合計:       ${result.total} 件`);
      console.log(`  更新:       ${result.updated} 件`);
      console.log(`  スキップ:   ${result.skipped} 件`);
      console.log(`  エラー:     ${result.errors} 件\n`);
    }

    console.log("【全体】");
    console.log(`  合計:       ${summary.total} 件`);
    console.log(`  更新:       ${summary.updated} 件`);
    console.log(`  スキップ:   ${summary.skipped} 件`);
    console.log(`  エラー:     ${summary.errors} 件`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  処理時間: ${duration} 秒`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ tokenMap マイグレーション失敗:", error);
    throw error;
  }
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
