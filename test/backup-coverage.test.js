const assert = require("node:assert/strict");
const Module = require("node:module");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  BACKUP_COVERAGE,
  BACKUP_FORMAT_VERSION,
  BACKUP_KIND,
  LEGACY_CONFIGURED_COLLECTIONS,
  LEGACY_CONFIGURED_COLLECTION_NAMES,
  LEGACY_UNVERSIONED_KIND,
  createBackupCoverageMetadata,
  describeBackupCoverage,
} = require("../src/backupCoverage");
const LocalStorageAdapter = require("../src/storage/LocalStorageAdapter");

function loadBackupCommand(storage, admin = {}) {
  const resolvedPath = require.resolve("../src/commands/backup.js");
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

async function captureConsole(callback) {
  const lines = [];
  const originalLog = console.log;
  console.log = (...values) => lines.push(values.join(" "));
  try {
    return { result: await callback(), output: lines.join("\n") };
  } finally {
    console.log = originalLog;
  }
}

test("new legacy logical backups use exact string-safe incomplete metadata", () => {
  const metadata = createBackupCoverageMetadata();

  assert.deepEqual(metadata, {
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
  assert.ok(Object.values(metadata).every((value) => typeof value === "string"));
  assert.equal(
    LEGACY_CONFIGURED_COLLECTIONS.split(",").includes("PrivateSettings"),
    false,
  );
  assert.equal(
    LEGACY_CONFIGURED_COLLECTIONS.split(",").includes("SettingAudits"),
    false,
  );
  assert.deepEqual(LEGACY_CONFIGURED_COLLECTION_NAMES, [
    "Articles", "Customers", "Customers_archive", "Sites", "Sites_archive",
    "Employees", "Employees_archive", "Outsourcers", "Outsourcers_archive",
    "SiteOperationSchedules", "OperationResults", "Billings", "DailyAttendances",
    "ArrangementNotifications", "Autonumbers", "Users",
  ]);
});

test("exact v1 metadata is recognized as incomplete and never complete", () => {
  assert.deepEqual(describeBackupCoverage({
    collections: "",
    ...createBackupCoverageMetadata(),
  }), {
    formatVersion: "1",
    kind: "LEGACY_COMPANY_LOGICAL",
    coverage: "INCOMPLETE",
    legacyConfiguredCollections: LEGACY_CONFIGURED_COLLECTIONS,
    privateSettingsBackup: "EXCLUDED",
    privateSettingsRestore: "UNAVAILABLE",
    settingAuditsRestore: "UNAVAILABLE",
    ccbBackup: "UNAVAILABLE",
    ccbRestore: "UNAVAILABLE",
    metadataVerified: true,
  });
});

test("backup creation stores additive coverage while retaining legacy collections metadata", async () => {
  class Timestamp {}

  const companySnapshot = {
    exists: true,
    data() {
      return { companyName: "Synthetic tenant" };
    },
  };
  const queriedCollections = [];
  const db = {
    collection(collectionPath) {
      queriedCollections.push(collectionPath);
      if (collectionPath === "Companies") {
        return {
          doc() {
            return {
              async get() {
                return companySnapshot;
              },
            };
          },
        };
      }

      return {
        limit() {
          return this;
        },
        async get() {
          return { empty: true, size: 0, docs: [] };
        },
      };
    },
  };
  function firestore() {
    return db;
  }
  firestore.Timestamp = Timestamp;

  let saved;
  const storage = {
    async save(savedPath, data, metadata) {
      saved = { savedPath, data, metadata };
    },
  };
  const backup = loadBackupCommand(storage, {
    firestore,
    auth() {
      throw new Error("empty Users scope must not read Authentication");
    },
  });

  await captureConsole(() =>
    backup.backupCompany("company-a", {
      timestamp: "2026-08-28_00-00-00",
    }),
  );

  assert.equal(
    saved.savedPath,
    "companies/company-a/backup_2026-08-28_00-00-00.json",
  );
  assert.equal(saved.metadata.collections, "");
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(createBackupCoverageMetadata()).map((key) => [
        key,
        saved.metadata[key],
      ]),
    ),
    createBackupCoverageMetadata(),
  );
  assert.equal(saved.data.metadata.collections.length, 0);
  assert.equal("PrivateSettings" in saved.data.subCollections, false);
  assert.equal("SettingAudits" in saved.data.subCollections, false);
  assert.deepEqual(
    queriedCollections,
    [
      "Companies",
      "Companies/company-a/Settings",
      "Companies/company-a/PrivateSettings",
      "Companies/company-a/SettingAudits",
      ...LEGACY_CONFIGURED_COLLECTION_NAMES.map(
        (name) => `Companies/company-a/${name}`,
      ),
    ],
  );
});

test("snapshot creation stores the same incomplete coverage metadata", async () => {
  class Timestamp {}
  const companySnapshot = {
    exists: true,
    data() {
      return { companyName: "Synthetic tenant", maintenanceMode: true };
    },
  };
  const db = {
    collection(collectionPath) {
      if (collectionPath === "Companies") {
        return {
          doc() {
            return { async get() { return companySnapshot; } };
          },
        };
      }
      return {
        limit() { return this; },
        async get() { return { empty: true, size: 0, docs: [] }; },
      };
    },
  };
  function firestore() { return db; }
  firestore.Timestamp = Timestamp;
  let saved;
  const storage = {
    async exists() { return false; },
    async save(savedPath, data, metadata) {
      saved = { savedPath, data, metadata };
    },
  };
  const backup = loadBackupCommand(storage, {
    firestore,
    auth() { throw new Error("empty Users scope must not read Authentication"); },
  });

  const { result } = await captureConsole(() => backup.snapshotCompany("company-a"));
  assert.equal(result.success, true);
  assert.equal(saved.savedPath.replaceAll("\\", "/"), "temporary/companies/company-a/snapshot.json");
  assert.equal(saved.metadata.isSnapshot, true);
  assert.equal(saved.metadata.collections, "");
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(createBackupCoverageMetadata()).map((key) => [key, saved.metadata[key]]),
    ),
    createBackupCoverageMetadata(),
  );
});

