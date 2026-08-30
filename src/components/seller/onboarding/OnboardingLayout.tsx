import Head from 'next/head';
import Logo from '@/components/ui/logo';
import styles from './onboarding.module.css';

export default function OnboardingLayout({ children, step }: { children: React.ReactNode; step?: 1 | 2 }) {
  return <div className={styles.page}>
    <Head><title>Откройте магазин — SANCAN</title><meta name="robots" content="noindex,nofollow" /></Head>
    <Logo href={process.env.NEXT_PUBLIC_SHOP_URL || 'https://sancan.ru'} className={styles.brand} aria-label="SANCAN — главная" />
    <main className={styles.content}>
      {step && <nav className={styles.progress} aria-label={`Шаг ${step} из 2`}>
        <span className={styles.active} aria-current={step === 1 ? 'step' : undefined}><b>{step === 2 ? '✓' : '1'}</b>Магазин</span>
        <i className={styles.line} />
        <span className={step === 2 ? styles.active : ''} aria-current={step === 2 ? 'step' : undefined}><b>2</b>Первый товар</span>
      </nav>}
      {children}
    </main>
    <p className={styles.footer}>Ваше дело начинается с первого товара.</p>
  </div>;
}
