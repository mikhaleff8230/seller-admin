import { useRouter } from 'next/router';
import Link from '@/components/ui/link';
import { getIcon } from '@/utils/get-icon';
import * as sidebarIcons from '@/components/icons/sidebar';
import { Routes } from '@/config/routes';
import cn from 'classnames';
import { useMeQuery } from '@/data/user';

export default function SellerSidebarMenu() {
  const router = useRouter();
  const { data: me } = useMeQuery();
  const selectedShopId = typeof router.query.shop_id === 'string' ? router.query.shop_id : '';
  const shops = me?.shops || [];
  const selectedShop = shops.find((shop: any) => String(shop.id) === selectedShopId) || shops[0];
  const shopSlug = selectedShop?.slug;
  const promotionHref = selectedShop ? `${Routes.promotion}?shop_id=${selectedShop.id}` : Routes.promotion;
  const items = [
    { href: Routes.dashboard, label: 'Мои магазины', icon: 'MyShopIcon' },
    { href: promotionHref, activeHref: Routes.promotion, label: 'Продвижение', icon: 'DashboardIcon' },
    { href: Routes.paymentProfiles, label: 'Платёжные профили СБП', icon: 'TaxesIcon' },
    { href: Routes.xmlImport.list, label: 'Импорт XML / CSV', icon: 'ImportIcon' },
    ...(shopSlug ? [
      { href: `/${shopSlug}`, label: 'Панель продавца', icon: 'DashboardIcon' },
      { href: `/${shopSlug}${Routes.product.list}`, label: 'Товары', icon: 'ProductsIcon' },
      { href: `/${shopSlug}${Routes.order.list}`, label: 'Заказы', icon: 'OrdersIcon' },
      { href: `/${shopSlug}${Routes.reviews.list}`, label: 'Отзывы', icon: 'ReviewIcon' },
      { href: `/${shopSlug}${Routes.question.list}`, label: 'Сообщения', icon: 'QuestionIcon' },
      { href: `/${shopSlug}/billing`, label: 'Баланс и платежи', icon: 'TaxesIcon' },
      { href: `/${shopSlug}${Routes.staff.list}`, label: 'Сотрудники', icon: 'UsersIcon' },
    ] : []),
  ];

  return (
    <nav className="mt-7 w-full border-t border-gray-100 pt-4" aria-label="Меню продавца">
      <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Кабинет продавца
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const activePath = item.activeHref || item.href;
          const active = activePath === '/'
            ? router.pathname === '/'
            : router.pathname.startsWith(activePath.split('?')[0]);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-[#232323] text-white' : 'text-body-dark hover:bg-gray-100'
              )}
            >
              {getIcon({
                iconList: sidebarIcons,
                iconName: item.icon,
                className: 'me-3 h-5 w-5 shrink-0',
              })}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
