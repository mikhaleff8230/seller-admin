import { useEffect, useState } from 'react';
import Layout from '@/components/layouts/admin';
import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import { HttpClient } from '@/data/client/http-client';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

type Tab = 'orders' | 'profiles' | 'confirmations';
const endpoints: Record<Tab, string> = {
  orders: '/api/admin/second-life/orders',
  profiles: '/api/admin/second-life/payment-profiles',
  confirmations: '/api/admin/second-life/payment-confirmations',
};

export default function SecondLifeAdmin() {
  const [tab, setTab] = useState<Tab>('orders');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const load = async () => {
    setLoading(true);
    try {
      const r: any = await HttpClient.get(endpoints[tab]);
      setRows(r?.data || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [tab]);
  const action = async (action: string) => {
    if (!selected) return;
    const reason =
      action === 'open_dispute'
        ? prompt('Причина спора') || 'Открыт администратором'
        : undefined;
    await HttpClient.post(
      `/api/admin/second-life/orders/${selected.public_id || selected.id}/action`,
      { action, reason }
    );
    setSelected(null);
    load();
  };
  return (
    <>
      <Card className="mb-6">
        <h1 className="text-xl font-bold">Second Hand — прямые платежи СБП</h1>
        <p className="mt-2 text-sm text-body">
          Отдельный контур C2C. Обычные заказы и оплата сайта не изменяются.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {(['orders', 'profiles', 'confirmations'] as Tab[]).map((x) => (
            <button
              key={x}
              onClick={() => setTab(x)}
              className={`rounded px-4 py-2 font-semibold ${
                tab === x ? 'bg-accent text-white' : 'bg-gray-100'
              }`}
            >
              {x === 'orders'
                ? 'Заказы'
                : x === 'profiles'
                ? 'Платёжные профили'
                : 'Подтверждения'}
            </button>
          ))}
        </div>
      </Card>
      <Card className="overflow-x-auto p-0">
        {loading ? (
          <div className="p-8">Загрузка…</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-4">ID</th>
                <th className="p-4">Участники / получатель</th>
                <th className="p-4">Сумма / банк</th>
                <th className="p-4">Статус</th>
                <th className="p-4">Дата</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => tab === 'orders' && setSelected(row)}
                  className="cursor-pointer border-b hover:bg-gray-50"
                >
                  <td className="p-4 font-semibold">
                    {row.public_id || row.id}
                  </td>
                  <td className="p-4">
                    {row.seller?.name ||
                      row.user?.name ||
                      row.buyer?.name ||
                      row.receiver_name ||
                      '—'}
                  </td>
                  <td className="p-4">
                    {row.price || row.amount || row.bank_name || '—'}
                  </td>
                  <td className="p-4">
                    {row.payment_status ||
                      row.status ||
                      (row.is_active ? 'Активен' : 'Отключён')}
                  </td>
                  <td className="p-4">
                    {new Date(row.created_at).toLocaleString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-2xl rounded bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold">Заказ {selected.public_id}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>Покупатель: {selected.buyer?.name}</div>
              <div>Продавец: {selected.seller?.name}</div>
              <div>
                Сумма: {selected.price} {selected.currency}
              </div>
              <div>Статус: {selected.order_status}</div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => action('open_dispute')}>
                Открыть спор
              </Button>
              <Button onClick={() => action('close_dispute')}>
                Закрыть спор
              </Button>
              <Button onClick={() => action('cancel')}>Отменить заказ</Button>
              <Button onClick={() => action('block_seller')}>
                Заблокировать продавца
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
SecondLifeAdmin.authenticate = { permissions: adminOnly };
SecondLifeAdmin.Layout = Layout;
export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'form', 'table'])),
  },
});
