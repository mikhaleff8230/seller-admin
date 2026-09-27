import Logo from '@/components/ui/logo';
import { useUI } from '@/contexts/ui.context';
import AuthorizedMenu from './authorized-menu';
import LinkButton from '@/components/ui/link-button';
import { NavbarIcon } from '@/components/icons/navbar-icon';
import { motion } from 'framer-motion';
import { useTranslation } from 'next-i18next';
import { Routes } from '@/config/routes';
import {
  adminAndOwnerOnly,
  adminOnly,
  getAuthCredentials,
  hasAccess,
} from '@/utils/auth-utils';
import LanguageSwitcher from './language-switer';
import { Config } from '@/config';
import { useSellerBalanceQuery } from '@/data/seller-balance';
import { WalletIcon } from '@/components/icons/wallet-icon';
import DepositBalanceModal from '@/components/billing/deposit-balance-modal';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { HttpClient } from '@/data/client/http-client';

const Navbar = () => {
	const { t } = useTranslation();
	const { toggleSidebar } = useUI();
	const router = useRouter();
	const [search, setSearch] = useState('');

	const { permissions } = getAuthCredentials();
  const { balance, isLoading: isBalanceLoading } = useSellerBalanceQuery();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const { data: chatData } = useQuery(
    ['chat-conversations', 'navbar'],
    () => HttpClient.get<any>('/chat/conversations'),
    { refetchInterval: 30000 }
  );
  const conversations = chatData?.data || chatData?.conversations || [];
  const unreadMessages = Array.isArray(conversations)
    ? conversations.reduce((total: number, conversation: any) => total + Number(conversation?.unseen || 0), 0)
    : 0;

  const { enableMultiLang } = Config;
  const shopSlug = typeof router.query.shop === 'string' ? router.query.shop : '';

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!shopSlug || !search.trim()) return;
    router.push({ pathname: `/${shopSlug}${Routes.product.list}`, query: { search: search.trim() } });
  };

  return (
    <header className="fixed z-40 w-full border-b border-[#edf0f5] bg-white/95 backdrop-blur-xl">
      <nav className="flex h-20 items-center px-3 sm:px-5 md:px-7">
        {/* <!-- Mobile menu button --> */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={toggleSidebar}
          className="flex h-full items-center justify-center p-2 focus:text-accent focus:outline-none lg:hidden"
        >
          <NavbarIcon />
        </motion.button>

        <div className="ms-4 hidden w-[220px] shrink-0 md:flex lg:ms-1 lg:w-[236px]">
          <Logo />
        </div>

        <form onSubmit={submitSearch} className="mx-3 hidden w-full max-w-[560px] md:block lg:mx-5">
          <label className="relative block">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#78849b]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            </span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} disabled={!shopSlug} placeholder="Поиск по товарам…" className="h-11 w-full rounded-[14px] border-0 bg-[#f4f6f9] pl-11 pr-4 text-sm text-[#242a3c] outline-none ring-1 ring-transparent transition placeholder:text-[#a3acbb] focus:bg-white focus:ring-[#dce5f2] disabled:cursor-default" />
          </label>
        </form>

        <div className="ms-auto flex min-w-0 items-center gap-2 sm:gap-3">
          {hasAccess(adminAndOwnerOnly, permissions) && (
            <a
              href={Routes.chat}
              aria-label={unreadMessages ? `Уведомления: ${unreadMessages} непрочитанных` : 'Уведомления'}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e5e9f0] bg-white text-[#4e586e] transition hover:bg-[#f5f7fa]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>
              {unreadMessages > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </a>
          )}
          {/* Отображение баланса */}
          {hasAccess(adminAndOwnerOnly, permissions) && (
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex h-10 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-[#171b2c] px-3 text-white shadow-[0_8px_20px_rgba(23,27,44,0.14)] transition hover:bg-[#282e44] sm:px-4"
            >
              <WalletIcon className="h-4 w-4 text-white" />
              <span className="hidden text-sm font-bold sm:inline">Пополнить баланс</span>
              <span className="hidden h-4 w-px bg-white/25 lg:block" />
              <span className="text-xs font-semibold text-white/85">
                {isBalanceLoading ? (
                  <span>...</span>
                ) : (
                  `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(balance?.balance || 0)} ₽`
                )}
              </span>
            </button>
          )}
          {hasAccess(adminOnly, permissions) && (
            <div className="hidden md:block">
              <LinkButton href={Routes.shop.create} size="small">
                {t('common:text-create-shop')}
              </LinkButton>
            </div>
          )}
          {enableMultiLang ? (
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
          ) : null}
          <AuthorizedMenu />
        </div>
      </nav>
      <DepositBalanceModal 
        isOpen={showDepositModal} 
        onClose={() => setShowDepositModal(false)} 
      />
    </header>
  );
};

export default Navbar;
