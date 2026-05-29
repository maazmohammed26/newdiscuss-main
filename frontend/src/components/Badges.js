import React from 'react';
import { Lock } from 'lucide-react';

// Verification/filter logic: Strictly type === 'discussion', must have technical/problem-solving/business-solution tags
export function getEligibleDiscussionsCount(posts) {
  if (!posts || !Array.isArray(posts)) return 0;
  return posts.filter(p => {
    // Only discussion posts
    if (p.type !== 'discussion') return false;
    
    // Must fall under: technical info post, problem solving, business solution, etc.
    const hashtags = p.hashtags || [];
    return hashtags.some(tag => {
      const norm = tag.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        norm.includes('technical') ||
        norm.includes('problemsolving') ||
        norm.includes('problemsolve') ||
        norm.includes('business') ||
        norm.includes('solution') ||
        norm.includes('tech') ||
        norm.includes('solve') ||
        norm.includes('problem') ||
        norm.includes('coding') ||
        norm.includes('programming') ||
        norm.includes('dev') ||
        norm.includes('software')
      );
    });
  }).length;
}

export const OFFICIAL_BADGES = [
  {
    id: 'badge_1',
    name: 'Discussion Starter',
    badgeText: 'Spark',
    target: 5,
    description: 'Awarded for starting your first 5 high-quality technical discussions.',
    rules: 'Publish 5 Discussion posts (no projects, no pulses, no comments) that include tech info, problem-solving, or business-solution hashtags.',
    renderSvg: (isLocked) => (
      <svg width="100%" height="100%" viewBox="0 0 150 160" xmlns="http://www.w3.org/2000/svg" className={isLocked ? 'grayscale opacity-40' : ''}>
        <defs>
          <style>{`
            .bg-spark { fill: #FDF3E7; }
            .rim-spark { fill: none; stroke: #C87232; stroke-width: 3; }
            .body-spark { fill: #E08535; }
            .shine-spark { fill: #F5AB68; }
            .dark-spark { fill: #A0541A; }
            .name-spark { font-family: sans-serif; font-size: 14px; font-weight: 600; fill: #412402; }
          `}</style>
        </defs>
        <rect x="0" y="0" width="150" height="160" rx="16" fill="transparent" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5"/>
        <circle cx="75" cy="72" r="54" className="bg-spark"/>
        <circle cx="75" cy="72" r="52" className="rim-spark"/>
        <polygon points="75,28 110,48 110,96 75,116 40,96 40,48" className="body-spark"/>
        <polygon points="75,34 105,51 105,93 75,110 45,93 45,51" className="shine-spark"/>
        <polygon points="75,40 100,55 100,89 75,104 50,89 50,55" className="dark-spark"/>
        <path d="M82,56 L68,74 L76,74 L70,90 L86,70 L78,70 Z" fill="#FAEEDA" opacity="0.93"/>
        <text x="75" y="148" textAnchor="middle" className="name-spark">Spark</text>
      </svg>
    )
  },
  {
    id: 'badge_2',
    name: 'Insightful Contributor',
    badgeText: 'Contributor',
    target: 15,
    description: 'Awarded for sharing 15 technical or business analysis posts.',
    rules: 'Publish 15 Discussion posts (no projects, no pulses, no comments) that include tech info, problem-solving, or business-solution hashtags.',
    renderSvg: (isLocked) => (
      <svg width="100%" height="100%" viewBox="0 0 150 160" xmlns="http://www.w3.org/2000/svg" className={isLocked ? 'grayscale opacity-40' : ''}>
        <defs>
          <style>{`
            .bg-contrib { fill: #F0F1F3; }
            .rim-contrib { fill: none; stroke: #7A8696; stroke-width: 3; }
            .body-contrib { fill: #9DAABB; }
            .shine-contrib { fill: #C8D2DC; }
            .dark-contrib { fill: #5F6E7D; }
            .name-contrib { font-family: sans-serif; font-size: 14px; font-weight: 600; fill: #2C3540; }
          `}</style>
        </defs>
        <rect x="0" y="0" width="150" height="160" rx="16" fill="transparent" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5"/>
        <circle cx="75" cy="72" r="54" className="bg-contrib"/>
        <circle cx="75" cy="72" r="52" className="rim-contrib"/>
        <polygon points="75,28 110,48 110,96 75,116 40,96 40,48" className="body-contrib"/>
        <polygon points="75,34 105,51 105,93 75,110 45,93 45,51" className="shine-contrib"/>
        <polygon points="75,40 100,55 100,89 75,104 50,89 50,55" className="dark-contrib"/>
        <rect x="54" y="54" width="42" height="30" rx="5" fill="#E8EDF2" opacity="0.92"/>
        <path d="M62,84 L58,94 L70,84 Z" fill="#E8EDF2" opacity="0.92"/>
        <line x1="60" y1="63" x2="90" y2="63" stroke="#5F6E7D" strokeWidth="2" strokeLinecap="round"/>
        <line x1="60" y1="70" x2="90" y2="70" stroke="#5F6E7D" strokeWidth="2" strokeLinecap="round"/>
        <line x1="60" y1="77" x2="80" y2="77" stroke="#5F6E7D" strokeWidth="2" strokeLinecap="round"/>
        <text x="75" y="148" textAnchor="middle" className="name-contrib">Contributor</text>
      </svg>
    )
  },
  {
    id: 'badge_3',
    name: 'Problem Solver',
    badgeText: 'Catalyst',
    target: 25,
    description: 'Awarded for publishing 25 high-quality technical solution posts.',
    rules: 'Publish 25 Discussion posts (no projects, no pulses, no comments) that include tech info, problem-solving, or business-solution hashtags.',
    renderSvg: (isLocked) => (
      <svg width="100%" height="100%" viewBox="0 0 150 160" xmlns="http://www.w3.org/2000/svg" className={isLocked ? 'grayscale opacity-40' : ''}>
        <defs>
          <style>{`
            .bg-catalyst { fill: #E1F5EE; }
            .rim-catalyst { fill: none; stroke: #0F6E56; stroke-width: 3; }
            .body-catalyst { fill: #1D9E75; }
            .shine-catalyst { fill: #5DCAA5; }
            .dark-catalyst { fill: #085041; }
            .name-catalyst { font-family: sans-serif; font-size: 14px; font-weight: 600; fill: #04342C; }
          `}</style>
        </defs>
        <rect x="0" y="0" width="150" height="160" rx="16" fill="transparent" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5"/>
        <circle cx="75" cy="72" r="54" className="bg-catalyst"/>
        <circle cx="75" cy="72" r="52" className="rim-catalyst"/>
        <polygon points="75,28 110,48 110,96 75,116 40,96 40,48" className="body-catalyst"/>
        <polygon points="75,34 105,51 105,93 75,110 45,93 45,51" className="shine-catalyst"/>
        <polygon points="75,40 100,55 100,89 75,104 50,89 50,55" className="dark-catalyst"/>
        <circle cx="75" cy="72" r="6" fill="#E1F5EE" opacity="0.95"/>
        <ellipse cx="75" cy="72" rx="22" ry="10" fill="none" stroke="#9FE1CB" strokeWidth="2" opacity="0.9"/>
        <ellipse cx="75" cy="72" rx="22" ry="10" fill="none" stroke="#9FE1CB" strokeWidth="2" opacity="0.9" transform="rotate(60 75 72)"/>
        <ellipse cx="75" cy="72" rx="22" ry="10" fill="none" stroke="#9FE1CB" strokeWidth="2" opacity="0.9" transform="rotate(120 75 72)"/>
        <text x="75" y="148" textAnchor="middle" className="name-catalyst">Catalyst</text>
      </svg>
    )
  },
  {
    id: 'badge_4',
    name: 'Technical Sage',
    badgeText: 'Luminary',
    target: 39,
    description: 'Awarded for authoring 39 elaborate developer or coding posts.',
    rules: 'Publish 39 Discussion posts (no projects, no pulses, no comments) that include tech info, problem-solving, or business-solution hashtags.',
    renderSvg: (isLocked) => (
      <svg width="100%" height="100%" viewBox="0 0 150 160" xmlns="http://www.w3.org/2000/svg" className={isLocked ? 'grayscale opacity-40' : ''}>
        <defs>
          <style>{`
            .bg-lumi { fill: #EEEDFE; }
            .rim-lumi { fill: none; stroke: #534AB7; stroke-width: 3; }
            .body-lumi { fill: #7F77DD; }
            .shine-lumi { fill: #AFA9EC; }
            .dark-lumi { fill: #3C3489; }
            .name-lumi { font-family: sans-serif; font-size: 14px; font-weight: 600; fill: #26215C; }
          `}</style>
        </defs>
        <rect x="0" y="0" width="150" height="160" rx="16" fill="transparent" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5"/>
        <circle cx="75" cy="72" r="54" className="bg-lumi"/>
        <circle cx="75" cy="72" r="52" className="rim-lumi"/>
        <polygon points="75,28 110,48 110,96 75,116 40,96 40,48" className="body-lumi"/>
        <polygon points="75,34 105,51 105,93 75,110 45,93 45,51" className="shine-lumi"/>
        <polygon points="75,40 100,55 100,89 75,104 50,89 50,55" className="dark-lumi"/>
        <path d="M75,52 L78,65 L92,65 L81,73 L85,87 L75,79 L65,87 L69,73 L58,65 L72,65 Z" fill="#EEEDFE" opacity="0.93"/>
        <text x="75" y="148" text-anchor="middle" className="name-lumi">Luminary</text>
      </svg>
    )
  },
  {
    id: 'badge_5',
    name: 'Discuss Legend',
    badgeText: 'Legend',
    target: 54,
    description: 'The highest achievement of Discuss, celebrating 54+ stellar posts.',
    rules: 'Publish 54 Discussion posts (no projects, no pulses, no comments) that include tech info, problem-solving, or business-solution hashtags.',
    renderSvg: (isLocked) => (
      <svg width="100%" height="100%" viewBox="0 0 150 160" xmlns="http://www.w3.org/2000/svg" className={isLocked ? 'grayscale opacity-40 animate-pulse' : ''}>
        <defs>
          <style>{`
            .bg-legend { fill: #FAEEDA; }
            .rim-legend { fill: none; stroke: #BA7517; stroke-width: 3.5; }
            .body-legend { fill: #EF9F27; }
            .shine-legend { fill: #FAC775; }
            .dark-legend { fill: #854F0B; }
            .name-legend { font-family: sans-serif; font-size: 14px; font-weight: 600; fill: #412402; }
          `}</style>
        </defs>
        <rect x="0" y="0" width="150" height="160" rx="16" fill="transparent" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5"/>
        <circle cx="75" cy="72" r="54" className="bg-legend"/>
        <circle cx="75" cy="72" r="58" fill="none" stroke="#FAC775" strokeWidth="1.5" opacity="0.5"/>
        <circle cx="75" cy="72" r="52" className="rim-legend"/>
        <polygon points="75,28 110,48 110,96 75,116 40,96 40,48" className="body-legend"/>
        <polygon points="75,34 105,51 105,93 75,110 45,93 45,51" className="shine-legend"/>
        <polygon points="75,40 100,55 100,89 75,104 50,89 50,55" className="dark-legend"/>
        <path d="M54,90 L54,72 L64,82 L75,60 L86,82 L96,72 L96,90 Z" fill="#FAEEDA" opacity="0.95"/>
        <rect x="54" y="90" width="42" height="7" rx="2" fill="#FAEEDA" opacity="0.95"/>
        <text x="75" y="148" text-anchor="middle" className="name-legend">Legend</text>
      </svg>
    )
  }
];

export function BadgeIcon({ badge, isLocked, size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 transition-transform duration-200 select-none ${sizeClasses[size]} ${className}`}>
      {badge.renderSvg(isLocked)}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl pointer-events-none">
          <div className="bg-neutral-800/80 text-white rounded-full p-1.5 shadow-md">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
    </div>
  );
}
