import { useEffect, useState } from 'react';
import { getAuthCredentials, setAuthCredentials } from '@/utils/auth-utils';
import { userClient } from '@/data/client/user';

type ImpersonatedUser = { id: string; name: string; email: string };

export default function ImpersonationBanner() {
  const [user, setUser] = useState<ImpersonatedUser | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('sancan_impersonated_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  if (!user) return null;

  const stopImpersonating = async () => {
    const storedAdmin = sessionStorage.getItem('sancan_admin_credentials');
    if (!storedAdmin) return;

    try {
      await userClient.logout();
    } catch (_) {
      // The admin session can still be restored if revoking the temporary token fails.
    }

    const admin = JSON.parse(storedAdmin) as ReturnType<typeof getAuthCredentials>;
    setAuthCredentials(admin.token || '', admin.permissions || []);
    sessionStorage.removeItem('sancan_admin_credentials');
    sessionStorage.removeItem('sancan_impersonated_user');
    window.location.assign('/users');
  };

  return (
    <div className="fixed left-1/2 top-2 z-[60] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-amber-400/60 bg-amber-300/80 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-lg backdrop-blur-md sm:gap-3 sm:px-4 sm:text-sm">
      <span className="max-w-[45vw] truncate">Вы вошли как {user.name || user.email}</span>
      <button onClick={stopImpersonating} className="whitespace-nowrap rounded-full bg-[#232323] px-3 py-1 text-white hover:bg-black">
        Вернуться в админку
      </button>
    </div>
  );
}
