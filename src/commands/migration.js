/**
 * @file src/commands/migration.js
 * @description マイグレーション処理
 *
 * - Geopoint マイグレーション（既存）
 * - Agreement → AgreementV2 マイグレーション
 * - ArrangementNotification ドキュメントID マイグレーション
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
      `  ⏭️  [${collectionName}] ${doc.id}: location データなし、スキップ`,
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
      data.location.lng,
    );
    await doc.ref.update({ geopoint });
    console.log(
      `  ✅ [${collectionName}] ${doc.id}: geopoint 追加 (${data.location.lat}, ${data.location.lng})`,
    );
    return true;
  } catch (error) {
    console.error(
      `  ❌ [${collectionName}] ${doc.id}: エラー - ${error.message}`,
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
    `📊 [${collectionName}] 完了: ${snapshot.size} 件中 ${updated} 件更新、${skipped} 件スキップ`,
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
    `Companies/${companyId}/Employees`,
  );

  // Sites
  results.Sites = await processCollection(
    db.collection("Companies").doc(companyId).collection("Sites"),
    `Companies/${companyId}/Sites`,
  );

  // Customers
  results.Customers = await processCollection(
    db.collection("Companies").doc(companyId).collection("Customers"),
    `Companies/${companyId}/Customers`,
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
      "Companies",
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
      `  Companies:  ${summary.Companies.updated}/${summary.Companies.total} 件更新`,
    );
    console.log(
      `  Employees:  ${summary.Employees.updated}/${summary.Employees.total} 件更新`,
    );
    console.log(
      `  Sites:      ${summary.Sites.updated}/${summary.Sites.total} 件更新`,
    );
    console.log(
      `  Customers:  ${summary.Customers.updated}/${summary.Customers.total} 件更新`,
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
  runAgreementMigration,
  runArrangementNotificationMigration,
};

// ============================================================================
// Agreement → AgreementV2 マイグレーション
// ============================================================================

/**
 * dayType の優先度マップ
 * 同一 date+shiftType グループ内で共通プロパティが異なる場合、この優先度で採用する。
 */
const DAY_TYPE_PRIORITY = ["WEEKDAY", "SATURDAY", "SUNDAY", "HOLIDAY"];

/**
 * agreements 配列を agreementsV2 形式に変換する。
 *
 * Agreement（旧）はフラットな構造:
 *   { dateAt, dayType, shiftType, startTime, endTime, breakMinutes, regulationWorkMinutes,
 *     isStartNextDay, unitPriceBase, overtimeUnitPriceBase, unitPriceQualified,
 *     overtimeUnitPriceQualified, billingUnitType, includeBreakInBilling, cutoffDate }
 *
 * AgreementV2（新）はネスト構造:
 *   { dateAt, shiftType, startTime, endTime, breakMinutes, regulationWorkMinutes,
 *     isStartNextDay, billingUnitType, includeBreakInBilling, cutoffDate,
 *     rates: { WEEKDAY: { unitPriceBase, ... }, SATURDAY: { ... }, ... } }
 *
 * 同じ date+shiftType を持つ Agreement を1つの AgreementV2 にマージし、
 * 各 Agreement の dayType に応じて rates[dayType] に単価を配置する。
 *
 * @param {Array<Object>} agreements - 旧 Agreement オブジェクトの配列
 * @returns {Array<Object>} - AgreementV2 形式のオブジェクト配列
 */
