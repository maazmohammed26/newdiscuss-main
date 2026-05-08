import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file before upload
 * @param {File} imageFile - The file to compress
 * @param {Object} options - Custom compression options
 * @returns {Promise<File>} Compressed file
 */
export const compressImage = async (imageFile, options = {}) => {
  const defaultOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8,
    ...options
  };

  try {
    return await imageCompression(imageFile, defaultOptions);
  } catch (error) {
    console.error('Image compression failed:', error);
    return imageFile; // Return original file if compression fails
  }
};

/**
 * Generates a local preview URL for a file
 * @param {File} file - The file to preview
 * @returns {string} Preview URL
 */
export const getLocalPreview = (file) => {
  return URL.createObjectURL(file);
};

/**
 * Revokes a local preview URL to free up memory
 * @param {string} url - The URL to revoke
 */
export const revokeLocalPreview = (url) => {
  URL.revokeObjectURL(url);
};
