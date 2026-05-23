import { X } from 'lucide-react';
import { useState } from 'react';
import { ADMIN_MESSAGE_PREVIEW_LENGTH } from '@/lib/uiConstants';

export default function UserAdminMessage({ message }) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!message || message.trim() === '' || dismissed) {
    return null;
  }

  const trimmedMessage = message.trim();
  const isLongMessage = trimmedMessage.length > ADMIN_MESSAGE_PREVIEW_LENGTH;
  const shownMessage = isLongMessage && !expanded
    ? `${trimmedMessage.slice(0, ADMIN_MESSAGE_PREVIEW_LENGTH)}…`
    : trimmedMessage;

  return (
    <>
      <div 
        data-testid="user-admin-message"
        className="user-admin-msg-box rounded-xl p-4 mb-4 overflow-hidden"
      >
        <div className="flex items-start gap-3">
          <div className="flex items-center shrink-0">
            <span className="msg-tag-left text-2xl font-bold">&lt;</span>
            <span className="msg-tag-right text-2xl font-bold">&gt;</span>
          </div>
          <p className="flex-1 text-[13px] md:text-[14px] msg-text-container break-words whitespace-pre-wrap">
            <span className="msg-label font-bold">Admin message: </span>
            <span className="msg-content font-medium">{shownMessage}</span>
            {isLongMessage && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="ml-1 text-[11px] font-bold underline msg-more-btn"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </p>
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
        .msg-more-btn { color: #2563EB; }

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
        .dark .msg-more-btn { color: #93C5FD; }

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
        .discuss-light .msg-more-btn { color: #EF4444 !important; }

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
        .discuss-black .msg-more-btn { color: #FF007F !important; }
      `}</style>
    </>
  );
}
