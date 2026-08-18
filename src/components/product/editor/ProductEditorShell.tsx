import { ReactNode } from 'react';
import StickyProductGallery from './StickyProductGallery';
import VariantsRail from './VariantsRail';
import { useFormContext } from 'react-hook-form';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';

type ProductEditorShellProps = {
  children: ReactNode;
  footer: ReactNode;
  productId?: string | number;
  boostEnabled: boolean;
  boostStatus: string;
  boostBalance: string;
  boostBusy: boolean;
  onBoostToggle: (enabled: boolean) => void;
};

export default function ProductEditorShell({
  children,
  footer,
  productId,
  boostEnabled,
  boostStatus,
  boostBalance,
  boostBusy,
  onBoostToggle,
}: ProductEditorShellProps) {
  const { watch } = useFormContext<ProductEditorFormData>();
  const name = watch('name');
  const gallery = watch('gallery');
  const image = watch('image');
  const photoCount =
    (image ? 1 : 0) + (Array.isArray(gallery) ? gallery.length : 0);

  return (
    <div className="wb-editor">
      <div className="wb-editor-grid">
        <VariantsRail />

        <main>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
                {productId ? 'Редактирование товара' : 'Добавить товар'}
              </h1>
              <p style={{ margin: '4px 0 0', color: '#8c8c8c', fontSize: 13 }}>
                {name || 'Без названия'}
              </p>
            </div>
            <span className="wb-badge">
              Качество карточки: {Math.min(10, 2 + photoCount * 2)}
            </span>
          </div>

          <div className="wb-main-row">
            <StickyProductGallery />
            <div>{children}</div>
          </div>
        </main>

        <aside className="wb-editor-right wb-sticky space-y-3">
          <div className="wb-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="wb-card-title">Boost продвижение</h2>
                <p style={{ fontSize: 13, color: '#8c8c8c', margin: '6px 0 0' }}>
                  Баланс: {boostBalance} ₽
                </p>
                <p style={{ fontSize: 12, color: '#8c8c8c', margin: '4px 0 0' }}>
                  {!productId && boostEnabled
                    ? 'Запустится сразу после создания товара'
                    : boostStatus === 'starting'
                      ? 'Продвижение включается…'
                      : boostStatus === 'stopping'
                        ? 'Продвижение выключается…'
                        : boostStatus === 'error'
                          ? 'Ошибка синхронизации'
                          : boostEnabled
                            ? 'Продвижение активно'
                            : 'Продвижение выключено'}
                </p>
              </div>
              <button
                type="button"
                disabled={boostBusy}
                onClick={() => onBoostToggle(!boostEnabled)}
                className={`relative mt-1 h-7 w-14 shrink-0 rounded-full transition ${boostEnabled ? 'bg-[#232323]' : 'bg-gray-300'} disabled:opacity-50`}
                aria-label="Boost продвижение"
                aria-pressed={boostEnabled}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${boostEnabled ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <div className="wb-card">
            <h2 className="wb-card-title">Видеообложка</h2>
            <p style={{ fontSize: 13, color: '#8c8c8c', margin: 0 }}>
              Загрузка видео временно отключена. Можно добавить позже в медиа.
            </p>
          </div>

          <details className="wb-card" open>
            <summary
              style={{
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 14,
                listStyle: 'none',
              }}
            >
              Требования к медиа
            </summary>
            <ul className="wb-req-list" style={{ marginTop: 12 }}>
              <li>Минимум 1 фото товара</li>
              <li>Формат JPG/PNG/WEBP, до 5 МБ</li>
              <li>Первое фото — главное на витрине</li>
              <li>Рекомендуется вертикальный кадр 3:4</li>
            </ul>
          </details>
        </aside>
      </div>

      {footer}
    </div>
  );
}
