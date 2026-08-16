const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

const claimsModulePath = require.resolve("../src/commands/claims.js");

async function loadClaimsWithAuthUser(authUser) {
  const calls = [];
  const firebaseAdminFake = {
    auth() {
      return {
        async getUser(uid) {
          calls.push({ method: "getUser", uid });
          return structuredClone(authUser);
        },
        async setCustomUserClaims(uid, claims) {
          calls.push({ method: "setCustomUserClaims", uid, claims });
        },
      };
    },
  };

  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === "firebase-admin") return firebaseAdminFake;
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[claimsModulePath];
    return {
      claims: require(claimsModulePath),
      calls,
    };
  } finally {
    Module._load = originalLoad;
  }
}

test("removing super-user authority preserves claims and writes false", async () => {
  const { claims, calls } = await loadClaimsWithAuthUser({
    uid: "user-a",
    email: "user@example.invalid",
    customClaims: {
      companyId: "company-a",
      isSuperUser: true,
      isDeveloper: true,
    },
  });

  await claims.removeSuperUserClaim("user-a");

  assert.deepEqual(calls, [
    { method: "getUser", uid: "user-a" },
    {
      method: "setCustomUserClaims",
      uid: "user-a",
      claims: {
        companyId: "company-a",
        isSuperUser: false,
        isDeveloper: true,
      },
    },
  ]);
});

test("removing super-user authority normalizes a missing claim to false", async () => {
  const { claims, calls } = await loadClaimsWithAuthUser({
    uid: "user-a",
    email: "user@example.invalid",
    customClaims: { companyId: "company-a" },
  });

  await claims.removeSuperUserClaim("user-a");

  assert.deepEqual(calls.at(-1), {
    method: "setCustomUserClaims",
    uid: "user-a",
    claims: {
      companyId: "company-a",
      isSuperUser: false,
    },
  });
});