function convertAgreementsToV2(agreements) {
  if (!Array.isArray(agreements) || agreements.length === 0) {
    return [];
  }

  // date+shiftType でグループ化
  const groupMap = new Map();

  for (const agr of agreements) {
    // date を計算（dateAt が Firestore Timestamp の場合に対応）
    const dateAt = agr.dateAt?.toDate ? agr.dateAt.toDate() : agr.dateAt;
    let dateStr = agr.date;
    if (!dateStr && dateAt instanceof Date && !isNaN(dateAt)) {
      const y = dateAt.getFullYear();
      const m = String(dateAt.getMonth() + 1).padStart(2, "0");
      const d = String(dateAt.getDate()).padStart(2, "0");
      dateStr = `${y}-${m}-${d}`;
    }

    const key = `${dateStr}_${agr.shiftType}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        dateAt: agr.dateAt,
        shiftType: agr.shiftType,
        entries: [],
      });
    }
    groupMap.get(key).entries.push(agr);
  }

  const results = [];

  for (const [, group] of groupMap) {
    // 優先度順にソート（WEEKDAY が最優先）して共通プロパティを決定
    const sorted = [...group.entries].sort(
      (a, b) =>
        DAY_TYPE_PRIORITY.indexOf(a.dayType) -
        DAY_TYPE_PRIORITY.indexOf(b.dayType),
    );
    const primary = sorted[0];

    // rates を構築（デフォルト値で初期化）
    const defaultRateSet = {
      unitPriceBase: 0,
      overtimeUnitPriceBase: 0,
      unitPriceQualified: 0,
      overtimeUnitPriceQualified: 0,
    };

    const rates = {
      WEEKDAY: { ...defaultRateSet },
      SATURDAY: { ...defaultRateSet },
      SUNDAY: { ...defaultRateSet },
      HOLIDAY: { ...defaultRateSet },
    };

    // 各 dayType の単価を配置
    for (const entry of group.entries) {
      if (rates[entry.dayType]) {
        rates[entry.dayType] = {
          unitPriceBase: entry.unitPriceBase ?? 0,
          overtimeUnitPriceBase: entry.overtimeUnitPriceBase ?? 0,
          unitPriceQualified: entry.unitPriceQualified ?? 0,
          overtimeUnitPriceQualified: entry.overtimeUnitPriceQualified ?? 0,
        };
      }
    }

    // AgreementV2 オブジェクトを構築
    const v2 = {
      dateAt: group.dateAt,
      shiftType: group.shiftType,
      startTime: primary.startTime ?? "",
      isStartNextDay: primary.isStartNextDay ?? false,
      endTime: primary.endTime ?? "",
      breakMinutes: primary.breakMinutes ?? 0,
      regulationWorkMinutes: primary.regulationWorkMinutes ?? 0,
      rates,
      billingUnitType: primary.billingUnitType ?? "",
      includeBreakInBilling: primary.includeBreakInBilling ?? false,
      cutoffDate: primary.cutoffDate ?? 0,
    };

    results.push(v2);
  }

  return results;
}

/**
 * agreementsV2 配列から、指定された date と shiftType に該当する agreementV2 を検索する。
 *
 * マッチング条件:
 * - shiftType が完全一致
 * - agreementV2 の date が対象 date 以前のもの
 * - 上記条件を満たすもののうち、date が最も新しいもの（date 時点で最新）
 *
 * @param {Array<Object>|undefined} agreementsV2 - AgreementV2 オブジェクトの配列
 * @param {string} targetDate - 対象日付（YYYY-MM-DD 形式）
 * @param {string} targetShiftType - 対象勤務区分
 * @returns {Object|null} - マッチした AgreementV2 オブジェクト、または null
 */
function findMatchingAgreementV2(agreementsV2, targetDate, targetShiftType) {
  if (!Array.isArray(agreementsV2) || agreementsV2.length === 0) {
    return null;
  }

  let best = null;
  let bestDate = null;

  for (const agr of agreementsV2) {
    // shiftType が一致しないものはスキップ
    if (agr.shiftType !== targetShiftType) continue;

    // date を取得（dateAt が Firestore Timestamp の場合に対応）
    const dateAt = agr.dateAt?.toDate ? agr.dateAt.toDate() : agr.dateAt;
    let dateStr = agr.date;
    if (!dateStr && dateAt instanceof Date && !isNaN(dateAt)) {
      const y = dateAt.getFullYear();
      const m = String(dateAt.getMonth() + 1).padStart(2, "0");
      const d = String(dateAt.getDate()).padStart(2, "0");
      dateStr = `${y}-${m}-${d}`;
    }

    if (!dateStr) continue;

    // agreementV2 の date が対象 date 以前であること
    if (dateStr > targetDate) continue;

    // より新しい date を優先
    if (!bestDate || dateStr > bestDate) {
      best = agr;
      bestDate = dateStr;
    }
  }

  return best;
}

/**
 * Agreement → AgreementV2 マイグレーション メイン処理
 *
 * 対象:
 * - Companies ドキュメントの agreements → agreementsV2
 * - Companies/{companyId}/Sites ドキュメントの agreements → agreementsV2
 * - Companies/{companyId}/OperationResults ドキュメントの agreement フィールドを
 *   Site の agreementsV2 から再取得して更新
 */
async function runAgreementMigration() {
  console.log("🚀 Agreement → AgreementV2 マイグレーション開始\n");
  console.log("=".repeat(60));

  const startTime = Date.now();
  const summary = {
    Companies: { total: 0, updated: 0, skipped: 0 },
    Sites: { total: 0, updated: 0, skipped: 0 },
    OperationResults: { total: 0, updated: 0, skipped: 0, nullSet: 0 },
  };

  try {
    const db = admin.firestore();

    // 1. Companies コレクション
    console.log("\n📂 [Companies] 処理開始...");
    const companiesSnapshot = await db.collection("Companies").get();

    for (const companyDoc of companiesSnapshot.docs) {
      const data = companyDoc.data();
      summary.Companies.total++;

      if (!Array.isArray(data.agreements) || data.agreements.length === 0) {
        console.log(
          `  ⏭️  [Companies] ${companyDoc.id}: agreements なし、スキップ`,
        );
        summary.Companies.skipped++;
      } else {
        const agreementsV2 = convertAgreementsToV2(data.agreements);

        await companyDoc.ref.update({ agreementsV2 });
        console.log(
          `  ✅ [Companies] ${companyDoc.id}: ${data.agreements.length} 件 → ${agreementsV2.length} 件に変換`,
        );
        summary.Companies.updated++;
      }

      // 2. 各会社の Sites サブコレクション
      console.log(`\n  📂 [Companies/${companyDoc.id}/Sites] 処理開始...`);
      const sitesSnapshot = await db
        .collection("Companies")
        .doc(companyDoc.id)
        .collection("Sites")
        .get();

      // siteId → agreementsV2 のマップ（OperationResults で使用）
      const siteAgreementsMap = new Map();

      for (const siteDoc of sitesSnapshot.docs) {
        const siteData = siteDoc.data();
        summary.Sites.total++;

        if (
          !Array.isArray(siteData.agreements) ||
          siteData.agreements.length === 0
        ) {
          console.log(
            `    ⏭️  [Sites] ${siteDoc.id}: agreements なし、スキップ`,
          );
          summary.Sites.skipped++;
          // agreementsV2 が既に存在すればマップに追加
          if (Array.isArray(siteData.agreementsV2)) {
            siteAgreementsMap.set(siteDoc.id, siteData.agreementsV2);
          }
          continue;
        }

        const siteAgreementsV2 = convertAgreementsToV2(siteData.agreements);

        await siteDoc.ref.update({ agreementsV2: siteAgreementsV2 });
        console.log(
          `    ✅ [Sites] ${siteDoc.id}: ${siteData.agreements.length} 件 → ${siteAgreementsV2.length} 件に変換`,
        );
        summary.Sites.updated++;

        // マップに保存
        siteAgreementsMap.set(siteDoc.id, siteAgreementsV2);
      }

      // 3. 各会社の OperationResults サブコレクション
      console.log(
        `\n  📂 [Companies/${companyDoc.id}/OperationResults] 処理開始...`,
      );
      const opResultsSnapshot = await db
        .collection("Companies")
        .doc(companyDoc.id)
        .collection("OperationResults")
        .get();

      if (opResultsSnapshot.empty) {
        console.log(`    ℹ️  [OperationResults] ドキュメントなし`);
      }

      for (const opDoc of opResultsSnapshot.docs) {
        const opData = opDoc.data();
        summary.OperationResults.total++;

        const { siteId, shiftType } = opData;

        // date を取得（dateAt が Firestore Timestamp の場合に対応）
        const dateAt = opData.dateAt?.toDate
          ? opData.dateAt.toDate()
          : opData.dateAt;
        let dateStr = opData.date;
        if (!dateStr && dateAt instanceof Date && !isNaN(dateAt)) {
          const y = dateAt.getFullYear();
          const m = String(dateAt.getMonth() + 1).padStart(2, "0");
          const d = String(dateAt.getDate()).padStart(2, "0");
          dateStr = `${y}-${m}-${d}`;
        }

        if (!siteId || !shiftType || !dateStr) {
          console.log(
            `    ⏭️  [OperationResults] ${opDoc.id}: siteId/shiftType/date が不足、スキップ`,
          );
          summary.OperationResults.skipped++;
          continue;
        }

        // Site の agreementsV2 から該当する agreement を取得
        const agreementsV2 = siteAgreementsMap.get(siteId);
        const matchedAgreement = findMatchingAgreementV2(
          agreementsV2,
          dateStr,
          shiftType,
        );

        await opDoc.ref.update({ agreement: matchedAgreement });

        if (matchedAgreement) {
          console.log(
            `    ✅ [OperationResults] ${opDoc.id}: agreement 更新 (date=${dateStr}, shiftType=${shiftType})`,
          );
          summary.OperationResults.updated++;
        } else {
          console.log(
            `    ⚠️  [OperationResults] ${opDoc.id}: 該当する agreementV2 なし → null`,
          );
          summary.OperationResults.nullSet++;
        }
      }
    }

    // 4. 結果サマリー表示
    console.log("\n" + "=".repeat(60));
    console.log("📊 Agreement → AgreementV2 マイグレーション完了\n");
    console.log("【処理結果サマリー】");
    console.log(
      `  Companies:        ${summary.Companies.updated}/${summary.Companies.total} 件更新 (${summary.Companies.skipped} 件スキップ)`,
    );
    console.log(
      `  Sites:            ${summary.Sites.updated}/${summary.Sites.total} 件更新 (${summary.Sites.skipped} 件スキップ)`,
    );
    console.log(
      `  OperationResults: ${summary.OperationResults.updated}/${summary.OperationResults.total} 件更新 (${summary.OperationResults.skipped} 件スキップ, ${summary.OperationResults.nullSet} 件 null)`,
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  処理時間: ${duration} 秒`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ マイグレーション失敗:", error);
    throw error;
  }
}

