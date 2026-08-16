const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

const modulePath = require.resolve(
  "../src/commands/migrateIsSuperUserClaim.js",
);

process.env.IS_EMULATOR = "true";

function createSnapshot(data) {
  return {
    exists: data !== undefined,
    data: () => structuredClone(data),
  };
}

function createAdminFake({ users, documents, freshUsers = {} }) {
  const writes = [];
  const currentUsers = new Map(
    users.map((user) => [user.uid, structuredClone(user)]),
  );
  for (const [uid, user] of Object.entries(freshUsers)) {
    currentUsers.set(uid, structuredClone(user));
  }

  return {
    writes,
    admin: {
      auth() {
        return {
          async listUsers(_pageSize, pageToken) {
            if (!pageToken) {
              return {
                users: users.slice(0, 3).map((user) => structuredClone(user)),
                pageToken: users.length > 3 ? "page-2" : undefined,
              };
            }
            return {
              users: users.slice(3).map((user) => structuredClone(user)),
            };
          },
          async getUser(uid) {
            return structuredClone(currentUsers.get(uid));
          },
          async setCustomUserClaims(uid, claims) {
            writes.push({ uid, claims: structuredClone(claims) });
            const current = currentUsers.get(uid);
            current.customClaims = structuredClone(claims);
            const listed = users.find((user) => user.uid === uid);
            if (listed) listed.customClaims = structuredClone(claims);
          },
        };
      },
      firestore() {
        return {
          doc(path) {
            return {
              async get() {
                return createSnapshot(documents[path]);
              },
            };
          },
        };
      },
    },
  };
}

function createRegisteredUser(uid, overrides = {}) {
  const {
    companyId = "company-a",
    customClaims = {},
    ...otherOverrides
  } = overrides;
  return {
    uid,
    email: `${uid}@example.invalid`,
    emailVerified: true,
    disabled: false,
    customClaims: { companyId, ...customClaims },
    ...otherOverrides,
  };
}

function createDocuments(users) {
  const documents = { "Companies/company-a": { companyName: "Test" } };
  for (const user of users) {
    if (typeof user.customClaims?.companyId !== "string") continue;
    documents[`Companies/company-a/Users/${user.uid}`] = {
      companyId: "company-a",
      email: user.email,
      isTemporary: false,
      disabled: false,
    };
  }
  return documents;
}

async function loadMigration(adminFake) {
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === "../firebaseAdmin") return adminFake;
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[modulePath];
    return require(modulePath).migrateIsSuperUserClaim;
  } finally {
    Module._load = originalLoad;
  }
}

test("dry-run classifies accounts without writing claims", async () => {
  const users = [
    createRegisteredUser("missing"),
    createRegisteredUser("super", { customClaims: { isSuperUser: true } }),
    createRegisteredUser("regular", {
      customClaims: { isSuperUser: false },
    }),
    {
      uid: "signup",
      email: "signup@example.invalid",
      emailVerified: false,
      disabled: false,
      customClaims: {},
    },
    createRegisteredUser("invalid-claim", {
      customClaims: { isSuperUser: "true" },
    }),
    createRegisteredUser("invalid-identity", { emailVerified: false }),
  ];
  const fake = createAdminFake({
    users,
    documents: createDocuments(users),
  });
  const migrate = await loadMigration(fake.admin);

  const summary = await migrate({ apply: false });

  assert.deepEqual(summary, {
    mode: "dry-run",
    environment: "emulator",
    scanned: 6,
    eligibleMissing: 1,
    normalized: 0,
    unchangedTrue: 1,
    unchangedFalse: 1,
    unassigned: 1,
    invalidIdentity: 1,
    invalidClaim: 1,
    concurrentSkipped: 0,
    errors: 0,
  });
  assert.deepEqual(fake.writes, []);
});

test("apply preserves other claims and is idempotent", async () => {
  const users = [
    createRegisteredUser("missing", {
      customClaims: { isDeveloper: true },
    }),
  ];
  const fake = createAdminFake({
    users,
    documents: createDocuments(users),
  });
  const migrate = await loadMigration(fake.admin);

  const first = await migrate({ apply: true });
  const second = await migrate({ apply: true });

  assert.equal(first.normalized, 1);
  assert.equal(second.normalized, 0);
  assert.equal(second.unchangedFalse, 1);
  assert.deepEqual(fake.writes, [
    {
      uid: "missing",
      claims: {
        companyId: "company-a",
        isDeveloper: true,
        isSuperUser: false,
      },
    },
  ]);
});

test("apply rechecks a candidate and skips a concurrent claim change", async () => {
  const listedUser = createRegisteredUser("changed");
  const currentUser = createRegisteredUser("changed", {
    customClaims: { isSuperUser: true },
  });
  const fake = createAdminFake({
    users: [listedUser],
    freshUsers: { changed: currentUser },
    documents: createDocuments([listedUser]),
  });
  const migrate = await loadMigration(fake.admin);

  const summary = await migrate({ apply: true });

  assert.equal(summary.eligibleMissing, 1);
  assert.equal(summary.concurrentSkipped, 1);
  assert.equal(summary.normalized, 0);
  assert.deepEqual(fake.writes, []);
});

test("apply refuses all writes when any invalid account exists", async () => {
  const users = [
    createRegisteredUser("missing"),
    createRegisteredUser("invalid", {
      customClaims: { isSuperUser: "false" },
    }),
  ];
  const fake = createAdminFake({
    users,
    documents: createDocuments(users),
  });
  const migrate = await loadMigration(fake.admin);

  await assert.rejects(
    () => migrate({ apply: true }),
    /refused to write because invalid accounts were found/,
  );
  assert.deepEqual(fake.writes, []);
});

test("migration refuses an implicit or production environment", async () => {
  const fake = createAdminFake({ users: [], documents: {} });
  const migrate = await loadMigration(fake.admin);
  const emulatorFlag = process.env.IS_EMULATOR;
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firebaseEnv = process.env.FIREBASE_ENV;

  try {
    delete process.env.IS_EMULATOR;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.FIREBASE_ENV;
    await assert.rejects(() => migrate(), /explicit emulator or dev/);

    process.env.FIREBASE_ENV = "prod";
    await assert.rejects(() => migrate(), /explicit emulator or dev/);
  } finally {
    if (emulatorFlag === undefined) delete process.env.IS_EMULATOR;
    else process.env.IS_EMULATOR = emulatorFlag;
    if (authHost === undefined) delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    else process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
    if (firebaseEnv === undefined) delete process.env.FIREBASE_ENV;
    else process.env.FIREBASE_ENV = firebaseEnv;
  }
});
