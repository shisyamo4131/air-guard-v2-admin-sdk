/**
 * AirGuard Admin SDK CLI
 * 統一されたコマンドラインインターフェース
 */

const { program } = require("commander");
const package = require("../package.json");

// 早期の環境変数設定
function setupEnvironmentEarly() {
  // コマンドライン引数から --env を抽出
  const envIndex = process.argv.indexOf("--env");
  if (envIndex !== -1 && process.argv[envIndex + 1]) {
    const env = process.argv[envIndex + 1];
    if (env === "emulator") {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
      process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
    }
  }

  // -e フラグもチェック
  const eIndex = process.argv.indexOf("-e");
  if (eIndex !== -1 && process.argv[eIndex + 1]) {
    const env = process.argv[eIndex + 1];
    if (env === "emulator") {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
      process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
    }
  }
}

// 環境変数を早期に設定
setupEnvironmentEarly();

// コマンドモジュールをインポート（環境変数設定後）
const usersCommands = require("./commands/users");
const claimsCommands = require("./commands/claims");
const systemCommands = require("./commands/system");

// プログラムの基本設定
program
  .name("airguard-admin")
  .description("AirGuard Admin SDK - Firebase Admin operations for AirGuard")
  .version(package.version);

// 環境設定オプション（グローバル）
program
  .option("-e, --env <environment>", "Environment (prod|emulator)", "prod")
  .option(
    "--emulator-host <host>",
    "Firebase Auth Emulator host",
    "localhost:9099"
  );

// users サブコマンド
const usersCmd = program
  .command("users")
  .description("User management operations");

usersCmd
  .command("list")
  .description("List all super users")
  .action(async (options, cmd) => {
    const globalOpts = cmd.parent.parent.opts();
    await usersCommands.listSuperUsers(globalOpts);
  });

usersCmd
  .command("view <uid>")
  .description("View user claims for a specific user")
  .action(async (uid, options, cmd) => {
    const globalOpts = cmd.parent.parent.opts();
    await usersCommands.viewUserClaims(uid, globalOpts);
  });

usersCmd
  .command("get-uid <email>")
  .description("Get UID by email address")
  .action(async (email, options, cmd) => {
    const globalOpts = cmd.parent.parent.opts();
    await usersCommands.getUidByEmail(email, globalOpts);
  });

// claims サブコマンド
const claimsCmd = program
  .command("claims")
  .description("User claims management operations");

claimsCmd
  .command("set-superuser <uid>")
  .description("Set superuser claim for a user")
  .action(async (uid, options, cmd) => {
    const globalOpts = cmd.parent.parent.opts();
    await claimsCommands.setSuperUserClaim(uid, globalOpts);
  });

claimsCmd
  .command("remove-superuser <uid>")
  .description("Remove superuser claim from a user")
  .action(async (uid, options, cmd) => {
    const globalOpts = cmd.parent.parent.opts();
    await claimsCommands.removeSuperUserClaim(uid, globalOpts);
  });

claimsCmd
  .command("set-developer <uid>")
  .description("Set developer claim for a user")
  .action(async (uid, options, cmd) => {
    const globalOpts = cmd.parent.parent.opts();
    await claimsCommands.setDeveloperClaim(uid, globalOpts);
  });

claimsCmd
  .command("remove-developer <uid>")
  .description("Remove developer claim from a user")
  .action(async (uid, options, cmd) => {
    const globalOpts = cmd.parent.parent.opts();
    await claimsCommands.removeDeveloperClaim(uid, globalOpts);
  });

// system サブコマンド
const systemCmd = program
  .command("system")
  .description("System management operations");

systemCmd
  .command("status")
  .description("Check current maintenance status")
  .action(async (options, cmd) => {
    const globalOpts = cmd.parent.parent.opts();
    await systemCommands.getMaintenanceStatus(globalOpts);
  });

systemCmd
  .command("maintenance-on")
  .description("Enable maintenance mode")
  .action(async (options, cmd) => {
    const globalOpts = cmd.parent.parent.opts();
    await systemCommands.enableMaintenance(globalOpts);
  });

systemCmd
  .command("maintenance-off")
  .description("Disable maintenance mode")
  .action(async (options, cmd) => {
    const globalOpts = cmd.parent.parent.opts();
    await systemCommands.disableMaintenance(globalOpts);
  });

systemCmd
  .command("maintenance-toggle")
  .description("Toggle maintenance mode")
  .action(async (options, cmd) => {
    const globalOpts = cmd.parent.parent.opts();
    await systemCommands.toggleMaintenance(globalOpts);
  });

systemCmd
  .command("init")
  .description("Initialize system document")
  .action(async (options, cmd) => {
    const globalOpts = cmd.parent.parent.opts();
    await systemCommands.initializeSystem(globalOpts);
  });

// ヘルプの改善
program.on("--help", () => {
  console.log("");
  console.log("Examples (推奨):");
  console.log("  $ npm run cli users list");
  console.log("  $ npm run cli:emulator users view <uid>");
  console.log("  $ npm run cli users get-uid <email>");
  console.log("  $ npm run cli claims set-superuser <uid>");
  console.log("  $ npm run cli:emulator system status");
  console.log("  $ npm run cli system maintenance-on");
  console.log("");
  console.log("直接実行:");
  console.log("  $ node src/cli.js users list");
  console.log("  $ node src/cli.js users get-uid user@example.com");
  console.log("  $ node src/cli.js --env emulator system status");
  console.log("");
});

// エラーハンドリング
process.on("unhandledRejection", (error) => {
  console.error(" Unhandled promise rejection:", error.message);
  process.exit(1);
});

// CLIを実行
program.parse();
