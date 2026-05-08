/**
 * Video Media Service (Powered by Cloudinary)
 * Handles video uploads and streaming for "Pulse"
 */

const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'discuss_uploads';

export const uploadVideo = async (file, fileName, folder = 'pulse') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `discuss/${folder}`);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Video upload failed');
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      fileId: data.public_id,
      thumbnail: data.secure_url.replace(/\.[^/.]+$/, ".jpg"), 
      pulseUrl: data.secure_url 
    };
  } catch (error) {
    console.error('Video upload error:', error);
    throw error;
  }
};

export const getOptimizedVideoUrl = (videoUrl) => {
  if (!videoUrl) return '';
  return videoUrl.replace('/upload/', '/upload/f_auto,q_auto/');
};
