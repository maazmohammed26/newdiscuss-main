import React, { useState, useRef } from 'react';
import { compressImage, getLocalPreview, revokeLocalPreview } from '@/lib/mediaUtils';
import { uploadImage } from '@/lib/cloudinary';
import { uploadVideo } from '@/lib/imagekit';
import { IoClose, IoImage, IoVideocam, IoCloudUpload } from 'react-icons/io5';
import './MediaUpload.css';

const MediaUpload = ({ onUploadComplete, onUploadingChange, type = 'image', folder = 'general', multiple = false, maxFiles = null }) => {
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    let files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (multiple && maxFiles && files.length > maxFiles) {
      alert(`You can only select up to ${maxFiles} files at once.`);
      files = files.slice(0, maxFiles);
    }

    const newPreviews = files.map(file => ({
      file,
      url: getLocalPreview(file),
      type: file.type.startsWith('video/') ? 'video' : 'image'
    }));

    setUploading(true);
    onUploadingChange?.(true);
    setProgress(10);
    setPreviews(newPreviews);

    try {
      // Simulate progress bar updates
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 300);

      const uploadPromises = newPreviews.map(async (preview) => {
        if (preview.type === 'image') {
          const compressed = await compressImage(preview.file);
          return await uploadImage(compressed, folder);
        } else {
          return await uploadVideo(preview.file, preview.file.name, folder);
        }
      });

      const results = await Promise.all(uploadPromises);
      clearInterval(progressInterval);
      setProgress(100);
      
      onUploadComplete(multiple ? results : results[0]);
      
      // Cleanup
      newPreviews.forEach(p => revokeLocalPreview(p.url));
      setPreviews([]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Media upload failed. Please try again.');
      setPreviews([]);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="media-upload-container">
      <div className="media-preview-grid">
        {previews.map((preview, index) => (
          <div key={index} className="media-preview-item relative">
            {preview.type === 'image' ? (
              <img src={preview.url} alt="preview" className={uploading ? 'opacity-50' : ''} />
            ) : (
              <video src={preview.url} muted className={uploading ? 'opacity-50' : ''} />
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                 <span className="text-white text-sm font-bold drop-shadow-md">{progress}%</span>
              </div>
            )}
          </div>
        ))}
        
        {(!uploading && (multiple || previews.length === 0)) && (
          <div className="add-media-slot" onClick={() => fileInputRef.current?.click()}>
            {type === 'image' ? <IoImage size={32} /> : <IoVideocam size={32} />}
            <span>Add {type}</span>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={type === 'image' ? 'image/*' : 'video/*'}
        multiple={multiple}
        style={{ display: 'none' }}
      />

      {uploading && (
        <div className="upload-progress-bar mt-3">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {folder === 'pulse' && (
        <div className="pulse-disclaimer">
          Note: This Pulse video will be public.
        </div>
      )}
    </div>
  );
};

export default MediaUpload;