// ============================================================================
// ArrangementNotification ドキュメントID マイグレーション
// ============================================================================

/**
 * ArrangementNotification ドキュメントID マイグレーション メイン処理
 *
 * 旧ID形式: ${siteOperationScheduleId}-${workerId}
 * 新ID形式: ${siteOperationScheduleId}_${workerId}
 *
 * 処理:
 * 1. 旧ドキュメント（"-" 区切り）を検出
 * 2. 新IDでドキュメントを作成（docId フィールドも更新）
 * 3. 旧ドキュメントを削除
 */
async function runArrangementNotificationMigration() {
  console.log(
    "🚀 ArrangementNotification ドキュメントID マイグレーション開始\n",
  );
  console.log("=".repeat(60));

  const startTime = Date.now();
  const summary = { total: 0, migrated: 0, skipped: 0, errors: 0 };

  try {
    const db = admin.firestore();
    const companiesSnapshot = await db.collection("Companies").get();

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      console.log(`\n🏢 会社 ${companyId} の処理開始...`);

      const collectionRef = db
        .collection("Companies")
        .doc(companyId)
        .collection("ArrangementNotifications");

      const snapshot = await collectionRef.get();

      if (snapshot.empty) {
        console.log(
          `  ℹ️  [Companies/${companyId}/ArrangementNotifications] ドキュメントなし`,
        );
        continue;
      }

      for (const doc of snapshot.docs) {
        summary.total++;
        const oldId = doc.id;
        const data = doc.data();

        // siteOperationScheduleId と workerId から新IDを生成
        const { siteOperationScheduleId } = data;

        // workerId は computed property のため、ドキュメントデータに含まれない場合がある
        // その場合、id (employeeId/outsourcerId) と index から復元する
        let workerId = data.workerId;
        if (!workerId) {
          if (data.isEmployee) {
            workerId = data.id;
          } else if (data.id && data.index !== undefined) {
            workerId = `${data.id}:${data.index}`;
          }
        }

        if (!siteOperationScheduleId || !workerId) {
          console.log(
            `  ⚠️  ${oldId}: siteOperationScheduleId または workerId が未設定、スキップ`,
          );
          summary.skipped++;
          continue;
        }

        const newId = `${siteOperationScheduleId}_${workerId}`;

        // 既に新ID形式の場合はスキップ
        if (oldId === newId) {
          console.log(`  ⏭️  ${oldId}: 既に新ID形式、スキップ`);
          summary.skipped++;
          continue;
        }

        try {
          // バッチで旧ドキュメント削除 + 新ドキュメント作成を実行
          const batch = db.batch();

          // 新ドキュメントを作成（docId を新IDに更新）
          const newDocRef = collectionRef.doc(newId);
          const newData = { ...data, docId: newId };
          batch.set(newDocRef, newData);

          // 旧ドキュメントを削除
          batch.delete(doc.ref);

          await batch.commit();

          console.log(`  ✅ ${oldId} → ${newId}`);
          summary.migrated++;
        } catch (error) {
          console.error(`  ❌ ${oldId}: エラー - ${error.message}`);
          summary.errors++;
        }
      }
    }

    // 結果サマリー表示
    console.log("\n" + "=".repeat(60));
    console.log(
      "📊 ArrangementNotification ドキュメントID マイグレーション完了\n",
    );
    console.log("【処理結果サマリー】");
    console.log(`  合計:       ${summary.total} 件`);
    console.log(`  マイグレーション: ${summary.migrated} 件`);
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
