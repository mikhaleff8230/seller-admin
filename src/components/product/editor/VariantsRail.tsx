import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFormContext } from 'react-hook-form';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useProductEditorStore } from '@/store/useProductEditorStore';
import { useProductsQuery } from '@/data/product';
import { useShopQuery } from '@/data/shop';

type VariantItem = {
  id?: string | number;
  slug?: string;
  name?: string;
  image?: any;
  attributes?: Record<string, string>;
  price?: number;
  sale_price?: number | null;
  quantity?: number;
  sku?: string;
  gallery?: any[];
};

const getImageSrc = (image?: any) =>
  image?.thumbnail || image?.url || image?.original || '';

const buildGroupKey = () => String(Date.now() + Math.floor(Math.random() * 1000));

export default function VariantsRail() {
  const router = useRouter();
  const { watch, setValue, getValues } = useFormContext<ProductEditorFormData>();
  const { product } = useProductEditorStore();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);

  const groupVariants = watch('group_variants');
  const groupKey = watch('group_key');
  const name = watch('name');
  const image = watch('image');

  const shop = router.query.shop as string;
  const currentSlug = router.query.productSlug as string;

  const { data: shopData } = useShopQuery(
    { slug: shop },
    { enabled: Boolean(shop && isPickerOpen) }
  );

  const { products, loading } = useProductsQuery(
    {
      name: search.trim(),
      limit: 20,
      shop_id: shopData?.id ? String(shopData.id) : undefined,
      language: router.locale || 'ru',
    },
    {
      enabled: Boolean(isPickerOpen && shopData?.id),
      keepPreviousData: true,
    }
  );

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
        sale_price: v.sale_price,
        quantity: v.quantity,
        sku: v.sku,
        gallery: v.gallery,
      }));
    }

    return [
      {
        id: product?.id,
        slug: currentSlug,
        name: name || 'Текущий товар',
        image,
        price: getValues('price') || 0,
        sale_price: getValues('sale_price') || null,
        quantity: getValues('quantity') || 0,
        sku: getValues('sku') || '',
      },
    ];
  }, [groupVariants, name, image, product?.id, currentSlug, getValues]);

  const openVariant = (item: VariantItem) => {
    if (!item.slug || !shop) return;
    if (item.slug === currentSlug) return;
    router.push(`/${shop}/products/${item.slug}/edit-wizard`);
  };

  const toggleProduct = (id: string | number) => {
    setSelectedIds((current) =>
      current.some((item) => String(item) === String(id))
        ? current.filter((item) => String(item) !== String(id))
        : [...current, id]
    );
  };

  const addSelectedProducts = () => {
    if (selectedIds.length === 0) {
      toast.error('Выберите товары для добавления в варианты');
      return;
    }

    const currentVariants = Array.isArray(groupVariants) ? groupVariants : [];
    const currentProductVariant = {
      id: product?.id,
      slug: currentSlug,
      name: getValues('name') || product?.name || 'Текущий товар',
      image: getValues('image'),
      attributes: getValues('attribute_values') || {},
      price: getValues('price') || 0,
      sale_price: getValues('sale_price') || null,
      quantity: getValues('quantity') || 0,
      sku: getValues('sku') || '',
      gallery: getValues('gallery') || [],
    };

    const baseVariants =
      currentVariants.length > 0
        ? currentVariants
        : currentProductVariant.id || currentProductVariant.slug
          ? [currentProductVariant]
          : [];

    const productsToAdd = products
      .filter((candidate: any) =>
        selectedIds.some((id) => String(id) === String(candidate.id))
      )
      .filter(
        (candidate: any) =>
          !baseVariants.some((variant: any) => String(variant.id) === String(candidate.id))
      )
      .map((candidate: any) => ({
        id: candidate.id,
        slug: candidate.slug,
        name: candidate.name,
        image: candidate.image,
        attributes: candidate.attribute_values || candidate.attributes || {},
        price: candidate.price || 0,
        sale_price: candidate.sale_price || null,
        quantity: candidate.quantity || 0,
        sku: candidate.sku || '',
        gallery: candidate.gallery || [],
      }));

    if (productsToAdd.length === 0) {
      toast.info('Выбранные товары уже есть в вариантах');
      return;
    }

    if (!groupKey) {
      setValue('group_key', buildGroupKey() as any, { shouldDirty: true });
    }

    setValue('is_group_product', true as any, { shouldDirty: true });
    setValue('group_variants', [...baseVariants, ...productsToAdd] as any, {
      shouldDirty: true,
      shouldValidate: true,
    });

    toast.success(`Добавлено вариантов: ${productsToAdd.length}`);
    setSelectedIds([]);
    setIsPickerOpen(false);
  };

  const pickerModal =
    isPickerOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/45 p-4"
            onClick={() => setIsPickerOpen(false)}
          >
            <div
              className="flex h-[82vh] w-full max-w-3xl flex-col rounded-xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-heading">Добавить товар в варианты</h3>
                  <p className="mt-1 text-sm text-body">
                    Выберите свои товары, которые нужно связать с текущей карточкой как варианты.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full px-3 py-1 text-xl leading-none text-gray-500 hover:bg-gray-100"
                  onClick={() => setIsPickerOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="shrink-0">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Поиск по названию товара"
                  className="mb-4 h-11 w-full rounded-lg border border-gray-200 px-4 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-100">
                {loading ? (
                  <div className="p-4 text-sm text-body">Загружаем товары...</div>
                ) : products.length === 0 ? (
                  <div className="p-4 text-sm text-body">Товары не найдены</div>
                ) : (
                  products.map((candidate: any) => {
                    const isCurrent =
                      String(candidate.id) === String(product?.id) ||
                      (!!candidate.slug && candidate.slug === currentSlug);
                    const alreadyInGroup = items.some(
                      (item) => String(item.id) === String(candidate.id)
                    );
                    const disabled = isCurrent || alreadyInGroup;
                    const checked = selectedIds.some(
                      (id) => String(id) === String(candidate.id)
                    );
                    const src = getImageSrc(candidate.image);

                    return (
                      <label
                        key={candidate.id}
                        className={`flex items-center gap-3 border-b border-gray-100 p-3 last:border-b-0 ${
                          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleProduct(candidate.id)}
                        />
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt=""
                            className="h-12 w-12 rounded-md object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-md bg-gray-100" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-heading">
                            {candidate.name}
                          </span>
                          <span className="text-xs text-body">
                            ID: {candidate.id}
                            {candidate.price != null ? ` · ${candidate.price} ₽` : ''}
                            {alreadyInGroup ? ' · уже в вариантах' : ''}
                            {isCurrent ? ' · текущий товар' : ''}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="mt-5 flex shrink-0 justify-end gap-3">
                <button
                  type="button"
                  className="wb-btn wb-btn-ghost"
                  onClick={() => setIsPickerOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="wb-btn wb-btn-dark"
                  onClick={addSelectedProducts}
                >
                  Добавить{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <aside className="wb-editor-left wb-sticky wb-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="wb-card-title" style={{ margin: 0 }}>
          Варианты
        </h2>
        <span style={{ fontSize: 12, color: '#8c8c8c' }}>{items.length}</span>
      </div>

      <div>
        {items.map((item, index) => {
          const src = getImageSrc(item.image) || getImageSrc(image);
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
        <button
          type="button"
          className="wb-btn wb-btn-dark wb-btn-block"
          onClick={() => setIsPickerOpen(true)}
        >
          Добавить вариант
        </button>
      </div>

      {pickerModal}
    </aside>
  );
}
