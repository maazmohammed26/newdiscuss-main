import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserTalentGraph, updateUserSkills, logAIAction } from '@/lib/talentGraphDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import DiscussLogo from '@/components/DiscussLogo';

const PREDEFINED_SKILLS = [
  'React', 'Node.js', 'Python', 'Cybersecurity', 'Data Science',
  'AI/ML', 'Firebase', 'Supabase', 'Flutter', 'DevOps', 'UI/UX', 'Cloud'
];

export default function SkillsOnboardingModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const checkOnboarding = async () => {
      try {
        const tg = await getUserTalentGraph(user.id);
        if (!tg || !tg.hasCompletedOnboarding) {
          setOpen(true);
        }
      } catch (err) {
        console.error('Failed to load onboarding status:', err);
      }
    };

    checkOnboarding();
  }, [user?.id]);

  const handleToggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(prev => prev.filter(s => s !== skill));
    } else {
      if (selectedSkills.length >= 6) {
        toast.error('You can add up to 6 skills maximum.');
        return;
      }
      setSelectedSkills(prev => [...prev, skill]);
    }
  };

  const handleAddCustomSkill = (e) => {
    e.preventDefault();
    const skill = customSkill.trim();
    if (!skill) return;

    if (selectedSkills.some(s => s.toLowerCase() === skill.toLowerCase())) {
      toast.error('Skill is already selected.');
      return;
    }

    if (selectedSkills.length >= 6) {
      toast.error('Maximum 6 skills allowed.');
      return;
    }

    setSelectedSkills(prev => [...prev, skill]);
    setCustomSkill('');
  };

  const handleSave = async () => {
    if (selectedSkills.length === 0) {
      toast.error('Please select at least one skill to continue.');
      return;
    }

    setSaving(true);
    try {
      await updateUserSkills(user.id, selectedSkills, {
        hasCompletedOnboarding: true,
        onboardingCompletedAt: new Date().toISOString()
      });

      await logAIAction(user.id, 'onboarding_skills_selected', { skills: selectedSkills });

      toast.success('Profile skills updated!');
      setOpen(false);
    } catch (err) {
      console.error('Failed to save skills:', err);
      toast.error('Failed to save skills. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#121212] border border-[#DBDBDB] dark:border-[#262626] rounded-2xl p-6 select-none shadow-2xl">
        <DialogHeader className="text-center sm:text-center space-y-2">
          <div className="flex justify-center mb-1">
            <DiscussLogo size="md" />
          </div>
          <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-white">
            Welcome to Discuss TalentGraph
          </DialogTitle>
          <DialogDescription className="text-neutral-500 dark:text-neutral-400 text-xs">
            Select your skills to discover developer matches, collaborate on projects, and grow your network.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="flex flex-wrap gap-2 py-2">
            {PREDEFINED_SKILLS.map((skill) => {
              const isSelected = selectedSkills.includes(skill);
              return (
                <button
                  key={skill}
                  onClick={() => handleToggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0095F6] text-white border-[#0095F6] shadow-xs'
                      : 'bg-transparent text-neutral-700 border-[#DBDBDB] dark:text-neutral-300 dark:border-[#262626] hover:border-neutral-400'
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleAddCustomSkill} className="flex gap-2">
            <Input
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              placeholder="Add a custom skill..."
              className="bg-neutral-50 dark:bg-neutral-900 border border-[#DBDBDB] dark:border-[#262626] text-xs h-9 rounded-xl text-neutral-900 dark:text-white focus-visible:ring-[#0095F6]"
              maxLength={25}
            />
            <Button
              type="submit"
              variant="outline"
              className="border-[#DBDBDB] dark:border-[#262626] h-9 px-4 text-xs font-bold rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Add
            </Button>
          </form>

          {selectedSkills.length > 0 && (
            <div className="pt-2 border-t border-[#EFEFEF] dark:border-[#262626]">
              <p className="text-[11px] text-neutral-400 mb-1.5 font-medium">Selected ({selectedSkills.length}/6):</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 bg-[#0095F6]/10 text-[#0095F6] px-2.5 py-0.5 rounded-full text-xs font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleToggleSkill(skill)}
                      className="hover:text-red-500 font-bold ml-1 text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-2 border-t border-[#EFEFEF] dark:border-[#262626]">
          <Button
            onClick={handleSave}
            disabled={saving || selectedSkills.length === 0}
            className="w-full bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save and Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}