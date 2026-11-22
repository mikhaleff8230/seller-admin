import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/layouts/admin';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { toast } from 'react-toastify';
import { HttpClient } from '@/data/client/http-client';
import {
  TelegramChannel,
  TelegramPost,
  telegramImportClient,
} from '@/data/telegram-import';

const initialForm = {
  shop_id: '',
  url: '',
  title: '',
  supplier_name: '',
  access_method: 'bot',
  category_id: '',
  price_source: 'wholesale',
  markup_percent: 35,
  fixed_markup: 0,
  round_to: 10,
  minimum_sale_price: '',
  initial_import_mode: 'none',
  initial_import_limit: 20,
  initial_from: '',
  initial_to: '',
  auto_import_enabled: true,
  content_permission_confirmed: false,
};

const statusNames: Record<string, string> = {
  active: 'Активен',
  paused: 'Приостановлен',
  sync_requested: 'Ожидает синхронизации',
  error: 'Ошибка',
  new: 'Новый',
  processing: 'Обрабатывается',
  draft_created: 'Черновик создан',
  review: 'Требует проверки',
  skipped: 'Пропущен',
  duplicate: 'Дубликат',
  excluded: 'Исключён',
};

export default function TelegramImportPage() {
  const [stats, setStats] = useState<any>({});
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [posts, setPosts] = useState<TelegramPost[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<any>(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkMarkup, setBulkMarkup] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [statsData, channelData, postData] = await Promise.all([
        telegramImportClient.stats(),
        telegramImportClient.channels(),
        telegramImportClient.posts(
          statusFilter ? { status: statusFilter } : {}
        ),
      ]);
      setStats(statsData || {});
      setChannels(channelData?.data || []);
      setPosts(postData?.data || []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Не удалось загрузить Telegram Import'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);
  useEffect(() => {
    Promise.all([
      HttpClient.get<any>('/my-shops'),
      HttpClient.get<any>('/categories', { limit: 1000 }),
    ])
      .then(([shopData, categoryData]) => {
        setShops(shopData?.data || shopData || []);
        setCategories(categoryData?.data || categoryData || []);
      })
      .catch(() => undefined);
  }, []);

  const cards = useMemo(
    () => [
      ['Каналов', stats.channels_total || 0],
      ['Активных', stats.channels_active || 0],
      ['Постов сегодня', stats.posts_today || 0],
      ['Черновиков', stats.drafts_created || 0],
      ['На проверке', stats.review || 0],
      ['Ошибок', stats.errors || 0],
    ],
    [stats]
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await telegramImportClient.createChannel({
        ...form,
        shop_id: Number(form.shop_id),
        category_id: form.category_id ? Number(form.category_id) : null,
        markup_percent: Number(form.markup_percent),
        fixed_markup: Number(form.fixed_markup),
        round_to: Number(form.round_to),
        minimum_sale_price: form.minimum_sale_price
          ? Number(form.minimum_sale_price)
          : null,
        initial_import_limit:
          form.initial_import_mode === 'limit'
            ? Number(form.initial_import_limit)
            : null,
      });
      toast.success('Telegram-канал добавлен');
      setForm(initialForm);
      setShowForm(false);
      await load();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Не удалось добавить канал'
      );
    }
  };

  const action = async (run: () => Promise<any>, message: string) => {
    try {
      await run();
      toast.success(message);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Операция не выполнена');
    }
  };

  const bulk = async (
    bulkAction: string,
    extra: Record<string, unknown> = {}
  ) => {
    if (!selected.length) return toast.warning('Выберите публикации');
    await action(
      () =>
        telegramImportClient.bulk({
          post_ids: selected,
          action: bulkAction,
          ...extra,
        }),
      'Массовая операция выполнена'
    );
    setSelected([]);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-heading">
            Telegram Import 2.0
          </h1>
          <p className="text-sm text-gray-500">
            Автоматическое создание черновиков из разрешённых каналов
            поставщиков
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-accent px-4 py-2 font-semibold text-white"
        >
          {showForm ? 'Закрыть' : 'Добавить Telegram-канал'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border bg-white p-4">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-lg border bg-white p-5 md:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Магазин">
            <select
              required
              value={form.shop_id}
              onChange={(e) => setForm({ ...form, shop_id: e.target.value })}
              className="input"
            >
              <option value="">Выберите</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="URL или username">
            <input
              required
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://t.me/channel"
              className="input"
            />
          </Field>
          <Field label="Название">
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Поставщик">
            <input
              value={form.supplier_name}
              onChange={(e) =>
                setForm({ ...form, supplier_name: e.target.value })
              }
              className="input"
            />
          </Field>
          <Field label="Категория по умолчанию">
            <select
              value={form.category_id}
              onChange={(e) =>
                setForm({ ...form, category_id: e.target.value })
              }
              className="input"
            >
              <option value="">Требовать проверку</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Доступ">
            <select
              value={form.access_method}
              onChange={(e) =>
                setForm({ ...form, access_method: e.target.value })
              }
              className="input"
            >
              <option value="bot">Telegram Bot API</option>
              <option value="mtproto">MTProto (разрешённый аккаунт)</option>
            </select>
          </Field>
          <Field label="Базовая цена">
            <select
              value={form.price_source}
              onChange={(e) =>
                setForm({ ...form, price_source: e.target.value })
              }
              className="input"
            >
              <option value="wholesale">Оптовая</option>
              <option value="retail">Розничная</option>
            </select>
          </Field>
          <Field label="Наценка, %">
            <input
              type="number"
              min="0"
              value={form.markup_percent}
              onChange={(e) =>
                setForm({ ...form, markup_percent: e.target.value })
              }
              className="input"
            />
          </Field>
          <Field label="Фиксированная добавка">
            <input
              type="number"
              min="0"
              value={form.fixed_markup}
              onChange={(e) =>
                setForm({ ...form, fixed_markup: e.target.value })
              }
              className="input"
            />
          </Field>
          <Field label="Округление">
            <select
              value={form.round_to}
              onChange={(e) => setForm({ ...form, round_to: e.target.value })}
              className="input"
            >
              <option value="1">1 ₽</option>
              <option value="10">10 ₽</option>
              <option value="50">50 ₽</option>
              <option value="100">100 ₽</option>
            </select>
          </Field>
          <Field label="История">
            <select
              value={form.initial_import_mode}
              onChange={(e) =>
                setForm({ ...form, initial_import_mode: e.target.value })
              }
              className="input"
            >
              <option value="none">Не импортировать</option>
              <option value="limit">Последние публикации</option>
              <option value="dates">Диапазон дат</option>
            </select>
          </Field>
          {form.initial_import_mode === 'limit' && (
            <Field label="Количество">
              <select
                value={form.initial_import_limit}
                onChange={(e) =>
                  setForm({ ...form, initial_import_limit: e.target.value })
                }
                className="input"
              >
                {[20, 50, 100, 500].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </Field>
          )}
          {form.initial_import_mode === 'dates' && (
            <>
              <Field label="С даты">
                <input
                  type="date"
                  required
                  value={form.initial_from}
                  onChange={(e) =>
                    setForm({ ...form, initial_from: e.target.value })
                  }
                  className="input"
                />
              </Field>
              <Field label="По дату">
                <input
                  type="date"
                  required
                  value={form.initial_to}
                  onChange={(e) =>
                    setForm({ ...form, initial_to: e.target.value })
                  }
                  className="input"
                />
              </Field>
            </>
          )}
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.content_permission_confirmed}
              onChange={(e) =>
                setForm({
                  ...form,
                  content_permission_confirmed: e.target.checked,
                })
              }
              required
            />{' '}
            Подтверждаю разрешение поставщика на использование контента
          </label>
          <div className="md:col-span-2">
            <button className="rounded bg-accent px-5 py-2 font-semibold text-white">
              Подключить канал
            </button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-lg border bg-white">
        <h2 className="border-b p-4 text-lg font-semibold">Каналы</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  'Название',
                  'Статус',
                  'Посты',
                  'Товары',
                  'Синхронизация',
                  'Действия',
                ].map((x) => (
                  <th key={x} className="p-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.map((channel) => (
                <tr key={channel.id} className="border-t">
                  <td className="p-3">
                    <div className="font-semibold">{channel.title}</div>
                    <div className="text-xs text-gray-500">
                      @{channel.username || '—'}
                    </div>
                  </td>
                  <td className="p-3">
                    {statusNames[channel.status] || channel.status}
                    {channel.last_error && (
                      <div className="max-w-xs text-xs text-red-600">
                        {channel.last_error}
                      </div>
                    )}
                  </td>
                  <td className="p-3">{channel.posts_count || 0}</td>
                  <td className="p-3">{channel.products_count || 0}</td>
                  <td className="p-3 text-xs">
                    {channel.last_sync_at
                      ? new Date(channel.last_sync_at).toLocaleString('ru-RU')
                      : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          action(
                            () => telegramImportClient.sync(channel.id),
                            'Синхронизация запрошена'
                          )
                        }
                        className="text-accent"
                      >
                        Синхронизировать
                      </button>
                      <button
                        onClick={() =>
                          action(
                            () => telegramImportClient.pause(channel.id),
                            'Канал приостановлен'
                          )
                        }
                        className="text-orange-600"
                      >
                        Пауза
                      </button>
                      <button
                        onClick={() =>
                          confirm('Архивировать канал?') &&
                          action(
                            () => telegramImportClient.remove(channel.id),
                            'Канал архивирован'
                          )
                        }
                        className="text-red-600"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!channels.length && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Каналы ещё не подключены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h2 className="text-lg font-semibold">История импорта</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="rounded border p-2 text-sm"
            >
              <option value="">Категория…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                bulk('set_category', { category_id: Number(bulkCategory) })
              }
              disabled={!bulkCategory}
              className="rounded border px-3 py-2 text-sm"
            >
              Назначить
            </button>
            <input
              value={bulkMarkup}
              onChange={(e) => setBulkMarkup(e.target.value)}
              type="number"
              min="0"
              placeholder="Наценка %"
              className="w-28 rounded border p-2 text-sm"
            />
            <button
              onClick={() =>
                bulk('set_markup', { markup_percent: Number(bulkMarkup) })
              }
              disabled={bulkMarkup === ''}
              className="rounded border px-3 py-2 text-sm"
            >
              Наценка
            </button>
            <button
              onClick={() => bulk('retry')}
              className="rounded border px-3 py-2 text-sm"
            >
              Повторить
            </button>
            <button
              onClick={() => bulk('publish')}
              className="rounded border px-3 py-2 text-sm text-green-700"
            >
              Опубликовать
            </button>
            <button
              onClick={() => bulk('exclude')}
              className="rounded border px-3 py-2 text-sm text-red-600"
            >
              Архивировать
            </button>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border p-2 text-sm"
            >
              <option value="">Все статусы</option>
              {[
                'new',
                'processing',
                'draft_created',
                'review',
                'skipped',
                'duplicate',
                'error',
              ].map((s) => (
                <option key={s} value={s}>
                  {statusNames[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3">
                  <input
                    type="checkbox"
                    checked={
                      posts.length > 0 && selected.length === posts.length
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? posts.map((p) => p.id) : []
                      )
                    }
                  />
                </th>
                {[
                  'Фото',
                  'Канал',
                  'Публикация',
                  'Цена',
                  'Размеры / цвета',
                  'Статус',
                  'Действия',
                ].map((x) => (
                  <th key={x} className="p-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-t align-top">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(post.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, post.id]
                            : selected.filter((id) => id !== post.id)
                        )
                      }
                    />
                  </td>
                  <td className="p-3">
                    {post.media?.[0]?.storage_data?.thumbnail ? (
                      <img
                        src={post.media[0].storage_data.thumbnail}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3">{post.channel?.title}</td>
                  <td className="max-w-md p-3">
                    <div className="font-semibold">
                      {post.normalized_data?.name ||
                        post.original_text?.slice(0, 80) ||
                        'Без описания'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {post.original_date
                        ? new Date(post.original_date).toLocaleString('ru-RU')
                        : ''}
                    </div>
                    {post.error_message && (
                      <div className="text-xs text-red-600">
                        {post.error_message}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {post.normalized_data?.pricing?.selling_price
                      ? `${post.normalized_data.pricing.selling_price} ₽`
                      : '—'}
                  </td>
                  <td className="p-3 text-xs">
                    {[
                      ...(post.normalized_data?.sizes || []),
                      ...(post.normalized_data?.colors || []),
                    ].join(', ') || '—'}
                  </td>
                  <td className="p-3">
                    {statusNames[post.status] || post.status}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      {post.product_id && post.product?.shop?.slug && (
                        <a
                          href={`/${post.product.shop.slug}/products/${
                            post.product.full_slug || post.product.slug
                          }/edit-wizard`}
                          className="text-accent"
                        >
                          Открыть черновик
                        </a>
                      )}
                      {post.source_url && (
                        <a
                          href={post.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent"
                        >
                          Оригинал
                        </a>
                      )}
                      {!post.product_id && (
                        <button
                          onClick={() =>
                            action(
                              () => telegramImportClient.retry(post.id),
                              'Повторная обработка запущена'
                            )
                          }
                          className="text-left text-accent"
                        >
                          Повторить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!posts.length && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    Публикаций пока нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {loading && (
        <div className="fixed bottom-5 right-5 rounded bg-black px-4 py-2 text-sm text-white">
          Обновление…
        </div>
      )}
      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.55rem 0.7rem;
          background: #fff;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}

TelegramImportPage.Layout = Layout;
export async function getStaticProps({ locale }: { locale: string }) {
  return { props: { ...(await serverSideTranslations(locale, ['common'])) } };
}
