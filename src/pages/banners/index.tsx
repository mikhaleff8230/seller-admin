import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/layouts/admin';
import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import { HttpClient } from '@/data/client/http-client';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { toast } from 'react-toastify';

type Banner={id:number;kind:'hero'|'strip';is_active:boolean;sort_order:number;content:Record<string,any>};
export default function BannersPage(){
 const [rows,setRows]=useState<Banner[]>([]),[autoplay,setAutoplay]=useState(true),[interval,setIntervalValue]=useState(5000),[loading,setLoading]=useState(true);
 const load=()=>HttpClient.get<any>('/admin/homepage-banners').then(d=>{setRows(d.banners||[]);setAutoplay(d.autoplay);setIntervalValue(d.interval_ms);}).catch((e:any)=>toast.error(e?.response?.data?.message||'Не удалось загрузить баннеры')).finally(()=>setLoading(false));
 useEffect(()=>{load();},[]);
 const saveSettings=async()=>{await HttpClient.post('/admin/homepage-banners/settings',{autoplay,interval_ms:interval});toast.success('Настройки сохранены');};
 const remove=async(id:number)=>{if(!confirm('Удалить баннер?'))return;await HttpClient.delete(`/admin/homepage-banners/${id}`);toast.success('Баннер удалён');load();};
 return <div className="space-y-6"><Card><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Баннеры главной</h1><p className="mt-1 text-sm text-body">Сначала выберите баннер из списка или создайте новый.</p></div><Link href="/banners/create"><Button>Создать баннер</Button></Link></div></Card><Card><div className="flex flex-wrap items-end gap-5"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={autoplay} onChange={e=>setAutoplay(e.target.checked)}/> Автопрокрутка</label><label className="text-sm font-semibold">Интервал, мс<input type="number" min="1500" max="60000" step="500" value={interval} onChange={e=>setIntervalValue(+e.target.value)} className="ml-2 w-28 rounded border p-2"/></label><Button onClick={saveSettings}>Сохранить настройки</Button></div></Card><Card><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b text-sm text-body"><th className="p-4">ID</th><th className="p-4">Название</th><th className="p-4">Тип</th><th className="p-4">Порядок</th><th className="p-4">Статус</th><th className="p-4 text-right">Действия</th></tr></thead><tbody>{rows.map(b=><tr key={b.id} className="border-b last:border-0"><td className="p-4">#{b.id}</td><td className="p-4 font-semibold">{b.content.title||b.content.text||`Баннер ${b.id}`}</td><td className="p-4">{b.kind==='hero'?'Большой баннер':'Промо-полоса'}</td><td className="p-4">{b.sort_order}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${b.is_active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{b.is_active?'Активен':'Скрыт'}</span></td><td className="p-4"><div className="flex justify-end gap-2"><Link href={`/banners/${b.id}`} className="rounded border px-3 py-2 font-semibold">Редактировать</Link><button onClick={()=>remove(b.id)} className="rounded border border-red-200 px-3 py-2 font-semibold text-red-600">Удалить</button></div></td></tr>)}</tbody></table>{loading&&<div className="p-8 text-center text-body">Загрузка…</div>}{!loading&&!rows.length&&<div className="p-8 text-center text-body">Баннеров пока нет.</div>}</div></Card></div>;
}
BannersPage.authenticate={permissions:adminOnly};BannersPage.Layout=Layout;
export const getStaticProps=async({locale}:any)=>({props:{...(await serverSideTranslations(locale,['common','form','table']))}});