for (const [name, metadata] of [
  ["missing", undefined],
  ["old", { timestamp: "2026-08-28_00-00-00" }],
  [
    "malformed",
    { ...createBackupCoverageMetadata(), formatVersion: 1 },
  ],
  [
    "contradictory expected field",
    { ...createBackupCoverageMetadata(), coverage: "COMPLETE" },
  ],
  [
    "contradictory additional field",
    { ...createBackupCoverageMetadata(), backupComplete: "true" },
  ],
]) {
  test(`${name} metadata fails closed as unversioned incomplete`, () => {
    const result = describeBackupCoverage(metadata);
    assert.equal(result.kind, LEGACY_UNVERSIONED_KIND);
    assert.equal(result.formatVersion, "UNVERSIONED");
    assert.equal(result.coverage, "INCOMPLETE");
    assert.equal(result.metadataVerified, false);
    assert.equal(result.privateSettingsBackup, "UNVERIFIED");
    assert.equal(result.privateSettingsRestore, "UNAVAILABLE");
    assert.equal(result.settingAuditsRestore, "UNAVAILABLE");
    assert.equal(result.ccbBackup, "UNAVAILABLE");
    assert.equal(result.ccbRestore, "UNAVAILABLE");
  });
}

test("per-company list renders coverage from metadata without loading payload", async () => {
  const calls = { list: 0, load: 0, save: 0 };
  const storage = {
    async list() {
      calls.list += 1;
      return [
        {
          path: "companies/company-a/backup_2026-08-28_00-00-00.json",
          metadata: {
            timestamp: "2026-08-28_00-00-00",
            totalDocuments: "12",
            totalAuthUsers: "2",
            collections: "Customers,Users",
            ...createBackupCoverageMetadata(),
          },
        },
      ];
    },
    async load() {
      calls.load += 1;
      throw new Error("list must not load a payload");
    },
    async save() {
      calls.save += 1;
    },
  };
  const backup = loadBackupCommand(storage);

  const { output } = await captureConsole(() =>
    backup.listBackups("company-a"),
  );

  assert.deepEqual(calls, { list: 1, load: 0, save: 0 });
  assert.match(output, /LEGACY_COMPANY_LOGICAL \(v1\)/);
  assert.match(output, /coverage: INCOMPLETE/);
  assert.match(output, /PrivateSettings backup: EXCLUDED/);
  assert.match(output, /PrivateSettings restore: UNAVAILABLE/);
  assert.match(output, /SettingAudits restore: UNAVAILABLE/);
  assert.match(output, /CCB backup \/ restore: UNAVAILABLE \/ UNAVAILABLE/);
});

test("global list renders old metadata as unversioned incomplete without loading payload", async () => {
  const calls = { list: 0, load: 0, save: 0 };
  const storage = {
    async list() {
      calls.list += 1;
      return [
        {
          path: "companies/company-a/backup_2026-08-27_00-00-00.json",
          metadata: {
            companyName: "Synthetic tenant",
            timestamp: "2026-08-27_00-00-00",
            coverage: "COMPLETE",
          },
        },
      ];
    },
    async load() {
      calls.load += 1;
      throw new Error("list must not load a payload");
    },
    async save() {
      calls.save += 1;
    },
  };
  const backup = loadBackupCommand(storage);

  const { output } = await captureConsole(() => backup.listBackups());

  assert.deepEqual(calls, { list: 1, load: 0, save: 0 });
  assert.match(output, /LEGACY_UNVERSIONED \(UNVERSIONED\)/);
  assert.match(output, /coverage: INCOMPLETE/);
  assert.doesNotMatch(output, /coverage: COMPLETE/);
  assert.match(output, /PrivateSettings backup: UNVERIFIED/);
  assert.match(output, /SettingAudits restore: UNAVAILABLE/);
  assert.match(output, /CCB backup \/ restore: UNAVAILABLE \/ UNAVAILABLE/);
});

