import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { saveNews } from '@/lib/firebaseSixth';
import { toast } from 'sonner';

export default function NewsAdminModal({ open, onClose, editData }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editData) {
      setTitle(editData.title || '');
      setDescription(editData.description || '');
      setImage(editData.image || '');
    } else {
      setTitle('');
      setDescription('');
      setImage('');
    }
  }, [editData, open]);

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    
    setSaving(true);
    try {
      const newsId = editData?.id || Date.now().toString();
      const newsData = {
        title,
        description,
        image,
        createdAt: editData?.createdAt || new Date().toISOString(),
        authorId: 'ZUPjqx5LCwPqe2THOcIkrU7KaEj2'
      };
      
      await saveNews(newsId, newsData);
      toast.success(editData ? 'News updated!' : 'News added!');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save news');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
        <DialogHeader>
          <DialogTitle className="text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] text-xl font-bold">
            {editData ? 'Edit News' : 'Add Tech News'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="News Title"
              className="bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="News Description (URLs and emails will be clickable)"
              rows={8}
              className="bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF] mb-1 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Image URL (Optional)
            </label>
            <Input 
              value={image} 
              onChange={(e) => setImage(e.target.value)} 
              placeholder="https://example.com/image.png"
              className="bg-neutral-50 dark:bg-neutral-800 discuss:bg-[#262626] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose} className="border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-600 dark:text-neutral-300 discuss:text-[#F5F5F5]">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#2563EB] discuss:bg-[#EF4444] text-white hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {editData ? 'Update News' : 'Publish News'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
