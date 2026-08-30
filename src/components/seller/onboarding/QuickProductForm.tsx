import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCategoriesQuery } from '@/data/category';
import { productValidationSchema } from '@/components/product/product-validation-schema';
import { onboardingClient, onboardingError, OnboardingState, ProductDraft } from '@/data/seller-onboarding';
import ProductImageUploader from './ProductImageUploader';
import CategorySelect from './CategorySelect';
import styles from './onboarding.module.css';

export default function QuickProductForm({ state, onSaved, onBack }: {
  state: OnboardingState; onSaved: (state: OnboardingState) => void; onBack: () => void;
}) {
  const [draft, setDraft] = useState<ProductDraft>(state.draft);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [error, setError] = useState('');
  const version = useRef(state.draft_version);
  const saved = useRef(JSON.stringify(state.draft));
  const pending = useRef<Promise<void>>(Promise.resolve());
  const submitting = useRef(false);
  const { categories, loading, error: categoryError, refetch } = useCategoriesQuery({ limit: 999, language: 'ru' });

  const persist = (value: ProductDraft) => {
    const json = JSON.stringify(value);
    const task = pending.current.catch(() => undefined).then(async () => {
      if (json === saved.current || submitting.current) return;
      setSaveStatus('Сохраняем черновик…');
      try {
        const result = await onboardingClient.draft(value, version.current);
        version.current = result.version; saved.current = json; setSaveStatus('Черновик сохранён');
      } catch (error) { setSaveStatus('Черновик не сохранён'); throw error; }
    });
    pending.current = task;
    return task;
  };
  useEffect(() => {
    if (JSON.stringify(draft) === saved.current || busy) return;
    const timer = window.setTimeout(() => { persist(draft).catch((e) => setError(onboardingError(e))); }, 650);
    return () => window.clearTimeout(timer);
  }, [draft, busy]);
  const change = (key: keyof ProductDraft, value: any) => setDraft((d) => ({ ...d, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy || uploading) return;
    setError('');
    try { await productValidationSchema.pick(['name']).validate({ name: draft.name?.trim() }); }
    catch { setError('Введите название товара.'); return; }
    if (!draft.image) { setError('Добавьте фотографию товара.'); return; }
    if (!draft.category_id) { setError('Выберите категорию товара.'); return; }
    if (!/^\d{1,8}([.,]\d{1,2})?$/.test(draft.price || '') || Number(draft.price?.replace(',', '.')) <= 0) {
      setError('Укажите цену больше нуля, не более двух знаков после запятой.'); return;
    }
    setBusy(true);
    try { await persist(draft); submitting.current = true; onSaved(await onboardingClient.product(draft, state.product_request_key)); }
    catch (error) { setError(onboardingError(error, 'Не удалось опубликовать товар. Ваши данные сохранены — попробуйте ещё раз.')); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <>
    <p className={styles.eyebrow}>Шаг 2 из 2 · {state.shop.name}</p>
    <h1 className={styles.title}>Ваш первый товар.<br />Начнём с него.</h1>
    <p className={styles.subtitle}>Добавьте фото и пару деталей —<br />остальное можно заполнить позже.</p>
    <form className={styles.form} onSubmit={submit}>
      <ProductImageUploader value={draft.image} onChange={(image) => change('image', image)} onBusy={setUploading} disabled={busy} />
      <div><label htmlFor="product-name" className={styles.label}>Название товара</label>
        <input id="product-name" className={styles.input} placeholder="Например, керамическая ваза" value={draft.name || ''} onChange={(e) => change('name', e.target.value)} maxLength={255} required disabled={busy} />
      </div>
      <div className={styles.row}>
        <div><label htmlFor="product-price" className={styles.label}>Цена, ₽</label>
          <input id="product-price" className={styles.input} inputMode="decimal" placeholder="0" value={draft.price || ''} onChange={(e) => change('price', e.target.value)} maxLength={12} required disabled={busy} />
        </div>
        <div><label htmlFor="product-category" className={styles.label}>Категория</label>
          <CategorySelect categories={categories} value={draft.category_id} onChange={(value) => change('category_id', value)} loading={loading} disabled={busy} />
          {categoryError && <button type="button" className={styles.quiet} onClick={() => refetch()}>Не загрузились категории. Повторить</button>}
        </div>
      </div>
      <p className={styles.helper}>Публикуем 1 штуку. Количество, варианты и подробное описание можно изменить в редакторе товара.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {error.startsWith('Подтвердите email') && <Link className={styles.secondary} href="/verify-email">Подтвердить email</Link>}
      <button className={styles.button} disabled={busy || uploading || loading || !state.shop.is_active}>
        {busy ? <><i className={styles.spinner} />Публикуем…</> : <>Опубликовать товар <span aria-hidden>→</span></>}
      </button>
      {!state.shop.is_active && <p className={styles.error}>Магазин отключён. Обратитесь в поддержку перед публикацией.</p>}
      <p className={styles.save} aria-live="polite">{saveStatus}</p>
    </form>
    <button className={styles.quiet} disabled={busy || uploading} onClick={async () => {
      try { await persist(draft); onBack(); } catch (e) { setError(onboardingError(e)); }
    }}>← Изменить название магазина</button>
  </>;
}
