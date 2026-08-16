const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const cliSource = fs.readFileSync(
  path.join(__dirname, "../src/cli.js"),
  "utf8",
);

test("is-super-user-claim migration is registered as dry-run by default", () => {
  assert.match(
    cliSource,
    /\.command\("is-super-user-claim \[mode\]"\)/,
  );
  assert.match(cliSource, /migrateIsSuperUserClaim\(\{/);
  assert.match(cliSource, /apply: mode\?\.toLowerCase\(\) === "apply"/);
});

test("is-super-user-claim migration rejects unsupported modes", () => {
  assert.match(
    cliSource,
    /mode && mode\.toLowerCase\(\) !== "apply"/,
  );
  assert.match(cliSource, /mode must be 'apply' or omitted/);
});
