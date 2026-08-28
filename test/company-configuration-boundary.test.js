const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

const {
  CCB_COLLECTION_NAMES,
  CompanyConfigurationBoundaryInspectionError,
  UnsupportedCompanyConfigurationError,
  assertLegacyCompanyOperationSupported,
  collectPayloadReasons,
} = require("../src/safety/companyConfigurationBoundary");

function makeFirebase({ companyData = {}, collections = {}, failCollection } = {}) {
  const calls = {
    authDelete: 0,
    authGet: 0,
    batch: 0,
    batchCommit: 0,
    rootDelete: 0,
    rootUpdate: 0,
  };

  const companySnapshot = {
    exists: true,
    data: () => structuredClone(companyData),
  };

  const db = {
    collection(path) {
      if (path === "Companies") {
        return {
          doc() {
            return {
              get: async () => companySnapshot,
              delete: async () => {
                calls.rootDelete += 1;
              },
              update: async () => {
                calls.rootUpdate += 1;
              },
            };
          },
        };
      }

      const collectionName = path.split("/").at(-1);
      return {
        limit() {
          return this;
        },
        async get() {
          if (collectionName === failCollection) {
            throw new Error("synthetic inspection failure");
          }
          const size = collections[collectionName] || 0;
          return { empty: size === 0, size, docs: [] };
        },
      };
    },
    batch() {
      calls.batch += 1;
      return {
        delete() {},
        set() {},
        async commit() {
          calls.batchCommit += 1;
        },
      };
    },
  };

  const admin = {
    firestore() {
      return db;
    },
    auth() {
      return {
        async deleteUser() {
          calls.authDelete += 1;
        },
        async getUser() {
          calls.authGet += 1;
          return {};
        },
      };
    },
  };

  return { admin, calls, companySnapshot, db };
}