test("coverage-like aliases and CCB collections invalidate otherwise exact v1 metadata", () => {
  const exact = { collections: "Customers", ...createBackupCoverageMetadata() };
  for (const addition of [
    { fullBackup: "true" },
    { includesPrivateSettings: "true" },
    { settingAuditsRestoreAvailable: "true" },
    { ccbBackupAvailable: 1 },
    { backupComplete: 1 },
    { private_settings_backup: "INCLUDED" },
    { "setting-audits-restore-available": "true" },
    { "backup scope": "FULL" },
    { includedCollections: "PrivateSettings" },
    { collections: "Customers,PrivateSettings" },
    { collections: "Settings" },
    { collections: "SettingAudits" },
  ]) {
    const result = describeBackupCoverage({ ...exact, ...addition });
    assert.equal(result.kind, LEGACY_UNVERSIONED_KIND);
    assert.equal(result.privateSettingsBackup, "UNVERIFIED");
  }
});

test("local list reads metadata sidecars without opening backup payloads", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "airguard-backup-coverage-"));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
  const adapter = new LocalStorageAdapter(tempRoot);
  const relativePath = "companies/synthetic/backup_2026-08-28_00-00-00.json";
  const metadata = {
    timestamp: "2026-08-28_00-00-00",
    collections: "Customers",
    ...createBackupCoverageMetadata(),
  };
  await adapter.save(relativePath, { synthetic: true }, metadata);
  await fs.writeFile(path.join(tempRoot, relativePath), "payload must not be parsed", "utf8");

  const originalReadFile = fs.readFile;
  const readPaths = [];
  fs.readFile = async (readPath, ...args) => {
    readPaths.push(String(readPath));
    return originalReadFile(readPath, ...args);
  };
  let listed;
  try {
    listed = await adapter.list("companies/synthetic/backup_*.json", {
      includeMetadata: true,
    });
  } finally {
    fs.readFile = originalReadFile;
  }
  assert.equal(listed.length, 1);
  assert.equal(listed[0].metadata.kind, BACKUP_KIND);
  assert.equal(listed[0].metadata.collections, "Customers");
  assert.equal(readPaths.some((readPath) => readPath.endsWith(relativePath)), false);
  assert.equal(readPaths.every((readPath) => readPath.endsWith(".metadata")), true);

  const oldPath = "companies/synthetic/backup_2026-08-27_00-00-00.json";
  await fs.writeFile(path.join(tempRoot, oldPath), "old payload must not be parsed", "utf8");
  const withOld = await adapter.list("companies/synthetic/backup_*.json", {
    includeMetadata: true,
  });
  const old = withOld.find(
    ({ path: listedPath }) => listedPath.replaceAll("\\", "/") === oldPath,
  );
  assert.deepEqual(old.metadata, {});
});

test("local save failure cannot leave an old verified sidecar beside a new payload", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "airguard-backup-atomic-"));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
  const adapter = new LocalStorageAdapter(tempRoot);
  const relativePath = "companies/synthetic/backup_2026-08-28_00-00-00.json";
  const metadata = {
    timestamp: "2026-08-28_00-00-00",
    collections: "Customers",
    ...createBackupCoverageMetadata(),
  };
  await adapter.save(relativePath, { generation: "old" }, metadata);

  const originalRename = fs.rename;
  fs.rename = async (oldPath, newPath) => {
    if (String(newPath).endsWith(".metadata")) {
      const error = new Error("synthetic sidecar publish failure");
      error.code = "EIO";
      throw error;
    }
    return originalRename(oldPath, newPath);
  };
  try {
    await assert.rejects(
      adapter.save(relativePath, { generation: "new" }, metadata),
      /synthetic sidecar publish failure/,
    );
  } finally {
    fs.rename = originalRename;
  }

  const listed = await adapter.list("companies/synthetic/backup_*.json", {
    includeMetadata: true,
  });
  assert.deepEqual(listed[0].metadata, {});
  const loaded = await adapter.load(relativePath);
  assert.equal(loaded.data.generation, "new");
});

