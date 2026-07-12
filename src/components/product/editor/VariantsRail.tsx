import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useRouter } from 'next/router';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useProductEditorStore } from '@/store/useProductEditorStore';

type VariantItem = {
  id?: string | number;
  slug?: string;
  name?: string;
  image?: any;
  attributes?: Record<string, string>;
  price?: number;
};

export default function VariantsRail() {
  const router = useRouter();
  const { watch } = useFormContext<ProductEditorFormData>();
  const { product } = useProductEditorStore();
  const groupVariants = watch('group_variants');
  const name = watch('name');
  const image = watch('image');

  const shop = router.query.shop as string;
  const currentSlug = router.query.productSlug as string;

  const items: VariantItem[] = useMemo(() => {
    const list = Array.isArray(groupVariants) ? groupVariants : [];
    if (list.length > 0) {
      return list.map((v: any, i: number) => ({
        id: v.id,
        slug: v.slug,
        name:
          v.name ||
          (v.attributes
            ? Object.values(v.attributes).filter(Boolean).join(' / ')
            : `Вариант ${i + 1}`),
        image: v.image,
        attributes: v.attributes,
        price: v.price,
      }));
    }

    // Single product fallback card
    return [
      {
        id: product?.id,
        slug: currentSlug,
        name: name || 'Текущий товар',
        image,
      },
    ];
  }, [groupVariants, name, image, product?.id, currentSlug]);

  const openVariant = (item: VariantItem) => {
    if (!item.slug || !shop) return;
    if (item.slug === currentSlug) return;
    router.push(`/${shop}/products/${item.slug}/edit-wizard`);
  };

  const goCreateVariant = () => {
    if (!shop) return;
    router.push(`/${shop}/products/create-wizard`);
  };

  return (
    <aside className="wb-editor-left wb-sticky wb-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="wb-card-title" style={{ margin: 0 }}>
          Варианты
        </h2>
        <span style={{ fontSize: 12, color: '#8c8c8c' }}>
          {items.length}
        </span>
      </div>

      <div>
        {items.map((item, index) => {
          const src =
            item.image?.thumbnail ||
            item.image?.url ||
            item.image?.original ||
            image?.thumbnail ||
            image?.url ||
            image?.original;
          const isActive =
            (!!item.slug && item.slug === currentSlug) ||
            (!item.slug && index === 0 && items.length === 1);

          return (
            <button
              key={item.id || item.slug || index}
              type="button"
              className={`wb-variant-item ${isActive ? 'is-active' : ''}`}
              onClick={() => openVariant(item)}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="wb-variant-thumb" src={src} alt="" />
              ) : (
                <div className="wb-variant-thumb" />
              )}
              <div className="wb-variant-meta">
                <div className="idx">{index + 1}</div>
                <div className="title">{item.name || `Вариант ${index + 1}`}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          Добавить вариант
        </div>
        <button
          type="button"
          className="wb-btn wb-btn-dark wb-btn-block"
          onClick={goCreateVariant}
        >
          Вручную
        </button>
        <button
          type="button"
          className="wb-btn wb-btn-ghost wb-btn-block"
          onClick={() => {
            const el = document.querySelector('[data-section="attributes"]');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          Из своей карточки
        </button>
      </div>
    </aside>
  );
}
