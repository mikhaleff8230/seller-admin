import SellerDashboard from '@/components/seller-dashboard';
import ShopLayout from '@/components/layouts/shop';
import { adminOwnerAndStaffOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticPaths } from 'next';

export default function ShopPage() {
  return <SellerDashboard />;
}

ShopPage.Layout = ShopLayout;
ShopPage.authenticate = {
  permissions: adminOwnerAndStaffOnly,
};

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['form', 'common', 'table'])),
  },
});

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [],
  fallback: 'blocking',
});
