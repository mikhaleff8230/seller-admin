import { useEffect, useState } from 'react';
import { HttpClient } from '@/data/client/http-client';
import { toast } from 'react-toastify';

type PromptState = 'loading' | 'hidden' | 'offer' | 'ios-install' | 'denied';

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bytes = window.atob(base64);
  return Uint8Array.from([...bytes].map((char) => char.charCodeAt(0)));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

export default function WebPushPrompt() {
  const [state, setState] = useState<PromptState>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('hidden');
      return;
    }

    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setState(subscription ? 'hidden' : isIos() && !isStandalone() ? 'ios-install' : 'offer'))
      .catch(() => setState('hidden'));
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'offer');
        return;
      }

      const config = await HttpClient.get<{ public_key: string; configured: boolean }>('/api/push/vapid-public-key');
      if (!config.configured || !config.public_key) {
        throw new Error('Web Push пока не настроен на сервере');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.public_key),
      });
      const json = subscription.toJSON();

      await HttpClient.post('/api/push/subscriptions', {
        endpoint: subscription.endpoint,
        keys: json.keys,
        content_encoding: 'aes128gcm',
      });
      await HttpClient.post('/api/push/test', {});

      toast.success('Push-уведомления подключены');
      setState('hidden');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Не удалось подключить уведомления');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading' || state === 'hidden') return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-gray-200 md:left-auto md:right-6">
      <div className="text-base font-semibold text-heading">Не пропускайте сообщения покупателей</div>
      <p className="mt-1 text-sm leading-5 text-body">
        {state === 'ios-install'
          ? 'На iPhone нажмите «Поделиться» → «На экран Домой», затем откройте SANCAN с новой иконки.'
          : state === 'denied'
          ? 'Уведомления заблокированы. Разрешите их для SANCAN в настройках браузера.'
          : 'Включите бесплатные уведомления — они придут, даже если кабинет закрыт.'}
      </p>
      {state === 'offer' && (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Подключаем…' : 'Включить уведомления'}
        </button>
      )}
    </div>
  );
}
