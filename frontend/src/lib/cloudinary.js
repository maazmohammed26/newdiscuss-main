/**
 * Cloudinary Media Service
 * Handles image uploads and transformations
 */

const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.REACT_APP_CLOUDINARY_API_KEY;

const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'discuss_uploads';

/**
 * Uploads an image to Cloudinary
 * @param {File|Blob} file - The file to upload
 * @param {string} folder - Target folder in Cloudinary
 * @returns {Promise<Object>} Uploaded image data
 */
export const uploadImage = async (file, folder = 'general') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `discuss/${folder}`);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      thumbnail: getThumbnailUrl(data.public_id),
      blur: getBlurUrl(data.public_id)
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Generates a thumbnail URL for an image
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (publicId) => {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_thumb,w_200,g_face,f_auto,q_auto/${publicId}`;
};

/**
 * Generates a blur-up placeholder URL
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} Blur URL
 */
export const getBlurUrl = (publicId) => {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_scale,w_50,e_blur:1000,f_auto,q_auto/${publicId}`;
};

/**
 * Generates an HD preview URL
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} HD URL
 */
export const getHDUrl = (publicId) => {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${publicId}`;
};

/**
 * Calculates SHA-1 hex string for Cloudinary signed requests
 */
async function computeSha1(text) {
  const enc = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-1', enc.encode(text));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Permanently deletes an image from Cloudinary storage
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteImage = async (publicId) => {
  const API_SECRET = process.env.REACT_APP_CLOUDINARY_API_SECRET;
  if (!publicId || !CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.warn('Cloudinary delete skipped: missing credentials or publicId', {
      publicId,
      hasSecret: Boolean(API_SECRET)
    });
    return false;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await computeSha1(`public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`);

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', API_KEY);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload/destroy`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      // Also try standard destroy URL
      const fallbackResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
        {
          method: 'POST',
          body: formData,
        }
      );
      if (!fallbackResponse.ok) {
        console.error('Cloudinary destroy response not ok:', fallbackResponse.status);
        return false;
      }
      const fallbackData = await fallbackResponse.json();
      return fallbackData.result === 'ok' || fallbackData.result === 'not found';
    }

    const data = await response.json();
    return data.result === 'ok' || data.result === 'not found';
  } catch (error) {
    console.error('Failed to permanently delete image from Cloudinary:', error);
    return false;
  }
};
