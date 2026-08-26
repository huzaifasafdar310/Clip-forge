import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleUser, AuthContextType } from '@/types/auth';
import { api } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preferred source: VITE_GOOGLE_CLIENT_ID from build-time environment,
// falling back to the hardcoded default client ID if the env var is not set.
const DEFAULT_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '115243955025-34mt0dlogqe8pu8vjfqfg6l6s4v6j0qh.apps.googleusercontent.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>(DEFAULT_CLIENT_ID);
  const [tokenClient, setTokenClient] = useState<any>(null);

  // 1. Fetch public config (Google Client ID) & restore persistent user session
  useEffect(() => {
    const initAuth = async () => {
      // Step A: Attempt to fetch real Google Client ID from backend /api/config first (if backend is deployed & reachable)
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (data?.google_client_id && typeof data.google_client_id === 'string' && data.google_client_id.trim()) {
              setClientId(data.google_client_id.trim());
            }
          }
        }
      } catch (err) {
        // Backend not reachable — fallback to VITE_GOOGLE_CLIENT_ID / DEFAULT_CLIENT_ID seamlessly
        console.warn('Could not fetch backend config, using default Client ID:', err);
      }

      // Step B: Check Database for existing persistent session
      try {
        const authMe = await api.getCurrentUser();
        if (authMe?.is_authenticated && authMe?.user && authMe?.access_token) {
          const dbUser: GoogleUser = {
            accessToken: authMe.access_token,
            name: authMe.user.name || 'YouTube Creator',
            email: authMe.user.email,
            avatarUrl: authMe.user.picture,
            channelTitle: authMe.user.channel_title,
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          };
          setUser(dbUser);
          localStorage.setItem('clipai_user', JSON.stringify(dbUser));
          return;
        }
      } catch {
        // Session check failed or not logged in — safe to ignore
      }

      // Step C: Restore from localStorage if present and valid
      try {
        const saved = localStorage.getItem('clipai_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.accessToken && (parsed.expiresAt ? parsed.expiresAt > Date.now() : true)) {
            setUser(parsed);
          } else {
            localStorage.removeItem('clipai_user');
          }
        }
      } catch {
        localStorage.removeItem('clipai_user');
      }
    };

    initAuth();
  }, []);

  // 2. Initialize Google Token Client when Google script loads and clientId is ready
  useEffect(() => {
    if (!clientId) return;

    const initClient = () => {
      if ((window as any).google?.accounts?.oauth2) {
        try {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
            callback: async (response: any) => {
              setIsLoggingIn(false);
              if (response.error) {
                console.error('Google OAuth Callback Error:', response);
                let msg = `Google OAuth Error: ${response.error}`;
                if (response.error_description) {
                  msg += ` (${response.error_description})`;
                }
                if (response.error === 'popup_closed_by_user') {
                  msg = 'Google login popup was closed before completing authorization.';
                } else if (response.error === 'access_denied') {
                  msg = 'Access denied. Please approve YouTube upload permissions to proceed.';
                }
                setAuthError(msg);
                return;
              }

              if (response.access_token) {
                setAuthError(null);
                const newUser: GoogleUser = {
                  accessToken: response.access_token,
                  name: 'YouTube Creator',
                  expiresAt: Date.now() + (Number(response.expires_in) || 3600) * 1000,
                };

                // Fetch Google profile details (name, email, avatar) directly from Google API
                try {
                  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${response.access_token}` },
                  });
                  if (profileRes.ok) {
                    const profile = await profileRes.json();
                    if (profile.name) newUser.name = profile.name;
                    if (profile.email) newUser.email = profile.email;
                    if (profile.picture) newUser.avatarUrl = profile.picture;
                  }
                } catch (profileErr) {
                  console.warn('Google userinfo fetch note:', profileErr);
                }

                // Fetch YouTube channel details if accessible
                try {
                  const ytRes = await fetch(
                    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
                    { headers: { Authorization: `Bearer ${response.access_token}` } }
                  );
                  if (ytRes.ok) {
                    const ytData = await ytRes.json();
                    if (ytData?.items?.[0]?.snippet) {
                      newUser.channelTitle = ytData.items[0].snippet.title;
                      if (!newUser.avatarUrl && ytData.items[0].snippet.thumbnails?.default?.url) {
                        newUser.avatarUrl = ytData.items[0].snippet.thumbnails.default.url;
                      }
                    }
                  }
                } catch {}

                // Save to local storage for persistence across visits
                localStorage.setItem('clipai_user', JSON.stringify(newUser));
                setUser(newUser);

                // Persist token in backend DB if available
                try {
                  await api.loginUser({
                    access_token: response.access_token,
                    expires_in: Number(response.expires_in) || 3600,
                  });
                } catch {
                  // Silent fallback
                }
              }
            },
            error_callback: (err: any) => {
              if (err && err.type === 'popup_failed_to_open') {
                setIsLoggingIn(false);
                setAuthError('Popup blocked: Please allow popups for this site in your browser URL bar.');
              }
            },
          });
          setTokenClient(client);
        } catch (e: any) {
          console.warn('Google Token Client init note:', e);
        }
      }
    };

    if ((window as any).google?.accounts?.oauth2) {
      initClient();
    } else {
      const timer = setInterval(() => {
        if ((window as any).google?.accounts?.oauth2) {
          initClient();
          clearInterval(timer);
        }
      }, 300);
      return () => clearInterval(timer);
    }
  }, [clientId]);

  const login = () => {
    setAuthError(null);
    if (tokenClient) {
      setIsLoggingIn(true);
      try {
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) {
        setIsLoggingIn(false);
        setAuthError(`Failed to request access token: ${err?.message || err}`);
      }
    } else {
      if (!(window as any).google?.accounts?.oauth2) {
        setAuthError('Google Identity Services script is still loading. Please wait a moment and retry.');
      } else {
        setAuthError('Google Auth Client not initialized. Please verify your Google Client ID.');
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('clipai_user');
    setUser(null);
    setAuthError(null);
    api.logoutUser().catch(() => {});
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoggingIn,
        authError,
        clearAuthError,
        clientId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
