import { useQuery, useMutation, useQueryClient } from 'react-query';
import { API_ENDPOINTS } from '@/data/client/api-endpoints';
import { HttpClient } from '@/data/client/http-client';
import { toast } from 'react-toastify';

export interface SellerBalance {
  balance: number;
  total_deposited: number;
  total_spent: number;
}

export interface BalanceResponse {
  success: boolean;
  data: SellerBalance;
}

export interface BalanceLedgerItem {
  id: string;
  type: string;
  amount: number;
  balance_before: number | null;
  balance_after: number | null;
  description: string;
  created_at: string;
}

export interface BalanceLedgerResponse {
  success: boolean;
  data: BalanceLedgerItem[];
}

export interface DepositRequest {
  amount: number;
  payment_method: 'yookassa';
}

export interface DepositResponse {
  success: boolean;
  message: string;
  data?: {
    payment_url?: string;
    payment_id?: string;
    amount?: number;
  };
  payment_url?: string;
  payment_id?: string;
  amount?: number;
}

export const useSellerBalanceQuery = () => {
  const { data, error, isLoading, refetch } = useQuery<BalanceResponse, Error>(
    ['seller-balance'],
    () => HttpClient.get<BalanceResponse>(`/api/seller/balance`),
    {
      retry: 1,
      refetchInterval: 60_000,
    }
  );

  return {
    balance: data?.data,
    isLoading,
    error,
    refetch,
  };
};

export const useBalanceLedgerQuery = () => {
  const { data, error, isLoading, refetch } = useQuery<BalanceLedgerResponse, Error>(
    ['seller-balance-ledger'],
    () => HttpClient.get<BalanceLedgerResponse>('/api/seller/balance/ledger?limit=50'),
    {
      retry: 1,
      refetchInterval: 60_000,
    }
  );

  return {
    entries: data?.data ?? [],
    isLoading,
    error,
    refetch,
  };
};

export const useDepositMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<DepositResponse, Error, DepositRequest>(
    (data) => HttpClient.post<DepositResponse>(`/api/seller/balance/deposit`, data),
    {
      onSuccess: (response) => {
        // Проверяем payment_url в корне ответа или в data
        const paymentUrl = response.payment_url || response.data?.payment_url;
        
        if (response.success && paymentUrl) {
          // Редирект на страницу оплаты
          window.location.href = paymentUrl;
        } else if (response.success) {
          toast.success(response.message || 'Баланс успешно пополнен');
          queryClient.invalidateQueries(['seller-balance']);
        } else {
          toast.error(response.message || 'Ошибка при пополнении баланса');
        }
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Ошибка при пополнении баланса');
      },
    }
  );
};

export interface CheckPendingResponse {
  success: boolean;
  data: {
    has_pending: boolean;
    processed?: boolean;
    amount?: number;
    old_balance?: number;
    new_balance?: number;
    status?: string;
    message: string;
  };
}

export const useCheckPendingDeposit = () => {
  const queryClient = useQueryClient();

  return useMutation<CheckPendingResponse, Error, void>(
    () => HttpClient.get<CheckPendingResponse>(`/api/seller/balance/check-pending`),
    {
      onSuccess: (response) => {
        if (response.success && response.data.processed) {
          toast.success(`✅ Баланс пополнен на ${response.data.amount} ₽`);
          queryClient.invalidateQueries(['seller-balance']);
        }
      },
      onError: (error: any) => {
        // Не показываем ошибку, так как это проверка статуса
        console.error('Ошибка при проверке статуса пополнения:', error);
      },
    }
  );
};

export interface VirtualDepositRequest {
  seller_id: number;
  amount: number;
}

export interface VirtualDepositResponse {
  success: boolean;
  message: string;
  data?: {
    seller_id: number;
    amount: number;
    old_balance: number;
    new_balance: number;
    deposit_id: number;
  };
}

export const useVirtualDepositMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<VirtualDepositResponse, Error, VirtualDepositRequest>(
    (data) => HttpClient.post<VirtualDepositResponse>(`/api/admin/seller/balance/virtual-deposit`, data),
    {
      onSuccess: (response) => {
        if (response.success) {
          toast.success(response.message || `Баланс успешно пополнен на ${response.data?.amount} ₽`);
          queryClient.invalidateQueries(['seller-balance']);
        } else {
          toast.error(response.message || 'Ошибка при пополнении баланса');
        }
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Ошибка при виртуальном пополнении баланса');
      },
    }
  );
};




