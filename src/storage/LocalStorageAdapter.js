const StorageAdapter = require("./StorageAdapter");
const fs = require("fs").promises;
const path = require("path");
const { glob } = require("glob");

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
   * メタデータはファイル内容に含める（customMetadataは使用不可）
   */
  async save(filePath, data, metadata = {}) {
    const fullPath = path.resolve(this.basePath, filePath);
    const dirPath = path.dirname(fullPath);

    // ディレクトリが存在しない場合は作成
    await fs.mkdir(dirPath, { recursive: true });

    // メタデータをデータに含める
    const dataWithMetadata = {
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString(),
        storage: "local",
      },
      data,
    };

    await fs.writeFile(
      fullPath,
      JSON.stringify(dataWithMetadata, null, 2),
      "utf8"
    );
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

    // メタデータも取得する場合
    const results = [];
    for (const file of files) {
      try {
        const content = await fs.readFile(file, "utf8");
        const parsed = JSON.parse(content);
        const relativePath = path.relative(this.basePath, file);

        results.push({
          path: relativePath,
          metadata: parsed.metadata || {},
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
  }

  /**
   * メタデータのみを取得
   * ローカルストレージでは全ファイルを読む必要がある
   */
  async getMetadata(filePath) {
    const loaded = await this.load(filePath);
    return loaded.metadata;
  }
}

module.exports = LocalStorageAdapter;
