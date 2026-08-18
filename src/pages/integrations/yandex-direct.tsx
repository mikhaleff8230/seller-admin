import { useEffect, useState } from 'react';
import Layout from '@/components/layouts/admin';
import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import { HttpClient } from '@/data/client/http-client';
import { adminOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { toast } from 'react-toastify';

type Settings = { enabled:boolean; oauth_token:string; oauth_token_configured:boolean; client_login:string; campaign_id:string; feed_id:string; markup_percent:string; balance_reserve:string; sync_interval_minutes:number };
const defaults: Settings = {enabled:false,oauth_token:'',oauth_token_configured:false,client_login:'',campaign_id:'',feed_id:'',markup_percent:'30',balance_reserve:'100',sync_interval_minutes:15};

export default function YandexDirectPage(){
 const [settings,setSettings]=useState<Settings>(defaults); const [monitor,setMonitor]=useState<any>({}); const [errors,setErrors]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [check,setCheck]=useState<any>(null);
 const load=()=>HttpClient.get<any>('/api/admin/yandex-direct').then(d=>{setSettings({...defaults,...d.settings,oauth_token:''});setMonitor(d.monitor||{});setErrors(d.errors||[]);}).catch((e:any)=>toast.error(e?.response?.data?.message||'Не удалось загрузить настройки')).finally(()=>setLoading(false));
 useEffect(()=>{load()},[]);
 const field=(key:keyof Settings,value:any)=>setSettings(s=>({...s,[key]:value}));
 const save=async()=>{setBusy(true);try{await HttpClient.put('/api/admin/yandex-direct',{...settings,campaign_id:Number(settings.campaign_id),feed_id:Number(settings.feed_id),markup_percent:Number(settings.markup_percent),balance_reserve:Number(settings.balance_reserve)});toast.success('Настройки сохранены');load();}catch(e:any){toast.error(e?.response?.data?.message||'Настройки не сохранены')}finally{setBusy(false)}};
 const test=async()=>{setBusy(true);setCheck(null);try{const d=await HttpClient.post<any>('/api/admin/yandex-direct/test',{oauth_token:settings.oauth_token||null,client_login:settings.client_login||null,campaign_id:Number(settings.campaign_id),feed_id:Number(settings.feed_id)});setCheck(d);toast.success('Подключение работает')}catch(e:any){setCheck({success:false,message:e?.response?.data?.message||'Ошибка подключения'})}finally{setBusy(false)}};
 if(loading)return <div className="p-8">Загрузка…</div>;
 const input='mt-1 w-full rounded border border-gray-300 p-3';
 return <div className="space-y-6">
  <Card><h1 className="text-2xl font-bold">Яндекс Директ</h1><p className="mt-1 text-sm text-body">Управление Boost через существующую Единую перфоманс-кампанию.</p></Card>
  <Card><div className="grid gap-5 md:grid-cols-2">
   <label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={settings.enabled} onChange={e=>field('enabled',e.target.checked)}/> Интеграция включена</label><div/>
   <label>OAuth token<input type="password" value={settings.oauth_token} onChange={e=>field('oauth_token',e.target.value)} placeholder={settings.oauth_token_configured?'Токен сохранён — оставьте пустым':'Введите OAuth token'} className={input}/></label>
   <label>Client Login (optional)<input value={settings.client_login||''} onChange={e=>field('client_login',e.target.value)} className={input}/></label>
   <label>ID ЕПК<input type="number" value={settings.campaign_id||''} onChange={e=>field('campaign_id',e.target.value)} className={input}/></label>
   <label>ID товарного фида<input type="number" value={settings.feed_id||''} onChange={e=>field('feed_id',e.target.value)} className={input}/></label>
   <label>Наценка SANCAN, %<input type="number" min="0" step="0.01" value={settings.markup_percent} onChange={e=>field('markup_percent',e.target.value)} className={input}/></label>
   <label>Резерв баланса, ₽<input type="number" min="0" step="0.01" value={settings.balance_reserve} onChange={e=>field('balance_reserve',e.target.value)} className={input}/></label>
   <label>Интервал синхронизации, минут<input type="number" min="5" value={settings.sync_interval_minutes} onChange={e=>field('sync_interval_minutes',+e.target.value)} className={input}/></label>
  </div><div className="mt-6 flex gap-3"><Button loading={busy} onClick={save}>Сохранить</Button><Button loading={busy} variant="outline" onClick={test}>Проверить подключение</Button></div>
  {check&&<div className={`mt-5 rounded p-4 ${check.success?'bg-green-50 text-green-800':'bg-red-50 text-red-700'}`}>{check.success?<>✓ API подключен<br/>✓ ЕПК: {check.campaign?.name} #{check.campaign?.id}<br/>✓ Feed #{check.feed?.id}</>:check.message}</div>}</Card>
  <Card><h2 className="mb-4 text-lg font-bold">Статус интеграции</h2><div className="grid gap-4 md:grid-cols-3"><Stat label="Активных seller groups" value={monitor.active_seller_groups||0}/><Stat label="Активных Boost товаров" value={monitor.active_boost_products||0}/><Stat label="Расход Яндекс сегодня" value={`${monitor.yandex_cost_today||0} ₽`}/><Stat label="Списано seller" value={`${monitor.seller_charged_today||0} ₽`}/><Stat label="Маржа SANCAN" value={`${Math.max(0,(+monitor.seller_charged_today||0)-(+monitor.yandex_cost_today||0)).toFixed(2)} ₽`}/><Stat label="Последняя синхронизация" value={monitor.last_sync_at||'—'}/></div></Card>
  <Card><h2 className="mb-4 text-lg font-bold">Последние ошибки Direct</h2>{errors.length?<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Дата</th><th className="p-3">Seller</th><th className="p-3">Операция</th><th className="p-3">Ошибка</th></tr></thead><tbody>{errors.map(e=><tr key={e.id} className="border-b"><td className="p-3">{e.created_at}</td><td className="p-3">{e.seller_id||'—'}</td><td className="p-3">{e.operation}</td><td className="p-3 text-red-600">{e.error_message}</td></tr>)}</tbody></table></div>:<div className="text-body">Ошибок нет.</div>}</Card>
 </div>
}
function Stat({label,value}:{label:string;value:any}){return <div className="rounded bg-gray-50 p-4"><div className="text-sm text-body">{label}</div><div className="mt-1 text-xl font-bold">{value}</div></div>}
YandexDirectPage.authenticate={permissions:adminOnly}; YandexDirectPage.Layout=Layout;
export const getStaticProps=async({locale}:any)=>({props:{...(await serverSideTranslations(locale,['common','form','table']))}});