function loadCommandModule(relativePath, { admin, storage }) {
  const resolvedPath = require.resolve(relativePath);
  const originalLoad = Module._load;

  Module._load = function load(request, parent, isMain) {
    if (request === "../firebaseAdmin") return admin;
    if (request === "../storage") {
      return {
        createStorageAdapterFromEnv() {
          return storage;
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[resolvedPath];
    return require(resolvedPath);
  } finally {
    Module._load = originalLoad;
  }
}

async function withMutedConsole(callback) {
  const methods = ["log", "warn", "error"];
  const originals = Object.fromEntries(
    methods.map((method) => [method, console[method]]),
  );
  for (const method of methods) console[method] = () => {};
  try {
    return await callback();
  } finally {
    for (const method of methods) console[method] = originals[method];
  }
}

test("published CCB contract is available through the additive subpath", async () => {
  const contract = await import(
    "@shisyamo4131/air-guard-v2-schemas/company-configuration"
  );
  assert.equal(contract.COMPANY_CONFIGURATION_SCHEMA_VERSION, 1);
  assert.equal(contract.COMPANY_CONFIGURATION_STATE, "CCB_V1_ACTIVE");
});

test("legacy company without CCB markers or documents remains supported", async () => {
  const { db, companySnapshot } = makeFirebase({
    companyData: { companyName: "Legacy tenant" },
  });

  const result = await assertLegacyCompanyOperationSupported({
    db,
    companyId: "company-a",
    companySnapshot,
    operation: "backup",
  });

  assert.deepEqual(result, {
    supported: true,
    schemaVersion: 1,
    configurationState: "CCB_V1_ACTIVE",
  });
});

for (const field of ["schemaVersion", "configurationState"]) {
  test(`root marker ${field} stops a legacy operation`, async () => {
    const { db, companySnapshot } = makeFirebase({
      companyData: { [field]: field === "schemaVersion" ? 1 : "CCB_V1_ACTIVE" },
    });

    await assert.rejects(
      assertLegacyCompanyOperationSupported({
        db,
        companyId: "company-a",
        companySnapshot,
        operation: "delete-company",
      }),
      (error) =>
        error instanceof UnsupportedCompanyConfigurationError &&
        error.code === "CCB_UNSUPPORTED_OPERATION" &&
        error.reasons.includes(`company.${field}`),
    );
  });
}

for (const collectionName of CCB_COLLECTION_NAMES) {
  test(`${collectionName} presence stops a legacy operation`, async () => {
    const { db, companySnapshot } = makeFirebase({
      collections: { [collectionName]: 1 },
    });

    await assert.rejects(
      assertLegacyCompanyOperationSupported({
        db,
        companyId: "company-a",
        companySnapshot,
        operation: "backup",
      }),
      (error) =>
        error.code === "CCB_UNSUPPORTED_OPERATION" &&
        error.reasons.includes(`company.${collectionName}`),
    );
  });
}

test("boundary inspection failure stops the operation", async () => {
  const { db, companySnapshot } = makeFirebase({ failCollection: "Settings" });

  await assert.rejects(
    assertLegacyCompanyOperationSupported({
      db,
      companyId: "company-a",
      companySnapshot,
      operation: "backup",
    }),
    (error) =>
      error instanceof CompanyConfigurationBoundaryInspectionError &&
      error.code === "CCB_BOUNDARY_CHECK_FAILED",
  );
});

test("CCB markers in a backup payload are detected without value echo", () => {
  assert.deepEqual(
    collectPayloadReasons({
      company: { schemaVersion: 1, configurationState: "CCB_V1_ACTIVE" },
      subCollections: { Settings: [], PrivateSettings: [], SettingAudits: [] },
    }),
    [
      "backup.company.schemaVersion",
      "backup.company.configurationState",
      "backup.subCollections.Settings",
      "backup.subCollections.PrivateSettings",
      "backup.subCollections.SettingAudits",
    ],
  );
});

test("company deletion stops before Auth or Firestore writes", async () => {
  const { admin, calls } = makeFirebase({ collections: { Settings: 1 } });
  const companies = loadCommandModule("../src/commands/companies.js", {
    admin,
  });

  await withMutedConsole(() =>
    assert.rejects(
      companies.deleteCompany("company-a", { skipConfirmation: true }),
      { code: "CCB_UNSUPPORTED_OPERATION" },
    ),
  );

  assert.equal(calls.authDelete, 0);
  assert.equal(calls.batch, 0);
  assert.equal(calls.rootDelete, 0);
});

test("backup stops before Auth reads or storage writes", async () => {
  const { admin, calls } = makeFirebase({ collections: { Settings: 1 } });
  const storageCalls = { save: 0 };
  const storage = {
    async save() {
      storageCalls.save += 1;
    },
  };
  const backup = loadCommandModule("../src/commands/backup.js", {
    admin,
    storage,
  });

  await withMutedConsole(() =>
    assert.rejects(backup.backupCompany("company-a"), {
      code: "CCB_UNSUPPORTED_OPERATION",
    }),
  );

  assert.equal(calls.authGet, 0);
  assert.equal(storageCalls.save, 0);
});

for (const [method, options] of [
  ["snapshotCompany", {}],
  ["diffBackup", {}],
  ["restoreSelective", { collections: "Customers" }],
  ["restoreDiff", { collections: "Customers" }],
]) {
  test(`${method} rejects a live CCB tenant before storage or writes`, async () => {
    const { admin, calls } = makeFirebase({ collections: { Settings: 1 } });
    const storageCalls = { load: 0, list: 0, save: 0 };
    const storage = {
      async exists() {
        return false;
      },
      async load() {
        storageCalls.load += 1;
        return {};
      },
      async list() {
        storageCalls.list += 1;
        return [];
      },
      async save() {
        storageCalls.save += 1;
      },
    };
    const backup = loadCommandModule("../src/commands/backup.js", {
      admin,
      storage,
    });

    await withMutedConsole(() =>
      assert.rejects(backup[method]("company-a", options), {
        code: "CCB_UNSUPPORTED_OPERATION",
      }),
    );

    assert.deepEqual(storageCalls, { load: 0, list: 0, save: 0 });
    assert.equal(calls.batch, 0);
    assert.equal(calls.authDelete, 0);
  });
}

test("complete restore rejects a CCB backup before destructive writes", async () => {
  const { admin, calls } = makeFirebase();
  const storage = {
    async list() {
      return [{ path: "companies/company-a/backup.json" }];
    },
    async load() {
      return {
        data: {
          backupDate: "2026-08-28T00:00:00.000Z",
          companyId: "company-a",
          company: { schemaVersion: 1 },
          subCollections: {},
          authUsers: [],
        },
        metadata: { environment: "UNKNOWN" },
      };
    },
  };
  const backup = loadCommandModule("../src/commands/backup.js", {
    admin,
    storage,
  });

  await withMutedConsole(() =>
    assert.rejects(
      backup.restoreCompanyFromLatestBackup("company-a", {
        skipConfirmation: true,
      }),
      { code: "CCB_UNSUPPORTED_OPERATION" },
    ),
  );

  assert.equal(calls.authDelete, 0);
  assert.equal(calls.batch, 0);
  assert.equal(calls.rootDelete, 0);
  assert.equal(calls.rootUpdate, 0);
});

test("legacy company maintenance command is blocked after CCB staging", async () => {
  const { admin, calls } = makeFirebase({
    collections: { PrivateSettings: 1 },
  });
  const companies = loadCommandModule("../src/commands/companies.js", {
    admin,
  });

  await withMutedConsole(() =>
    assert.rejects(companies.enableMaintenanceMode("company-a"), {
      code: "CCB_UNSUPPORTED_OPERATION",
    }),
  );
  assert.equal(calls.rootUpdate, 0);
});
