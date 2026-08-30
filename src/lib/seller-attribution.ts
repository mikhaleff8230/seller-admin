const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid'];
const STORAGE_KEY = 'sancan:seller-attribution';

export function captureSellerAttribution(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const previous = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const params = new URLSearchParams(window.location.search);
    // Keep the first advertising touch through navigation/login/registration.
    for (const key of KEYS) {
      const value = params.get(key);
      if (value && !previous[key]) previous[key] = value.slice(0, 500);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(previous));
    return previous;
  } catch { return {}; }
}
