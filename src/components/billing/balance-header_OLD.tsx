import { useSellerBalanceQuery, useDepositMutation } from '@/data/seller-balance';
import Button from '@/components/ui/button';
import Loader from '@/components/ui/loader/loader';
import { useState } from 'react';

interface BalanceHeaderProps {
  sellerId?: number;
}

export default function BalanceHeader({ sellerId }: BalanceHeaderProps) {
  const { balance, isLoading } = useSellerBalanceQuery();
  const { mutate: deposit, isLoading: isDepositing } = useDepositMutation();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (amount > 0) {
      deposit({ amount, payment_method: 'yookassa' });
      setShowDepositModal(false);
      setDepositAmount('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-body">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-body">Баланс:</span>
        <span className="text-lg font-semibold text-heading">
          {balance?.balance.toFixed(2) || '0.00'} ₽
        </span>
      </div>
      <Button
        size="small"
        onClick={() => setShowDepositModal(true)}
        disabled={isDepositing}
      >
        Пополнить
      </Button>

      {showDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-heading mb-4">Пополнить баланс</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-body mb-2">
                  Сумма пополнения (₽)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-heading"
                  placeholder="Введите сумму"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDepositModal(false);
                    setDepositAmount('');
                  }}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleDeposit}
                  disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isDepositing}
                >
                  {isDepositing ? 'Обработка...' : 'Пополнить'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

