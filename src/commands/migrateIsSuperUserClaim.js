/**
 * @file src/commands/migrateIsSuperUserClaim.js
 * @description 既存Authentication UserのisSuperUser claimを安全に正規化します。
 */

const admin = require("../firebaseAdmin");

const AUTH_PAGE_SIZE = 1000;

function createSummary(apply, environment) {
  return {
    mode: apply ? "apply" : "dry-run",
    environment,
    scanned: 0,
    eligibleMissing: 0,
    normalized: 0,
    unchangedTrue: 0,
    unchangedFalse: 0,
    unassigned: 0,
    invalidIdentity: 0,
    invalidClaim: 0,
    concurrentSkipped: 0,
    errors: 0,
  };
}

function resolveEnvironment() {
  if (
    process.env.IS_EMULATOR === "true" ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST
  ) {
    return "emulator";
  }

  const environment = (process.env.FIREBASE_ENV || "").toLowerCase();
  if (environment === "dev" || environment === "development") {
    return "dev";
  }

  throw new Error(
    "isSuperUser claim migration requires an explicit emulator or dev environment",
  );
}

function getSuperUserClaimState(customClaims = {}) {
  if (!Object.hasOwn(customClaims, "isSuperUser")) return "missing";
  if (customClaims.isSuperUser === true) return "true";
  if (customClaims.isSuperUser === false) return "false";
  return "invalid";
}

async function inspectAuthUser(authUser, firestore) {
  const customClaims = authUser.customClaims || {};
  const companyId = customClaims.companyId;
  const superUserClaimState = getSuperUserClaimState(customClaims);

  if (typeof companyId !== "string" || !companyId) {
    if (
      companyId === undefined &&
      (superUserClaimState === "missing" || superUserClaimState === "false")
    ) {
      return { status: "unassigned" };
    }
    return { status: "invalid-identity" };
  }

  if (
    typeof authUser.uid !== "string" ||
    !authUser.uid ||
    typeof authUser.email !== "string" ||
    !authUser.email ||
    authUser.emailVerified !== true ||
    typeof authUser.disabled !== "boolean"
  ) {
    return { status: "invalid-identity" };
  }

  const [companySnapshot, userSnapshot] = await Promise.all([
    firestore.doc(`Companies/${companyId}`).get(),
    firestore.doc(`Companies/${companyId}/Users/${authUser.uid}`).get(),
  ]);
  const user = userSnapshot.exists ? userSnapshot.data() : null;

  if (
    !companySnapshot.exists ||
    !userSnapshot.exists ||
    user?.companyId !== companyId ||
    user?.email !== authUser.email ||
    user?.isTemporary !== false ||
    typeof user?.disabled !== "boolean"
  ) {
    return { status: "invalid-identity" };
  }

  if (superUserClaimState === "invalid") {
    return { status: "invalid-claim" };
  }

  return { status: superUserClaimState };
}

function countInspection(summary, inspection) {
  switch (inspection.status) {
    case "missing":
      summary.eligibleMissing++;
      break;
    case "true":
      summary.unchangedTrue++;
      break;
    case "false":
      summary.unchangedFalse++;
      break;
    case "unassigned":
      summary.unassigned++;
      break;
    case "invalid-claim":
      summary.invalidClaim++;
      break;
    default:
      summary.invalidIdentity++;
      break;
  }
}

async function normalizeCandidate(uid, auth, firestore, summary) {
  try {
    const currentAuthUser = await auth.getUser(uid);
    const currentInspection = await inspectAuthUser(currentAuthUser, firestore);

    if (currentInspection.status !== "missing") {
      summary.concurrentSkipped++;
      return;
    }

    await auth.setCustomUserClaims(uid, {
      ...(currentAuthUser.customClaims || {}),
      isSuperUser: false,
    });
    summary.normalized++;
  } catch {
    summary.errors++;
  }
}

function printSummary(summary) {
  console.log("\nisSuperUser claim migration summary");
  for (const [key, value] of Object.entries(summary)) {
    console.log(`${key}: ${value}`);
  }
}

/**
 * isSuperUser claimの未設定値をfalseへ正規化します。
 * dry-runが既定で、apply=trueの場合だけAuthenticationを書き換えます。
 *
 * @param {{ apply?: boolean }} options
 * @returns {Promise<object>} 件数だけを含む実行結果
 */
async function migrateIsSuperUserClaim({ apply = false } = {}) {
  if (typeof apply !== "boolean") {
    throw new TypeError("apply must be a boolean");
  }

  const environment = resolveEnvironment();
  const auth = admin.auth();
  const firestore = admin.firestore();
  const summary = createSummary(apply, environment);
  const candidateUids = [];
  let pageToken;

  do {
    const page = await auth.listUsers(AUTH_PAGE_SIZE, pageToken);

    for (const authUser of page.users) {
      summary.scanned++;

      try {
        const inspection = await inspectAuthUser(authUser, firestore);
        countInspection(summary, inspection);

        if (inspection.status === "missing") {
          candidateUids.push(authUser.uid);
        }
      } catch {
        summary.errors++;
      }
    }

    pageToken = page.pageToken;
  } while (pageToken);

  if (
    apply &&
    (summary.invalidIdentity > 0 ||
      summary.invalidClaim > 0 ||
      summary.errors > 0)
  ) {
    printSummary(summary);
    throw new Error(
      "isSuperUser claim migration refused to write because invalid accounts were found",
    );
  }

  if (apply) {
    for (const uid of candidateUids) {
      await normalizeCandidate(uid, auth, firestore, summary);
    }
  }

  printSummary(summary);

  if (summary.errors > 0) {
    throw new Error("isSuperUser claim migration completed with errors");
  }

  return summary;
}

module.exports = { migrateIsSuperUserClaim };
