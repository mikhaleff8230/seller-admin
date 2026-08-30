import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import RegistrationForm from '@/components/auth/registration-form';
import { useRouter } from 'next/router';
import { getAuthCredentials, isAuthenticated } from '@/utils/auth-utils';
import OnboardingLayout from '@/components/seller/onboarding/OnboardingLayout';
import styles from '@/components/seller/onboarding/onboarding.module.css';
import { useEffect } from 'react';
import { sellerEntry } from '@/data/seller-onboarding';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale!, ['common', 'form'])),
  },
});

export default function RegisterPage() {
  const router = useRouter();
  const { token, permissions } = getAuthCredentials();
  useEffect(() => {
    if (isAuthenticated({ token, permissions })) router.replace(sellerEntry(permissions || []));
  }, [token]);
  return (
    <OnboardingLayout>
      <p className={styles.eyebrow}>Для тех, кто создаёт и продаёт</p>
      <h1 className={styles.title}>Откройте магазин<br />на SANCAN</h1>
      <p className={styles.subtitle}>Начните продавать за несколько минут</p>
      <RegistrationForm />
    </OnboardingLayout>
  );
}
