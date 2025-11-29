const LocalStorageAdapter = require("./LocalStorageAdapter");
const FirebaseStorageAdapter = require("./FirebaseStorageAdapter");

/**
 * 環境やオプションに応じて適切なStorageAdapterを返すファクトリー関数
 *
 * @param {Object} options - 設定オプション
 * @param {string} [options.type='local'] - ストレージタイプ ('local' | 'firebase')
 * @param {string} [options.basePath='./backups'] - ローカルストレージのベースパス
 * @param {string} [options.bucketName] - Firebase Storageのバケット名（省略時はデフォルトバケット）
 * @returns {StorageAdapter} 適切なStorageAdapterインスタンス
 */
function createStorageAdapter(options = {}) {
  const { type = "local", basePath = "./backups", bucketName = null } = options;

  switch (type) {
    case "firebase":
      return new FirebaseStorageAdapter(bucketName);

    case "local":
    default:
      return new LocalStorageAdapter(basePath);
  }
}

/**
 * 環境変数からストレージタイプを自動判定
 * STORAGE_TYPE環境変数が設定されていればそれを使用、なければローカル
 *
 * @param {Object} [overrideOptions] - 追加オプション（環境変数より優先）
 * @returns {StorageAdapter} 適切なStorageAdapterインスタンス
 */
function createStorageAdapterFromEnv(overrideOptions = {}) {
  const type = overrideOptions.type || process.env.STORAGE_TYPE || "local";
  const basePath =
    overrideOptions.basePath || process.env.BACKUP_BASE_PATH || "./backups";
  const bucketName =
    overrideOptions.bucketName || process.env.FIREBASE_STORAGE_BUCKET || null;

  return createStorageAdapter({
    type,
    basePath,
    bucketName,
  });
}

module.exports = {
  createStorageAdapter,
  createStorageAdapterFromEnv,
  LocalStorageAdapter,
  FirebaseStorageAdapter,
};
