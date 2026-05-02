import { WalletPointsIcon } from '@/components/icons/wallet-point';
import Button from '@/components/ui/button';
import { useTranslation } from 'next-i18next';
import cn from 'classnames';

type PaymentConfirmationModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
  amount: number;
  cancelBtnLoading?: boolean;
  confirmBtnLoading?: boolean;
  isRenewal?: boolean;
};

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  onCancel,
  onConfirm,
  amount,
  cancelBtnLoading = false,
  confirmBtnLoading = false,
  isRenewal = false,
}) => {
  const { t } = useTranslation('common');
  
  // Форматируем сумму с двумя знаками после запятой
  const formattedAmount = amount.toFixed(2);
  
  return (
    <div className="m-auto w-full max-w-sm rounded-md bg-light p-4 pb-6 sm:w-[24rem] md:rounded-xl">
      <div className="h-full w-full text-center">
        <div className="flex h-full flex-col justify-between">
          <WalletPointsIcon className="m-auto mt-4 h-12 w-12 text-accent" />
          <p className="mt-4 text-xl font-bold text-heading">
            {isRenewal 
              ? (t('text-renew-product-period') || 'Продлить период размещения')
              : (t('text-publish-product') || 'Опубликовать товар')
            }
          </p>
          <p className="py-2 px-6 leading-relaxed text-body-dark dark:text-muted">
            {isRenewal 
              ? (t('text-payment-will-renew') || 'Будет списано для продления периода')
              : (t('text-payment-will-be-charged') || 'Будет списано')
            } <strong>{formattedAmount} ₽</strong>
            {isRenewal && (
              <span className="block mt-2 text-sm text-gray-600">
                {t('text-renewal-period-info') || 'Период будет продлен на 180 дней'}
              </span>
            )}
          </p>
          <div className="space-s-4 mt-8 flex w-full items-center justify-between">
            <div className="w-1/2">
              <Button
                onClick={onCancel}
                loading={cancelBtnLoading}
                disabled={cancelBtnLoading || confirmBtnLoading}
                variant="custom"
                className={cn(
                  'w-full rounded bg-accent py-2 px-4 text-center text-base font-semibold text-light shadow-md transition duration-200 ease-in hover:bg-accent-hover focus:bg-accent-hover focus:outline-none',
                )}
              >
                {t('button-cancel') || 'Сбросить'}
              </Button>
            </div>

            <div className="w-1/2">
              <Button
                onClick={onConfirm}
                loading={confirmBtnLoading}
                disabled={cancelBtnLoading || confirmBtnLoading}
                variant="custom"
                className={cn(
                  'w-full rounded bg-green-600 py-2 px-4 text-center text-base font-semibold text-light shadow-md transition duration-200 ease-in hover:bg-green-700 focus:bg-green-700 focus:outline-none',
                )}
              >
                {t('button-publish') || 'Опубликовать'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationModal;

