import { HttpClient } from './client/http-client';

export type OnboardingImage = { id: number; original: string; thumbnail: string };
export type ProductDraft = { name?: string; price?: string; category_id?: number | null; image?: OnboardingImage | null };
export type OnboardingState = {
  status: 'in_progress' | 'completed';
  step: 'shop' | 'product' | 'success';
  started_at: string;
  completed_at: string | null;
  shop_completed_at: string | null;
  product_request_key: string;
  draft: ProductDraft;
  draft_version: number;
  shop: { id: number; name: string; slug: string; is_active: boolean; url: string };
  product: null | { id: number; name: string; slug: string; price: string; image: OnboardingImage | null; status: string; moderation_status: string; visible: boolean; url: string };
};

export const ONBOARDING_API = '/api/seller/onboarding';
export const onboardingClient = {
  get: () => HttpClient.get<OnboardingState>(ONBOARDING_API),
  resume: () => HttpClient.post<OnboardingState>(`${ONBOARDING_API}/resume`, {}),
  shop: (name: string) => HttpClient.patch<OnboardingState>(`${ONBOARDING_API}/shop`, { name }),
  draft: (draft: ProductDraft, version: number) => HttpClient.patch<{ version: number }>(`${ONBOARDING_API}/draft`, { draft, version }),
  product: (draft: ProductDraft, request_key: string) => HttpClient.post<OnboardingState>(`${ONBOARDING_API}/product`, { ...draft, request_key }),
  skip: () => HttpClient.post(`${ONBOARDING_API}/skip`, {}),
  claimEvents: () => HttpClient.post<Array<{ event: string }>>(`${ONBOARDING_API}/events/claim`, {}),
};

export function sellerEntry(permissions: string[] = []) {
  return permissions.includes('store_owner') && !permissions.includes('super_admin') ? '/seller/entry' : '/';
}

export function onboardingError(error: any, fallback = 'Не удалось сохранить изменения. Попробуйте ещё раз.') {
  const status = error?.response?.status;
  if (status === 403 && error?.response?.data?.message === 'SELLER_SELF_REGISTRATION_REQUIRED') return 'Первый товар должен опубликовать сам продавец. Выйдите из режима «Войти как пользователь» и войдите в аккаунт продавца обычным способом.';
  if (status === 409 && error?.response?.data?.message === 'EMAIL_NOT_VERIFIED') return 'Подтвердите email перед публикацией. Данные товара сохранены.';
  if (status === 409) return 'Данные изменились в другой вкладке. Обновите страницу, чтобы продолжить.';
  if (status === 401) return 'Сессия закончилась. Войдите снова — сохранённые данные останутся.';
  if (status === 403) return 'Действие недоступно для этого аккаунта. Обратитесь в поддержку.';
  if (status === 422) {
    const data = error.response.data;
    const fields = data.errors || data;
    if (fields.price) return 'Укажите цену больше нуля, не более двух знаков после запятой.';
    if (fields.image) return 'Добавьте фотографию товара в формате JPG, PNG или WEBP.';
    if (fields.category_id || fields.type_id) return 'Выберите категорию товара.';
    if (fields.name) return 'Введите название длиной до 255 символов.';
    if (fields.status) return 'Публикация временно недоступна. Обратитесь в поддержку.';
  }
  return fallback;
}
