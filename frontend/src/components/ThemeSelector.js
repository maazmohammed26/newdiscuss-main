import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
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
import { Sun, Moon, Code, Zap, Gamepad2 } from 'lucide-react';

export default function ThemeSelector() {
  const { theme, changeTheme } = useTheme();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTheme, setPendingTheme] = useState(null);

  const handleThemeChange = (newTheme) => {
    // Show confirmation for specialty themes when switching TO them
    if (
      (newTheme === 'discuss-light' && theme !== 'discuss-light') ||
      (newTheme === 'discuss-black' && theme !== 'discuss-black') ||
      (newTheme === 'discuss-retro' && theme !== 'discuss-retro')
    ) {
      setPendingTheme(newTheme);
      setShowConfirm(true);
    } else {
      changeTheme(newTheme);
    }
  };

  const confirmThemeChange = () => {
    if (pendingTheme) {
      changeTheme(pendingTheme);
    }
    setShowConfirm(false);
    setPendingTheme(null);
  };

  const isDiscussTheme = theme === 'discuss-light';
  const isBlackTheme = theme === 'discuss-black';
  const isRetroTheme = theme === 'discuss-retro';

  const themes = [
    { id: 'light',          name: 'Light',   icon: Sun      },
    { id: 'dark',           name: 'Dark',    icon: Moon     },
    { id: 'discuss-light',  name: 'Discuss', icon: Code     },
    { id: 'discuss-black',  name: 'Black',   icon: Zap      },
    { id: 'discuss-retro',  name: 'Retro',   icon: Gamepad2 },
  ];

  const getActiveStyle = (id) => {
    if (theme !== id) return 'border-[#E2E6ED] text-[#6B7280] hover:border-[#1D7AFF]';
    if (id === 'discuss-light') return 'border-[#EF4444] bg-[#EF4444] text-white';
    if (id === 'discuss-black') return 'border-[#FF007F] bg-gradient-to-r from-[#FF007F] to-[#7000FF] text-white shadow-[0_0_12px_rgba(255,0,127,0.4)]';
    if (id === 'discuss-retro') return 'border-[#E64A19] bg-gradient-to-r from-[#D32F2F] to-[#1565C0] text-white shadow-[0_0_12px_rgba(230,74,25,0.4)]';
    return 'border-[#1D7AFF] bg-[#1D7AFF] text-white';
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {themes.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              data-testid={`theme-option-${t.id}`}
              onClick={() => handleThemeChange(t.id)}
              className={`relative flex items-center justify-center gap-1.5 px-3 py-2 border transition-all text-xs font-medium rounded-md ${getActiveStyle(t.id)}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">{t.name}</span>
              {/* Pink dot indicator for Black theme */}
              {t.id === 'discuss-black' && theme !== 'discuss-black' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF007F]" />
              )}
              {/* Red-blue dot indicator for Retro theme */}
              {t.id === 'discuss-retro' && theme !== 'discuss-retro' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#D32F2F] to-[#1565C0]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Confirmation dialog — shared for discuss-light and discuss-black */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {pendingTheme === 'discuss-black' ? (
                <>
                  <Zap className="w-5 h-5 text-[#FF007F]" />
                  <span
                    style={{
                      background: 'linear-gradient(90deg, #FF007F, #7000FF)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Switch to Discuss Black?
                  </span>
                </>
              ) : pendingTheme === 'discuss-retro' ? (
                <>
                  <Gamepad2 className="w-5 h-5 text-[#E64A19]" />
                  <span
                    style={{
                      background: 'linear-gradient(90deg, #D32F2F, #1565C0)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Switch to Retro Theme?
                  </span>
                </>
              ) : (
                <>
                  <Code className="w-5 h-5 text-[#EF4444]" />
                  Switch to Discuss Theme?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTheme === 'discuss-black'
                ? 'This will change the app appearance (colors, fonts, UI style) to the Discuss Black theme — a futuristic dark UI with hot-pink, orange, and purple accents. Do you want to continue?'
                : pendingTheme === 'discuss-retro'
                ? 'This will apply a retro-futuristic theme inspired by 90s/2000s hardware — tactile 3D buttons, bevelled panels, red & blue accents, and rounded chunky shapes. You can switch back anytime.'
                : 'This will apply a tech-inspired theme with monospace fonts, red accents, and square edges. You can switch back anytime from your profile settings.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => { setShowConfirm(false); setPendingTheme(null); }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmThemeChange}
              style={
                pendingTheme === 'discuss-black'
                  ? { background: 'linear-gradient(135deg, #FF007F, #7000FF)', border: 'none' }
                  : pendingTheme === 'discuss-retro'
                  ? { background: 'linear-gradient(135deg, #D32F2F, #1565C0)', border: 'none' }
                  : {}
              }
              className={
                pendingTheme === 'discuss-black'
                  ? 'text-white font-medium'
                  : pendingTheme === 'discuss-retro'
                  ? 'text-white font-medium'
                  : 'bg-[#EF4444] text-white hover:bg-[#DC2626] font-medium'
              }
            >
              {pendingTheme === 'discuss-black' ? 'Apply Black Theme' : pendingTheme === 'discuss-retro' ? 'Apply Retro Theme' : 'Apply Discuss Theme'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
