import { useMemo, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useRouter } from 'next/router';
import { useAttributesQuery } from '@/data/attributes';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import FileInput from '@/components/ui/file-input';

type Props = {
  shopId?: string | number;
};

type Axis = {
  attribute?: { id: string | number; name: string; slug?: string; values?: any[] };
  value?: any[];
};

const combinationKey = (options: any[] = []) =>
  options
    .map((option) => `${String(option?.name || '').trim()}:${String(option?.value || '').trim()}`)
    .sort()
    .join('|');

const buildCombinations = (axes: Axis[]) => {
  const valid = axes.filter(
    (axis) => axis?.attribute && Array.isArray(axis.value) && axis.value.length > 0
  );
  if (!valid.length || valid.length !== axes.length) return [];

  return valid.reduce<any[][]>(
    (rows, axis) =>
      rows.flatMap((row) =>
        (axis.value || []).map((value) => [
          ...row,
          {
            name: axis.attribute?.name || '',
            value: value?.value ?? value?.name ?? String(value),
            attribute_id: axis.attribute?.id,
            attribute_value_id: value?.id,
          },
        ])
      ),
    [[]]
  );
};

export default function ProductVariationEditor({ shopId }: Props) {
  const { locale } = useRouter();
  const {
    control,
    register,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<ProductEditorFormData>();
  const { attributes, loading } = useAttributesQuery(
    { shop_id: shopId ? String(shopId) : undefined, language: locale },
    { enabled: Boolean(shopId) }
  );
  const axes = (watch('variations') || []) as Axis[];
  const options = (watch('variation_options') || []) as any[];
  const { fields: axisFields, append: appendAxis, remove: removeAxis } = useFieldArray({
    control,
    name: 'variations' as any,
  });
  const { fields: optionFields, replace: replaceOptions, remove: removeOption } = useFieldArray({
    control,
    name: 'variation_options' as any,
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkQuantity, setBulkQuantity] = useState('');

  const usedAttributeIds = useMemo(
    () => new Set(axes.map((axis) => String(axis?.attribute?.id || '')).filter(Boolean)),
    [axes]
  );

  const generate = () => {
    const combinations = buildCombinations(getValues('variations') as Axis[]);
    const current = (getValues('variation_options') || []) as any[];
    const currentByKey = new Map(
      current.map((option) => [combinationKey(option?.options), option])
    );
    const next = combinations.map((combination) => {
      const saved = currentByKey.get(combinationKey(combination));
      return {
        ...(saved || {}),
        title: combination.map((item) => item.value).join(' / '),
        options: combination,
        price: saved?.price ?? getValues('price') ?? 0,
        sale_price: saved?.sale_price ?? null,
        quantity: saved?.quantity ?? 0,
        stock_status: saved?.stock_status ?? 'unknown',
        sku: saved?.sku ?? '',
        // Новые комбинации нельзя случайно опубликовать как доступные.
        is_disable: saved?.id ? Boolean(saved.is_disable) : true,
      };
    });
    replaceOptions(next as any);
    setSelected({});
  };

  const selectedIndexes = options
    .map((option, index) => ({ index, key: combinationKey(option?.options) }))
    .filter(({ key }) => selected[key])
    .map(({ index }) => index);

  const applyBulk = (mode?: 'enable' | 'disable') => {
    selectedIndexes.forEach((index) => {
      if (bulkPrice !== '' && Number(bulkPrice) >= 0) {
        setValue(`variation_options.${index}.price` as any, Number(bulkPrice), { shouldDirty: true });
      }
      if (bulkQuantity !== '' && Number(bulkQuantity) >= 0) {
        setValue(`variation_options.${index}.quantity` as any, Number(bulkQuantity), { shouldDirty: true });
      }
      if (mode) {
        setValue(`variation_options.${index}.is_disable` as any, mode === 'disable', { shouldDirty: true });
        setValue(`variation_options.${index}.stock_status` as any, mode === 'enable' ? 'known' : 'out_of_stock', { shouldDirty: true });
      }
    });
  };

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5" aria-labelledby="product-variations-title">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="product-variations-title" className="text-lg font-semibold text-heading">Вариации товара</h3>
          <p className="mt-1 text-sm text-body">Выберите атрибуты, сформируйте комбинации и явно включите доступные SKU.</p>
        </div>
        <button type="button" onClick={generate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Сформировать вариации
        </button>
      </div>

      <div className="space-y-4">
        {axisFields.map((field, index) => {
          const axis = axes[index];
          const availableAttributes = (attributes || []).filter(
            (attribute: any) => String(attribute.id) === String(axis?.attribute?.id || '') || !usedAttributeIds.has(String(attribute.id))
          );
          return (
            <div key={field.id} className="grid gap-3 rounded-xl bg-gray-50 p-4 md:grid-cols-[minmax(180px,1fr)_2fr_auto]">
              <label className="text-sm font-medium text-gray-700">
                Атрибут
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                  value={axis?.attribute?.id || ''}
                  disabled={loading}
                  onChange={(event) => {
                    const attribute = (attributes || []).find((item: any) => String(item.id) === event.target.value);
                    setValue(`variations.${index}.attribute` as any, attribute as any, { shouldDirty: true });
                    setValue(`variations.${index}.value` as any, [] as any, { shouldDirty: true });
                  }}
                >
                  <option value="">Выберите атрибут</option>
                  {availableAttributes.map((attribute: any) => <option key={attribute.id} value={attribute.id}>{attribute.name}</option>)}
                </select>
              </label>
              <fieldset>
                <legend className="text-sm font-medium text-gray-700">Значения</legend>
                <div className="mt-1 flex min-h-[42px] flex-wrap gap-2">
                  {(axis?.attribute?.values || []).map((value: any) => {
                    const checked = (axis?.value || []).some((item: any) => String(item.id) === String(value.id));
                    return (
                      <button
                        type="button"
                        key={value.id}
                        aria-pressed={checked}
                        onClick={() => {
                          const current = axis?.value || [];
                          const next = checked ? current.filter((item: any) => String(item.id) !== String(value.id)) : [...current, value];
                          setValue(`variations.${index}.value` as any, next as any, { shouldDirty: true });
                        }}
                        className={`rounded-xl border px-3 py-2 text-sm ${checked ? 'border-blue-600 bg-blue-50 font-semibold text-blue-700' : 'border-gray-300 bg-white text-gray-800'}`}
                      >
                        {value.value}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <button type="button" onClick={() => removeAxis(index)} className="self-end px-2 py-2 text-sm font-medium text-red-600">Удалить</button>
            </div>
          );
        })}
        <button type="button" onClick={() => appendAxis({ attribute: undefined, value: [] } as any)} className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700">
          Добавить атрибут вариации
        </button>
      </div>

      {optionFields.length > 0 && (
        <div className="mt-7">
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="mb-3 text-sm font-semibold text-blue-950">Массовое изменение: выбрано {selectedIndexes.length} SKU</div>
            <div className="flex flex-wrap gap-2">
              <input aria-label="Общая цена" type="number" min="0" step="0.01" placeholder="Цена" value={bulkPrice} onChange={(event) => setBulkPrice(event.target.value)} className="w-32 rounded-lg border border-blue-200 px-3 py-2 text-sm" />
              <input aria-label="Общий остаток" type="number" min="0" placeholder="Остаток" value={bulkQuantity} onChange={(event) => setBulkQuantity(event.target.value)} className="w-32 rounded-lg border border-blue-200 px-3 py-2 text-sm" />
              <button type="button" disabled={!selectedIndexes.length} onClick={() => applyBulk()} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Применить</button>
              <button type="button" disabled={!selectedIndexes.length} onClick={() => applyBulk('enable')} className="rounded-lg border border-green-300 px-3 py-2 text-sm font-semibold text-green-700 disabled:opacity-50">Включить</button>
              <button type="button" disabled={!selectedIndexes.length} onClick={() => applyBulk('disable')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Отключить</button>
            </div>
          </div>

          <div className="space-y-3">
            {optionFields.map((field, index) => {
              const option = options[index] || {};
              const key = combinationKey(option.options);
              return (
                <div key={field.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <input type="checkbox" checked={Boolean(selected[key])} onChange={(event) => setSelected((state) => ({ ...state, [key]: event.target.checked }))} />
                      {option.title || 'Вариация'}
                    </label>
                    <button type="button" onClick={() => removeOption(index)} className="text-sm font-medium text-red-600">Удалить комбинацию</button>
                  </div>
                  <input type="hidden" {...register(`variation_options.${index}.id` as any)} />
                  <input type="hidden" {...register(`variation_options.${index}.title` as any)} />
                  <input type="hidden" {...register(`variation_options.${index}.stock_status` as any)} />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <label className="text-xs text-gray-600">Цена<input type="number" min="0" step="0.01" {...register(`variation_options.${index}.price` as any, { valueAsNumber: true })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
                    <label className="text-xs text-gray-600">Цена со скидкой<input type="number" min="0" step="0.01" {...register(`variation_options.${index}.sale_price` as any, { valueAsNumber: true })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
                    <label className="text-xs text-gray-600">SKU<input {...register(`variation_options.${index}.sku` as any)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
                    <label className="text-xs text-gray-600">Остаток<input type="number" min="0" {...register(`variation_options.${index}.quantity` as any, { valueAsNumber: true })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
                    <label className="flex items-center gap-2 self-end rounded-lg bg-gray-50 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(option.is_disable)}
                        onChange={(event) => {
                          setValue(`variation_options.${index}.is_disable` as any, event.target.checked, { shouldDirty: true });
                          setValue(`variation_options.${index}.stock_status` as any, event.target.checked ? 'out_of_stock' : 'known', { shouldDirty: true });
                        }}
                      />
                      Недоступен
                    </label>
                  </div>
                  <div className="mt-3 max-w-md">
                    <div className="mb-1 text-xs text-gray-600">Изображение SKU (например, фото выбранного цвета)</div>
                    <FileInput name={`variation_options.${index}.image`} control={control} multiple={false} />
                  </div>
                  {(errors as any)?.variation_options?.[index] && <p className="mt-2 text-xs text-red-600">Проверьте цену, SKU и остаток вариации.</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
