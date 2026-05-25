import { useEffect } from 'react';
import { toast } from 'sonner';

export default function useSecurityProtection() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        navigator.clipboard.writeText('');
        toast.error("Action restricted by security policy.");
      }
      
      // Ctrl+C / Cmd+C / Ctrl+P / Cmd+P / Cmd+Shift+S / Cmd+Shift+4 / Cmd+Shift+3
      if ((e.ctrlKey || e.metaKey) && 
         (e.key === 'c' || e.key === 'C' || 
          e.key === 'p' || e.key === 'P' || 
          e.key === 's' || e.key === 'S')) {
        
        // Let people copy if they are typing in an input box
        const activeElement = document.activeElement;
        const isInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);
        
        if (!isInput) {
          e.preventDefault();
          navigator.clipboard.writeText('');
          toast.error("Action restricted by security policy.");
        }
      }
    };

    const handleCopy = (e) => {
      const activeElement = document.activeElement;
      const isInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);
      
      if (!isInput) {
        e.preventDefault();
        toast.error("Action restricted by security policy.");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
    };
  }, []);
}
