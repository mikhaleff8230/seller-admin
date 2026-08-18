import { useProductEditorStore } from '@/store/useProductEditorStore';
import { useFormContext } from 'react-hook-form';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { ProductStatus } from '@/types';
import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { Routes } from '@/config/routes';

type EditorActionsProps = {
  onSave: (publish: boolean) => void;
  isLoading: boolean;
  productId?: string | number;
  variant?: 'default' | 'footer';
};

export default function EditorActions({
  onSave,
  isLoading,
  productId,
  variant = 'footer',
}: EditorActionsProps) {
  const { lastSaved, errors } = useProductEditorStore();
  const { t } = useTranslation();
  const router = useRouter();
  const { watch } = useFormContext<ProductEditorFormData>();
  const currentStatus = watch('status') || 'draft';
  const shop = router.query.shop as string;

  const availableStatuses = useMemo(() => {
    return [
      { value: ProductStatus.Publish, label: t('form:input-label-published') || 'Опубликовано' },
      { value: ProductStatus.Draft, label: t('form:input-label-draft') || 'Черновик' },
      { value: ProductStatus.UnPublish, label: t('form:input-label-soft-disabled') || 'Архивировать' },
    ];
  }, [t]);

  const informationalStatuses = useMemo(() => {
    return [
      { value: ProductStatus.UnderReview, label: t('form:input-label-under-review') || 'На модерации' },
      { value: ProductStatus.Approved, label: t('form:input-label-approved') || 'Принят' },
      { value: ProductStatus.Rejected, label: t('form:input-label-rejected') || 'Отклонен' },
    ];
  }, [t]);

  const getStatusLabel = () => {
    const statusLower = currentStatus?.toLowerCase() || 'draft';
    const infoStatus = informationalStatuses.find(
      (status) => statusLower === status.value.toLowerCase()
    );
    if (infoStatus) return infoStatus.label;
    const normalStatus = availableStatuses.find(
      (status) => statusLower === status.value.toLowerCase()
    );
    return normalStatus?.label || 'Черновик';
  };

  const listHref = shop
    ? `/${shop}${Routes.product.list}`
    : Routes.product.list;

  const errorBlock = errors.validation ? (
    <div className="absolute left-6 bottom-[76px] max-w-md p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm">
      <p className="text-sm font-medium text-red-800 mb-1">
        Для публикации заполните обязательные поля:
      </p>
      <p className="text-sm text-red-700">{errors.validation}</p>
    </div>
  ) : null;

  if (variant === 'footer') {
    return (
      <>
        {errorBlock}
        <div className="wb-footer">
          <div className="wb-footer-actions">
            <span
              style={{
                fontSize: 12,
                color: '#8c8c8c',
                marginRight: 8,
              }}
            >
              {getStatusLabel()}
              {lastSaved
                ? ` · ${new Date(lastSaved).toLocaleTimeString()}`
                : ''}
            </span>
            <NextLink
              href={listHref}
              className="wb-btn wb-btn-ghost"
              style={{ textDecoration: 'none' }}
            >
              К списку товаров
            </NextLink>
            <button
              type="button"
              className="wb-btn wb-btn-ghost"
              onClick={() => onSave(false)}
              disabled={isLoading}
            >
              {isLoading ? 'Сохранение…' : 'Сохранить'}
            </button>
            {!productId && (
              <button
                type="button"
                className="wb-btn wb-btn-primary"
                onClick={() => onSave(true)}
                disabled={isLoading}
              >
                Опубликовать
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  return null;
}
