export function normalizeRussianPhone(value?: string | null): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  const national = digits.slice(-10);
  return national.length === 10 ? `7${national}` : digits;
}

export function formatRussianPhone(value?: string | null): string {
  const national = normalizeRussianPhone(value).slice(-10);

  if (national.length !== 10) return value ?? '';

  return `+7 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6, 8)}-${national.slice(8, 10)}`;
}

export function phoneHref(value?: string | null): string {
  const digits = normalizeRussianPhone(value);
  return digits ? `tel:+${digits}` : '#';
}
