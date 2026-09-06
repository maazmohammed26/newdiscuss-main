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
