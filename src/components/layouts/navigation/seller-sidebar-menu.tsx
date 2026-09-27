import { useRouter } from 'next/router';
import Link from '@/components/ui/link';
import { getIcon } from '@/utils/get-icon';
import * as sidebarIcons from '@/components/icons/sidebar';
import { Routes } from '@/config/routes';
import cn from 'classnames';
import { useMeQuery } from '@/data/user';
import { HttpClient } from '@/data/client/http-client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';

export default function SellerSidebarMenu() {
  const router = useRouter();
  const { data: me } = useMeQuery();
  const [availableShops, setAvailableShops] = useState<any[]>([]);
  const [rememberedShopId, setRememberedShopId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  useEffect(() => {
    setRememberedShopId(window.localStorage.getItem('sancan.active_shop_id') || '');
  }, []);

  const selectedShop = shops.find((shop: any) => String(shop.id) === selectedShopId)
    || shops.find((shop: any) => shop.slug === routeShopSlug)
    || shops.find((shop: any) => String(shop.id) === rememberedShopId)
    || shops[0];
  const shopSlug = selectedShop?.slug;
  const promotionHref = selectedShop ? `${Routes.promotion}?shop_id=${selectedShop.id}` : Routes.promotion;
  const chatHref = selectedShop ? `${Routes.chat}?shop_id=${selectedShop.id}` : Routes.chat;
  const paymentProfilesHref = selectedShop ? `${Routes.paymentProfiles}?shop_id=${selectedShop.id}` : Routes.paymentProfiles;
  const xmlImportHref = selectedShop ? `${Routes.xmlImport.list}?shop_id=${selectedShop.id}` : Routes.xmlImport.list;

  useEffect(() => {
    if (!selectedShop?.id) return;
    const value = String(selectedShop.id);
    window.localStorage.setItem('sancan.active_shop_id', value);
    if (value !== rememberedShopId) setRememberedShopId(value);
  }, [selectedShop?.id, rememberedShopId]);
  const { data: chatData } = useQuery(
    ['chat-conversations', 'navbar'],
    () => HttpClient.get<any>('/chat/conversations'),
    { refetchInterval: 30_000 }
  );
  const conversations = chatData?.data || chatData?.conversations || [];
  const unreadMessages = Array.isArray(conversations)
    ? conversations.reduce((total: number, conversation: any) => total + Number(conversation?.unseen || 0), 0)
    : 0;
  const settingsActive = router.pathname === '/[shop]/edit'
    || router.pathname.includes('/staffs')
    || router.pathname === Routes.paymentProfiles
    || router.pathname === Routes.xmlImport.list;

  useEffect(() => {
    if (settingsActive) setSettingsOpen(true);
  }, [settingsActive]);

  const items = shopSlug ? [
    { href: `/${shopSlug}`, label: 'Дашборд', icon: 'DashboardIcon', active: router.pathname === '/[shop]' },
    { href: `/${shopSlug}${Routes.product.list}`, label: 'Товары', icon: 'ProductsIcon', active: router.pathname.includes('/products') },
    { href: `/${shopSlug}${Routes.order.list}`, label: 'Заказы', icon: 'OrdersIcon', active: router.pathname.includes('/orders') },
    { href: chatHref, label: 'Чаты', icon: 'ChatIcon', active: router.pathname === Routes.chat, badge: unreadMessages },
    { href: promotionHref, label: 'Продвижение', icon: 'DashboardIcon', active: router.pathname === Routes.promotion && router.query.view !== 'statistics' },
    { href: `${promotionHref}&view=statistics`, label: 'Статистика', icon: 'OrdersIcon', active: router.pathname === Routes.promotion && router.query.view === 'statistics' },
    { href: `/${shopSlug}${Routes.reviews.list}`, label: 'Отзывы', icon: 'ReviewIcon', active: router.pathname.includes('/reviews') },
    { href: `/${shopSlug}${Routes.question.list}`, label: 'Вопросы', icon: 'QuestionIcon', active: router.pathname.includes('/questions') },
    { href: `/${shopSlug}/billing`, label: 'Баланс', icon: 'TaxesIcon', active: router.pathname.includes('/billing') },
  ] : [
    { href: Routes.dashboard, label: 'Мои магазины', icon: 'MyShopIcon', active: router.pathname === Routes.dashboard },
    { href: Routes.promotion, label: 'Продвижение', icon: 'DashboardIcon', active: router.pathname === Routes.promotion },
    { href: Routes.paymentProfiles, label: 'Платёжные профили СБП', icon: 'TaxesIcon', active: router.pathname === Routes.paymentProfiles },
    { href: Routes.xmlImport.list, label: 'Импорт XML / CSV', icon: 'ImportIcon', active: router.pathname === Routes.xmlImport.list },
  ];
  const settingsItems = shopSlug ? [
    { href: `/${shopSlug}/edit`, label: 'Настройки магазина', icon: 'ShopIcon', active: router.pathname === '/[shop]/edit' },
    { href: paymentProfilesHref, label: 'Профиль СБП', icon: 'TaxesIcon', active: router.pathname === Routes.paymentProfiles },
    { href: `/${shopSlug}${Routes.staff.list}`, label: 'Менеджеры', icon: 'UsersIcon', active: router.pathname.includes('/staffs') },
    { href: xmlImportHref, label: 'Импорт XML / CSV', icon: 'ImportIcon', active: router.pathname === Routes.xmlImport.list },
  ] : [];

  return (
    <nav className="mt-4 flex w-full flex-1 flex-col border-t border-gray-100 pt-4" aria-label="Меню продавца">
      <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.09em] text-[#a0a8b8]">
        Кабинет продавца
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex min-h-[42px] items-center rounded-xl px-3 text-sm font-semibold leading-5 transition-all',
                item.active ? 'bg-[#edf4ff] text-[#236ee8]' : 'text-[#59647a] hover:bg-[#f5f7fa] hover:text-[#252b3d]'
              )}
            >
              {getIcon({
                iconList: sidebarIcons,
                iconName: item.icon,
                className: 'me-2.5 h-4 w-4 shrink-0',
              })}
              <span className="flex-1">{item.label}</span>
              {!!item.badge && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{item.badge > 99 ? '99+' : item.badge}</span>
              )}
            </Link>
          );
        })}
        {shopSlug && (
          <div>
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-expanded={settingsOpen}
              className={cn(
                'flex min-h-[42px] w-full items-center rounded-xl px-3 text-sm font-semibold leading-5 transition-all',
                settingsActive ? 'bg-[#edf4ff] text-[#236ee8]' : 'text-[#59647a] hover:bg-[#f5f7fa] hover:text-[#252b3d]'
              )}
            >
              {getIcon({ iconList: sidebarIcons, iconName: 'SettingsIcon', className: 'me-2.5 h-4 w-4 shrink-0' })}
              <span className="flex-1 text-left">Настройки</span>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn('h-4 w-4 transition-transform', settingsOpen && 'rotate-180')}><path d="m5 7.5 5 5 5-5" /></svg>
            </button>
            {settingsOpen && (
              <div className="mt-1 space-y-0.5 border-l border-[#e3e8f0] pl-3 ml-5">
                {settingsItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      'flex min-h-[36px] items-center rounded-lg px-2.5 text-xs font-semibold transition-colors',
                      item.active ? 'bg-[#f2f6fd] text-[#236ee8]' : 'text-[#707b91] hover:bg-[#f7f8fa] hover:text-[#30374b]'
                    )}
                  >
                    {getIcon({ iconList: sidebarIcons, iconName: item.icon, className: 'me-2 h-3.5 w-3.5 shrink-0' })}
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {shopSlug && (
        <div className="mt-auto pt-6">
          <div className="overflow-hidden rounded-[18px] bg-gradient-to-br from-[#eef4ff] to-[#e4efff] p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#2f7df4] shadow-sm">
              {getIcon({ iconList: sidebarIcons, iconName: 'DashboardIcon', className: 'h-4 w-4' })}
            </div>
            <strong className="mt-3 block text-sm leading-5 text-[#20263a]">Больше возможностей с продвижением</strong>
            <p className="mt-1 text-[11px] leading-4 text-[#71809a]">Получайте больше просмотров и сообщений.</p>
            <Link href={promotionHref} className="mt-4 flex h-9 items-center justify-center rounded-xl bg-[#2f7df4] text-xs font-bold text-white transition hover:bg-[#236bd5]">Запустить рекламу</Link>
          </div>
          <Link href={Routes.dashboard} className="mt-3 flex items-center justify-center text-[11px] font-semibold text-[#8d96a8] hover:text-[#556176]">← Мои магазины</Link>
        </div>
      )}
    </nav>
  );
}
