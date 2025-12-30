/**
 * @file src/commands/migration.js
 * @description Geopoint マイグレーション処理（一度きりの実行）
 *
 * 既存の location プロパティ（lat, lng）から geopoint フィールドを生成し、
 * ドキュメントに追加する。
 *
 * 対象コレクション:
 * - Companies（ルートレベル）
 * - Companies/{companyId}/Employees
 * - Companies/{companyId}/Sites
 * - Companies/{companyId}/Customers
 */

const admin = require("../firebaseAdmin");

/**
 * ドキュメントに geopoint を追加
 * @param {Object} doc - Firestore ドキュメントスナップショット
 * @param {string} collectionName - コレクション名（ログ用）
 * @returns {Promise<boolean>} - 更新した場合 true
 */
async function addGeopointToDocument(doc, collectionName) {
  const data = doc.data();

  // location プロパティがない、または lat/lng がない場合はスキップ
  if (
    !data.location ||
    typeof data.location.lat !== "number" ||
    typeof data.location.lng !== "number"
  ) {
    console.log(
      `  ⏭️  [${collectionName}] ${doc.id}: location データなし、スキップ`
    );
    return false;
  }

  // 既に geopoint がある場合はスキップ
  if (data.geopoint) {
    console.log(`  ⏭️  [${collectionName}] ${doc.id}: geopoint 既存、スキップ`);
    return false;
  }

  try {
    // GeoPoint を生成して更新
    const geopoint = new admin.firestore.GeoPoint(
      data.location.lat,
      data.location.lng
    );
    await doc.ref.update({ geopoint });
    console.log(
      `  ✅ [${collectionName}] ${doc.id}: geopoint 追加 (${data.location.lat}, ${data.location.lng})`
    );
    return true;
  } catch (error) {
    console.error(
      `  ❌ [${collectionName}] ${doc.id}: エラー - ${error.message}`
    );
    return false;
  }
}

/**
 * コレクションの全ドキュメントを処理
 * @param {Object} collectionRef - Firestore コレクション参照
 * @param {string} collectionName - コレクション名（ログ用）
 * @returns {Promise<Object>} - 処理結果
 */
async function processCollection(collectionRef, collectionName) {
  console.log(`\n📂 [${collectionName}] 処理開始...`);

  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log(`  ℹ️  [${collectionName}] ドキュメントなし`);
    return { total: 0, updated: 0, skipped: 0 };
  }

  let updated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const result = await addGeopointToDocument(doc, collectionName);
    if (result) {
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(
    `📊 [${collectionName}] 完了: ${snapshot.size} 件中 ${updated} 件更新、${skipped} 件スキップ`
  );

  return {
    total: snapshot.size,
    updated,
    skipped,
  };
}

/**
 * 会社のサブコレクションを処理
 * @param {Object} db - Firestore インスタンス
 * @param {string} companyId - 会社 ID
 * @returns {Promise<Object>} - 処理結果
 */
async function processCompanySubcollections(db, companyId) {
  console.log(`\n🏢 会社 ${companyId} のサブコレクション処理開始...`);

  const results = {};

  // Employees
  results.Employees = await processCollection(
    db.collection("Companies").doc(companyId).collection("Employees"),
    `Companies/${companyId}/Employees`
  );

  // Sites
  results.Sites = await processCollection(
    db.collection("Companies").doc(companyId).collection("Sites"),
    `Companies/${companyId}/Sites`
  );

  // Customers
  results.Customers = await processCollection(
    db.collection("Companies").doc(companyId).collection("Customers"),
    `Companies/${companyId}/Customers`
  );

  return results;
}

/**
 * メインマイグレーション処理
 */
async function runGeopointMigration() {
  console.log("🚀 Geopoint マイグレーション開始\n");
  console.log("=".repeat(60));

  const startTime = Date.now();
  const summary = {
    Companies: { total: 0, updated: 0, skipped: 0 },
    Employees: { total: 0, updated: 0, skipped: 0 },
    Sites: { total: 0, updated: 0, skipped: 0 },
    Customers: { total: 0, updated: 0, skipped: 0 },
  };

  try {
    const db = admin.firestore();

    // 1. Companies コレクション（ルートレベル）を処理
    const companiesResult = await processCollection(
      db.collection("Companies"),
      "Companies"
    );
    summary.Companies = companiesResult;

    // 2. 各会社のサブコレクションを処理
    const companiesSnapshot = await db.collection("Companies").get();

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      const results = await processCompanySubcollections(db, companyId);

      // サマリーに集計
      summary.Employees.total += results.Employees.total;
      summary.Employees.updated += results.Employees.updated;
      summary.Employees.skipped += results.Employees.skipped;

      summary.Sites.total += results.Sites.total;
      summary.Sites.updated += results.Sites.updated;
      summary.Sites.skipped += results.Sites.skipped;

      summary.Customers.total += results.Customers.total;
      summary.Customers.updated += results.Customers.updated;
      summary.Customers.skipped += results.Customers.skipped;
    }

    // 3. 結果サマリー表示
    console.log("\n" + "=".repeat(60));
    console.log("📊 マイグレーション完了\n");
    console.log("【処理結果サマリー】");
    console.log(
      `  Companies:  ${summary.Companies.updated}/${summary.Companies.total} 件更新`
    );
    console.log(
      `  Employees:  ${summary.Employees.updated}/${summary.Employees.total} 件更新`
    );
    console.log(
      `  Sites:      ${summary.Sites.updated}/${summary.Sites.total} 件更新`
    );
    console.log(
      `  Customers:  ${summary.Customers.updated}/${summary.Customers.total} 件更新`
    );

    const totalUpdated =
      summary.Companies.updated +
      summary.Employees.updated +
      summary.Sites.updated +
      summary.Customers.updated;
    const totalDocs =
      summary.Companies.total +
      summary.Employees.total +
      summary.Sites.total +
      summary.Customers.total;

    console.log(`\n  合計: ${totalUpdated}/${totalDocs} 件更新`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  処理時間: ${duration} 秒`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ マイグレーション失敗:", error);
    throw error;
  }
}

module.exports = {
  runGeopointMigration,
};
