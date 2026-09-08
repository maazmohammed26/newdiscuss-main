import { useState, useRef } from 'react';
import { motion, useAnimation, useMotionValue } from 'framer-motion';
import { Trash2, Check, ExternalLink } from 'lucide-react';

const SWIPE_ACTION_WIDTH = 84;
const FULL_SWIPE_THRESHOLD = -180;

export default function NotificationItem({
  item,
  onOpen,
  onMarkRead,
  onDelete,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const isDragging = useRef(false);

  const handleDragEnd = async (_, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Full swipe past threshold or high-velocity left swipe: delete directly
    if (offset < FULL_SWIPE_THRESHOLD || (offset < -50 && velocity < -500)) {
      setIsDeleting(true);
      await controls.start({ x: -400, opacity: 0, transition: { duration: 0.22, ease: 'easeOut' } });
      onDelete?.(item.id);
    } else if (offset < -SWIPE_ACTION_WIDTH / 2) {
      // Partial swipe: reveal the red delete action area
      controls.start({ x: -SWIPE_ACTION_WIDTH, transition: { type: 'spring', stiffness: 450, damping: 32 } });
    } else {
      // Snap back to closed state
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 35 } });
    }

    // Small delay to allow click vs drag differentiation
    setTimeout(() => {
      isDragging.current = false;
    }, 50);
  };

  const handleManualDelete = async (e) => {
    e.stopPropagation();
    setIsDeleting(true);
    await controls.start({ x: -400, opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } });
    onDelete?.(item.id);
  };

  const handleMarkRead = (e) => {
    e.stopPropagation();
    onMarkRead?.(item.id);
  };

  const handleClick = () => {
    if (isDragging.current || isDeleting) return;
    onOpen?.(item);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, overflow: 'hidden', transition: { duration: 0.24, ease: 'easeInOut' } }}
      className="relative w-full overflow-hidden select-none touch-pan-y"
    >
      {/* Background Red Destructive Action Area */}
      <div 
        className="absolute inset-y-0 right-0 w-24 flex items-center justify-center bg-rose-600 dark:bg-rose-700 text-white z-0"
        aria-hidden="true"
      >
        <button
          type="button"
          onClick={handleManualDelete}
          aria-label="Delete notification"
          className="w-full h-full flex flex-col items-center justify-center gap-1 hover:bg-rose-700 active:bg-rose-800 transition-colors focus:outline-hidden"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-wider uppercase">Delete</span>
        </button>
      </div>

      {/* Foreground Swipeable Notification Row */}
      <motion.div
        animate={controls}
        drag="x"
        dragConstraints={{ left: -SWIPE_ACTION_WIDTH, right: 0 }}
        dragElastic={0.12}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`relative z-10 w-full border-b border-neutral-100 dark:border-neutral-900 px-4 py-3.5 text-left cursor-pointer transition-colors duration-150 ${
          item.read
            ? 'bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/60'
            : 'bg-blue-50/70 dark:bg-blue-950/20 hover:bg-blue-50/90 dark:hover:bg-blue-950/35'
        }`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-start gap-3.5">
          {/* Status dot / unread indicator */}
          <div className="pt-1.5 shrink-0">
            <span
              className={`block h-2 w-2 rounded-full transition-colors ${
                item.read ? 'bg-transparent ring-1 ring-neutral-300 dark:ring-neutral-700' : 'bg-[#0095F6] shadow-xs shadow-blue-500/40'
              }`}
            />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {item.title}
              </p>
              <span className="shrink-0 text-[11px] font-normal text-neutral-400 dark:text-neutral-500">
                {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>

            <p className="mt-0.5 text-[13px] leading-snug text-neutral-600 dark:text-neutral-300 line-clamp-2">
              {item.body}
            </p>

            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-neutral-400 dark:text-neutral-500">
              <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</span>

              {/* Action shortcuts */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {!item.read && onMarkRead && (
                  <button
                    type="button"
                    onClick={handleMarkRead}
                    className="inline-flex items-center gap-1 text-[#0095F6] hover:text-[#1877F2] dark:hover:text-blue-400 font-medium px-1.5 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark read</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleManualDelete}
                  className="p-1 text-neutral-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
