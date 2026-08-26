import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleUser, AuthContextType } from '@/types/auth';
import { storageService } from '@/services/storageService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [clientId] = useState<string>(() => storageService.getGoogleClientId());
  const [tokenClient, setTokenClient] = useState<any>(null);


  // Initialize Google Token Client when Google script loads and clientId is configured
  useEffect(() => {
    if (!clientId) return;

    const initClient = () => {
      if ((window as any).google?.accounts?.oauth2) {
        try {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'openid email profile https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
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
                const expiresInSec = Number(response.expires_in) || 3600;
                const newUser: GoogleUser = {
                  accessToken: response.access_token,
                  name: 'YouTube Creator',
                  expiresAt: Date.now() + expiresInSec * 1000,
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

                // Security: Keep OAuth access token strictly in memory React state (not written to localStorage)
                setUser(newUser);
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
    if (!clientId) {
      setAuthError(
        'Google OAuth Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment settings.'
      );
      return;
    }

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
    setUser(null);
    setAuthError(null);
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
