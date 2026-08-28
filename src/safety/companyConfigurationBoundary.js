const CCB_COLLECTION_NAMES = Object.freeze([
  "Settings",
  "PrivateSettings",
  "SettingAudits",
]);

const CCB_ROOT_MARKER_FIELDS = Object.freeze([
  "schemaVersion",
  "configurationState",
]);

let contractPromise;

function loadCompanyConfigurationContract() {
  if (!contractPromise) {
    contractPromise = import(
      "@shisyamo4131/air-guard-v2-schemas/company-configuration"
    );
  }
  return contractPromise;
}

function hasOwn(value, key) {
  return (
    value !== null &&
    typeof value === "object" &&
    Object.prototype.hasOwnProperty.call(value, key)
  );
}

function collectPayloadReasons(backupData) {
  if (!backupData || typeof backupData !== "object") return [];

  const reasons = [];
  const company = backupData.company;
  const subCollections = backupData.subCollections;

  for (const field of CCB_ROOT_MARKER_FIELDS) {
    if (hasOwn(company, field)) reasons.push(`backup.company.${field}`);
  }

  for (const collectionName of CCB_COLLECTION_NAMES) {
    if (hasOwn(subCollections, collectionName)) {
      reasons.push(`backup.subCollections.${collectionName}`);
    }
  }

  return reasons;
}

class UnsupportedCompanyConfigurationError extends Error {
  constructor(operation, reasons, contract) {
    super(
      `Operation ${operation} is not supported for a CCB company. ` +
        "Use a separately approved CCB-aware operator procedure.",
    );
    this.name = "UnsupportedCompanyConfigurationError";
    this.code = "CCB_UNSUPPORTED_OPERATION";
    this.operation = operation;
    this.reasons = Object.freeze([...reasons]);
    this.schemaVersion = contract.COMPANY_CONFIGURATION_SCHEMA_VERSION;
    this.configurationState = contract.COMPANY_CONFIGURATION_STATE;
  }
}

class CompanyConfigurationBoundaryInspectionError extends Error {
  constructor(operation, cause) {
    super(
      `Unable to verify the Company configuration boundary for ${operation}; ` +
        "the operation was stopped before any write.",
    );
    this.name = "CompanyConfigurationBoundaryInspectionError";
    this.code = "CCB_BOUNDARY_CHECK_FAILED";
    this.operation = operation;
    this.cause = cause;
  }
}

async function readCompanyData({ db, companyId, companySnapshot, companyData }) {
  if (companyData !== undefined) return companyData;
  if (companySnapshot) return companySnapshot.data();

  const snapshot = await db.collection("Companies").doc(companyId).get();
  return snapshot.exists ? snapshot.data() : null;
}

async function inspectLiveBoundary({
  db,
  companyId,
  companySnapshot,
  companyData,
}) {
  const reasons = [];
  const rootData = await readCompanyData({
    db,
    companyId,
    companySnapshot,
    companyData,
  });

  for (const field of CCB_ROOT_MARKER_FIELDS) {
    if (hasOwn(rootData, field)) reasons.push(`company.${field}`);
  }

  for (const collectionName of CCB_COLLECTION_NAMES) {
    const snapshot = await db
      .collection(`Companies/${companyId}/${collectionName}`)
      .limit(1)
      .get();
    if (!snapshot.empty) reasons.push(`company.${collectionName}`);
  }

  return reasons;
}

async function assertLegacyCompanyOperationSupported({
  db,
  companyId,
  operation,
  companySnapshot,
  companyData,
  backupData,
}) {
  try {
    const contract = await loadCompanyConfigurationContract();
    const reasons = [
      ...collectPayloadReasons(backupData),
      ...(await inspectLiveBoundary({
        db,
        companyId,
        companySnapshot,
        companyData,
      })),
    ];

    if (reasons.length > 0) {
      throw new UnsupportedCompanyConfigurationError(
        operation,
        reasons,
        contract,
      );
    }

    return {
      supported: true,
      schemaVersion: contract.COMPANY_CONFIGURATION_SCHEMA_VERSION,
      configurationState: contract.COMPANY_CONFIGURATION_STATE,
    };
  } catch (error) {
    if (error instanceof UnsupportedCompanyConfigurationError) throw error;
    if (error instanceof CompanyConfigurationBoundaryInspectionError) {
      throw error;
    }
    throw new CompanyConfigurationBoundaryInspectionError(operation, error);
  }
}

module.exports = {
  CCB_COLLECTION_NAMES,
  CCB_ROOT_MARKER_FIELDS,
  UnsupportedCompanyConfigurationError,
  CompanyConfigurationBoundaryInspectionError,
  collectPayloadReasons,
  assertLegacyCompanyOperationSupported,
};
