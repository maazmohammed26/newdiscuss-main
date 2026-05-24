import { X } from 'lucide-react';
import { useState } from 'react';
import { ADMIN_MESSAGE_PREVIEW_LENGTH } from '@/lib/uiConstants';

const URL_PATTERN = '(?:https?:\\/\\/[^\\s<>"\']*[^\\s<>"\'.,!?;:)])|(?:www\\.[^\\s<>"\']*[^\\s<>"\'.,!?;:)])';
const PHONE_PATTERN = '\\+?\\d[\\d\\s().-]{6,}\\d';
const URL_OR_PHONE_SPLIT_REGEX = new RegExp(`(${URL_PATTERN}|${PHONE_PATTERN})`, 'i');
const URL_TOKEN_REGEX = new RegExp(`^(${URL_PATTERN})$`, 'i');
const PHONE_TOKEN_REGEX = new RegExp(`^(${PHONE_PATTERN})$`);

function splitTrailingPunctuation(value) {
  let core = value;
  let trailing = '';

  while (/[.,!?;:()]$/.test(core)) {
    trailing = core.slice(-1) + trailing;
    core = core.slice(0, -1);
  }

  return { core, trailing };
}

function isUrlToken(value) {
  return URL_TOKEN_REGEX.test(value);
}

function isPhoneToken(value) {
  return PHONE_TOKEN_REGEX.test(value);
}

function buildLinkHref(value) {
  if (isUrlToken(value)) {
    return value.startsWith('www.') ? `https://${value}` : value;
  }
  if (isPhoneToken(value)) {
    const normalized = value.replace(/[^\d+]/g, '');
    const digitCount = normalized.replace(/\+/g, '').length;
    if (digitCount < 7) return null;
    return normalized ? `tel:${normalized}` : null;
  }
  return null;
}

function renderLinkedMessage(message) {
  const segments = message.split(URL_OR_PHONE_SPLIT_REGEX);

  return segments.map((segment, index) => {
    if (!segment) return null;
    const { core, trailing } = splitTrailingPunctuation(segment);
    const href = buildLinkHref(core);

    const key = `segment-${index}`;

    if (!href) return <span key={key}>{segment}</span>;

    return (
      <span key={key}>
        <a
          href={href}
          className="msg-link font-semibold underline underline-offset-2 break-all"
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {core}
        </a>
        {trailing}
      </span>
    );
  });
}

export default function UserAdminMessage({ message }) {
  const [dismissed, setDismissed] = useState(false);

  if (!message || message.trim() === '' || dismissed) {
    return null;
  }

  const trimmedMessage = message.trim();
  const showScrollHint = trimmedMessage.length > ADMIN_MESSAGE_PREVIEW_LENGTH;

  return (
    <>
      <div 
        data-testid="user-admin-message"
        className="user-admin-msg-box rounded-xl p-4 mb-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex items-center shrink-0">
            <span className="msg-tag-left text-2xl font-bold">&lt;</span>
            <span className="msg-tag-right text-2xl font-bold">&gt;</span>
          </div>
          <div className="flex-1 text-[13px] md:text-[14px] msg-text-container">
            <span className="msg-label font-bold">Admin message: </span>
            <div className="msg-content font-medium mt-1 max-h-36 overflow-y-auto scrollbar-hide whitespace-pre-wrap break-words pr-1">
              {renderLinkedMessage(trimmedMessage)}
            </div>
            {showScrollHint && (
              <p className="text-[11px] mt-1 msg-scroll-hint">Scroll to read full message</p>
            )}
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg msg-close-btn transition-colors shrink-0"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style>{`
        /* Default / Light Theme */
        .user-admin-msg-box {
          background-color: #EFF6FF;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .msg-tag-left { color: #3B82F6; }
        .msg-tag-right { color: #EF4444; }
        .msg-label { color: #1E293B; }
        .msg-content { color: #2563EB; }
        .msg-close-btn {
          color: #64748B;
        }
        .msg-close-btn:hover {
          background-color: rgba(59, 130, 246, 0.1);
          color: #3B82F6;
        }
        .msg-link { color: #1D4ED8; }
        .msg-link:hover { color: #1E3A8A; }
        .msg-scroll-hint { color: #475569; }

        /* Dark Theme */
        .dark .user-admin-msg-box {
          background-color: #1E293B;
          border: 1px solid #334155;
        }
        .dark .msg-tag-left { color: #3B82F6; }
        .dark .msg-tag-right { color: #EF4444; }
        .dark .msg-label { color: #F1F5F9; }
        .dark .msg-content { color: #60A5FA; }
        .dark .msg-close-btn {
          color: #94A3B8;
        }
        .dark .msg-close-btn:hover {
          background-color: rgba(96, 165, 250, 0.15);
          color: #60A5FA;
        }
        .dark .msg-link { color: #93C5FD; }
        .dark .msg-link:hover { color: #DBEAFE; }
        .dark .msg-scroll-hint { color: #94A3B8; }

        /* Retro / Discuss Light Theme */
        .discuss-light .user-admin-msg-box {
          background-color: #ffffff !important;
          border: 2px solid #000000 !important;
          box-shadow: 3px 3px 0 #000000 !important;
          border-radius: 0 !important;
        }
        .discuss-light .msg-tag-left { color: #000000 !important; }
        .discuss-light .msg-tag-right { color: #EF4444 !important; }
        .discuss-light .msg-label { color: #000000 !important; }
        .discuss-light .msg-content { color: #EF4444 !important; font-weight: 700 !important; }
        .discuss-light .msg-close-btn {
          color: #000000 !important;
          border-radius: 0 !important;
        }
        .discuss-light .msg-close-btn:hover {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }
        .discuss-light .msg-link { color: #B91C1C !important; }
        .discuss-light .msg-link:hover { color: #7F1D1D !important; }
        .discuss-light .msg-scroll-hint { color: #334155 !important; }

        /* Cyberpunk / Discuss Black Theme */
        .discuss-black .user-admin-msg-box {
          background-color: rgba(255, 0, 127, 0.04) !important;
          border: 1px solid rgba(255, 0, 127, 0.25) !important;
          box-shadow: 0 0 15px rgba(255, 0, 127, 0.05) !important;
        }
        .discuss-black .msg-tag-left { color: #FF007F !important; }
        .discuss-black .msg-tag-right { color: #9333EA !important; }
        .discuss-black .msg-label { color: #FFFFFF !important; }
        .discuss-black .msg-content { color: #FF007F !important; font-weight: 600 !important; text-shadow: 0 0 8px rgba(255, 0, 127, 0.4) !important; }
        .discuss-black .msg-close-btn {
          color: #9090A8 !important;
        }
        .discuss-black .msg-close-btn:hover {
          background-color: rgba(255, 0, 127, 0.1) !important;
          color: #FF007F !important;
        }
        .discuss-black .msg-link { color: #FF007F !important; }
        .discuss-black .msg-link:hover { color: #FDA4AF !important; }
        .discuss-black .msg-scroll-hint { color: #A1A1AA !important; }
      `}</style>
    </>
  );
}
