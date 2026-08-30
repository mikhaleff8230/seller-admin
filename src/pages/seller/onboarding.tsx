import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import SellerOnboarding from '@/components/seller/onboarding/SellerOnboarding';

export default function SellerOnboardingPage() { return <SellerOnboarding />; }
SellerOnboardingPage.authenticate = { permissions: ['store_owner'] };
export const getStaticProps = async ({ locale }: { locale: string }) => ({ props: { ...(await serverSideTranslations(locale || 'ru', ['common', 'form'])) } });
