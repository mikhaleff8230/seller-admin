import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { HttpClient } from '@/data/client/http-client';

export type AiServiceType = 'photo' | 'text' | 'analysis' | 'pricing';
export type AiJobStatus =
  | 'draft'
  | 'waiting_confirmation'
  | 'paid'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface AiService {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  service_type: AiServiceType;
  provider: string;
  model: string;
  cost: number;
  currency: 'credits' | 'rub';
  is_active: boolean;
  sort_order: number;
  seller_balance?: number;
  can_charge?: boolean;
}

export interface AiServiceJob {
  id: number;
  seller_id: number;
  product_id?: number | null;
  product_image_id?: number | null;
  ai_service_id: number;
  service?: AiService;
  status: AiJobStatus;
  provider: string;
  model: string;
  input_payload?: Record<string, any> | null;
  output_payload?: Record<string, any> | null;
  input_image_url?: string | null;
  output_image_url?: string | null;
  cost: number;
  currency: 'credits' | 'rub';
  balance_transaction_id?: number | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ServicesResponse {
  services?: AiService[];
  data?: AiService[];
}

interface JobsResponse {
  data?: AiServiceJob[];
}

interface CreateAiJobResponse {
  job_id: number;
  status: AiJobStatus;
  cost: number;
  currency: 'credits' | 'rub';
  balance: number;
}

interface ConfirmAiJobResponse {
  job_id: number;
  status: AiJobStatus;
  charged: number;
  currency: 'credits' | 'rub';
  balance_after: number;
  message?: string;
}

interface CreateAiJobInput {
  service_code: string;
  product_id?: number;
  product_image_id?: number;
  input_image_url?: string;
  context?: Record<string, any>;
}

export const useAiServicesQuery = (productId?: number) => {
  const { data, isLoading, error, refetch } = useQuery<ServicesResponse, Error>(
    ['ai-services', productId],
    () => HttpClient.get<ServicesResponse>('/api/ai/services', productId ? { product_id: productId } : undefined),
    {
      retry: 1,
    }
  );

  return {
    services: data?.services ?? data?.data ?? [],
    isLoading,
    error,
    refetch,
  };
};

export const useSellerAiJobsQuery = (productId?: number, enabled = true) => {
  const { data, isLoading, error, refetch } = useQuery<JobsResponse, Error>(
    ['seller-ai-jobs', productId],
    () => HttpClient.get<JobsResponse>('/api/seller/ai/jobs', productId ? { product_id: productId } : undefined),
    {
      enabled,
      refetchInterval: (response) => {
        const jobs = response?.data ?? [];
        return jobs.some((job) => ['paid', 'processing'].includes(job.status)) ? 3000 : false;
      },
      retry: 1,
    }
  );

  return {
    jobs: data?.data ?? [],
    isLoading,
    error,
    refetch,
  };
};

export const useCreateAiJobMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateAiJobResponse, Error, CreateAiJobInput>(
    (payload) => HttpClient.post<CreateAiJobResponse>('/api/ai/jobs', payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('seller-ai-jobs');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Не удалось создать AI-задачу');
      },
    }
  );
};

export const useConfirmAiJobMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<ConfirmAiJobResponse, Error, number>(
    (jobId) => HttpClient.post<ConfirmAiJobResponse>(`/api/ai/jobs/${jobId}/confirm`, {}),
    {
      onSuccess: (response) => {
        toast.success(response.message || 'AI-задача запущена');
        queryClient.invalidateQueries('seller-ai-jobs');
        queryClient.invalidateQueries('seller-balance');
        queryClient.invalidateQueries('ai-services');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Не удалось списать баланс и запустить AI');
      },
    }
  );
};

export const useCancelAiJobMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<AiServiceJob>, Error, number>(
    (jobId) => HttpClient.post<ApiResponse<AiServiceJob>>(`/api/ai/jobs/${jobId}/cancel`, {}),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('seller-ai-jobs');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Не удалось отменить AI-задачу');
      },
    }
  );
};

interface ApplyAiJobResponse {
  success: boolean;
  job_id: number;
  gallery_item?: {
    thumbnail: string;
    original: string;
    url: string;
  };
  message?: string;
}

export const useApplyAiJobMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<ApplyAiJobResponse, Error, number>(
    (jobId) => HttpClient.post<ApplyAiJobResponse>(`/api/ai/jobs/${jobId}/apply`, {}),
    {
      onSuccess: (response) => {
        toast.success(response.message || 'AI-результат применён');
        queryClient.invalidateQueries('seller-ai-jobs');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Не удалось применить AI-результат');
      },
    }
  );
};

export const useRejectAiJobMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<AiServiceJob>, Error, number>(
    (jobId) => HttpClient.post<ApiResponse<AiServiceJob>>(`/api/ai/jobs/${jobId}/reject`, {}),
    {
      onSuccess: (response: any) => {
        toast.success(response?.message || 'AI-результат отклонён');
        queryClient.invalidateQueries('seller-ai-jobs');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Не удалось отклонить AI-результат');
      },
    }
  );
};
