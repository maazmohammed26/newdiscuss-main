import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { saveJob } from '@/lib/firebaseSixth';
import { toast } from 'sonner';

const PLATFORMS = ['Discuss', 'LinkedIn', 'Naukri', 'Indeed', 'Foundit', 'Others'];
const JOB_TYPES = ['Job', 'Internship', 'Hackathon'];

export default function JobAdminModal({ open, onClose, editData }) {
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [aboutCompany, setAboutCompany] = useState('');
  const [applyLink, setApplyLink] = useState('');
  const [applyPlatform, setApplyPlatform] = useState('Discuss');
  const [jobType, setJobType] = useState('Job');
  const [experienceType, setExperienceType] = useState('');
  const [location, setLocation] = useState('');
  const [hackathonPlatform, setHackathonPlatform] = useState('Discuss');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editData) {
      setTitle(editData.title || '');
      setCompanyName(editData.companyName || '');
      setDescription(editData.description || '');
      setAboutCompany(editData.aboutCompany || '');
      setApplyLink(editData.applyLink || '');
      setApplyPlatform(editData.applyPlatform || 'Discuss');
      setJobType(editData.jobType || 'Job');
      setExperienceType(editData.experienceType || '');
      setLocation(editData.location || '');
      setHackathonPlatform(editData.hackathonPlatform || 'Discuss');
      setStartDate(editData.startDate || '');
      setEndDate(editData.endDate || '');
    } else {
      setTitle('');
      setCompanyName('');
      setDescription('');
      setAboutCompany('');
      setApplyLink('');
      setApplyPlatform('Discuss');
      setJobType('Job');
      setExperienceType('');
      setLocation('');
      setHackathonPlatform('Discuss');
      setStartDate('');
      setEndDate('');
    }
  }, [editData, open]);

  const handleSave = async () => {
    if (!title.trim() || !companyName.trim() || !description.trim() || !applyLink.trim()) {
      toast.error('Title, Company, Description, and Apply Link are required');
      return;
    }
    
    setSaving(true);
    try {
      const jobId = editData?.id || Date.now().toString();
      const jobData = {
        title,
        companyName,
        description,
        aboutCompany,
        applyLink,
        applyPlatform,
        jobType,
        location,
        hackathonPlatform: jobType === 'Hackathon' ? hackathonPlatform : '',
        experienceType,
        startDate,
        endDate,
        createdAt: editData?.createdAt || new Date().toISOString(),
        authorId: 'ZUPjqx5LCwPqe2THOcIkrU7KaEj2'
      };
      
      await saveJob(jobId, jobData);
      toast.success(editData ? 'Job updated!' : 'Job added!');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
        <DialogHeader>
          <DialogTitle className="text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] text-xl font-bold">
            {editData ? 'Edit Job' : 'Add Job Posting'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
              Job Title <span className="text-red-500">*</span>
            </label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Frontend Developer" className="bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]"/>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Discuss Inc." className="bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
              Experience Type
            </label>
            <Input value={experienceType} onChange={(e) => setExperienceType(e.target.value)} placeholder="e.g. Freshers, 3 to 4 years" className="bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]"/>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
              Apply Link <span className="text-red-500">*</span>
            </label>
            <Input value={applyLink} onChange={(e) => setApplyLink(e.target.value)} placeholder="https://" className="bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
              Apply Platform
            </label>
            <select 
              value={applyPlatform} 
              onChange={(e) => setApplyPlatform(e.target.value)}
              className="w-full h-10 px-3 py-2 rounded-md bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] outline-none"
            >
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
              Job Type
            </label>
            <select 
              value={jobType} 
              onChange={(e) => setJobType(e.target.value)}
              className="w-full h-10 px-3 py-2 rounded-md bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] outline-none"
            >
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
              Location (Optional)
            </label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Remote, Bangalore, London" className="bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]"/>
          </div>

          {jobType === 'Hackathon' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
                Hackathon Platform
              </label>
              <select 
                value={hackathonPlatform} 
                onChange={(e) => setHackathonPlatform(e.target.value)}
                className="w-full h-10 px-3 py-2 rounded-md bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] outline-none"
              >
                {['Discuss', 'Devpost', 'Unstop', 'Luma', 'Others'].map(hp => (
                  <option key={hp} value={hp}>{hp}</option>
                ))}
              </select>
            </div>
          )}

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
              Description / JD <span className="text-red-500">*</span>
            </label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Job Description (URLs and emails will be clickable)" rows={6} className="bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] resize-none"/>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
              About Company (Optional)
            </label>
            <Textarea value={aboutCompany} onChange={(e) => setAboutCompany(e.target.value)} placeholder="About the company" rows={3} className="bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] resize-none"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
              Start Date (Optional)
            </label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
              End Date (Optional)
            </label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]"/>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose} className="border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-600 dark:text-neutral-300 discuss:text-[#F5F5F5]">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#2563EB] discuss:bg-[#EF4444] text-white hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {editData ? 'Update Job' : 'Publish Job'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
