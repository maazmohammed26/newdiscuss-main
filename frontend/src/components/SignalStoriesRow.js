import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToActiveStories,
  subscribeToSeenStoryIds,
  groupStoriesByAuthor,
} from '@/lib/storiesDb';
import SignalStoryCreator from '@/components/SignalStoryCreator';
import SignalStoryViewer from '@/components/SignalStoryViewer';
import UserAvatar from '@/components/UserAvatar';
import { Plus } from 'lucide-react';

function StoryAvatar({ group, hasUnseen, isSelf, onClick, onAddClick }) {
  const authorName = isSelf ? 'Your story' : group.authorUsername;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none cursor-pointer"
      style={{ width: '72px' }}
    >
      <div className="relative">
        <div
          className={`w-[64px] h-[64px] rounded-full p-[2.5px] flex items-center justify-center transition-transform duration-150 group-hover:scale-105 active:scale-95 ${
            hasUnseen ? 'ig-story-gradient' : 'bg-neutral-300 dark:bg-neutral-700'
          }`}
        >
          <div className="w-full h-full rounded-full p-[2px] bg-white dark:bg-black overflow-hidden flex items-center justify-center">
            {group.authorPhotoUrl ? (
              <UserAvatar 
                src={group.authorPhotoUrl} 
                username={group.authorUsername} 
                className="w-full h-full object-cover rounded-full" 
              />
            ) : (
              <div
                className="w-full h-full rounded-full flex items-center justify-center text-white text-[16px] font-bold"
                style={{ background: hasUnseen ? 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)' : '#8E8E8E' }}
              >
                {(group.authorUsername?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {isSelf && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onAddClick();
            }}
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#0095F6] border-2 border-white dark:border-black flex items-center justify-center text-white shadow-xs cursor-pointer hover:scale-110 active:scale-95 transition-transform"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3px]" />
          </div>
        )}
      </div>

      <span 
        className="text-[11.5px] leading-tight text-center truncate w-full text-neutral-800 dark:text-neutral-200"
        style={{ maxWidth: '68px' }}
      >
        {authorName}
      </span>
    </button>
  );
}

function AddStoryBubble({ user, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none cursor-pointer"
      style={{ width: '72px' }}
    >
      <div className="relative">
        <div className="w-[64px] h-[64px] rounded-full p-[2px] flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center">
            {user?.photo_url ? (
              <UserAvatar 
                src={user.photo_url} 
                username={user.username || 'You'} 
                className="w-full h-full object-cover rounded-full opacity-90" 
              />
            ) : (
              <div className="w-full h-full rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 text-[16px] font-bold">
                {(user?.username?.[0] || 'Y').toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#0095F6] border-2 border-white dark:border-black flex items-center justify-center text-white shadow-xs hover:scale-110 transition-transform">
          <Plus className="w-3.5 h-3.5 stroke-[3px]" />
        </div>
      </div>

      <span 
        className="text-[11.5px] leading-tight text-center truncate w-full text-neutral-800 dark:text-neutral-200"
        style={{ maxWidth: '68px' }}
      >
        Your story
      </span>
    </button>
  );
}

export default function SignalStoriesRow() {
  const { user } = useAuth();

  const [stories, setStories] = useState([]);
  const [seenIds, setSeenIds] = useState(new Set());
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreator, setShowCreator] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIdx, setViewerGroupIdx] = useState(0);

  const rowRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToSeenStoryIds(user.id, setSeenIds);
    return () => unsub();
  }, [user?.id]);

  useEffect(() => {
    const unsub = subscribeToActiveStories((fetchedStories) => {
      setStories(fetchedStories);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setGroups(groupStoriesByAuthor(stories, seenIds, user?.id));
  }, [stories, seenIds, user?.id]);

  const handleSeenUpdate = useCallback(() => {}, []);

  const openViewer = (idx) => {
    setViewerGroupIdx(idx);
    setViewerOpen(true);
  };

  const userHasStory = groups.some((g) => g.authorId === user?.id);

  return (
    <>
      {/* Edge-to-edge Instagram Stories Strip (No outer card box) */}
      <div className="w-full bg-white dark:bg-black border-b border-[#EFEFEF] dark:border-[#262626] py-3 px-2 select-none">
        <div
          ref={rowRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {!userHasStory && (
            <AddStoryBubble
              user={user}
              onClick={() => setShowCreator(true)}
            />
          )}

          {loading ? (
            <>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ width: '72px' }}>
                  <div className="w-[64px] h-[64px] rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
                  <div className="w-12 h-2.5 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
                </div>
              ))}
            </>
          ) : (
            groups.map((group, idx) => {
              const hasUnseen = group.stories.some((s) => !seenIds.has(s.id));
              const isSelf = group.authorId === user?.id;
              return (
                <StoryAvatar
                  key={group.authorId}
                  group={group}
                  hasUnseen={hasUnseen}
                  isSelf={isSelf}
                  onClick={() => openViewer(idx)}
                  onAddClick={() => setShowCreator(true)}
                />
              );
            })
          )}
        </div>
      </div>

      {showCreator && (
        <SignalStoryCreator
          onClose={() => setShowCreator(false)}
          onCreated={() => setShowCreator(false)}
        />
      )}

      {viewerOpen && groups.length > 0 && (
        <SignalStoryViewer
          groups={groups}
          initialGroupIndex={viewerGroupIdx}
          seenIds={seenIds}
          onSeenUpdate={handleSeenUpdate}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}