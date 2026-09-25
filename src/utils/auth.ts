import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    if ('serviceWorker' in navigator && 'caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: 'CLEAR_CACHE' });
    }
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    window.location.href = '/';
  } catch {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  }
}

export async function handleMagicLinkToken(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const type = params.get('type');
  if (!token || type !== 'magiclink') return false;
  try {
    const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'magiclink' });
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('token');
    newUrl.searchParams.delete('type');
    window.history.replaceState({}, '', newUrl.toString());
    return !error;
  } catch {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('token');
    newUrl.searchParams.delete('type');
    window.history.replaceState({}, '', newUrl.toString());
    return false;
  }
}

export async function initializeAuth(): Promise<void> {
  await handleMagicLinkToken();
  const currentUser = await getCurrentUser();
  const storedUserId = localStorage.getItem('pwaReturnRouting_userId');
  if ((storedUserId && currentUser && storedUserId !== currentUser.id) || (!currentUser && storedUserId)) {
    localStorage.removeItem('pwaReturnRouting');
    localStorage.removeItem('pwaReturnRouting_userId');
  }
}
