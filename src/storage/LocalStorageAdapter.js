const StorageAdapter = require("./StorageAdapter");
const fs = require("fs").promises;
const path = require("path");
const { randomUUID } = require("crypto");
const { glob } = require("glob");

const activeLockTokens = new Set();

function parseLockOwner(content) {
  try {
    const owner = JSON.parse(content);
    if (
      !owner || typeof owner !== "object" || Array.isArray(owner) ||
      Object.keys(owner).sort().join("\0") !== "createdAt\0pid\0token" ||
      !Number.isSafeInteger(owner.pid) || owner.pid < 1 ||
      typeof owner.token !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(owner.token) ||
      typeof owner.createdAt !== "string" ||
      !Number.isFinite(Date.parse(owner.createdAt)) ||
      new Date(owner.createdAt).toISOString() !== owner.createdAt
    ) {
      return null;
    }
    return owner;
  } catch {
    return null;
  }
}

function lockOwnerIsAlive(owner) {
  if (owner.pid === process.pid) return activeLockTokens.has(owner.token);
  try {
    process.kill(owner.pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

async function acquireSaveLock(lockPath, filePath) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomUUID();
    const ownerTempPath = `${lockPath}.${token}.owner.tmp`;
    const owner = { pid: process.pid, token, createdAt: new Date().toISOString() };
    await fs.writeFile(ownerTempPath, JSON.stringify(owner), "utf8");
    try {
      await fs.link(ownerTempPath, lockPath);
      activeLockTokens.add(token);
      return owner;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      let existing;
      try {
        existing = parseLockOwner(await fs.readFile(lockPath, "utf8"));
      } catch (readError) {
        if (readError?.code === "ENOENT") continue;
        throw readError;
      }
      if (!existing) {
        throw new Error(`Local storage save lock owner is invalid: ${filePath}`);
      }
      if (lockOwnerIsAlive(existing)) {
        throw new Error(`Concurrent local storage save rejected: ${filePath}`);
      }
      const quarantinePath = `${lockPath}.${randomUUID()}.stale`;
      try {
        await fs.rename(lockPath, quarantinePath);
        await fs.unlink(quarantinePath);
      } catch (recoveryError) {
        if (recoveryError?.code !== "ENOENT") throw recoveryError;
      }
    } finally {
      await fs.unlink(ownerTempPath).catch(() => {});
    }
  }
  throw new Error(`Unable to acquire local storage save lock: ${filePath}`);
}

async function releaseSaveLock(lockPath, owner) {
  try {
    const current = parseLockOwner(await fs.readFile(lockPath, "utf8"));
    if (!current || current.token !== owner.token || current.pid !== owner.pid) {
      throw new Error("Local storage save lock ownership changed before release");
    }
    await fs.unlink(lockPath);
  } finally {
    activeLockTokens.delete(owner.token);
  }
}

/**
 * ローカルファイルシステムストレージアダプター
 * 現在のfs.promises実装をアダプターパターンに適合
 */
class LocalStorageAdapter extends StorageAdapter {
  constructor(basePath = "./backups") {
    super();
    this.basePath = basePath;
  }

  /**
   * データをJSONファイルとして保存
   * メタデータはfile本体と、一覧用の分離sidecarへ保存する
   */
  async save(filePath, data, metadata = {}) {
    const fullPath = path.resolve(this.basePath, filePath);
    const dirPath = path.dirname(fullPath);
    const sidecarPath = `${fullPath}.metadata`;
    const lockPath = `${fullPath}.lock`;
    const generationId = randomUUID();
    const payloadTempPath = `${fullPath}.${generationId}.payload.tmp`;
    const metadataTempPath = `${fullPath}.${generationId}.metadata.tmp`;

    // ディレクトリが存在しない場合は作成
    await fs.mkdir(dirPath, { recursive: true });
    const lockOwner = await acquireSaveLock(lockPath, filePath);

    try {
      // メタデータをデータに含める
      const dataWithMetadata = {
        metadata: {
          ...metadata,
          generationId,
          savedAt: new Date().toISOString(),
          storage: "local",
        },
        data,
      };

      // 両方のtempが完成してから公開する。sidecarは最後にpublishし、
      // 途中失敗時は常にsidecar無し（一覧ではUNVERIFIED）へ倒す。
      await fs.writeFile(
        payloadTempPath,
        JSON.stringify(dataWithMetadata, null, 2),
        "utf8"
      );
      await fs.writeFile(
        metadataTempPath,
        JSON.stringify(dataWithMetadata.metadata, null, 2),
        "utf8"
      );
      await fs.unlink(sidecarPath).catch((error) => {
        if (error?.code !== "ENOENT") throw error;
      });
      await fs.rename(payloadTempPath, fullPath);
      await fs.rename(metadataTempPath, sidecarPath);
    } finally {
      await fs.unlink(payloadTempPath).catch(() => {});
      await fs.unlink(metadataTempPath).catch(() => {});
      await releaseSaveLock(lockPath, lockOwner);
    }
  }

  /**
   * JSONファイルからデータを読み込み
   */
  async load(filePath) {
    const fullPath = path.resolve(this.basePath, filePath);
    const content = await fs.readFile(fullPath, "utf8");
    return JSON.parse(content);
  }

  /**
   * パターンに一致するファイルをリスト表示
   * includeMetadata: true の場合、各ファイルのメタデータも取得
   */
  async list(pattern, options = {}) {
    const searchPattern = path.resolve(this.basePath, pattern);
    const files = await glob(searchPattern, { windowsPathsNoEscape: true });

    if (!options.includeMetadata) {
      return files.map((f) => ({ path: path.relative(this.basePath, f) }));
    }

    // 一覧ではpayload本体を開かず、分離metadataだけを取得する。
    // sidecarのない旧artifactは未検証metadataとして返す。
    const results = [];
    for (const file of files) {
      try {
        const content = await fs.readFile(`${file}.metadata`, "utf8");
        const metadata = JSON.parse(content);
        const relativePath = path.relative(this.basePath, file);

        results.push({
          path: relativePath,
          metadata:
            metadata && typeof metadata === "object" && !Array.isArray(metadata)
              ? metadata
              : {},
        });
      } catch (err) {
        // メタデータ取得失敗時はパスのみ返す
        results.push({
          path: path.relative(this.basePath, file),
          metadata: {},
        });
      }
    }

    return results;
  }

  /**
   * ファイルの存在確認
   */
  async exists(filePath) {
    try {
      const fullPath = path.resolve(this.basePath, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ファイルを削除
   */
  async delete(filePath) {
    const fullPath = path.resolve(this.basePath, filePath);
    await fs.unlink(fullPath);
    try {
      await fs.unlink(`${fullPath}.metadata`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  /**
   * メタデータのみを取得
   * payload本体を開かず、分離sidecarから取得する
   */
  async getMetadata(filePath) {
    const fullPath = path.resolve(this.basePath, filePath);
    try {
      const content = await fs.readFile(`${fullPath}.metadata`, "utf8");
      const metadata = JSON.parse(content);
      return metadata && typeof metadata === "object" && !Array.isArray(metadata)
        ? metadata
        : {};
    } catch (error) {
      if (error?.code === "ENOENT" || error instanceof SyntaxError) return {};
      throw error;
    }
  }
}

module.exports = LocalStorageAdapter;
