import { useEffect, useState } from 'react';
import { onboardingClient, onboardingError, OnboardingState } from '@/data/seller-onboarding';
import { flushOnboardingGoals } from '@/lib/metrika';
import OnboardingLayout from './OnboardingLayout';
import QuickShopForm from './QuickShopForm';
import QuickProductForm from './QuickProductForm';
import SuccessStep from './SuccessStep';
import styles from './onboarding.module.css';

export default function SellerOnboarding() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [back, setBack] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError('');
    onboardingClient.resume().then((value) => { if (!cancelled) setState(value); }).catch((error) => { if (!cancelled) setError(onboardingError(error)); });
    return () => { cancelled = true; };
  }, [retry]);
  useEffect(() => {
    if (!state) return;
    let attempts = 0;
    const flush = async () => {
      if (await flushOnboardingGoals() || ++attempts >= 10) window.clearInterval(timer);
    };
    const timer = window.setInterval(flush, 3000);
    flush();
    return () => window.clearInterval(timer);
  }, [state]);
  const saved = (value: OnboardingState) => { setState(value); setBack(false); window.scrollTo({ top: 0 }); };
  const success = state?.product || state?.status === 'completed';
  return <OnboardingLayout step={state && !success ? (back || state.step === 'shop' ? 1 : 2) : undefined}>
    {!state && !error && <p role="status" className={styles.subtitle}>Готовим ваш магазин…</p>}
    {error && <><p className={styles.error} role="alert">{error}</p><button className={styles.button} onClick={() => setRetry((value) => value + 1)}>Попробовать ещё раз</button></>}
    {state && (success ? <SuccessStep state={state} /> : back || state.step === 'shop'
      ? <QuickShopForm state={state} onSaved={saved} />
      : <QuickProductForm state={state} onSaved={saved} onBack={() => setBack(true)} />)}
  </OnboardingLayout>;
}
