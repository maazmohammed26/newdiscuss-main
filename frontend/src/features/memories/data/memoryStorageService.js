/**
 * memoryStorageService.js
 * Pluggable Storage Provider abstraction for Discuss Memories.
 *
 * Current V1 Implementation: Cloudinary.
 * Designed so that future migration to S3, Cloudflare R2, or Firebase Storage
 * requires NO changes to UI components.
 *
 * All upload/delete/signing credentials remain server-side.
 * React/UI components interact only through this clean service interface.
 */

const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'discuss_uploads';

/**
 * Storage Provider Interface
 */
export class MemoryStorageProvider {
  /**
   * Upload an optimized memory image file.
   * @param {File|Blob} file
   * @param {{ userId: string, memoryId: string }} metadata
   * @returns {Promise<{ publicId: string, secureUrl: string, width: number, height: number, format: string }>}
   */
  async uploadMemory(file, { userId, memoryId }) {
    throw new Error('uploadMemory must be implemented');
  }

  /**
   * Generates calendar-sized thumbnail URL
   */
  getThumbnailUrl(publicId) {
    throw new Error('getThumbnailUrl must be implemented');
  }

  /**
   * Generates scrapbook-sized display URL
   */
  getScrapbookUrl(publicId) {
    throw new Error('getScrapbookUrl must be implemented');
  }

  /**
   * Generates high-res full viewer URL
   */
  getFullUrl(publicId) {
    throw new Error('getFullUrl must be implemented');
  }

  /**
   * Generates high-quality owner download URL with attachment disposition
   */
  getDownloadUrl(publicId, filename) {
    throw new Error('getDownloadUrl must be implemented');
  }
}

/**
 * Cloudinary Implementation for V1
 */
export class CloudinaryMemoryStorage extends MemoryStorageProvider {
  constructor(cloudName = CLOUD_NAME, uploadPreset = UPLOAD_PRESET) {
    super();
    this.cloudName = cloudName;
    this.uploadPreset = uploadPreset;
  }

  async uploadMemory(file, { userId, memoryId }) {
    if (!this.cloudName) {
      throw new Error('Cloudinary cloud name is not configured.');
    }
    if (!userId || !memoryId) {
      throw new Error('User ID and Memory ID are required for memory storage.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    // Strict folder structure: discuss/memories/<user-id>/<memory-id>
    formData.append('folder', `discuss/memories/${userId}`);
    formData.append('public_id', memoryId);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to upload memory image to Cloudinary.');
    }

    const data = await response.json();
    return {
      publicId: data.public_id,
      secureUrl: data.secure_url,
      width: data.width,
      height: data.height,
      format: data.format,
    };
  }

  getThumbnailUrl(publicId) {
    if (!publicId) return '';
    if (publicId.startsWith('http')) return publicId;
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/c_fill,w_300,h_300,g_auto,f_auto,q_auto/${publicId}`;
  }

  getScrapbookUrl(publicId) {
    if (!publicId) return '';
    if (publicId.startsWith('http')) return publicId;
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/c_limit,w_700,h_900,f_auto,q_auto/${publicId}`;
  }

  getFeedUrl(publicId) {
    if (!publicId) return '';
    if (publicId.startsWith('http')) return publicId;
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/c_limit,w_900,h_1200,f_auto,q_auto/${publicId}`;
  }

  getFullUrl(publicId) {
    if (!publicId) return '';
    if (publicId.startsWith('http')) return publicId;
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/c_limit,w_1800,h_2400,f_auto,q_auto/${publicId}`;
  }

  getDownloadUrl(publicId, filename = 'discuss_memory.jpg') {
    if (!publicId) return '';
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/fl_attachment:${safeName}/f_auto,q_auto/${publicId}`;
  }
}

// Singleton storage provider export
export const memoryStorage = new CloudinaryMemoryStorage();
