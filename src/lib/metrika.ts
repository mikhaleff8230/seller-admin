export const YANDEX_METRIKA_ID = 81185602;

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
