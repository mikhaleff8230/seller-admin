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
    <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-4 bg-amber-400 px-4 py-2 text-sm font-semibold text-gray-900 shadow">
      <span>Вы вошли как {user.name || user.email}</span>
      <button onClick={stopImpersonating} className="rounded bg-gray-900 px-3 py-1 text-white hover:bg-gray-700">
        Вернуться в админку
      </button>
    </div>
  );
}
