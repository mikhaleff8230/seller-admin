import { useFormContext } from 'react-hook-form';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useProductEditorStore } from '@/store/useProductEditorStore';
import ProductVariationEditor from '../components/ProductVariationEditor';

export default function StepPricing({ shopId }: { shopId?: string | number }) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProductEditorFormData>();
  const { product } = useProductEditorStore();

  const price = watch('price');
  const salePrice = watch('sale_price');
  const quantity = watch('quantity');
  const productType = watch('product_type') || 'simple';

  const systemSku = (product as any)?.internal_article || '';
  const discount =
    price && salePrice ? Math.round(((price - salePrice) / price) * 100) : 0;
  const sourcePlatform = (product as any)?.source_platform;
  const sourceUrl = String((product as any)?.preview_url || '');
  const marketplaceName = sourcePlatform === 'wildberries' || sourceUrl.includes('wildberries.ru') ? 'Wildberries' : 'Ozon';
  const isMarketplaceProduct = sourcePlatform === 'ozon' || sourcePlatform === 'wildberries' || sourceUrl.includes('ozon.ru') || sourceUrl.includes('wildberries.ru');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-xl font-semibold text-heading">
          Цена и наличие
        </h2>
        <p className="mb-6 text-sm text-body">
          Укажите цену товара, количество на складе и артикул продавца.
        </p>
      </div>

      <fieldset className="max-w-3xl">
        <legend className="mb-2 text-sm font-semibold text-heading">Тип товарной позиции</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`cursor-pointer rounded-xl border p-4 ${productType === 'simple' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
            <input className="mr-2" type="radio" value="simple" {...register('product_type')} />
            <span className="font-semibold">Простой товар</span>
            <span className="mt-1 block text-xs text-gray-600">Одна товарная позиция без выбираемых SKU.</span>
          </label>
          <label className={`cursor-pointer rounded-xl border p-4 ${productType === 'variable' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
            <input className="mr-2" type="radio" value="variable" {...register('product_type')} />
            <span className="font-semibold">Вариативный товар</span>
            <span className="mt-1 block text-xs text-gray-600">Один Product ID, размеры, цвета и другие SKU внутри карточки.</span>
          </label>
        </div>
      </fieldset>

      <div className="grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <Input
            label="Цена"
            type="number"
            step="0.01"
            {...register('price', { valueAsNumber: true })}
            error={errors.price?.message}
            variant="outline"
            floatingLabel
            required
          />
        </div>

        <div>
          <Input
            label="Цена со скидкой"
            type="number"
            step="0.01"
            {...register('sale_price', { valueAsNumber: true })}
            error={errors.sale_price?.message}
            variant="outline"
            floatingLabel
          />
        </div>

        <div>
          <Input
            label="Количество"
            type="number"
            {...register('quantity', { valueAsNumber: true })}
            error={errors.quantity?.message}
            variant="outline"
            floatingLabel
            required
          />
        </div>

        <div>
          <Input
            label="Артикул продавца *"
            {...register('sku', {
              pattern: {
                value: /^[a-zA-Z0-9]+$/,
                message: 'Артикул может содержать только латинские буквы и цифры',
              },
              onChange: (event) => {
                event.target.value = event.target.value.replace(/[^a-zA-Z0-9]/g, '');
              },
            })}
            error={errors.sku?.message}
            variant="outline"
            floatingLabel
          />
        </div>
      </div>

      {productType === 'variable' && <ProductVariationEditor shopId={shopId} />}

      {isMarketplaceProduct && (
        <div className="max-w-3xl rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-3 font-semibold text-blue-950">Источник {marketplaceName}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div><span className="block text-xs text-gray-500">Цена {marketplaceName}</span><b>{(product as any)?.source_price != null ? `${Number((product as any).source_price).toLocaleString('ru-RU')} ₽` : '—'}</b></div>
            <div><span className="block text-xs text-gray-500">Наценка</span><b>{(product as any)?.source_markup_percent != null ? `${Number((product as any).source_markup_percent)}%` : '—'}</b></div>
            <div><span className="block text-xs text-gray-500">Доп. расходы</span><b>{(product as any)?.source_additional_costs != null ? `${Number((product as any).source_additional_costs).toLocaleString('ru-RU')} ₽` : '—'}</b></div>
            <div><span className="block text-xs text-gray-500">Цена SANCAN</span><b>{Number(price || 0).toLocaleString('ru-RU')} ₽</b></div>
          </div>
          {(product as any)?.preview_url && <a className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline" href={(product as any).preview_url} target="_blank" rel="noreferrer">Открыть источник {marketplaceName} ↗</a>}
        </div>
      )}

      <div className="max-w-md">
        <Label>Артикул в системе</Label>
        <Input
          name="system_internal_article"
          value={systemSku || 'Будет сгенерирован при сохранении'}
          variant="outline"
          disabled
          className="bg-gray-50"
        />
        <p className="mt-1 text-xs text-gray-500">
          Автоматически генерируется системой при создании товара
        </p>
      </div>

      {discount > 0 && (
        <div className="max-w-3xl">
          <p className="text-sm text-green-600">Скидка: {discount}%</p>
        </div>
      )}

      <div className="max-w-3xl">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            {quantity && quantity > 0
              ? `Товар в наличии (${quantity} шт.)`
              : 'Товар отсутствует на складе'}
          </p>
        </div>
      </div>
    </div>
  );
}
