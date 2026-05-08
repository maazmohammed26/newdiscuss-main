import React, { useState } from 'react';
import { IoClose, IoChevronBack, IoChevronForward, IoDownload } from 'react-icons/io5';
import './FullscreenMedia.css';

const FullscreenMedia = ({ media, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  if (!media || media.length === 0) return null;

  const currentItem = Array.isArray(media) ? media[currentIndex] : media;

  const handleNext = (e) => {
    e.stopPropagation();
    if (currentIndex < media.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = currentItem.url;
    link.download = `discuss_media_${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fullscreen-overlay" onClick={onClose}>
      <div className="fullscreen-header">
        <span className="media-count">
          {Array.isArray(media) ? `${currentIndex + 1} / ${media.length}` : ''}
        </span>
        <div className="header-actions">
          <button className="icon-btn" onClick={handleDownload} title="Download">
            <IoDownload size={24} />
          </button>
          <button className="icon-btn" onClick={onClose} title="Close">
            <IoClose size={32} />
          </button>
        </div>
      </div>

      <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
        {Array.isArray(media) && currentIndex > 0 && (
          <button className="nav-btn prev" onClick={handlePrev}>
            <IoChevronBack size={40} />
          </button>
        )}

        <div className="media-wrapper">
          {currentItem.type === 'video' || currentItem.url.includes('video') ? (
            <video src={currentItem.url} controls autoPlay />
          ) : (
            <img src={currentItem.url} alt="Fullscreen media" />
          )}
        </div>

        {Array.isArray(media) && currentIndex < media.length - 1 && (
          <button className="nav-btn next" onClick={handleNext}>
            <IoChevronForward size={40} />
          </button>
        )}
      </div>

      {currentItem.caption && (
        <div className="fullscreen-footer">
          <p className="media-caption">{currentItem.caption}</p>
        </div>
      )}
    </div>
  );
};

export default FullscreenMedia;
