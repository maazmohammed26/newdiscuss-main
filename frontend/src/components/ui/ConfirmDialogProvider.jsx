import { useCallback, useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

let openConfirmation = null;

export const confirmAction = (options) => {
  if (!openConfirmation) return Promise.resolve(false);
  return openConfirmation(options);
};

export function ConfirmDialogProvider({ children }) {
  const [request, setRequest] = useState(null);

  useEffect(() => {
    openConfirmation = (options) => new Promise((resolve) => {
      setRequest({ options, resolve });
    });
    return () => {
      openConfirmation = null;
    };
  }, []);

  const settle = useCallback((result) => {
    setRequest((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  const options = request?.options || {};

  return (
    <>
      {children}
      <AlertDialog open={Boolean(request)} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title || 'Are you sure?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {options.description || 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#ED4956] hover:bg-[#D93645]"
              onClick={() => settle(true)}
            >
              {options.confirmLabel || 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
