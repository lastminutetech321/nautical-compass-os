import { getCurrentUser } from './auth';

const PWA_RETURN_KEY = 'pwaReturnRouting';
const PWA_USER_KEY = 'pwaReturnRouting_userId';
const EXPIRY_TIME = 15 * 60 * 1000;

interface ReturnRoute {
  path: string;
  timestamp: number;
  userId: string;
}

export async function storePWAReturnRoute(path: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const route: ReturnRoute = { path, timestamp: Date.now(), userId: user.id };
    localStorage.setItem(PWA_RETURN_KEY, JSON.stringify(route));
    localStorage.setItem(PWA_USER_KEY, user.id);
  } catch {}
}

export async function getPWAReturnRoute(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      localStorage.removeItem(PWA_RETURN_KEY);
      localStorage.removeItem(PWA_USER_KEY);
      return null;
    }
    const stored = localStorage.getItem(PWA_RETURN_KEY);
    if (!stored) return null;
    const route: ReturnRoute = JSON.parse(stored);
    if (route.userId !== user.id) {
      localStorage.removeItem(PWA_RETURN_KEY);
      localStorage.removeItem(PWA_USER_KEY);
      return null;
    }
    if (Date.now() - route.timestamp > EXPIRY_TIME) {
      localStorage.removeItem(PWA_RETURN_KEY);
      localStorage.removeItem(PWA_USER_KEY);
      return null;
    }
    return route.path;
  } catch {
    localStorage.removeItem(PWA_RETURN_KEY);
    localStorage.removeItem(PWA_USER_KEY);
    return null;
  }
}

export function clearPWAReturnRoute(): void {
  localStorage.removeItem(PWA_RETURN_KEY);
  localStorage.removeItem(PWA_USER_KEY);
}
