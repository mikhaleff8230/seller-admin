import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Layout from '@/components/layouts/app';
import Card from '@/components/common/card';
import Search from '@/components/common/search';
import Pagination from '@/components/ui/pagination';
import Badge from '@/components/ui/badge/badge';
import Button from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { siteSettings } from '@/settings/site.settings';
import { HttpClient } from '@/data/client/http-client';
import { adminAndOwnerOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { toast } from 'react-toastify';

const statusLabels: Record<string, string> = {
  publish: 'Опубликовано', draft: 'Черновик', under_review: 'На проверке', unpublish: 'Не опубликовано',
};

export default function PromotionPage() {
  const router = useRouter();
  const queryShopId = typeof router.query.shop_id === 'string' ? router.query.shop_id : '';
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [shopId, setShopId] = useState(queryShopId);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = async () => {
    try {
      const result = await HttpClient.get<any>('/api/seller/promotion', { shop_id: shopId || undefined, search: search || undefined, page, limit: 20 });
      setData(result);
      if (!shopId && result.shops?.length) {
        const firstShopId = String(result.shops[0].id);
        setShopId(firstShopId);
        router.replace({ pathname: router.pathname, query: { shop_id: firstShopId } }, undefined, { shallow: true });
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Не удалось загрузить продвижение');
    }
  };

  useEffect(() => { if (router.isReady) load(); }, [router.isReady, shopId, search, page]);
  useEffect(() => { setSelected([]); }, [shopId, page]);

  const changeShop = (value: string) => {
    setPage(1); setShopId(value);
    router.replace({ pathname: router.pathname, query: { shop_id: value } }, undefined, { shallow: true });
  };

  const toggle = async (product: any) => {
    setBusy(product.id);
    try {
      await HttpClient.put(`/api/products/${product.id}/boost`, { enabled: !product.boost_enabled });
      toast.success(!product.boost_enabled ? 'Продвижение включается' : 'Продвижение выключается');
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Не удалось изменить Boost');
    } finally { setBusy(null); }
  };

  const bulkToggle = async (enabled: boolean) => {
    if (!selected.length) return;
    setBulkBusy(true);
    try {
      await HttpClient.put('/api/seller/promotion/boost', { product_ids: selected.map(Number), enabled });
      toast.success(enabled ? `Продвижение включается для товаров: ${selected.length}` : `Продвижение выключается для товаров: ${selected.length}`);
      setSelected([]);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Не удалось изменить выбранные товары');
    } finally { setBulkBusy(false); }
  };

  if (!data) return <div className="p-8">Загрузка…</div>;
  const products = data.products?.data || [];
  const ctr = data.impressions ? ((data.clicks / data.impressions) * 100).toFixed(2) : '0.00';
  const selectedShop = data.shops?.find((shop: any) => String(shop.id) === String(shopId));
  const pageIds = products.map((product: any) => String(product.id));
  const allPageSelected = pageIds.length > 0 && pageIds.every((id: string) => selected.includes(id));
  const columns: any[] = [
    { title: <input type="checkbox" aria-label="Выбрать все товары на странице" checked={allPageSelected} onChange={(event) => setSelected(event.target.checked ? pageIds : [])} className="rounded border-gray-300 text-accent focus:ring-accent" />, key: 'select', width: 50, align: 'center', render: (_: any, product: any) => <input type="checkbox" aria-label={`Выбрать ${product.name}`} checked={selected.includes(String(product.id))} onChange={(event) => setSelected((current) => event.target.checked ? [...current, String(product.id)] : current.filter((id) => id !== String(product.id)))} className="rounded border-gray-300 text-accent focus:ring-accent" /> },
    { title: 'Фото', dataIndex: 'image', key: 'image', width: 80, render: (image: any, product: any) => <div className="relative h-[42px] w-[42px] overflow-hidden rounded"><Image src={image?.thumbnail || image?.original || siteSettings.product.placeholder} alt={product.name} fill sizes="42px" className="object-cover" /></div> },
    { title: 'Название', dataIndex: 'name', key: 'name', width: 330, ellipsis: true, render: (name: string, product: any) => <a href={`/${product.shop?.slug}/products/${product.slug}/edit`} className="font-medium text-body hover:text-accent" title={name}>{name}</a> },
    { title: 'Тип товара', dataIndex: 'type', key: 'type', width: 150, render: (type: any) => type?.name || '—' },
    { title: 'Цена', dataIndex: 'price', key: 'price', width: 130, render: (price: any) => `${Number(price || 0).toLocaleString('ru-RU')} ₽` },
    { title: 'Количество', dataIndex: 'quantity', key: 'quantity', width: 120, align: 'center', render: (quantity: any) => quantity ?? 0 },
    { title: 'Статус', dataIndex: 'status', key: 'status', width: 150, render: (status: string) => <Badge text={statusLabels[status] || status || '—'} color={status === 'publish' ? 'bg-[#232323] text-white' : status === 'draft' ? 'bg-yellow-400' : 'bg-gray-500 text-white'} /> },
    { title: 'Boost', dataIndex: 'boost_enabled', key: 'boost', width: 100, align: 'center', render: (_enabled: boolean, product: any) => <button type="button" aria-label="Переключить продвижение" disabled={busy === product.id} onClick={() => toggle(product)} className={`relative h-7 w-14 rounded-full transition-colors ${product.boost_enabled ? 'bg-[#232323]' : 'bg-gray-300'} disabled:opacity-50`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${product.boost_enabled ? 'left-8' : 'left-1'}`} /></button> },
    { title: 'Просмотры', key: 'views', width: 110, align: 'center', render: (_: any, product: any) => product.promotion_stats?.views || 0 },
    { title: 'Из рекламы', key: 'clicks', width: 120, align: 'center', render: (_: any, product: any) => product.promotion_stats?.yandex_clicks || 0 },
  ];

  return <div className="space-y-6">
    <Card><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-2xl font-bold">Продвижение товаров</h1><p className="mt-1 text-sm text-body">Товары показываются отдельно для выбранного магазина.</p></div><div className="w-full lg:w-96"><label className="mb-2 block text-sm font-semibold text-heading">Магазин</label><select value={shopId} onChange={(event) => changeShop(event.target.value)} className="h-12 w-full rounded border border-border-base bg-white px-4 text-sm outline-none focus:border-accent">{data.shops?.map((shop: any) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</select></div></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-6"><Metric label="Баланс селлера" value={`${data.balance} ₽`} /><Metric label={`Активно${selectedShop ? ` · ${selectedShop.name}` : ''}`} value={data.active_products} /><Metric label="Потрачено селлером" value={`${data.spent} ₽`} /><Metric label="CTR" value={`${ctr}%`} /><Metric label="Показы рекламы" value={data.impressions} /><Metric label="Клики" value={data.clicks} /></div></Card>
    <Card><Search onSearch={({ searchText }) => { setPage(1); setSearch(searchText); }} placeholderText="Поиск товара по названию" /></Card>
    <Card className="p-0"><div className="flex flex-col gap-3 border-b border-border-base p-4 md:flex-row md:items-center md:justify-between"><div className="text-sm text-body">Выбрано: <b className="text-heading">{selected.length}</b> из {products.length} на странице</div><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" size="small" onClick={() => setSelected(pageIds)} disabled={!products.length || bulkBusy}>Выбрать все</Button><Button variant="outline" size="small" onClick={() => setSelected([])} disabled={!selected.length || bulkBusy}>Снять выбор</Button><Button size="small" onClick={() => bulkToggle(true)} disabled={!selected.length || bulkBusy}>Включить Boost</Button><Button variant="outline" size="small" onClick={() => bulkToggle(false)} disabled={!selected.length || bulkBusy}>Выключить Boost</Button></div></div><div className="overflow-x-auto"><Table columns={columns} emptyText="В выбранном магазине товары не найдены" data={products} rowKey="id" scroll={{ x: 1300 }} /></div></Card>
    {!!data.products?.total && <div className="flex justify-end"><Pagination total={data.products.total} current={data.products.current_page} pageSize={data.products.per_page} onChange={(current) => setPage(current)} /></div>}
  </div>;
}

function Metric({ label, value }: { label: string; value: any }) { return <div className="rounded bg-gray-50 p-4"><div className="text-sm text-body">{label}</div><div className="mt-1 text-xl font-bold">{value}</div></div>; }
PromotionPage.authenticate = { permissions: adminAndOwnerOnly };
PromotionPage.Layout = Layout;
export const getStaticProps = async ({ locale }: any) => ({ props: { ...(await serverSideTranslations(locale, ['common', 'form', 'table'])) } });
