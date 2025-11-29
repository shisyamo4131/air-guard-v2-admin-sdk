const StorageAdapter = require("./StorageAdapter");
const admin = require("../firebaseAdmin");

/**
 * Firebase Storageストレージアダプター
 * customMetadataを活用した高速なメタデータ取得に対応
 */
class FirebaseStorageAdapter extends StorageAdapter {
  constructor(bucketName = null) {
    super();
    // bucketNameが指定されない場合はデフォルトバケットを使用
    this.bucket = bucketName
      ? admin.storage().bucket(bucketName)
      : admin.storage().bucket();
  }

  /**
   * データをFirebase Storageに保存
   * メタデータは両方に格納：
   * 1. ファイル内容（data部分） - リストア時に使用
   * 2. customMetadata - ダウンロード不要で高速取得可能
   */
  async save(filePath, data, metadata = {}) {
    const file = this.bucket.file(filePath);

    // メタデータをファイル内容に含める
    const dataWithMetadata = {
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString(),
        storage: "firebase",
      },
      data,
    };

    const content = JSON.stringify(dataWithMetadata, null, 2);

    // customMetadataを準備（全て文字列に変換）
    const customMetadata = {};
    for (const [key, value] of Object.entries(metadata)) {
      customMetadata[key] = String(value);
    }
    customMetadata.savedAt = new Date().toISOString();
    customMetadata.storage = "firebase";

    // Firebase Storageに保存（customMetadata付き）
    await file.save(content, {
      contentType: "application/json",
      metadata: {
        customMetadata,
      },
    });
  }

  /**
   * Firebase Storageからデータを読み込み
   */
  async load(filePath) {
    const file = this.bucket.file(filePath);
    const [content] = await file.download();
    return JSON.parse(content.toString("utf8"));
  }

  /**
   * パターンに一致するファイルをリスト表示
   * includeMetadata: true の場合、customMetadataのみ取得（高速）
   */
  async list(pattern, options = {}) {
    // globパターン(**や*)をprefixに変換
    // 例: "companies/**/backup_*.json" -> "companies/"
    const prefix = pattern.split("**")[0].split("*")[0];

    const [files] = await this.bucket.getFiles({
      prefix: prefix,
    });

    // パターンに一致するファイルのみフィルタ（簡易的なglob対応）
    const filteredFiles = files.filter((file) => {
      const fileName = file.name;
      // backup_*.json のようなパターンに対応
      if (pattern.includes("backup_") && pattern.includes(".json")) {
        return fileName.includes("/backup_") && fileName.endsWith(".json");
      }
      return true;
    });

    if (!options.includeMetadata) {
      return filteredFiles.map((f) => ({ path: f.name }));
    }

    // メタデータも取得する場合（customMetadataのみ、ダウンロード不要）
    const results = [];
    for (const file of filteredFiles) {
      const [metadata] = await file.getMetadata();
      results.push({
        path: file.name,
        metadata: metadata.metadata, // customMetadata部分
      });
    }

    return results;
  }

  /**
   * ファイルの存在確認
   */
  async exists(filePath) {
    try {
      const file = this.bucket.file(filePath);
      const [exists] = await file.exists();
      return exists;
    } catch {
      return false;
    }
  }

  /**
   * ファイルを削除
   */
  async delete(filePath) {
    const file = this.bucket.file(filePath);
    await file.delete();
  }

  /**
   * メタデータのみを取得（customMetadata、ダウンロード不要）
   * Firebase Storageの利点を活かした高速取得
   */
  async getMetadata(filePath) {
    const file = this.bucket.file(filePath);
    const [metadata] = await file.getMetadata();
    return metadata.metadata; // customMetadata部分
  }
}

module.exports = FirebaseStorageAdapter;
