import axios from 'axios';
import Cookies from 'js-cookie';
import Router from 'next/router';
import invariant from 'tiny-invariant';
import { toast } from 'react-toastify';

invariant(
  process.env.NEXT_PUBLIC_REST_API_ENDPOINT || process.env.NEXT_PUBLIC_API_URL,
  'NEXT_PUBLIC_REST_API_ENDPOINT or NEXT_PUBLIC_API_URL is not defined, please define it in your .env file'
);
const Axios = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_REST_API_ENDPOINT || process.env.NEXT_PUBLIC_API_URL,
  timeout: 50000,
  headers: {
    'Content-Type': 'application/json',
  },
});
// Change request data/error
const AUTH_TOKEN_KEY = process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY ?? 'authToken';
Axios.interceptors.request.use((config) => {
  const cookies = Cookies.get(AUTH_TOKEN_KEY);
  let token = '';
  if (cookies) {
    token = JSON.parse(cookies)['token'];
  }
// @ts-ignore
  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${token}`,
  };
  
  // Если отправляем FormData, удаляем Content-Type чтобы браузер установил правильный boundary
  // ВАЖНО: для FormData НЕ устанавливаем Content-Type - браузер сделает это сам с правильным boundary
  if (config.data instanceof FormData) {
    // Удаляем Content-Type из headers, чтобы браузер установил правильный boundary
    // Это критично для правильной отправки файлов
    console.log('Axios interceptor - FormData detected, removing Content-Type', {
      url: config.url,
      method: config.method,
      hasVideo: config.data.has('video'),
      currentContentType: config.headers['Content-Type'],
    });
    delete config.headers['Content-Type'];
    // Также удаляем из всех возможных мест
    if (config.headers && 'Content-Type' in config.headers) {
      delete config.headers['Content-Type'];
    }
    console.log('Axios interceptor - Content-Type removed', {
      contentTypeAfter: config.headers['Content-Type'],
    });
  }
  
  return config;
});

// Change response data/error here
let isReloading = false; // Защита от бесконечного цикла перезагрузок

Axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const message = error.response?.data?.message || '';
    
    // Проверяем, что это действительно ошибка авторизации (токен отсутствует или невалиден)
    // а не ошибка прав доступа (403 может быть из-за недостатка прав, но пользователь авторизован)
    const isAuthError = 
      status === 401 || 
      (status === 403 && message === 'PICKBAZAR_ERROR.NOT_AUTHORIZED') ||
      message === 'PICKBAZAR_ERROR.NOT_AUTHORIZED';
    
    // Исключаем обработку 401/403 для определенных запросов, которые могут возвращать эти ошибки
    // по другим причинам (например, недостаточно прав, но пользователь авторизован)
    // ВАЖНО: Не разлогиниваем при 403 для запросов на создание/обновление товара,
    // так как товар может создаваться даже при недостатке прав (в статусе черновик)
    const excludedUrls = [
      '/products', // Запросы к товарам могут возвращать 403 при недостатке прав
      '/shops',    // Запросы к магазинам могут возвращать 403 при недостатке прав
    ];
    
    // Проверяем, не является ли это запрос на создание/обновление товара
    const isProductCreateUpdate = url.includes('/products') && 
      (error.config?.method === 'post' || error.config?.method === 'put' || error.config?.method === 'patch');
    
    // Проверяем, не является ли это запрос, который мы должны исключить
    const isExcludedUrl = excludedUrls.some(excludedUrl => url.includes(excludedUrl));
    
    // Проверяем наличие токена - если токен есть, то 403 может быть ошибкой прав доступа,
    // а не авторизации
    const cookies = Cookies.get(AUTH_TOKEN_KEY);
    let hasToken = false;
    if (cookies) {
      try {
        const tokenData = JSON.parse(cookies);
        hasToken = !!tokenData?.token;
      } catch (e) {
        hasToken = false;
      }
    }
    
    // Определяем тип ошибки
    const isExplicitAuthError = message === 'PICKBAZAR_ERROR.NOT_AUTHORIZED';
    const isPermissionError = status === 403 && hasToken && !isExplicitAuthError; // 403 с токеном - ошибка прав доступа
    const isUnauthorizedError = status === 401 && !isProductCreateUpdate; // 401 - ошибка авторизации (кроме создания товара)
    
    // Показываем уведомление при ошибке прав доступа (403 с токеном)
    if (isPermissionError) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Недостаточно прав для выполнения этого действия';
      toast.error(errorMessage, {
        autoClose: 5000,
      });
      console.warn('Permission error (403 with token):', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.response?.data?.message,
      });
      // Не разлогиниваем при ошибке прав доступа - просто показываем уведомление
      return Promise.reject(error);
    }
    
    // Логика разлогинивания:
    // 1. Для 401: разлогиниваем только если это не запрос на создание/обновление товара
    // 2. Для явной ошибки авторизации (PICKBAZAR_ERROR.NOT_AUTHORIZED) - всегда разлогиниваем
    // 3. Для 403 при создании товара - не разлогиниваем (товар может создаваться в черновике)
    const shouldLogout = isAuthError && 
        !(status === 403 && isProductCreateUpdate && !isExplicitAuthError) && // 403 при создании товара - не разлогиниваем
        !(status === 401 && isProductCreateUpdate); // 401 при создании товара - не разлогиниваем (товар может создаваться)
    
    if (shouldLogout) {
      // Проверяем, не находимся ли мы уже в процессе перезагрузки
      if (!isReloading) {
        isReloading = true;
        console.error('Authorization error, redirecting to login...', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.message,
          hasToken: hasToken
        });
        Cookies.remove(AUTH_TOKEN_KEY);
        
        // Небольшая задержка перед перезагрузкой для избежания спама
        setTimeout(() => {
          Router.reload();
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

function formatBooleanSearchParam(key: string, value: boolean) {
  return value ? `${key}:1` : `${key}:`;
}

interface SearchParamOptions {
  status: string;
  moderation_status: string;
  categories: string;
  code: string;
  type: string;
  name: string;
  shop_id: string;
  is_approved: boolean;
  tracking_number: string;
  notice: string;
}

export class HttpClient {
  static async get<T>(url: string, params?: unknown) {
    const response = await Axios.get<T>(url, { params });
    return response.data;
  }

  static async post<T>(url: string, data: unknown, options?: any) {
    // Логируем запросы для OTP регистрации
    if (url.includes('otp-login') && data && typeof data === 'object') {
      console.log('HttpClient.post - OTP login request:', {
        url,
        data: JSON.stringify(data),
        permission: (data as any).permission,
      });
    }
    // Логируем запросы для создания/обновления SKU
    if (url.includes('/skus') && data && typeof data === 'object') {
      console.log('HttpClient.post - SKU request:', {
        url,
        hasProperties: !!(data as any).properties,
        properties: (data as any).properties,
        propertiesCount: Array.isArray((data as any).properties) ? (data as any).properties.length : 0,
        dataKeys: Object.keys(data as any),
      });
    }
    // Логируем запросы для создания товара с видео
    if (data instanceof FormData && url.includes('/products')) {
      console.log('HttpClient.post - Product create with FormData', {
        url,
        hasVideo: data.has('video'),
        videoFile: data.get('video'),
        isFile: data.get('video') instanceof File,
        videoFileName: data.get('video') instanceof File ? (data.get('video') as File).name : 'not a file',
        videoFileSize: data.get('video') instanceof File ? (data.get('video') as File).size : 'not a file',
        formDataKeys: Array.from(data.keys()),
      });
    }
    const response = await Axios.post<T>(url, data, options);
    
    // Логируем ответ для создания товара
    if (data instanceof FormData && url.includes('/products')) {
      console.log('HttpClient.post - Product create response', {
        url,
        hasResponse: !!response,
        responseData: response.data,
        hasVideos: !!(response.data as any)?.videos,
        videosCount: Array.isArray((response.data as any)?.videos) ? (response.data as any).videos.length : 0,
      });
    }
    
    return response.data;
  }

  static async put<T>(url: string, data: unknown) {
    // Для FormData не устанавливаем Content-Type - interceptor удалит его и браузер установит правильный boundary
    if (data instanceof FormData) {
      console.log('HttpClient.put - sending FormData', {
        url,
        hasVideo: data.has('video'),
        videoFile: data.get('video'),
        isFile: data.get('video') instanceof File,
        videoFileName: data.get('video') instanceof File ? (data.get('video') as File).name : 'not a file',
        videoFileSize: data.get('video') instanceof File ? (data.get('video') as File).size : 'not a file',
        keys: Array.from(data.keys()),
      });
    }
    // Логируем запросы для обновления SKU
    if (url.includes('/skus') && data && typeof data === 'object') {
      console.log('HttpClient.put - SKU update request:', {
        url,
        hasProperties: !!(data as any).properties,
        properties: (data as any).properties,
        propertiesCount: Array.isArray((data as any).properties) ? (data as any).properties.length : 0,
        dataKeys: Object.keys(data as any),
      });
    }
    const response = await Axios.put<T>(url, data);
    
    // Логируем ответ для обновления товара с видео
    if (data instanceof FormData && url.includes('/products')) {
      console.log('HttpClient.put - Product update response', {
        url,
        hasResponse: !!response,
        responseData: response.data,
        hasVideos: !!(response.data as any)?.videos,
        videosCount: Array.isArray((response.data as any)?.videos) ? (response.data as any).videos.length : 0,
        fullResponse: response.data,
      });
    }
    
    return response.data;
  }

  static async patch<T>(url: string, data: unknown) {
    const response = await Axios.patch<T>(url, data);
    return response.data;
  }

  static async delete<T>(url: string, config?: { data?: unknown; params?: unknown }) {
    const response = await Axios.delete<T>(url, config);
    return response.data;
  }

  static formatSearchParams(params: Partial<SearchParamOptions>) {
    return Object.entries(params)
      .filter(([, value]) => Boolean(value))
      .map(([k, v]) =>
        ['type', 'categories', 'tags', 'author', 'manufacturer'].includes(k)
          ? `${k}.slug:${v}`
          : ['is_approved'].includes(k)
          ? formatBooleanSearchParam(k, v as boolean)
          : `${k}:${v}`
      )
      .join(';');
  }
}

export function getFormErrors(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data.message;
  }
  return null;
}

export function getFieldErrors(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data.errors;
  }
  return null;
}
