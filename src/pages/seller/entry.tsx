import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { onboardingClient, onboardingError } from '@/data/seller-onboarding';
import OnboardingLayout from '@/components/seller/onboarding/OnboardingLayout';
import { flushOnboardingGoals } from '@/lib/metrika';
import styles from '@/components/seller/onboarding/onboarding.module.css';

export default function SellerEntry() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError('');
    onboardingClient.get().then((state) => {
      if (cancelled) return;
      flushOnboardingGoals();
      router.replace(state.status === 'completed' ? '/' : '/seller/onboarding');
    }).catch((error) => { if (!cancelled) setError(onboardingError(error)); });
    return () => { cancelled = true; };
  }, [retry]);
  return <OnboardingLayout>{error ? <><p role="alert" className={styles.error}>{error}</p><button className={styles.button} onClick={() => setRetry((value) => value + 1)}>Попробовать ещё раз</button></> : <p role="status" className={styles.subtitle}>Открываем ваш магазин…</p>}</OnboardingLayout>;
}
SellerEntry.authenticate = { permissions: ['store_owner'] };
export const getStaticProps = async ({ locale }: { locale: string }) => ({ props: { ...(await serverSideTranslations(locale || 'ru', ['common', 'form'])) } });
