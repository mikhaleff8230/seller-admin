import { useEffect, useState } from 'react';
import Layout from '@/components/layouts/app';
import Card from '@/components/common/card';
import { HttpClient } from '@/data/client/http-client';
import { adminAndOwnerOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { toast } from 'react-toastify';

export default function PromotionPage(){
 const [data,setData]=useState<any>(null);const [busy,setBusy]=useState<number|null>(null);
 const load=()=>HttpClient.get<any>('/api/seller/promotion').then(setData).catch((e:any)=>toast.error(e?.response?.data?.message||'Не удалось загрузить продвижение'));
 useEffect(()=>{load()},[]);
 const toggle=async(p:any)=>{setBusy(p.id);try{await HttpClient.put(`/api/products/${p.id}/boost`,{enabled:!p.boost_enabled});toast.success(!p.boost_enabled?'Продвижение включается':'Продвижение выключается');await load()}catch(e:any){toast.error(e?.response?.data?.message||'Не удалось изменить Boost')}finally{setBusy(null)}};
 if(!data)return <div className="p-8">Загрузка…</div>;
 const ctr=data.impressions?((data.clicks/data.impressions)*100).toFixed(2):'0.00';
 return <div className="space-y-6"><Card><h1 className="text-2xl font-bold">Продвижение товаров</h1><div className="mt-5 grid gap-4 md:grid-cols-4"><Metric label="Баланс" value={`${data.balance} ₽`}/><Metric label="Активных товаров" value={data.active_products}/><Metric label="Потрачено" value={`${data.spent} ₽`}/><Metric label="CTR" value={`${ctr}%`}/><Metric label="Показы рекламы" value={data.impressions}/><Metric label="Клики" value={data.clicks}/></div></Card>
 <Card className="overflow-x-auto p-0"><table className="w-full min-w-[700px] text-left"><thead><tr className="border-b bg-gray-50"><th className="p-4">Товар</th><th className="p-4">Boost</th><th className="p-4">Статус</th><th className="p-4">Просмотры</th><th className="p-4">Из рекламы</th></tr></thead><tbody>{data.products?.data?.map((p:any)=><tr key={p.id} className="border-b"><td className="p-4 font-semibold">{p.name}</td><td className="p-4"><button disabled={busy===p.id} onClick={()=>toggle(p)} className={`relative h-7 w-14 rounded-full ${p.boost_enabled?'bg-accent':'bg-gray-300'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white ${p.boost_enabled?'left-8':'left-1'}`}/></button></td><td className="p-4">{p.boost_status||'off'}</td><td className="p-4">{p.promotion_stats?.views||0}</td><td className="p-4">{p.promotion_stats?.yandex_clicks||0}</td></tr>)}</tbody></table></Card></div>
}
function Metric({label,value}:{label:string;value:any}){return <div className="rounded bg-gray-50 p-4"><div className="text-sm text-body">{label}</div><div className="mt-1 text-xl font-bold">{value}</div></div>}
PromotionPage.authenticate={permissions:adminAndOwnerOnly};PromotionPage.Layout=Layout;
export const getStaticProps=async({locale}:any)=>({props:{...(await serverSideTranslations(locale,['common','form','table']))}});
