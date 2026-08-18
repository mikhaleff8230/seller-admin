import { useRouter } from 'next/router';
import Link from '@/components/ui/link';
import { getIcon } from '@/utils/get-icon';
import * as sidebarIcons from '@/components/icons/sidebar';
import { Routes } from '@/config/routes';
import cn from 'classnames';

const items = [
  { href: Routes.dashboard, label: 'Мои магазины', icon: 'MyShopIcon' },
  { href: Routes.promotion, label: 'Продвижение', icon: 'DashboardIcon' },
  { href: Routes.profileUpdate, label: 'Профиль продавца', icon: 'UsersIcon' },
  { href: Routes.billing.list, label: 'Баланс и платежи', icon: 'TaxesIcon' },
  { href: Routes.paymentProfiles, label: 'Платёжные профили', icon: 'TaxesIcon' },
  { href: Routes.xmlImport.list, label: 'Импорт XML / CSV', icon: 'ImportIcon' },
];

export default function SellerSidebarMenu() {
  const router = useRouter();

  return (
    <nav className="mt-7 w-full border-t border-gray-100 pt-4" aria-label="Меню продавца">
      <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Кабинет продавца
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const active = item.href === '/'
            ? router.pathname === '/'
            : router.pathname.startsWith(item.href);
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
