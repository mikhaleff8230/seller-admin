import DepositBalanceModal from '@/components/billing/deposit-balance-modal';
import Link from '@/components/ui/link';
import Loader from '@/components/ui/loader/loader';
import { Routes } from '@/config/routes';
import { useSellerDashboardQuery, SellerDashboardData, SellerDashboardPeriod } from '@/data/seller-dashboard';
import { useShopQuery } from '@/data/shop';
import { siteSettings } from '@/settings/site.settings';
import cn from 'classnames';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ReactNode, useMemo, useState } from 'react';

type MetricKey = 'impressions' | 'clicks' | 'product_views' | 'messages';

const metricConfig: Array<{
  key: MetricKey;
  label: string;
  color: string;
  soft: string;
  icon: IconName;
}> = [
  { key: 'impressions', label: 'Показы', color: '#2f7df4', soft: '#eaf3ff', icon: 'eye' },
  { key: 'clicks', label: 'Переходы', color: '#15b875', soft: '#e8f8f1', icon: 'cursor' },
  { key: 'product_views', label: 'Просмотры карточек', color: '#8c5cf5', soft: '#f1ebff', icon: 'document' },
  { key: 'messages', label: 'Сообщения', color: '#f59e0b', soft: '#fff4df', icon: 'message' },
];

const statusLabels: Record<string, { label: string; className: string }> = {
  good_interest: { label: 'Хороший интерес', className: 'bg-emerald-50 text-emerald-700' },
  stable: { label: 'Стабильный интерес', className: 'bg-blue-50 text-blue-700' },
  improve_photo: { label: 'Улучшить фото', className: 'bg-amber-50 text-amber-700' },
  no_data: { label: 'Пока нет данных', className: 'bg-gray-100 text-gray-600' },
};

const advertisingCopy: Record<string, { title: string; description: string; tone: string }> = {
  active: {
    title: 'Продвижение работает',
    description: 'Ваши товары показываются потенциальным покупателям.',
    tone: 'text-emerald-600',
  },
  low: {
    title: 'Баланс постепенно расходуется',
    description: 'Пополните баланс заранее, чтобы показы не прерывались.',
    tone: 'text-amber-600',
  },
  warning: {
    title: 'Продвижение скоро остановится',
    description: 'На балансе осталось мало средств.',
    tone: 'text-orange-600',
  },
  stopped: {
    title: 'Продвижение остановлено',
    description: 'Пополните баланс, чтобы снова показывать товары покупателям.',
    tone: 'text-red-600',
  },
  ready: {
    title: 'Всё готово к продвижению',
    description: 'Выберите товары, которые хотите показывать покупателям.',
    tone: 'text-blue-600',
  },
  unavailable: {
    title: 'Продвижение временно недоступно',
    description: 'Сервис не списывает средства, пока продвижение отключено.',
    tone: 'text-gray-500',
  },
};

