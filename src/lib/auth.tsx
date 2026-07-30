import type { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

type AuthResult = { error: string | null; needsConfirm?: boolean; cancelled?: boolean };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  authLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signInWithApple: () => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

WebBrowser.maybeCompleteAuthSession();

const oauthRedirectTo = makeRedirectUri({ scheme: 'trak', path: 'auth/callback' });

async function createSessionFromUrl(url: string): Promise<AuthResult> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) return { error: String(params.error_description ?? errorCode) };

  const accessToken = typeof params.access_token === 'string' ? params.access_token : null;
  const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : null;
  if (!accessToken || !refreshToken) {
    return { error: 'Google sign-in did not return a session. Please try again.' };
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return { error: error?.message ?? null };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    // With email confirmation on, signUp returns a user but no session.
    return { error: error?.message ?? null, needsConfirm: !error && !data.session };
  }, []);

  const signInWithApple = useCallback(async (): Promise<AuthResult> => {
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );
      const credential = await AppleAuthentication.signInAsync({
        nonce: hashedNonce,
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { error: 'Apple sign-in did not return an identity token. Please try again.' };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });
      if (error) return { error: error.message };

      // Apple only shares the name on the first authorization. Preserve it
      // immediately so it is available on future sessions and devices.
      const givenName = credential.fullName?.givenName?.trim() || null;
      const familyName = credential.fullName?.familyName?.trim() || null;
      const fullName = [givenName, familyName].filter(Boolean).join(' ');
      if (fullName) {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            given_name: givenName,
            family_name: familyName,
          },
        });
      }

      return { error: null };
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return { error: null, cancelled: true };
      }
      return { error: error?.message ?? 'Apple sign-in failed. Please try again.' };
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: oauthRedirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error) return { error: error.message };
    if (!data.url) return { error: 'Google sign-in is unavailable right now.' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, oauthRedirectTo);
    if (result.type !== 'success') return { error: null, cancelled: true };
    return createSessionFromUrl(result.url);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    authLoading,
    signIn,
    signUp,
    signInWithApple,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return ctx;
}
