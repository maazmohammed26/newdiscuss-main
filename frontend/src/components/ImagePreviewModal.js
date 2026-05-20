import { useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';

export default function ImagePreviewModal({ open, onClose, imageUrl, altText = 'Profile picture' }) {
  // Prevent page scroll when preview is active
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open]);

  // Support escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onClose]);

  if (!open || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[99999] flex flex-col justify-between bg-black/95 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div 
        className="w-full flex items-center justify-between px-6 py-4 z-50 bg-gradient-to-b from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          <span className="text-white font-extrabold text-sm tracking-wider uppercase opacity-90">
            {altText}
          </span>
          <span className="text-neutral-400 text-xs mt-0.5">
            Profile Picture
          </span>
        </div>

        {/* Premium tactile close button */}
        <button
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 rounded-full text-white/90 hover:text-white backdrop-blur-md transition-all shadow-2xl cursor-pointer"
          aria-label="Close image preview"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Centered Image Container */}
      <div 
        className="flex-1 flex items-center justify-center p-4 relative"
        onClick={onClose}
      >
        <div 
          className="relative max-w-full max-h-[80vh] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img 
            src={imageUrl} 
            alt={altText}
            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl select-none animate-in zoom-in-95 duration-200"
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div 
        className="w-full text-center py-4 bg-gradient-to-t from-black/80 to-transparent text-neutral-500 text-xs select-none"
        onClick={(e) => e.stopPropagation()}
      >
        Tap anywhere outside the image to close
      </div>
    </div>
  );
}

