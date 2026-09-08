import { Globe, Github, Linkedin, Instagram, Twitter, Link2, ExternalLink } from 'lucide-react';

function getLinkDetails(link) {
  if (!link || !link.url) return null;
  const rawUrl = String(link.url).trim();
  if (!rawUrl) return null;

  const url = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    ? rawUrl
    : `https://${rawUrl}`;

  let domain = '';
  try {
    const parsed = new URL(url);
    domain = parsed.hostname.replace(/^www\./, '');
  } catch {
    domain = rawUrl;
  }

  const platform = (link.platform || link.name || '').toLowerCase();
  const lowerUrl = url.toLowerCase();

  let Icon = Globe;
  let label = link.name || link.label || '';

  if (platform.includes('github') || lowerUrl.includes('github.com')) {
    Icon = Github;
    if (!label) label = 'GitHub';
  } else if (platform.includes('linkedin') || lowerUrl.includes('linkedin.com')) {
    Icon = Linkedin;
    if (!label) label = 'LinkedIn';
  } else if (platform.includes('instagram') || lowerUrl.includes('instagram.com')) {
    Icon = Instagram;
    if (!label) label = 'Instagram';
  } else if (platform.includes('twitter') || platform.includes('x.com') || lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    Icon = Twitter;
    if (!label) label = 'X (Twitter)';
  } else if (!label) {
    label = domain || 'Link';
  }

  return { url, label, Icon };
}

export default function ProfileSocialLinks({ links = [], className = '' }) {
  if (!Array.isArray(links) || links.length === 0) return null;

  const validLinks = links
    .map(getLinkDetails)
    .filter(Boolean)
    .slice(0, 5);

  if (validLinks.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {validLinks.map(({ url, label, Icon }, idx) => (
        <a
          key={idx}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-neutral-200 dark:border-[#262626] bg-neutral-50/80 dark:bg-neutral-900/80 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-950 dark:hover:text-white transition-colors max-w-[200px]"
          title={url}
        >
          <Icon className="w-3.5 h-3.5 shrink-0 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
          <span className="truncate">{label}</span>
        </a>
      ))}
    </div>
  );
}
