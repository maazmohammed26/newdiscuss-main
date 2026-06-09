import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserTalentGraph, updateUserSkills, logAIAction } from '@/lib/talentGraphDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
        toast.error('You can add up to 5 or 6 skills maximum.');
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
      toast.error('You can add up to 5 or 6 skills maximum.');
      return;
    }

    setSelectedSkills(prev => [...prev, skill]);
    setCustomSkill('');
  };

  const handleSave = async () => {
    if (selectedSkills.length === 0) {
      toast.error('Please select or add at least one skill to continue.');
      return;
    }

    setSaving(true);
    try {
      await updateUserSkills(user.id, selectedSkills);
      await logAIAction(user.id, 'onboarding', `Onboarded with skills: ${selectedSkills.join(', ')}`);
      toast.success('Skills saved successfully.');
      setOpen(false);
    } catch (err) {
      toast.error('Failed to save skills. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Don't allow closing without saving to enforce onboarding
      if (!saving) {
        setOpen(val);
      }
    }}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Welcome to Discuss AI TalentGraph
          </DialogTitle>
          <DialogDescription className="text-neutral-500 dark:text-neutral-400 text-sm">
            Select your primary skills to start matching with other developers, side-projects, and collaboration opportunities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 my-5">
          <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto py-2 px-1">
            {PREDEFINED_SKILLS.map((skill) => {
              const isSelected = selectedSkills.includes(skill);
              return (
                <button
                  key={skill}
                  onClick={() => handleToggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                    isSelected
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-md dark:bg-white dark:text-neutral-900 dark:border-white'
                      : 'bg-transparent text-neutral-600 border-neutral-200 dark:text-neutral-400 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'
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
              className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white text-sm h-10 rounded-lg"
              maxLength={25}
            />
            <Button
              type="submit"
              variant="outline"
              className="border-neutral-200 dark:border-neutral-700 h-10 px-5 text-xs font-bold rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Add
            </Button>
          </form>

          {selectedSkills.length > 0 && (
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2 font-medium">Selected Skills ({selectedSkills.length}/6):</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-2 py-1 rounded-md text-xs border border-neutral-200/50 dark:border-neutral-700/50"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleToggleSkill(skill)}
                      className="hover:text-red-500 font-bold ml-1 text-[10px]"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <Button
            onClick={handleSave}
            disabled={saving || selectedSkills.length === 0}
            className="w-full sm:w-auto bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 rounded-lg font-bold text-sm py-2.5 px-6 shadow-lg transition-all"
          >
            {saving ? 'Saving...' : 'Save and Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