test("concurrent local saves to one path fail closed instead of mixing generations", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "airguard-backup-lock-"));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
  const adapter = new LocalStorageAdapter(tempRoot);
  const relativePath = "companies/synthetic/backup_2026-08-28_00-00-00.json";
  const metadata = {
    timestamp: "2026-08-28_00-00-00",
    collections: "Customers",
    ...createBackupCoverageMetadata(),
  };
  const results = await Promise.allSettled([
    adapter.save(relativePath, { generation: "first" }, metadata),
    adapter.save(relativePath, { generation: "second" }, metadata),
  ]);
  assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(results.filter(({ status }) => status === "rejected").length, 1);

  const loaded = await adapter.load(relativePath);
  const sidecar = await adapter.getMetadata(relativePath);
  assert.equal(loaded.metadata.generationId, sidecar.generationId);
  assert.equal(typeof sidecar.generationId, "string");
});

test("orphaned local save locks recover only when the owner is not alive", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "airguard-backup-orphan-lock-"));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
  const adapter = new LocalStorageAdapter(tempRoot);
  const relativePath = "companies/synthetic/backup_2026-08-28_00-00-00.json";
  const fullPath = path.join(tempRoot, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(`${fullPath}.lock`, JSON.stringify({
    pid: 2_147_483_647,
    token: "00000000-0000-4000-8000-000000000001",
    createdAt: "2026-08-28T00:00:00.000Z",
  }), "utf8");
  await adapter.save(relativePath, { recovered: true }, {
    timestamp: "2026-08-28_00-00-00",
    collections: "Customers",
    ...createBackupCoverageMetadata(),
  });
  assert.equal((await adapter.load(relativePath)).data.recovered, true);
  await assert.rejects(fs.access(`${fullPath}.lock`));
});

test("unlock failure is observable and the orphan can be recovered on retry", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "airguard-backup-unlock-"));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
  const adapter = new LocalStorageAdapter(tempRoot);
  const relativePath = "companies/synthetic/backup_2026-08-28_00-00-00.json";
  const lockPath = path.join(tempRoot, `${relativePath}.lock`);
  const metadata = {
    timestamp: "2026-08-28_00-00-00",
    collections: "Customers",
    ...createBackupCoverageMetadata(),
  };
  const originalUnlink = fs.unlink;
  let rejectedUnlock = false;
  fs.unlink = async (unlinkPath) => {
    if (!rejectedUnlock && path.resolve(String(unlinkPath)) === path.resolve(lockPath)) {
      rejectedUnlock = true;
      const error = new Error("synthetic unlock failure");
      error.code = "EIO";
      throw error;
    }
    return originalUnlink(unlinkPath);
  };
  try {
    await assert.rejects(
      adapter.save(relativePath, { attempt: 1 }, metadata),
      /synthetic unlock failure/,
    );
  } finally {
    fs.unlink = originalUnlink;
  }
  await adapter.save(relativePath, { attempt: 2 }, metadata);
  assert.equal((await adapter.load(relativePath)).data.attempt, 2);
  await assert.rejects(fs.access(lockPath));
});

test("invalid lock owner data cannot influence recovery paths", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "airguard-backup-invalid-lock-"));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
  const adapter = new LocalStorageAdapter(tempRoot);
  const relativePath = "companies/synthetic/backup_2026-08-28_00-00-00.json";
  const fullPath = path.join(tempRoot, relativePath);
  const sentinelPath = path.join(tempRoot, "sentinel.txt");
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(sentinelPath, "unchanged", "utf8");
  const invalidOwners = [
    { pid: 2_147_483_647, token: "../../sentinel", createdAt: "2026-08-28T00:00:00.000Z" },
    { pid: 2_147_483_647, token: "..\\..\\sentinel", createdAt: "2026-08-28T00:00:00.000Z" },
    { pid: 2_147_483_647, token: "C:\\sentinel", createdAt: "2026-08-28T00:00:00.000Z" },
    { pid: 2_147_483_647, token: "00000000-0000-4000-8000-000000000001", createdAt: "invalid" },
    {
      pid: 2_147_483_647,
      token: "00000000-0000-4000-8000-000000000001",
      createdAt: "2026-08-28T00:00:00.000Z",
      extra: true,
    },
  ];
  for (const owner of invalidOwners) {
    await fs.writeFile(`${fullPath}.lock`, JSON.stringify(owner), "utf8");
    await assert.rejects(
      adapter.save(relativePath, { rejected: true }, {
        timestamp: "2026-08-28_00-00-00",
        collections: "Customers",
        ...createBackupCoverageMetadata(),
      }),
      /lock owner is invalid/,
    );
    assert.equal(await fs.readFile(sentinelPath, "utf8"), "unchanged");
  }
});
