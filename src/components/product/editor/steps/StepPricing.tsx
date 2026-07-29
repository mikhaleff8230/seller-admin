import { useFormContext } from 'react-hook-form';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useProductEditorStore } from '@/store/useProductEditorStore';

export default function StepPricing() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProductEditorFormData>();
  const { product } = useProductEditorStore();

  const price = watch('price');
  const salePrice = watch('sale_price');
  const quantity = watch('quantity');

  const systemSku = product?.internal_article || (product as any)?.internal_article || '';
  const discount =
    price && salePrice ? Math.round(((price - salePrice) / price) * 100) : 0;

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

      <div className="max-w-md">
        <Label>Артикул в системе</Label>
        <Input
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
