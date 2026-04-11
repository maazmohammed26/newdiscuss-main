import { useState } from 'react';

export default function VerifiedBadge({ size = 'sm', className = '' }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className="relative inline-block">
      <img
        src="https://customer-assets.emergentagent.com/job_discuss-ui-refresh/artifacts/x4hh98ac_image.png"
        alt="Verified"
        className={`${sizes[size]} inline-block cursor-pointer ${className}`}
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title="Verified User"
      />
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-[#0F172A] dark:bg-[#F1F5F9] discuss:bg-[#1a1a1a] text-white dark:text-[#0F172A] discuss:text-[#F5F5F5] text-xs font-medium rounded-lg whitespace-nowrap z-50 shadow-lg">
          Verified User
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#0F172A] dark:border-b-[#F1F5F9] discuss:border-b-[#1a1a1a]"></div>
        </div>
      )}
    </div>
  );
}
