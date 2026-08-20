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
    || shops.find((shop: any) => shop.slug === routeShopSlug)
    || shops[0];
  const shopSlug = selectedShop?.slug;
  const promotionHref = selectedShop ? `${Routes.promotion}?shop_id=${selectedShop.id}` : Routes.promotion;
  const shopHref = (path = '') => shopSlug ? `/${shopSlug}${path}` : Routes.dashboard;
  const items = [
    { href: Routes.dashboard, label: 'Мои магазины', icon: 'MyShopIcon' },
    { href: promotionHref, activeHref: Routes.promotion, label: 'Продвижение', icon: 'DashboardIcon' },
    { href: Routes.paymentProfiles, label: 'Платёжные профили СБП', icon: 'TaxesIcon' },
    { href: shopHref(), label: 'Панель продавца', icon: 'DashboardIcon', requiresShop: true },
    { href: shopHref(Routes.product.list), label: 'Товары', icon: 'ProductsIcon', requiresShop: true },
    { href: shopHref(Routes.order.list), label: 'Заказы', icon: 'OrdersIcon', requiresShop: true },
    { href: shopHref(Routes.reviews.list), label: 'Отзывы', icon: 'ReviewIcon', requiresShop: true },
    { href: shopHref(Routes.question.list), label: 'Сообщения', icon: 'QuestionIcon', requiresShop: true },
    { href: shopHref('/billing'), label: 'Баланс и платежи', icon: 'TaxesIcon', requiresShop: true },
    { href: shopHref(Routes.staff.list), label: 'Менеджеры', icon: 'UsersIcon', requiresShop: true },
    { href: Routes.xmlImport.list, label: 'Импорт XML / CSV', icon: 'ImportIcon' },
  ];

  return (
    <nav className="mt-4 w-full border-t border-gray-100 pt-3" aria-label="Меню продавца">
      <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Кабинет продавца
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const unavailable = item.requiresShop && !shopSlug;
          const activePath = item.activeHref || item.href;
          const active = !unavailable && (activePath === '/'
            ? router.pathname === '/'
            : router.pathname.startsWith(activePath.split('?')[0]));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={unavailable ? 'Сначала создайте или привяжите магазин' : undefined}
              className={cn(
                'flex items-center rounded-lg px-2.5 py-1.5 text-sm font-medium leading-5 transition-colors',
                active ? 'bg-[#232323] text-white' : 'text-body-dark hover:bg-gray-100',
                unavailable && 'opacity-60'
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
