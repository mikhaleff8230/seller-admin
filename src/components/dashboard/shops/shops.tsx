import ErrorMessage from '@/components/ui/error-message';
import Loader from '@/components/ui/loader/loader';
import { useTranslation } from 'next-i18next';
import { useMeQuery } from '@/data/user';
import ShopCard from '@/components/shop/shop-card';
import { NoShop } from '@/components/icons/no-shop';
import { adminOnly, getAuthCredentials, hasAccess } from '@/utils/auth-utils';
import Link from '@/components/ui/link';
import { Routes } from '@/config/routes';

const ShopList = () => {
  const { t } = useTranslation();
  const { data, isLoading: loading, error } = useMeQuery();
  const { permissions } = getAuthCredentials();
  let permission = hasAccess(adminOnly, permissions);

  if (loading) return <Loader text={t('common:text-loading')} />;
  if (error) return <ErrorMessage message={error.message} />;
  return (
    <>
      {permission ? (
        <div className="mb-5 border-b border-dashed border-border-base pb-8 sm:mb-8">
          <h1 className="text-lg font-semibold text-heading">
            {t('common:sidebar-nav-item-my-shops')}
          </h1>
        </div>
      ) : (
        ''
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 3xl:grid-cols-5">
        {data?.shops?.map((myShop: any, idx: number) => (
          <ShopCard shop={myShop} key={idx} />
        ))}
      </div>
      {!data?.managed_shop && !data?.shops?.length ? (
        <section className="relative isolate w-full overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-600 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14 lg:min-h-[360px] lg:px-14 lg:py-16">
          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-28 right-20 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative z-10 max-w-2xl text-center sm:text-left">
            <span className="mb-4 inline-flex rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur sm:text-sm">
              Начните продавать на SANCAN
            </span>
            <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Создайте свой первый магазин
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/85 sm:mx-0 sm:text-lg">
              Добавьте информацию о магазине, загрузите товары и начните получать заказы от покупателей.
            </p>
            <Link
              href={Routes.shop.create}
              className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-[#232323] px-7 py-4 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-black sm:w-auto sm:text-lg"
            >
              Создать первый магазин
            </Link>
          </div>
          <div className="pointer-events-none absolute -bottom-12 -right-10 hidden w-[380px] opacity-30 lg:block xl:right-2 xl:w-[440px]">
            <NoShop />
          </div>
        </section>
      ) : null}
      {!!data?.managed_shop ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5">
          <ShopCard shop={data?.managed_shop} />
        </div>
      ) : null}
    </>
  );
};

export default ShopList;
