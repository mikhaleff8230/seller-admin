export const YANDEX_METRIKA_ID = 81185602;
import { onboardingClient } from '@/data/seller-onboarding';

type MetrikaParams = Record<string, unknown>;

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function reachMetrikaGoal(goal: string, params?: MetrikaParams) {
  if (typeof window === 'undefined' || typeof window.ym !== 'function') {
    return;
  }

  window.ym(YANDEX_METRIKA_ID, 'reachGoal', goal, params ?? {});
}

export function trackSellerRegistrationSuccess() {
  reachMetrikaGoal('seller_registration_success', {
    source: 'seller_register',
  });
}

let claiming = false;
export async function flushOnboardingGoals() {
  // Only goal names leave our server. Local tests never send advertising conversions.
  if (typeof window === 'undefined') return false;
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) return true;
  if (typeof window.ym !== 'function' || claiming) return false;
  claiming = true;
  try {
    const events = await onboardingClient.claimEvents();
    for (const item of events) {
      reachMetrikaGoal(item.event);
      if (item.event === 'seller_registration_completed') reachMetrikaGoal('seller_registration_success');
    }
    return true;
  } catch { return false; /* Retry unclaimed events on the next authenticated visit. */ }
  finally { claiming = false; }
}
