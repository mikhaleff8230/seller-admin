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
  const [period, setPeriod] = useState('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'paid_visits' | 'organic_visits' | ''>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [intensityBusy, setIntensityBusy] = useState(false);
  const [intensityIndex, setIntensityIndex] = useState(0);

  const load = async () => {
    try {
      const result = await HttpClient.get<any>('/api/seller/promotion', { shop_id: shopId || undefined, search: search || undefined, page, limit: 20, period, date_from: period === 'custom' ? dateFrom : undefined, date_to: period === 'custom' ? dateTo : undefined, sort_by: sortBy || undefined, sort_order: sortBy ? sortOrder : undefined, cache_bust: Date.now() });
      setData(result);
      const levels = result.intensity?.allowed_levels || [];
      const selectedIndex = levels.findIndex((level: number) => Number(level) === Number(result.intensity?.bid_level));
      setIntensityIndex(selectedIndex >= 0 ? selectedIndex : 0);
      if (!shopId && result.shops?.length) {
        const firstShopId = String(result.shops[0].id);
        setShopId(firstShopId);
        router.replace({ pathname: router.pathname, query: { shop_id: firstShopId } }, undefined, { shallow: true });
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Не удалось загрузить продвижение');
    }
  };

  useEffect(() => { if (router.isReady && (period !== 'custom' || (dateFrom && dateTo))) load(); }, [router.isReady, shopId, search, page, period, dateFrom, dateTo, sortBy, sortOrder]);
  useEffect(() => {
    if (!router.isReady) return;
    const interval = window.setInterval(load, 60_000);
    return () => window.clearInterval(interval);
  }, [router.isReady, shopId, search, page, period, dateFrom, dateTo, sortBy, sortOrder]);
  useEffect(() => { setSelected([]); }, [shopId, page]);

  const changeShop = (value: string) => {
    setPage(1); setShopId(value);
    router.replace({ pathname: router.pathname, query: { shop_id: value } }, undefined, { shallow: true });
  };

  const changeSort = (field: 'paid_visits' | 'organic_visits') => {
    setPage(1);
    if (sortBy === field) {
      setSortOrder((current) => current === 'desc' ? 'asc' : 'desc');
      return;
    }
    setSortBy(field);
    setSortOrder('desc');
  };

  const sortableTitle = (label: string, field: 'paid_visits' | 'organic_visits') => (
    <button type="button" onClick={() => changeSort(field)} className="inline-flex items-center gap-1 whitespace-nowrap font-semibold hover:text-accent">
      {label}<span aria-hidden="true" className={sortBy === field ? 'text-accent' : 'text-gray-400'}>{sortBy === field ? (sortOrder === 'desc' ? '↓' : '↑') : '↕'}</span>
    </button>
  );

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

  const changeIntensity = async (level: number) => {
    setIntensityBusy(true);
    try { await HttpClient.patch('/api/seller/advertising/intensity', { bid_level: level }); toast.success('Интенсивность сохранена'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Не удалось изменить интенсивность'); }
    finally { setIntensityBusy(false); }
  };

  if (!data) return <div className="p-8">Загрузка…</div>;
  const products = data.products?.data || [];
  const ctr = data.impressions ? ((data.clicks / data.impressions) * 100).toFixed(2) : '0.00';
  const averageClickPrice = data.clicks ? (Number(data.spent || 0) / Number(data.clicks)).toFixed(2) : '0.00';
  const selectedShop = data.shops?.find((shop: any) => String(shop.id) === String(shopId));
  const intensityLevels: number[] = data.intensity?.allowed_levels || [];
  const selectedIntensity = intensityLevels[intensityIndex] ?? data.intensity?.bid_level ?? 0;
  const pageIds = products.map((product: any) => String(product.id));
  const allPageSelected = pageIds.length > 0 && pageIds.every((id: string) => selected.includes(id));
  const columns: any[] = [
    { title: <input type="checkbox" aria-label="Выбрать все товары на странице" checked={allPageSelected} onChange={(event) => setSelected(event.target.checked ? pageIds : [])} className="rounded border-gray-300 text-accent focus:ring-accent" />, key: 'select', width: 50, align: 'center', render: (_: any, product: any) => <input type="checkbox" aria-label={`Выбрать ${product.name}`} checked={selected.includes(String(product.id))} onChange={(event) => setSelected((current) => event.target.checked ? [...current, String(product.id)] : current.filter((id) => id !== String(product.id)))} className="rounded border-gray-300 text-accent focus:ring-accent" /> },
    { title: 'Фото', dataIndex: 'image', key: 'image', width: 80, render: (image: any, product: any) => <div className="relative h-[42px] w-[42px] overflow-hidden rounded"><Image src={image?.thumbnail || image?.original || siteSettings.product.placeholder} alt={product.name} fill sizes="42px" className="object-cover" /></div> },
    { title: 'Название', dataIndex: 'name', key: 'name', width: 330, ellipsis: true, render: (name: string, product: any) => <a href={`/${product.shop?.slug}/products/${product.slug}/edit`} className="font-medium text-body hover:text-accent" title={name}>{name}</a> },
    { title: 'Статус', dataIndex: 'status', key: 'status', width: 150, render: (status: string) => <Badge text={statusLabels[status] || status || '—'} color={status === 'publish' ? 'bg-[#232323] text-white' : status === 'draft' ? 'bg-yellow-400' : 'bg-gray-500 text-white'} /> },
    { title: 'Boost', dataIndex: 'boost_enabled', key: 'boost', width: 100, align: 'center', render: (_enabled: boolean, product: any) => <button type="button" aria-label="Переключить продвижение" disabled={busy === product.id} onClick={() => toggle(product)} className={`relative h-7 w-14 rounded-full transition-colors ${product.boost_enabled ? 'bg-[#232323]' : 'bg-gray-300'} disabled:opacity-50`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${product.boost_enabled ? 'left-8' : 'left-1'}`} /></button> },
    { title: sortableTitle('Органические переходы', 'organic_visits'), key: 'organic_clicks', width: 190, align: 'center', render: (_: any, product: any) => product.promotion_stats?.organic_clicks ?? Math.max(Number(product.promotion_stats?.views || 0) - Number(product.promotion_stats?.yandex_clicks || 0), 0) },
    { title: sortableTitle('Переходы из рекламы', 'paid_visits'), key: 'paid_clicks', width: 190, align: 'center', render: (_: any, product: any) => product.promotion_stats?.yandex_clicks || 0 },
  ];

  return <div className="space-y-6">
    <Card><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-2xl font-bold">Продвижение товаров</h1><p className="mt-1 text-sm text-body">Товары показываются отдельно для выбранного магазина.</p></div><div className="w-full lg:w-96"><label className="mb-2 block text-sm font-semibold text-heading">Магазин</label><select value={shopId} onChange={(event) => changeShop(event.target.value)} className="h-12 w-full rounded border border-border-base bg-white px-4 text-sm outline-none focus:border-accent">{data.shops?.map((shop: any) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</select></div></div>
      <div className="mt-5 flex flex-wrap items-center gap-2"><span className="mr-2 text-sm font-semibold text-heading">Период:</span>{[['today','Сегодня'],['yesterday','Вчера'],['7d','7 дней'],['30d','30 дней'],['custom','Интервал']].map(([key,label])=><button key={key} type="button" onClick={()=>{setPeriod(key);setPage(1)}} className={`rounded-full px-4 py-2 text-sm font-semibold ${period===key?'bg-accent text-white':'bg-gray-100 text-heading'}`}>{label}</button>)}{period==='custom'&&<><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="rounded border p-2 text-sm"/><span>—</span><input type="date" value={dateTo} min={dateFrom} onChange={e=>setDateTo(e.target.value)} className="rounded border p-2 text-sm"/></>}</div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-7"><Metric label="Баланс селлера" value={`${data.balance} ₽`} /><Metric label={`Активно${selectedShop ? ` · ${selectedShop.name}` : ''}`} value={data.active_products} /><Metric label="Потрачено селлером" value={`${data.spent} ₽`} /><Metric label="CTR" value={`${ctr}%`} /><Metric label="Показы рекламы" value={data.impressions} /><Metric label="Клики" value={data.clicks} /><Metric label="Средняя цена клика (CPC)" value={`${averageClickPrice} ₽`} /></div>
      {intensityLevels.length > 0 && <div className="mt-5 flex flex-col gap-3 rounded-xl bg-gray-50 px-4 py-3 md:flex-row md:items-center"><div className="flex shrink-0 items-center justify-between gap-3 md:w-56"><span className="text-sm font-semibold text-heading">Интенсивность</span><span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-heading shadow-sm">{selectedIntensity} ₽</span></div><div className="min-w-0 flex-1"><input type="range" min={0} max={Math.max(0,intensityLevels.length-1)} step={1} value={intensityIndex} disabled={intensityBusy} onChange={event=>setIntensityIndex(Number(event.target.value))} onMouseUp={event=>changeIntensity(intensityLevels[Number(event.currentTarget.value)])} onTouchEnd={event=>changeIntensity(intensityLevels[Number(event.currentTarget.value)])} onKeyUp={event=>{if(event.key.startsWith('Arrow'))changeIntensity(intensityLevels[Number(event.currentTarget.value)])}} className="h-2 w-full cursor-pointer accent-[#232323] disabled:opacity-50"/><div className="mt-1 flex justify-between text-[11px] text-body">{intensityLevels.map(level=><span key={level}>{level}</span>)}</div></div></div>}
    </Card>
    <Card><Search onSearch={({ searchText }) => { setPage(1); setSearch(searchText); }} placeholderText="Поиск товара по названию" /></Card>
    <Card className="p-0"><div className="flex flex-col gap-3 border-b border-border-base p-4 md:flex-row md:items-center md:justify-between"><div className="text-sm text-body">Выбрано: <b className="text-heading">{selected.length}</b> из {products.length} на странице</div><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" size="small" onClick={() => setSelected(pageIds)} disabled={!products.length || bulkBusy}>Выбрать все</Button><Button variant="outline" size="small" onClick={() => setSelected([])} disabled={!selected.length || bulkBusy}>Снять выбор</Button><Button size="small" onClick={() => bulkToggle(true)} disabled={!selected.length || bulkBusy}>Включить Boost</Button><Button variant="outline" size="small" onClick={() => bulkToggle(false)} disabled={!selected.length || bulkBusy}>Выключить Boost</Button></div></div><div className="overflow-x-auto"><Table columns={columns} emptyText="В выбранном магазине товары не найдены" data={products} rowKey="id" scroll={{ x: 1300 }} /></div></Card>
    {!!data.products?.total && <div className="flex justify-end"><Pagination total={data.products.total} current={data.products.current_page} pageSize={data.products.per_page} onChange={(current) => setPage(current)} /></div>}
  </div>;
}

function Metric({ label, value }: { label: string; value: any }) { return <div className="rounded bg-gray-50 p-4"><div className="text-sm text-body">{label}</div><div className="mt-1 text-xl font-bold">{value}</div></div>; }
PromotionPage.authenticate = { permissions: adminAndOwnerOnly };
PromotionPage.Layout = Layout;
export const getStaticProps = async ({ locale }: any) => ({ props: { ...(await serverSideTranslations(locale, ['common', 'form', 'table'])) } });
