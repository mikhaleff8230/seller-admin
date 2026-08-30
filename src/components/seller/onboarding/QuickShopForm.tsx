import { useState } from 'react';
import { shopValidationSchema } from '@/components/shop/shop-validation-schema';
import { onboardingClient, onboardingError, OnboardingState } from '@/data/seller-onboarding';
import styles from './onboarding.module.css';

export default function QuickShopForm({ state, onSaved }: { state: OnboardingState; onSaved: (state: OnboardingState) => void }) {
  const [name, setName] = useState(state.shop.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <>
    <p className={styles.eyebrow}>Шаг 1 из 2</p>
    <h1 className={styles.title}>Как назовём<br />ваш магазин?</h1>
    <p className={styles.subtitle}>Пусть покупатели запомнят вас.<br />Остальные детали настроим позже.</p>
    <form className={styles.form} onSubmit={async (event) => {
      event.preventDefault(); if (busy) return;
      setError('');
      try { await shopValidationSchema.pick(['name']).validate({ name: name.trim() }); }
      catch { setError('Введите название магазина.'); return; }
      setBusy(true);
      try { onSaved(await onboardingClient.shop(name.trim())); }
      catch (error) { setError(onboardingError(error)); }
      finally { setBusy(false); }
    }}>
      <div><label className={styles.label} htmlFor="shop-name">Название магазина</label>
        <input id="shop-name" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={255} required autoComplete="organization" disabled={busy} />
        <p className={styles.helper}>Вы сможете изменить название в любое время.</p>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.button} disabled={busy || !name.trim()}>{busy ? <><i className={styles.spinner} />Сохраняем…</> : <>Продолжить <span aria-hidden>→</span></>}</button>
    </form>
  </>;
}
