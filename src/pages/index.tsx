import dynamic from 'next/dynamic';
import type { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import {
  allowedRoles,
  getAuthCredentials,
  hasAccess,
  isAuthenticated,
} from '@/utils/auth-utils';
import { SUPER_ADMIN } from '@/utils/constants';
import AppLayout from '@/components/layouts/app';
import { Routes } from '@/config/routes';
import { Config } from '@/config';

const AdminDashboard = dynamic(() => import('@/components/dashboard/admin'));
const OwnerDashboard = dynamic(() => import('@/components/dashboard/owner'));

export default function Dashboard({
  userPermissions,
}: {
  userPermissions: string[];
}) {
  if (userPermissions?.includes(SUPER_ADMIN)) {
    return <AdminDashboard />;
  }
  return <OwnerDashboard />;
}

Dashboard.Layout = AppLayout;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { locale } = ctx;
  // TODO: Improve it
  const generateRedirectUrl =
    locale !== Config.defaultLanguage
      ? `/${locale}${Routes.login}`
      : Routes.login;
  const { token, permissions } = getAuthCredentials(ctx);
  if (
    !isAuthenticated({ token, permissions }) ||
    !hasAccess(allowedRoles, permissions)
  ) {
    return {
      redirect: {
        destination: generateRedirectUrl,
        permanent: false,
      },
    };
  }
  if (locale) {
    if (permissions?.includes('store_owner') && !permissions.includes(SUPER_ADMIN) && ctx.query.onboarding !== 'skip') {
      try {
        const base = process.env.NEXT_PUBLIC_REST_API_ENDPOINT || process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(`${base?.replace(/\/$/, '')}/api/seller/onboarding`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (!response.ok) return { redirect: { destination: '/seller/entry', permanent: false } };
        const state = await response.json();
        if (state.status !== 'completed') return { redirect: { destination: '/seller/onboarding', permanent: false } };
      } catch {
        return { redirect: { destination: '/seller/entry', permanent: false } };
      }
    }
    return {
      props: {
        ...(await serverSideTranslations(locale, [
          'common',
          'table',
          'widgets',
        ])),
        userPermissions: permissions,
      },
    };
  }
  return {
    props: {
      userPermissions: permissions,
    },
  };
};
