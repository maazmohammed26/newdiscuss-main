import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  auth, 
  googleProvider, 
  database, 
  ref, 
  set, 
  signInWithPopup 
} from '@/lib/firebase';
import { onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { 
  Chrome, 
  Smartphone, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export default function LoginBridgePage() {
  const [searchParams] = useSearchParams();
  const flowId = searchParams.get('flowId');
  
  const [authState, setAuthState] = useState('checking'); // 'checking', 'unauthenticated', 'authenticating', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [user, setUser] = useState(null);

  // 1. Listen to Firebase Auth state on mount
  useEffect(() => {
    if (!flowId) {
      setAuthState('error');
      setErrorMessage('Missing authentication flow identifier. Please restart the login process inside the mobile app.');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      }
      setAuthState('unauthenticated');
    });

    return () => unsubscribe();
  }, [flowId]);

  // 2. Perform the secure bridging: write Google OAuth credentials to RTDB
  const handleBridgeAuth = async (signInResult) => {
    setAuthState('authenticating');
    try {
      const credential = GoogleAuthProvider.credentialFromResult(signInResult);
      if (!credential || !credential.idToken) {
        throw new Error("Unable to obtain secure Google credentials. Please try signing in again.");
      }
      
      // Write Google credentials to RTDB under /webViewAuth/{flowId}
      const bridgeRef = ref(database, `webViewAuth/${flowId}`);
      await set(bridgeRef, {
        status: 'success',
        googleIdToken: credential.idToken,
        googleAccessToken: credential.accessToken || null,
        uid: signInResult.user.uid,
        timestamp: Date.now()
      });
      
      setAuthState('success');
    } catch (err) {
      console.error('[Bridge] Authentication transfer failed:', err);
      setAuthState('error');
      setErrorMessage(err.message || 'An error occurred during authentication transfer.');
    }
  };

  // 3. Trigger Google login popup on click
  const handleLoginClick = async () => {
    setAuthState('authenticating');
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      await handleBridgeAuth(result);
    } catch (err) {
      console.error('[Bridge] Google Auth failed:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthState('unauthenticated');
      } else {
        setAuthState('error');
        setErrorMessage(err.message || 'Google sign-in failed.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EEF2F6] via-[#E0E7FF] to-[#F1F5F9] p-4 font-sans selection:bg-indigo-200">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-8 max-w-md w-full text-center space-y-6 transition-all duration-300">
        
        {/* Header App Branding */}
        <div className="flex flex-col items-center space-y-2">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-1.5 text-lg font-extrabold tracking-wider shadow-sm select-none">
            &lt;discuss/&gt;
          </div>
          <p className="text-neutral-500 text-xs font-semibold uppercase tracking-widest mt-1">Mobile Secure Portal</p>
        </div>

        {/* Dynamic visual graphic showing the bridge */}
        <div className="relative py-4 flex items-center justify-center gap-8">
          <div className="relative z-10 w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
            <Chrome className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 flex items-center justify-center">
            {authState === 'authenticating' ? (
              <div className="flex gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <ArrowRight className={`w-5 h-5 ${authState === 'success' ? 'text-green-500' : 'text-neutral-300 animate-pulse'}`} />
            )}
          </div>
          <div className="relative z-10 w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
            <Smartphone className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        {/* Core Auth States Rendering */}
        <div className="space-y-4">
          {authState === 'checking' && (
            <div className="space-y-3">
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <h2 className="text-lg font-bold text-neutral-800">Verifying session...</h2>
              <p className="text-neutral-500 text-sm">Please hold on while we prepare your secure connection.</p>
            </div>
          )}

          {authState === 'unauthenticated' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-neutral-800">Secure Sign-In</h2>
                <p className="text-neutral-500 text-sm px-2 leading-relaxed">
                  To complete signing into your <b>&lt;discuss/&gt;</b> app, click the button below to authenticate securely using your Google Account.
                </p>
              </div>
              
              <button
                onClick={handleLoginClick}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-50 border border-neutral-300 hover:border-neutral-400 text-neutral-700 font-bold py-3 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 8 12.5a5.99 5.99 0 0 1 5.99-6.013c1.642 0 3.123.633 4.246 1.666l3.197-3.19C19.337 3.015 16.786 2 13.99 2 8.163 2 3.5 6.663 3.5 12.5S8.163 23 13.99 23c5.44 0 9.878-3.9 9.878-9.5 0-.585-.054-1.17-.156-1.745l-11.472-.47z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          {authState === 'authenticating' && (
            <div className="space-y-3">
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <h2 className="text-lg font-bold text-neutral-800">Completing Sign-In</h2>
              <p className="text-neutral-500 text-sm">
                Exchanging secure keys and connecting with your mobile app. Almost done!
              </p>
            </div>
          )}

          {authState === 'success' && (
            <div className="space-y-4 animate-scale-up">
              <div className="flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 drop-shadow-sm" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-neutral-800">Logged In!</h2>
                <p className="text-neutral-600 text-sm leading-relaxed">
                  Your identity has been securely transferred to the <b>&lt;discuss/&gt;</b> app.
                </p>
              </div>
              
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-800 text-xs font-semibold leading-relaxed shadow-sm">
                🎉 Authentication successful. You can now close this browser tab and return to the app.
              </div>
            </div>
          )}

          {authState === 'error' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <AlertTriangle className="w-12 h-12 text-amber-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-neutral-800">Authentication Blocked</h2>
                <p className="text-neutral-500 text-xs leading-relaxed px-4">
                  {errorMessage || 'Failed to establish connection. Please return to the app and try again.'}
                </p>
              </div>
              <button
                onClick={() => setAuthState('unauthenticated')}
                className="text-indigo-600 hover:text-indigo-700 font-bold text-sm hover:underline cursor-pointer"
              >
                Try Sign-In Again
              </button>
            </div>
          )}
        </div>

        {/* Footer Safety Notice */}
        <div className="border-t border-neutral-100 pt-4 text-[10px] text-neutral-400 leading-normal flex items-center justify-center gap-1.5 select-none">
          <span>🔒 End-to-End Encrypted Session</span>
        </div>

      </div>
    </div>
  );
}
