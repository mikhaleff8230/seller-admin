import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';
import { HttpClient } from '@/data/client/http-client';
import { adminOwnerAndStaffOnly } from '@/utils/auth-utils';

type ShopOption = {
  id: number;
  name: string;
  slug: string;
  owner?: { name?: string; email?: string } | null;
};

export default function ExtensionConnectPage() {
  const router = useRouter();
  const deviceCode = useMemo(() => typeof router.query.device_code === 'string' ? router.query.device_code : '', [router.query.device_code]);
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [shopId, setShopId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    if (!deviceCode || deviceCode.length !== 64) {
      setError('Неверный код подключения. Откройте страницу заново из SANCAN Importer.');
      setLoading(false);
      return;
    }
    HttpClient.get<{ shops: ShopOption[] }>('/api/seller/import/shops')
      .then((response) => {
        const available = response?.shops || [];
        setShops(available);
        if (available.length === 1) setShopId(available[0].id);
      })
      .catch((caught: any) => setError(caught?.response?.data?.message || 'Не удалось загрузить магазины.'))
      .finally(() => setLoading(false));
  }, [deviceCode, router.isReady]);

  const approve = async () => {
    if (!shopId) return;
    setApproving(true); setError('');
    try {
      await HttpClient.post('/api/seller/import/auth/approve', { device_code: deviceCode, shop_id: shopId });
      setSuccess(true);
    } catch (caught: any) {
      setError(caught?.response?.data?.message || 'Не удалось подключить расширение.');
    } finally { setApproving(false); }
  };

  return <main className="min-h-screen bg-[#f5f7fb] px-4 py-12">
    <section className="mx-auto max-w-xl rounded-2xl bg-white p-7 shadow-sm">
      <div className="mb-6 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-600 text-xl font-bold text-white">S</div><div><h1 className="text-xl font-bold text-heading">SANCAN Importer</h1><p className="text-sm text-gray-500">Безопасное подключение Chrome-расширения</p></div></div>
      {loading && <p>Загружаю доступные магазины…</p>}
      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {success ? <div className="rounded-xl bg-green-50 p-5 text-green-800"><h2 className="font-bold">Расширение подключено</h2><p className="mt-2 text-sm">Вернитесь в popup SANCAN Importer. Эту вкладку можно закрыть.</p></div> : !loading && shops.length > 0 && <>
        <p className="mb-5 text-sm text-gray-600">Выберите магазин. Токен будет действовать 30 минут и сможет только импортировать черновики Ozon и Wildberries в этот магазин.</p>
        <label className="block text-sm font-semibold">Магазин<select className="mt-2 w-full rounded-xl border border-gray-300 p-3" value={shopId} onChange={(event) => setShopId(Number(event.target.value) || '')}><option value="">Выберите магазин</option>{shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}{shop.owner?.email ? ` — ${shop.owner.email}` : ''}</option>)}</select></label>
        <button className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={!shopId || approving} onClick={approve}>{approving ? 'Подключаю…' : 'Подключить SANCAN Importer'}</button>
      </>}
      {!loading && !error && !success && shops.length === 0 && <p className="rounded-xl bg-yellow-50 p-4 text-yellow-800">Для этого аккаунта нет доступных магазинов.</p>}
    </section>
  </main>;
}

ExtensionConnectPage.authenticate = { permissions: adminOwnerAndStaffOnly };

export const getStaticProps: GetStaticProps = async ({ locale }) => ({ props: { ...(await serverSideTranslations(locale!, ['common'])) } });
