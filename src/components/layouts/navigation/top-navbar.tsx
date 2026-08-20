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
  getAuthCredentials,
  hasAccess,
} from '@/utils/auth-utils';
import LanguageSwitcher from './language-switer';
import { Config } from '@/config';
import { useSellerBalanceQuery } from '@/data/seller-balance';
import { WalletIcon } from '@/components/icons/wallet-icon';
import DepositBalanceModal from '@/components/billing/deposit-balance-modal';
import { useState } from 'react';
import { useQuery } from 'react-query';
import { HttpClient } from '@/data/client/http-client';
import { ChatIcon } from '@/components/icons/sidebar/chat';

const Navbar = () => {
	const { t } = useTranslation();
	const { toggleSidebar } = useUI();

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

  return (
    <header className="fixed z-40 w-full bg-white shadow">
      <nav className="flex items-center justify-between px-5 py-4 md:px-8">
        {/* <!-- Mobile menu button --> */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={toggleSidebar}
          className="flex h-full items-center justify-center p-2 focus:text-accent focus:outline-none lg:hidden"
        >
          <NavbarIcon />
        </motion.button>

        <div className="ms-5 me-auto hidden md:flex">
          <Logo />
        </div>

        <div className="space-s-8 flex items-center">
          {hasAccess(adminAndOwnerOnly, permissions) && (
            <a
              href={Routes.chat}
              aria-label={unreadMessages ? `Чат: ${unreadMessages} непрочитанных` : 'Чат'}
              className="relative ms-3 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-[#232323] transition hover:bg-gray-100 md:ms-5"
            >
              <ChatIcon className="h-5 w-5" />
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
              className="flex items-center gap-2 ms-4 md:ms-6 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <WalletIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {isBalanceLoading ? (
                  <span className="text-gray-400">...</span>
                ) : (
                  `${(balance?.balance || 0).toFixed(2)} ₽`
                )}
              </span>
            </button>
          )}
          {hasAccess(adminAndOwnerOnly, permissions) && (
            <LinkButton
              href={Routes.shop.create}
              className="ms-4 md:ms-6"
              size="small"
            >
              {t('common:text-create-shop')}
            </LinkButton>
          )}
          {enableMultiLang ? <LanguageSwitcher /> : null}
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
