import { useRouter } from 'next/router';
import Navbar from '@/components/layouts/navigation/top-navbar';
import MobileNavigation from '@/components/layouts/navigation/mobile-navigation';
import OwnerInformation from '@/components/user/user-details';
import WebPushPrompt from '@/components/notifications/web-push-prompt';

const ShopLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const {
    locale,
  } = useRouter();

  const dir = locale === 'ar' || locale === 'he' ? 'rtl' : 'ltr';

  return (
    <div
      className="flex min-h-screen flex-col bg-[#f4f7fb] transition-colors duration-150"
      dir={dir}
    >
      <Navbar />
      <WebPushPrompt />
      <MobileNavigation>
        <OwnerInformation />
      </MobileNavigation>

      <div className="flex flex-1 pt-20">
        <aside className="seller-sidebar-scroll fixed bottom-0 hidden h-full w-[264px] overflow-y-auto border-r border-[#edf0f5] bg-white px-4 pt-20 ltr:left-0 ltr:right-auto rtl:right-0 rtl:left-auto lg:block">
          <OwnerInformation />
        </aside>
        <main className="w-full ltr:lg:pl-[264px] rtl:lg:pr-[264px] rtl:lg:pl-0">
          <div className="h-full p-3 sm:p-4 lg:p-5 xl:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
export default ShopLayout;
