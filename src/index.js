/**
 * AirGuard Admin SDK
 * プログラマティック使用のためのメインエクスポート
 */

const usersCommands = require("./commands/users");
const claimsCommands = require("./commands/claims");
const systemCommands = require("./commands/system");
const companiesCommands = require("./commands/companies");
const backupCommands = require("./commands/backup");

/**
 * AirGuard Admin SDK メインクラス
 */
class AirGuardAdminSDK {
  constructor(options = {}) {
    this.options = {
      env: "prod",
      emulatorHost: "localhost:9099",
      ...options,
    };
  }

  /**
   * 環境設定を更新
   */
  setEnvironment(env, emulatorHost = "localhost:9099") {
    this.options.env = env;
    this.options.emulatorHost = emulatorHost;
  }

  // Users commands
  async listSuperUsers() {
    return await usersCommands.listSuperUsers(this.options);
  }

  async viewUserClaims(uid) {
    return await usersCommands.viewUserClaims(uid, this.options);
  }

  async getUidByEmail(email) {
    return await usersCommands.getUidByEmail(email, this.options);
  }

  // Claims commands
  async setSuperUserClaim(identifier) {
    return await claimsCommands.setSuperUserClaim(identifier, this.options);
  }

  async removeSuperUserClaim(identifier) {
    return await claimsCommands.removeSuperUserClaim(identifier, this.options);
  }

  async setDeveloperClaim(identifier) {
    return await claimsCommands.setDeveloperClaim(identifier, this.options);
  }

  async removeDeveloperClaim(identifier) {
    return await claimsCommands.removeDeveloperClaim(identifier, this.options);
  }

  // System commands
  async getMaintenanceStatus() {
    return await systemCommands.getMaintenanceStatus(this.options);
  }

  async enableMaintenance() {
    return await systemCommands.enableMaintenance(this.options);
  }

  async disableMaintenance() {
    return await systemCommands.disableMaintenance(this.options);
  }

  async toggleMaintenance() {
    return await systemCommands.toggleMaintenance(this.options);
  }

  async initializeSystem() {
    return await systemCommands.initializeSystem(this.options);
  }

  // Companies commands
  async getCompanyInfo(companyId) {
    return await companiesCommands.getCompanyInfo(companyId, this.options);
  }

  async listCompanyUsers(companyId) {
    return await companiesCommands.listCompanyUsers(companyId, this.options);
  }

  async deleteCompany(companyId) {
    return await companiesCommands.deleteCompany(companyId, this.options);
  }

  // Backup commands
  async backupCompany(companyId, outputDir) {
    return await backupCommands.backupCompany(companyId, {
      ...this.options,
      output: outputDir,
    });
  }

  async backupAllCompanies(outputDir) {
    return await backupCommands.backupAllCompanies({
      ...this.options,
      output: outputDir,
    });
  }

  async listBackups(companyId) {
    return await backupCommands.listBackups(companyId, this.options);
  }

  async restoreCompany(backupFile) {
    return await backupCommands.restoreCompany(backupFile, this.options);
  }

  async restoreAllCompanies(timestamp, outputDir) {
    return await backupCommands.restoreAllCompanies(timestamp, {
      ...this.options,
      output: outputDir,
    });
  }
}

// 直接関数エクスポート（旧バージョン互換）
module.exports = {
  AirGuardAdminSDK,

  // 直接関数アクセス
  users: {
    listSuperUsers: usersCommands.listSuperUsers,
    viewUserClaims: usersCommands.viewUserClaims,
    getUidByEmail: usersCommands.getUidByEmail,
  },

  claims: {
    setSuperUserClaim: claimsCommands.setSuperUserClaim,
    removeSuperUserClaim: claimsCommands.removeSuperUserClaim,
    setDeveloperClaim: claimsCommands.setDeveloperClaim,
    removeDeveloperClaim: claimsCommands.removeDeveloperClaim,
  },

  system: {
    getMaintenanceStatus: systemCommands.getMaintenanceStatus,
    enableMaintenance: systemCommands.enableMaintenance,
    disableMaintenance: systemCommands.disableMaintenance,
    toggleMaintenance: systemCommands.toggleMaintenance,
    initializeSystem: systemCommands.initializeSystem,
  },

  companies: {
    getCompanyInfo: companiesCommands.getCompanyInfo,
    listCompanyUsers: companiesCommands.listCompanyUsers,
    deleteCompany: companiesCommands.deleteCompany,
  },

  backup: {
    backupCompany: backupCommands.backupCompany,
    backupAllCompanies: backupCommands.backupAllCompanies,
    restoreCompany: backupCommands.restoreCompany,
    restoreAllCompanies: backupCommands.restoreAllCompanies,
    listBackups: backupCommands.listBackups,
  },
};

/**
 * 使用例:
 *
 * // クラス使用
 * const { AirGuardAdminSDK } = require('air-guard-v2-admin-sdk');
 * const sdk = new AirGuardAdminSDK({ env: 'emulator' });
 * await sdk.listSuperUsers();
 * await sdk.getCompanyInfo('company-id-123');
 * await sdk.deleteCompany('company-id-123');
 *
 * // 直接関数使用
 * const { users, claims, system, companies } = require('air-guard-v2-admin-sdk');
 * await users.listSuperUsers({ env: 'prod' });
 * await claims.setSuperUserClaim('user@example.com', { env: 'emulator' });
 * await system.enableMaintenance({ env: 'prod' });
 * await companies.getCompanyInfo('company-id-123', { env: 'emulator' });
 * await companies.deleteCompany('company-id-123', { env: 'emulator' });
 */
