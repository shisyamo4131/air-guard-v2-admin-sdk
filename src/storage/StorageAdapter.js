/**
 * ストレージアダプターの抽象基底クラス
 * ローカルファイルシステムとFirebase Storageの統一インターフェースを提供
 */
class StorageAdapter {
  /**
   * データをストレージに保存
   * @param {string} path - 保存先パス（ローカル: ファイルパス、Firebase: オブジェクトパス）
   * @param {Object} data - 保存するデータオブジェクト
   * @param {Object} [metadata] - メタデータ（companyName, totalDocuments, totalAuthUsers, timestamp等）
   * @returns {Promise<void>}
   */
  async save(path, data, metadata = {}) {
    throw new Error("save() must be implemented by subclass");
  }

  /**
   * ストレージからデータを読み込み
   * @param {string} path - 読み込み元パス
   * @returns {Promise<Object>} 読み込んだデータオブジェクト
   */
  async load(path) {
    throw new Error("load() must be implemented by subclass");
  }

  /**
   * 指定パターンに一致するファイル/オブジェクトをリスト表示
   * @param {string} pattern - 検索パターン（ローカル: glob、Firebase: prefix）
   * @param {Object} [options] - オプション（includeMetadata: メタデータも取得するか）
   * @returns {Promise<Array>} ファイル情報の配列 { path, metadata? }
   */
  async list(pattern, options = {}) {
    throw new Error("list() must be implemented by subclass");
  }

  /**
   * ファイル/オブジェクトの存在確認
   * @param {string} path - 確認するパス
   * @returns {Promise<boolean>} 存在する場合true
   */
  async exists(path) {
    throw new Error("exists() must be implemented by subclass");
  }

  /**
   * ファイル/オブジェクトを削除
   * @param {string} path - 削除するパス
   * @returns {Promise<void>}
   */
  async delete(path) {
    throw new Error("delete() must be implemented by subclass");
  }

  /**
   * メタデータのみを取得（ファイル内容をダウンロードせずに）
   * @param {string} path - メタデータを取得するパス
   * @returns {Promise<Object>} メタデータオブジェクト
   */
  async getMetadata(path) {
    throw new Error("getMetadata() must be implemented by subclass");
  }
}

module.exports = StorageAdapter;
