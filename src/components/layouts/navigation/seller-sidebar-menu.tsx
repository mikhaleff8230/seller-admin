import { useRouter } from 'next/router';
import Link from '@/components/ui/link';
import { getIcon } from '@/utils/get-icon';
import * as sidebarIcons from '@/components/icons/sidebar';
import { Routes } from '@/config/routes';
import cn from 'classnames';
import { useMeQuery } from '@/data/user';
import { HttpClient } from '@/data/client/http-client';
import { useEffect, useMemo, useState } from 'react';

export default function SellerSidebarMenu() {
  const router = useRouter();
  const { data: me } = useMeQuery();
  const [availableShops, setAvailableShops] = useState<any[]>([]);
  const selectedShopId = typeof router.query.shop_id === 'string' ? router.query.shop_id : '';
  const routeShopSlug = typeof router.query.shop === 'string' ? router.query.shop : '';

  useEffect(() => {
    if (!me) return;

    const userShops = [
      ...(Array.isArray(me.shops) ? me.shops : []),
      ...(me.managed_shop ? [me.managed_shop] : []),
    ];
    if (userShops.length) {
      setAvailableShops(userShops);
      return;
    }

    HttpClient.get<any>('/my-shops')
      .then((response) => {
        const shops = response?.data || response || [];
        setAvailableShops(Array.isArray(shops) ? shops : []);
      })
      .catch(() => setAvailableShops([]));
  }, [me]);

  const shops = useMemo(
    () => Array.from(new Map(availableShops.map((shop) => [String(shop.id), shop])).values()),
    [availableShops]
  );
  const selectedShop = shops.find((shop: any) => String(shop.id) === selectedShopId)
    || shops.find((shop: any) => shop.slug === routeShopSlug);
  const shopSlug = selectedShop?.slug;
  const promotionHref = selectedShop ? `${Routes.promotion}?shop_id=${selectedShop.id}` : Routes.promotion;
  const items = [
    { href: Routes.dashboard, label: 'Мои магазины', icon: 'MyShopIcon' },
    { href: promotionHref, activeHref: Routes.promotion, label: 'Продвижение', icon: 'DashboardIcon' },
    { href: Routes.paymentProfiles, label: 'Платёжные профили СБП', icon: 'TaxesIcon' },
    ...(shopSlug ? [
      { href: `/${shopSlug}`, label: 'Панель продавца', icon: 'DashboardIcon' },
      { href: `/${shopSlug}${Routes.product.list}`, label: 'Товары', icon: 'ProductsIcon' },
      { href: `/${shopSlug}${Routes.order.list}`, label: 'Заказы', icon: 'OrdersIcon' },
      { href: Routes.chat, label: 'Чат', icon: 'ChatIcon' },
      { href: `/${shopSlug}${Routes.reviews.list}`, label: 'Отзывы', icon: 'ReviewIcon' },
      { href: `/${shopSlug}${Routes.question.list}`, label: 'Вопросы', icon: 'QuestionIcon' },
      { href: `/${shopSlug}/billing`, label: 'Баланс и платежи', icon: 'TaxesIcon' },
      { href: `/${shopSlug}${Routes.staff.list}`, label: 'Менеджеры', icon: 'UsersIcon' },
    ] : []),
    { href: Routes.xmlImport.list, label: 'Импорт XML / CSV', icon: 'ImportIcon' },
  ];

  return (
    <nav className="mt-4 w-full border-t border-gray-100 pt-3" aria-label="Меню продавца">
      <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Кабинет продавца
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const activePath = item.activeHref || item.href;
          const active = activePath === '/'
            ? router.pathname === '/'
            : router.pathname.startsWith(activePath.split('?')[0]);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center rounded-lg px-2.5 py-1.5 text-sm font-medium leading-5 transition-colors',
                active ? 'bg-[#232323] text-white' : 'text-body-dark hover:bg-gray-100'
              )}
            >
              {getIcon({
                iconList: sidebarIcons,
                iconName: item.icon,
                className: 'me-2.5 h-4 w-4 shrink-0',
              })}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
