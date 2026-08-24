import { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  createGroup, 
  isGroupNameAvailable, 
  GROUP_TYPE 
} from '@/lib/groupsDb';
import { AlertCircle, Loader2, Check, X, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateGroupModal({ open, onOpenChange, userId, onGroupCreated }) {
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState(GROUP_TYPE.PUBLIC);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [error, setError] = useState('');

  // Real-time name availability check
  useEffect(() => {
    if (!groupName.trim() || groupName.trim().length < 3) {
      setIsAvailable(null);
      setChecking(false);
      return;
    }

    const checkTimer = setTimeout(async () => {
      setChecking(true);
      try {
        const available = await isGroupNameAvailable(groupName);
        setIsAvailable(available);
        setError('');
      } catch (err) {
        console.error('Error checking name:', err);
        setIsAvailable(false);
        setError(err.message || 'Failed to check availability');
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(checkTimer);
  }, [groupName]);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (groupName.trim().length < 3) {
      setError('Group name must be at least 3 characters');
      return;
    }

    if (!isAvailable) {
      setError('This group name is already taken');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const group = await createGroup(userId, groupName, groupType);
      toast.success(`Group "${groupName}" created successfully!`);
      onGroupCreated?.(group);
      onOpenChange(false);
      
      // Reset form
      setGroupName('');
      setGroupType(GROUP_TYPE.PUBLIC);
      setIsAvailable(null);
    } catch (err) {
      console.error('Error creating group:', err);
      setError(err.message || 'Failed to create group');
      toast.error(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      setGroupName('');
      setGroupType(GROUP_TYPE.PUBLIC);
      setIsAvailable(null);
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] rounded-t-[26px] sm:rounded-[26px] border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black">
        <DialogHeader>
          <DialogTitle className="text-neutral-900 dark:text-neutral-50 dark:text-white text-lg font-bold">
            Create New Group
          </DialogTitle>
          <DialogDescription className="text-neutral-500 dark:text-neutral-400 dark:text-neutral-400">
            Create a public or private group. Group names must be unique.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="groupName" className="text-neutral-900 dark:text-neutral-50 dark:text-white font-semibold">
              Group Name
            </Label>
            <div className="relative">
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name (min 3 characters)"
                className="h-11 rounded-xl border-neutral-200 bg-neutral-50 pr-10 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
                disabled={loading}
                maxLength={50}
              />
              {checking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                </div>
              )}
              {!checking && isAvailable !== null && groupName.trim().length >= 3 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isAvailable ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {!checking && isAvailable === false && !error && groupName.trim().length >= 3 && (
              <p className="text-xs text-red-600 dark:text-red-500">
                This group name is already taken
              </p>
            )}
            {!checking && isAvailable === true && groupName.trim().length >= 3 && (
              <p className="text-xs text-green-600 dark:text-green-500">
                Group name is available!
              </p>
            )}
          </div>

          {/* Group Type */}
          <div className="space-y-2">
            <Label className="text-neutral-900 dark:text-neutral-50 dark:text-white font-semibold">
              Group Type
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setGroupType(GROUP_TYPE.PUBLIC)}
                disabled={loading}
                className={`p-4 rounded-2xl border transition-all ${
                  groupType === GROUP_TYPE.PUBLIC
                    ? 'border-[#0095F6] bg-[#0095F6]/5'
                    : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#0095F6] discuss:hover:border-[#EF4444]'}`}
              >
                <Users className={`w-6 h-6 mx-auto mb-2 ${
                  groupType === GROUP_TYPE.PUBLIC
                    ? 'text-[#0095F6] text-[#0095F6]'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`} />
                <p className={`font-semibold text-sm ${
                  groupType === GROUP_TYPE.PUBLIC
                    ? 'text-[#0095F6] text-[#0095F6]'
                    : 'text-neutral-900 dark:text-neutral-50 dark:text-white'
                }`}>
                  Public
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 mt-1">
                  Anyone can search and join
                </p>
              </button>

              <button
                onClick={() => setGroupType(GROUP_TYPE.PRIVATE)}
                disabled={loading}
                className={`p-4 rounded-2xl border transition-all ${
                  groupType === GROUP_TYPE.PRIVATE
                    ? 'border-[#0095F6] bg-[#0095F6]/5'
                    : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#0095F6] discuss:hover:border-[#EF4444]'}`}
              >
                <Lock className={`w-6 h-6 mx-auto mb-2 ${
                  groupType === GROUP_TYPE.PRIVATE
                    ? 'text-[#0095F6] text-[#0095F6]'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`} />
                <p className={`font-semibold text-sm ${
                  groupType === GROUP_TYPE.PRIVATE
                    ? 'text-[#0095F6] text-[#0095F6]'
                    : 'text-neutral-900 dark:text-neutral-50 dark:text-white'
                }`}>
                  Private
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 mt-1">
                  Invite-only group
                </p>
              </button>
            </div>
          </div>

          {/* Warning */}
          <div
            className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/20"
            style={false
              ? { backgroundColor: 'rgba(120,53,15,0.25)', borderColor: 'rgba(217,119,6,0.3)' }
              : {}}
          >
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 discuss:text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p
                  className="text-sm font-semibold text-amber-900 dark:text-amber-200 discuss:text-amber-200 mb-1"
                  style={false ? { color: '#FCD34D' } : {}}
                >
                  Important Notice
                </p>
                <p
                  className="text-xs text-amber-800 dark:text-amber-300 discuss:text-amber-300"
                  style={false ? { color: '#FDE68A' } : {}}
                >
                  Group type cannot be modified after creation. To change the type, you'll need to delete the group and create a new one.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 discuss:bg-red-950/30 border border-red-200 dark:border-red-800 discuss:border-red-800 rounded-[12px] p-3">
              <p className="text-sm text-red-600 dark:text-red-400 discuss:text-red-400">
                {error}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="border-neutral-200 dark:border-neutral-700 dark:border-[#262626] text-neutral-900 dark:text-neutral-50 dark:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !groupName.trim() || !isAvailable || groupName.trim().length < 3}
            className="rounded-xl bg-[#0095F6] text-white hover:bg-[#1877F2]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Group'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
