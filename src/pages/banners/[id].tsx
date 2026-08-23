import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layouts/admin';
import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import { HttpClient } from '@/data/client/http-client';
import { adminOnly } from '@/utils/auth-utils';
import { toast } from 'react-toastify';

type Kind = 'hero' | 'strip' | 'mobile';
const defaults: Record<Kind, Record<string, any>> = {
  hero: {
    background_type: 'color',
    background_color: '#ffe72e',
    gradient_from: '#ff5bd7',
    gradient_to: '#304dff',
    gradient_angle: 90,
    eyebrow: 'SANCAN Маркет',
    eyebrow_color: '#111827',
    eyebrow_background: '#ffffff',
    title: 'Цены напрямую от продавцов',
    title_color: '#000000',
    description: 'Новые товары и выгодные предложения.',
    description_color: '#3f3a16',
    button_one_text: 'Смотреть товары',
    button_one_url: '#',
    button_one_color: '#111827',
    button_one_background: '#ffffff',
    button_two_text: 'Скидки',
    button_two_url: '#',
    button_two_color: '#ffffff',
    button_two_background: '#8057ff',
    card_text: 'Выгодные покупки',
    card_badge: '%',
    card_note: '0+',
    card_background: '#8a65ff',
    card_text_color: '#ffffff',
  },
  strip: {
    background_type: 'gradient',
    background_color: '#168cff',
    gradient_from: '#ef68d5',
    gradient_to: '#4255ff',
    gradient_angle: 90,
    text: 'РАСПРОДАЖА УЖЕ НАЧАЛАСЬ',
    text_color: '#ffffff',
    button_text: 'Забрать сейчас',
    button_url: '#',
    button_color: '#ffffff',
    button_background: '#0b2548',
  },
  mobile: {
    background_type: 'image', background_color: '#6d38e0', gradient_from: '#8c52ff', gradient_to: '#342080', gradient_angle: 135,
    title: 'Цены напрямую от продавцов', title_color: '#ffffff', cta_text: 'Выгода до 70%', cta_url: '/explore', cta_color: '#ffffff', cta_background: '#24143f',
  },
};
const textFields: Record<Kind, Array<[string, string]>> = {
  hero: [
    ['eyebrow', 'Надпись в плашке'],
    ['title', 'Заголовок'],
    ['description', 'Описание'],
    ['button_one_text', 'Текст кнопки 1'],
    ['button_one_url', 'Ссылка кнопки 1'],
    ['button_two_text', 'Текст кнопки 2'],
    ['button_two_url', 'Ссылка кнопки 2'],
    ['card_text', 'Текст правой карточки'],
    ['card_badge', 'Знак карточки'],
    ['card_note', 'Метка карточки'],
  ],
  strip: [
    ['text', 'Основной текст'],
    ['button_text', 'Текст кнопки'],
    ['button_url', 'Ссылка кнопки'],
  ],
  mobile: [['title', 'Заголовок'], ['cta_text', 'Текст CTA'], ['cta_url', 'Ссылка CTA']],
};
const colorFields: Record<Kind, Array<[string, string]>> = {
  hero: [
    ['background_color', 'Цвет фона'],
    ['gradient_from', 'Градиент: начало'],
    ['gradient_to', 'Градиент: конец'],
    ['title_color', 'Цвет заголовка'],
    ['description_color', 'Цвет описания'],
    ['eyebrow_background', 'Фон плашки'],
    ['eyebrow_color', 'Текст плашки'],
    ['button_one_background', 'Фон кнопки 1'],
    ['button_one_color', 'Текст кнопки 1'],
    ['button_two_background', 'Фон кнопки 2'],
    ['button_two_color', 'Текст кнопки 2'],
    ['card_background', 'Фон карточки'],
    ['card_text_color', 'Текст карточки'],
  ],
  strip: [
    ['background_color', 'Цвет фона'],
    ['gradient_from', 'Градиент: начало'],
    ['gradient_to', 'Градиент: конец'],
    ['text_color', 'Цвет текста'],
    ['button_background', 'Фон кнопки'],
    ['button_color', 'Текст кнопки'],
  ],
  mobile: [['background_color', 'Цвет фона'], ['gradient_from', 'Градиент: начало'], ['gradient_to', 'Градиент: конец'], ['title_color', 'Цвет заголовка'], ['cta_background', 'Фон CTA'], ['cta_color', 'Текст CTA']],
};
export default function BannerEditor() {
  const router = useRouter(),
    raw = String(router.query.id || ''),
    creating = raw === 'create',
    id = Number(raw);
  const [kind, setKind] = useState<Kind>('hero'),
    [content, setContent] = useState({ ...defaults.hero }),
    [active, setActive] = useState(true),
    [order, setOrder] = useState(0),
    [image, setImage] = useState<File>(),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!router.isReady || creating) return;
    HttpClient.get<any>('/api/admin/homepage-banners').then((d) => {
      const b = d.banners.find((x: any) => x.id === id);
      if (!b) return router.replace('/banners');
      setKind(b.kind);
      setContent(b.content);
      setActive(b.is_active);
      setOrder(b.sort_order);
    });
  }, [router.isReady, raw]);
  const chooseKind = (v: Kind) => {
    setKind(v);
    setContent({ ...defaults[v] });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const d = new FormData();
      d.append('kind', kind);
      d.append('is_active', active ? '1' : '0');
      d.append('sort_order', String(order));
      Object.entries(content).forEach(([k, v]) =>
        d.append(`content[${k}]`, String(v ?? ''))
      );
      if (image) d.append('image', image);
      await HttpClient.post(
        creating ? '/api/admin/homepage-banners' : `/api/admin/homepage-banners/${id}`,
        d
      );
      toast.success(creating ? 'Баннер создан' : 'Баннер сохранён');
      router.push('/banners');
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Не удалось сохранить баннер'
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {creating ? 'Новый баннер' : 'Редактирование баннера'}
            </h1>
            <p className="mt-1 text-sm text-body">
              Настройте содержимое и сохраните изменения.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push('/banners')}
              className="rounded border px-4 py-2 font-semibold"
            >
              Назад
            </button>
            <Button loading={saving}>Сохранить</Button>
          </div>
        </div>
      </Card>
      <Card>
        <div className="grid gap-5 md:grid-cols-3">
          <label className="font-semibold">
            Тип
            <select
              value={kind}
              disabled={!creating}
              onChange={(e) => chooseKind(e.target.value as Kind)}
              className="mt-1 w-full rounded border p-3"
            >
              <option value="hero">Большой баннер</option>
              <option value="strip">Промо-полоса</option>
              <option value="mobile">Мобильный баннер</option>
            </select>
          </label>
          <label className="font-semibold">
            Порядок
            <input
              type="number"
              min="0"
              value={order}
              onChange={(e) => setOrder(+e.target.value)}
              className="mt-1 w-full rounded border p-3"
            />
          </label>
          <label className="flex items-center gap-2 pt-8 font-semibold">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />{' '}
            Показывать на сайте
          </label>
        </div>
      </Card>
      <Card>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="block font-semibold">
              Тип фона
              <select
                value={content.background_type}
                onChange={(e) =>
                  setContent({ ...content, background_type: e.target.value })
                }
                className="mt-1 w-full rounded border p-3"
              >
                <option value="color">Сплошной цвет</option>
                <option value="gradient">Градиент</option>
                {kind !== 'strip' && <option value="image">Изображение</option>}
              </select>
            </label>
            {kind !== 'strip' && content.background_type === 'image' && (
              <label className="block font-semibold">
                Изображение
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(e) => setImage(e.target.files?.[0])}
                  className="mt-1 block w-full rounded border p-3"
                />
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              {colorFields[kind].map(([key, label]) => (
                <label
                  key={key}
                  className={`${
                    key === 'background_color' &&
                    content.background_type !== 'color'
                      ? 'hidden'
                      : ''
                  } ${
                    key.startsWith('gradient_') &&
                    content.background_type !== 'gradient'
                      ? 'hidden'
                      : ''
                  } text-sm font-semibold`}
                >
                  {label}
                  <div className="mt-1 flex rounded border">
                    <input
                      type="color"
                      value={content[key] || '#000000'}
                      onChange={(e) =>
                        setContent({ ...content, [key]: e.target.value })
                      }
                      className="h-11 w-12"
                    />
                    <input
                      value={content[key] || ''}
                      onChange={(e) =>
                        setContent({ ...content, [key]: e.target.value })
                      }
                      className="w-full px-2"
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {textFields[kind].map(([key, label]) => (
              <label key={key} className="block text-sm font-semibold">
                {label}
                {key === 'description' ? (
                  <textarea
                    value={content[key] || ''}
                    onChange={(e) =>
                      setContent({ ...content, [key]: e.target.value })
                    }
                    className="mt-1 w-full rounded border p-3"
                  />
                ) : (
                  <input
                    value={content[key] || ''}
                    onChange={(e) =>
                      setContent({ ...content, [key]: e.target.value })
                    }
                    className="mt-1 w-full rounded border p-3"
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      </Card>
    </form>
  );
}
BannerEditor.authenticate = { permissions: adminOnly };
BannerEditor.Layout = Layout;