export default function SellerDashboard() {
  const router = useRouter();
  const shopSlug = typeof router.query.shop === 'string' ? router.query.shop : '';
  const [period, setPeriod] = useState<SellerDashboardPeriod>(30);
  const [showDeposit, setShowDeposit] = useState(false);
  const { data: shop, isLoading: shopLoading } = useShopQuery({ slug: shopSlug });
  const { data, isLoading, isFetching, error } = useSellerDashboardQuery(shop?.id, period);

  if (shopLoading || (isLoading && !data)) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-[24px] bg-white">
        <Loader text="Загружаем ваш магазин…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-[24px] border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <DashboardIcon name="warning" className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-[#171b2c]">Не удалось загрузить дашборд</h1>
        <p className="mt-2 text-sm text-[#727b93]">Обновите страницу или попробуйте ещё раз чуть позже.</p>
      </div>
    );
  }

  const hasActivity = Object.values(data.summary).some((value) => value > 0);
  const primaryAction = getPrimaryAction(data, shopSlug);
  const hero = getHeroCopy(data, hasActivity);

  return (
    <div className="mx-auto max-w-[1640px] space-y-4 font-body text-[#171b2c] lg:space-y-5">
      <section
        className="relative overflow-hidden rounded-[26px] border border-white/80 bg-[#eaf4ff] bg-cover bg-center px-5 py-6 shadow-[0_18px_50px_rgba(39,67,121,0.08)] sm:px-7 lg:min-h-[238px] lg:px-8 lg:py-8"
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(244,249,255,.98) 0%, rgba(244,249,255,.92) 32%, rgba(244,249,255,.28) 55%, rgba(244,249,255,0) 72%), url('/seller-dashboard-growth.png')",
        }}
      >
        <div className="relative z-10 max-w-[640px]">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#60708f]">
            <span className="rounded-full bg-white/80 px-3 py-1.5 shadow-sm">{data.shop?.name || 'Магазин'}</span>
            {isFetching && <span className="text-[#8c96aa]">Обновляем данные…</span>}
          </div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.035em] text-[#111522] sm:text-[34px] lg:text-[38px]">
            {hero.title}
          </h1>
          <p className="mt-2 max-w-[650px] text-sm leading-6 text-[#65718a] sm:text-base">{hero.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {primaryAction.type === 'deposit' ? (
              <button type="button" onClick={() => setShowDeposit(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#171b2c] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(23,27,44,0.2)] transition hover:-translate-y-0.5 hover:bg-[#252b42]">
                {primaryAction.label}<DashboardIcon name="arrow" className="h-4 w-4" />
              </button>
            ) : (
              <Link href={primaryAction.href} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#171b2c] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(23,27,44,0.2)] transition hover:-translate-y-0.5 hover:bg-[#252b42]">
                {primaryAction.label}<DashboardIcon name="arrow" className="h-4 w-4" />
              </Link>
            )}
            {hero.badge && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-2 text-xs font-semibold text-[#56647f]">
                <DashboardIcon name="trending" className="h-4 w-4 text-[#2f7df4]" />
                {hero.badge}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricConfig.map((metric) => (
          <MetricCard key={metric.key} metric={metric} data={data} />
        ))}
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px] lg:gap-5">
        <div className="space-y-4 lg:space-y-5">
          <ActivityChart data={data} period={period} onPeriodChange={setPeriod} />
          <ProductsTable data={data} shopSlug={shopSlug} />
        </div>

        <aside className="space-y-4 lg:space-y-5">
          <AdvertisingCard data={data} onDeposit={() => setShowDeposit(true)} />
          <TodayCard data={data} />
          <RecommendationsCard data={data} shopSlug={shopSlug} />
        </aside>
      </section>

      <DepositBalanceModal isOpen={showDeposit} onClose={() => setShowDeposit(false)} />
    </div>
  );
}

function MetricCard({ metric, data }: { metric: typeof metricConfig[number]; data: SellerDashboardData }) {
  const value = data.summary[metric.key];
  const growth = data.growth[metric.key];
  const chartValues = data.chart.map((point) => point[metric.key]);

  return (
    <article className="group relative min-h-[142px] overflow-hidden rounded-[22px] border border-[#edf0f6] bg-white p-5 shadow-[0_12px_35px_rgba(41,58,95,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(41,58,95,0.11)]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: metric.soft, color: metric.color }}>
          <DashboardIcon name={metric.icon} className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold text-[#31384c]">{metric.label}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-[#0f1320]">{formatNumber(value)}</div>
          <GrowthLabel value={value} growth={growth} />
        </div>
        <Sparkline values={chartValues} color={metric.color} id={metric.key} />
      </div>
    </article>
  );
}

function GrowthLabel({ value, growth }: { value: number; growth: number | null }) {
  if (growth === null) {
    return <div className="mt-2 text-[11px] font-medium text-[#9aa3b5]">{value > 0 ? 'Первые данные' : 'Пока нет данных'}</div>;
  }
  const positive = growth >= 0;
  return (
    <div className={cn('mt-2 flex items-center gap-1 text-[11px] font-bold', positive ? 'text-emerald-600' : 'text-red-500')}>
      <span>{positive ? '↗' : '↘'} {positive ? '+' : ''}{formatCompact(growth)}%</span>
      <span className="font-medium text-[#a1a9b8]">к прошлому периоду</span>
    </div>
  );
}

function Sparkline({ values, color, id }: { values: number[]; color: string; id: string }) {
  const points = useMemo(() => {
    if (!values.length || values.every((value) => value === 0)) return '';
    const max = Math.max(...values, 1);
    const min = Math.min(...values);
    const range = Math.max(max - min, 1);
    return values.map((value, index) => {
      const x = values.length === 1 ? 70 : (index / (values.length - 1)) * 138 + 1;
      const y = 39 - ((value - min) / range) * 31;
      return `${x},${y}`;
    }).join(' ');
  }, [values]);

  if (!points) {
    return <div className="h-12 w-[112px] rounded-lg bg-[#f7f8fb]" />;
  }

  return (
    <svg viewBox="0 0 140 44" className="h-12 w-[112px] overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`1,43 ${points} 139,43`} fill={`url(#spark-${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ActivityChart({ data, period, onPeriodChange }: { data: SellerDashboardData; period: SellerDashboardPeriod; onPeriodChange: (period: SellerDashboardPeriod) => void }) {
  const maxImpressions = Math.max(...data.chart.map((point) => point.impressions), 1);
  const maxClicks = Math.max(...data.chart.map((point) => point.clicks), 1);
  const maxMessages = Math.max(...data.chart.map((point) => point.messages), 1);
  const labelEvery = period === 90 ? 14 : period === 30 ? 5 : 1;

  return (
    <article className="rounded-[22px] border border-[#edf0f6] bg-white p-5 shadow-[0_12px_35px_rgba(41,58,95,0.06)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-[-0.02em] text-[#171b2c]">Динамика активности</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-[#778197]">
            <Legend color="#2f7df4" label="Показы" />
            <Legend color="#15b875" label="Переходы" />
            <Legend color="#f59e0b" label="Сообщения" />
          </div>
        </div>
        <div className="inline-flex w-fit rounded-xl bg-[#f4f6fa] p-1">
          {([7, 30, 90] as SellerDashboardPeriod[]).map((option) => (
            <button key={option} type="button" onClick={() => onPeriodChange(option)} className={cn('h-8 rounded-lg px-3 text-xs font-bold transition', period === option ? 'bg-white text-[#171b2c] shadow-sm' : 'text-[#8a94a8] hover:text-[#4f596f]')}>
              {option} дней
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto pb-1">
        <div className="relative h-[250px]" style={{ minWidth: Math.max(620, data.chart.length * (period === 90 ? 15 : 23)) }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[205px]">
            {[0, 1, 2, 3].map((line) => <div key={line} className="absolute inset-x-0 border-t border-dashed border-[#e9edf4]" style={{ top: `${line * 33.33}%` }} />)}
          </div>
          <div className="absolute inset-x-0 top-0 flex h-[222px] items-end gap-1.5">
            {data.chart.map((point, index) => {
              const impressionHeight = point.impressions ? Math.max(5, (point.impressions / maxImpressions) * 190) : 2;
              const clickHeight = point.clicks ? Math.max(5, (point.clicks / maxClicks) * 115) : 2;
              const messageHeight = point.messages ? Math.max(6, (point.messages / maxMessages) * 72) : 2;
              return (
                <div key={point.date} className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]" title={`${formatDate(point.date)} · Показы ${point.impressions} · Переходы ${point.clicks} · Сообщения ${point.messages}`}>
                  <span className="w-[55%] max-w-[12px] rounded-t-[4px] bg-gradient-to-t from-[#2f7df4] to-[#67a5ff] transition group-hover:brightness-105" style={{ height: impressionHeight }} />
                  <span className="w-[18%] max-w-[4px] rounded-t-full bg-[#15b875]" style={{ height: clickHeight }} />
                  <span className="w-[18%] max-w-[4px] rounded-t-full bg-[#f59e0b]" style={{ height: messageHeight }} />
                  {(index % labelEvery === 0 || index === data.chart.length - 1) && (
                    <span className="absolute top-[228px] whitespace-nowrap text-[10px] font-medium text-[#9aa3b3]">{formatShortDate(point.date)}</span>
                  )}
                </div>
              );
            })}
          </div>
          {!data.chart.some((point) => point.impressions || point.clicks || point.messages) && (
            <div className="absolute inset-x-0 top-16 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-500"><DashboardIcon name="chart" className="h-5 w-5" /></div>
              <p className="mt-3 text-sm font-semibold text-[#515b70]">Данные появятся после первых показов</p>
              <p className="mt-1 text-xs text-[#9aa3b3]">График обновляется автоматически.</p>
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[#a1a9b7]">Серии нормализованы по собственной шкале, чтобы динамика переходов и сообщений оставалась видимой.</p>
    </article>
  );
}

function AdvertisingCard({ data, onDeposit }: { data: SellerDashboardData; onDeposit: () => void }) {
  const advertising = data.advertising;
  const copy = advertisingCopy[advertising.status];
  const base = advertising.bonus_total || advertising.total_deposited;
  const used = advertising.bonus_spent ?? advertising.total_spent;
  const progress = base > 0 ? Math.min(100, Math.round((used / base) * 100)) : 0;
  const canStart = advertising.status === 'ready';

  return (
    <article className="rounded-[22px] border border-[#edf0f6] bg-white p-5 shadow-[0_12px_35px_rgba(41,58,95,0.07)]">
      <div className="flex items-start gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#eef5ff] text-[#2f7df4]">
          <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r="27" fill="none" stroke="#dceaff" strokeWidth="6" />
            <circle cx="32" cy="32" r="27" fill="none" stroke="#2f7df4" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${Math.max(10, progress * 1.7)} 170`} />
          </svg>
          <DashboardIcon name="megaphone" className="relative h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', advertising.status === 'active' ? 'bg-emerald-500' : advertising.status === 'warning' || advertising.status === 'low' ? 'bg-amber-500' : advertising.status === 'stopped' ? 'bg-red-500' : 'bg-blue-500')} />
            <h2 className="text-sm font-extrabold text-[#202538]">{copy.title}</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#7f899e]">{copy.description}</p>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-[#808a9f]">Осталось</div>
          <div className="mt-1 text-[30px] font-extrabold tracking-[-0.04em] text-[#151928]">{formatMoney(advertising.balance)}</div>
        </div>
        <div className="pb-1 text-right text-[11px] leading-4 text-[#929bad]">
          <div>Потрачено за период</div>
          <strong className="text-[#555f74]">{formatMoney(advertising.period_spent)}</strong>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf0f6]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#2f7df4] to-[#64a4ff] transition-all" style={{ width: `${progress}%` }} />
      </div>
      {base > 0 && <div className="mt-2 text-[11px] text-[#949daf]">Использовано {formatMoney(used)} из {formatMoney(base)}{advertising.bonus_total ? ' бонусного баланса' : ''}</div>}
      <div className="mt-4 grid gap-2">
        {canStart ? (
          <Link href={`${Routes.promotion}?shop_id=${data.shop?.id || ''}`} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#171b2c] text-sm font-bold text-white transition hover:bg-[#252b42]">
            Запустить продвижение <DashboardIcon name="arrow" className="h-4 w-4" />
          </Link>
        ) : (
          <button type="button" onClick={onDeposit} className={cn('flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition', advertising.status === 'warning' || advertising.status === 'stopped' ? 'bg-[#171b2c] text-white hover:bg-[#252b42]' : 'bg-[#f1f4f8] text-[#252a3b] hover:bg-[#e8ecf3]')}>
            <DashboardIcon name="wallet" className="h-4 w-4" /> Пополнить баланс
          </button>
        )}
      </div>
    </article>
  );
}

function TodayCard({ data }: { data: SellerDashboardData }) {
  const today = data.today;
  const empty = !today.impressions && !today.clicks && !today.messages;
  return (
    <article className="rounded-[22px] border border-[#edf0f6] bg-white p-5 shadow-[0_12px_35px_rgba(41,58,95,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-[#202538]">Сегодня в магазине</h2>
        <span className="text-[11px] text-[#a0a8b7]">{formatDate(new Date().toISOString().slice(0, 10))}</span>
      </div>
      {empty ? (
        <div className="mt-4 rounded-xl bg-[#f7f8fb] p-4 text-sm font-medium text-[#80899b]">Сегодня пока нет новой активности</div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <TodayMetric icon="eye" color="text-blue-600" soft="bg-blue-50" value={today.impressions} label="показов" />
          <TodayMetric icon="cursor" color="text-emerald-600" soft="bg-emerald-50" value={today.clicks} label="переходов" />
          <TodayMetric icon="message" color="text-amber-600" soft="bg-amber-50" value={today.messages} label="сообщений" />
        </div>
      )}
    </article>
  );
}

function TodayMetric({ icon, color, soft, value, label }: { icon: IconName; color: string; soft: string; value: number; label: string }) {
  return (
    <div className="min-w-0">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', color, soft)}><DashboardIcon name={icon} className="h-4 w-4" /></span>
      <strong className="mt-2 block text-lg font-extrabold text-[#1c2132]">+{formatNumber(value)}</strong>
      <span className="block truncate text-[10px] text-[#9aa3b5]">{label}</span>
    </div>
  );
}

function RecommendationsCard({ data, shopSlug }: { data: SellerDashboardData; shopSlug: string }) {
  const showOnboarding = data.onboarding.completed < data.onboarding.total;
  return (
    <article className="rounded-[22px] border border-[#edf0f6] bg-white p-5 shadow-[0_12px_35px_rgba(41,58,95,0.06)]">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500"><DashboardIcon name="bulb" className="h-4 w-4" /></span>
        <h2 className="text-base font-extrabold text-[#202538]">Что улучшить</h2>
      </div>

      {showOnboarding && (
        <div className="mt-4 rounded-2xl bg-[#f6f8fc] p-4">
          <div className="flex items-center justify-between text-xs font-bold text-[#59647b]"><span>Старт магазина</span><span>{data.onboarding.completed} из {data.onboarding.total}</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#2f7df4]" style={{ width: `${(data.onboarding.completed / data.onboarding.total) * 100}%` }} /></div>
          <div className="mt-3 space-y-2">
            {data.onboarding.steps.map((step) => (
              <div key={step.label} className="flex items-center gap-2 text-[11px] font-medium text-[#707a90]">
                <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border', step.complete ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[#cdd3df] bg-white')}>
                  {step.complete && <DashboardIcon name="check" className="h-2.5 w-2.5" />}
                </span>
                {step.label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 divide-y divide-[#f0f2f6]">
        {data.recommendations.length ? data.recommendations.map((item) => {
          const href = recommendationHref(item.key, shopSlug, data.shop?.id);
          return (
            <Link key={item.key} href={href} className="group flex items-center gap-3 py-3 first:pt-1 last:pb-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#d6dce7] bg-white text-transparent transition group-hover:border-blue-400 group-hover:text-blue-500"><DashboardIcon name="check" className="h-3 w-3" /></span>
              <span className="min-w-0 flex-1"><strong className="block text-xs font-bold text-[#33394c]">{item.title}</strong><span className="mt-0.5 block text-[10px] leading-4 text-[#98a1b2]">{item.description}</span></span>
              <DashboardIcon name="chevron" className="h-4 w-4 shrink-0 text-[#b3bac7] transition group-hover:translate-x-0.5" />
            </Link>
          );
        }) : (
          <div className="py-4 text-sm text-[#7f899c]">Основные шаги выполнены. Продолжайте следить за динамикой.</div>
        )}
      </div>
    </article>
  );
}

function ProductsTable({ data, shopSlug }: { data: SellerDashboardData; shopSlug: string }) {
  return (
    <article className="overflow-hidden rounded-[22px] border border-[#edf0f6] bg-white shadow-[0_12px_35px_rgba(41,58,95,0.06)]">
      <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
        <div><h2 className="text-lg font-extrabold tracking-[-0.02em] text-[#171b2c]">Топ товаров по статистике</h2><p className="mt-1 text-xs text-[#929bad]">Просмотры и переходы по карточкам за выбранный период</p></div>
        <Link href={`/${shopSlug}${Routes.product.list}`} className="hidden items-center gap-1 text-xs font-bold text-[#2f7df4] hover:text-[#1f65ce] sm:flex">Все товары <DashboardIcon name="arrow" className="h-4 w-4" /></Link>
      </div>

      {!data.products.length ? (
        <div className="border-t border-[#f0f2f6] px-6 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500"><DashboardIcon name="box" className="h-5 w-5" /></div>
          <h3 className="mt-3 text-sm font-bold text-[#4a5367]">Добавьте товар, чтобы увидеть статистику</h3>
          <Link href={`/${shopSlug}${Routes.product.create}`} className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#171b2c] px-4 text-xs font-bold text-white">Добавить первый товар</Link>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto border-t border-[#f0f2f6] md:block">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead><tr className="bg-[#fafbfc] text-[10px] font-bold uppercase tracking-[0.05em] text-[#939daf]"><th className="px-6 py-3">Товар</th><th className="px-4 py-3">Просмотры</th><th className="px-4 py-3">Переходы</th><th className="px-4 py-3">CTR</th><th className="px-4 py-3">Сообщения</th><th className="px-4 py-3">Статус</th></tr></thead>
              <tbody className="divide-y divide-[#f0f2f6]">
                {data.products.map((product) => {
                  const status = statusLabels[product.status] || statusLabels.no_data;
                  return (
                    <tr key={product.id} className="transition hover:bg-[#fafbfe]">
                      <td className="px-6 py-3"><Link href={`/${shopSlug}/products/${product.slug}/edit`} className="flex items-center gap-3"><span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[#f2f4f8]"><Image src={product.image?.thumbnail || product.image?.original || siteSettings.product.placeholder} alt={product.name} fill sizes="40px" className="object-cover" /></span><span className="max-w-[260px] truncate text-xs font-bold text-[#343a4d]">{product.name}</span></Link></td>
                      <td className="px-4 py-3 text-xs font-semibold text-[#444c61]">{formatNumber(product.views)}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-[#444c61]">{formatNumber(product.clicks)}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-[#444c61]">{formatCompact(product.ctr)}%</td>
                      <td className="px-4 py-3 text-xs font-semibold text-[#9aa3b4]" title="Чаты пока не связаны с конкретным товаром">{product.messages ?? '—'}</td>
                      <td className="px-4 py-3"><span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold', status.className)}>{status.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[#f0f2f6] border-t border-[#f0f2f6] md:hidden">
            {data.products.map((product) => {
              const status = statusLabels[product.status] || statusLabels.no_data;
              return (
                <Link key={product.id} href={`/${shopSlug}/products/${product.slug}/edit`} className="block p-4">
                  <div className="flex items-center gap-3"><span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#f2f4f8]"><Image src={product.image?.thumbnail || product.image?.original || siteSettings.product.placeholder} alt={product.name} fill sizes="48px" className="object-cover" /></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-[#343a4d]">{product.name}</div><span className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold', status.className)}>{status.label}</span></div></div>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#f8f9fb] p-3 text-center"><SmallStat label="Просмотры" value={formatNumber(product.views)} /><SmallStat label="Переходы" value={formatNumber(product.clicks)} /><SmallStat label="CTR" value={`${formatCompact(product.ctr)}%`} /></div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </article>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return <div><strong className="block text-xs text-[#3f475b]">{value}</strong><span className="mt-0.5 block text-[9px] text-[#9aa3b4]">{label}</span></div>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>;
}

function getHeroCopy(data: SellerDashboardData, hasActivity: boolean) {
  if (data.products_count === 0) {
    return {
      title: 'Ваш магазин готов к старту',
      description: data.advertising.bonus_total
        ? `Мы начислили вам ${formatMoney(data.advertising.bonus_total)} бонусного рекламного баланса. Добавьте товар, чтобы начать продвижение.`
        : 'Добавьте первый товар, чтобы запустить продвижение и получить первые показы.',
      badge: data.advertising.balance > 0 ? `${formatMoney(data.advertising.balance)} на рекламном балансе` : null,
    };
  }
  if (!hasActivity) {
    return {
      title: 'Ваш магазин готов к продвижению',
      description: 'Включите продвижение для товаров — первые реальные показатели появятся здесь автоматически.',
      badge: `${data.products_count} ${plural(data.products_count, 'товар готов', 'товара готовы', 'товаров готовы')}`,
    };
  }
  const growth = data.growth.impressions;
  return {
    title: growth !== null && growth > 0 ? 'Ваш магазин растёт' : 'Ваш магазин получает внимание',
    description: 'Покупатели находят ваши товары благодаря продвижению на SANCAN. Следите за переходами и сообщениями.',
    badge: growth !== null ? `${growth >= 0 ? '+' : ''}${formatCompact(growth)}% показов за период` : 'Появились первые реальные данные',
  };
}

function getPrimaryAction(data: SellerDashboardData, shopSlug: string): { type: 'link'; label: string; href: string } | { type: 'deposit'; label: string } {
  if (data.products_count === 0) return { type: 'link', label: 'Добавить первый товар', href: `/${shopSlug}${Routes.product.create}` };
  if (data.unread_messages > 0) return { type: 'link', label: 'Ответить покупателям', href: Routes.chat };
  if (data.advertising.active_products === 0) return { type: 'link', label: 'Запустить продвижение', href: `${Routes.promotion}?shop_id=${data.shop?.id || ''}` };
  if (data.advertising.balance < 20) return { type: 'deposit', label: 'Пополнить баланс' };
  return { type: 'link', label: 'Добавить ещё товар', href: `/${shopSlug}${Routes.product.create}` };
}

function recommendationHref(key: string, shopSlug: string, shopId?: number) {
  if (key === 'messages') return Routes.chat;
  if (key === 'promotion' || key === 'balance') return `${Routes.promotion}?shop_id=${shopId || ''}`;
  if (key === 'profile') return Routes.profileUpdate;
  if (key === 'shop_description') return `/${shopSlug}/edit`;
  return `/${shopSlug}${Routes.product.create}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value || 0);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value || 0);
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value || 0)} ₽`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`)).replace('.', '');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`)).replace('.', '');
}

function plural(number: number, one: string, few: string, many: string) {
  const mod100 = number % 100;
  const mod10 = number % 10;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

type IconName = 'eye' | 'cursor' | 'document' | 'message' | 'megaphone' | 'wallet' | 'arrow' | 'trending' | 'check' | 'chevron' | 'box' | 'bulb' | 'warning' | 'chart';

function DashboardIcon({ name, className }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    cursor: <><path d="m5 3 6.8 16 2.1-6.1L20 10.8 5 3Z" /><path d="m14 14 4 4" /></>,
    document: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5M10 13h5M10 17h5" /></>,
    message: <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-3.2-.6L4 20l1.4-4A7.5 7.5 0 1 1 20 11.5Z" />,
    megaphone: <><path d="M4 13v-2l12-5v12L4 13Z" /><path d="M8 14v5h4l1-4M18 9c2 1 2 5 0 6" /></>,
    wallet: <><path d="M4 6.5h14a2 2 0 0 1 2 2V19H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" /><path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    trending: <><path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 7 8 4 8-4v10l-8 4-8-4V7ZM12 11v10" /></>,
    bulb: <><path d="M9 18h6M10 22h4" /><path d="M8.5 15.5a7 7 0 1 1 7 0c-.8.6-1.5 1.4-1.5 2.5h-4c0-1.1-.7-1.9-1.5-2.5Z" /></>,
    warning: <><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20V7" /><path d="M2 20h21" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{paths[name]}</svg>;
}
