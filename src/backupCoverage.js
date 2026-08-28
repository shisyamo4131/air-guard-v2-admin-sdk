const { COMPANY_SUBCOLLECTIONS } = require("./constants/collections");

const BACKUP_FORMAT_VERSION = "1";
const BACKUP_KIND = "LEGACY_COMPANY_LOGICAL";
const BACKUP_COVERAGE = "INCOMPLETE";
const LEGACY_UNVERSIONED_KIND = "LEGACY_UNVERSIONED";
const LEGACY_CONFIGURED_COLLECTION_NAMES = Object.freeze([
  "Articles",
  "Customers",
  "Customers_archive",
  "Sites",
  "Sites_archive",
  "Employees",
  "Employees_archive",
  "Outsourcers",
  "Outsourcers_archive",
  "SiteOperationSchedules",
  "OperationResults",
  "Billings",
  "DailyAttendances",
  "ArrangementNotifications",
  "Autonumbers",
  "Users",
]);
const LEGACY_CONFIGURED_COLLECTIONS = LEGACY_CONFIGURED_COLLECTION_NAMES.join(",");
const runtimeCollections = COMPANY_SUBCOLLECTIONS.map(({ name }) => name);
if (runtimeCollections.join("\0") !== LEGACY_CONFIGURED_COLLECTION_NAMES.join("\0")) {
  throw new Error(
    "Legacy backup scope changed without a backup coverage format version update",
  );
}

const COVERAGE_METADATA = Object.freeze({
  formatVersion: BACKUP_FORMAT_VERSION,
  kind: BACKUP_KIND,
  coverage: BACKUP_COVERAGE,
  legacyConfiguredCollections: LEGACY_CONFIGURED_COLLECTIONS,
  privateSettingsBackup: "EXCLUDED",
  privateSettingsRestore: "UNAVAILABLE",
  settingAuditsRestore: "UNAVAILABLE",
  ccbBackup: "UNAVAILABLE",
  ccbRestore: "UNAVAILABLE",
});
const ALLOWED_METADATA_KEYS = new Set([
  ...Object.keys(COVERAGE_METADATA),
  "collections",
  "companyId",
  "companyName",
  "environment",
  "generationId",
  "isSnapshot",
  "savedAt",
  "storage",
  "timestamp",
  "totalAuthUsers",
  "totalDocuments",
]);

function createBackupCoverageMetadata() {
  return { ...COVERAGE_METADATA };
}

function hasUnknownMetadataClaim(metadata) {
  return Object.keys(metadata).some((key) => !ALLOWED_METADATA_KEYS.has(key));
}

function collectionsAreCompatible(metadata) {
  if (typeof metadata.collections !== "string") return false;
  const included = metadata.collections === ""
    ? []
    : metadata.collections.split(",");
  return new Set(included).size === included.length &&
    included.every((name) => LEGACY_CONFIGURED_COLLECTION_NAMES.includes(name));
}

function isCurrentCoverageMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }

  if (hasUnknownMetadataClaim(metadata) || !collectionsAreCompatible(metadata)) {
    return false;
  }

  return Object.entries(COVERAGE_METADATA).every(
    ([key, value]) =>
      typeof metadata[key] === "string" && metadata[key] === value,
  );
}

function describeBackupCoverage(metadata) {
  if (isCurrentCoverageMetadata(metadata)) {
    return {
      formatVersion: BACKUP_FORMAT_VERSION,
      kind: BACKUP_KIND,
      coverage: BACKUP_COVERAGE,
      legacyConfiguredCollections: LEGACY_CONFIGURED_COLLECTIONS,
      privateSettingsBackup: "EXCLUDED",
      privateSettingsRestore: "UNAVAILABLE",
      settingAuditsRestore: "UNAVAILABLE",
      ccbBackup: "UNAVAILABLE",
      ccbRestore: "UNAVAILABLE",
      metadataVerified: true,
    };
  }

  return {
    formatVersion: "UNVERSIONED",
    kind: LEGACY_UNVERSIONED_KIND,
    coverage: BACKUP_COVERAGE,
    legacyConfiguredCollections: "UNVERIFIED",
    privateSettingsBackup: "UNVERIFIED",
    privateSettingsRestore: "UNAVAILABLE",
    settingAuditsRestore: "UNAVAILABLE",
    ccbBackup: "UNAVAILABLE",
    ccbRestore: "UNAVAILABLE",
    metadataVerified: false,
  };
}

function formatBackupCoverageLines(metadata) {
  const coverage = describeBackupCoverage(metadata);
  const version = coverage.metadataVerified
    ? `v${coverage.formatVersion}`
    : coverage.formatVersion;

  return [
    `形式: ${coverage.kind} (${version})`,
    `coverage: ${coverage.coverage}`,
    `legacy configured scope: ${coverage.legacyConfiguredCollections}`,
    `PrivateSettings backup: ${coverage.privateSettingsBackup}`,
    `PrivateSettings restore: ${coverage.privateSettingsRestore}`,
    `SettingAudits restore: ${coverage.settingAuditsRestore}`,
    `CCB backup / restore: ${coverage.ccbBackup} / ${coverage.ccbRestore}`,
  ];
}

module.exports = {
  BACKUP_COVERAGE,
  BACKUP_FORMAT_VERSION,
  BACKUP_KIND,
  LEGACY_CONFIGURED_COLLECTIONS,
  LEGACY_CONFIGURED_COLLECTION_NAMES,
  LEGACY_UNVERSIONED_KIND,
  createBackupCoverageMetadata,
  describeBackupCoverage,
  formatBackupCoverageLines,
  isCurrentCoverageMetadata,
};
