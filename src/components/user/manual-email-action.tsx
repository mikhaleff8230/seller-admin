import { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { useMutation, useQuery } from 'react-query';
import { toast } from 'react-toastify';
import { userClient } from '@/data/client/user';

type EmailTemplate = { key: string; title: string; description: string };

const EnvelopeIcon = ({ width = 21 }: { width?: number }) => (
  <svg width={width} height={width} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export default function ManualEmailAction({ userId, email }: { userId: string; email?: string | null }) {
  const { data, isLoading: templatesLoading } = useQuery(
    ['manual-email-templates'],
    userClient.fetchManualEmailTemplates,
    { staleTime: 5 * 60 * 1000 }
  );
  const { mutateAsync: sendTemplate, isLoading } = useMutation(userClient.sendManualEmailTemplate);

  const handleSend = async (template: EmailTemplate, close: () => void) => {
    if (!email) {
      toast.error('У пользователя не указана электронная почта');
      return;
    }
    if (!window.confirm(`Отправить «${template.title}» на ${email}?`)) return;
    try {
      const response = await sendTemplate({ userId, template: template.key });
      toast.success(response.message || 'Письмо отправлено');
      close();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Не удалось отправить письмо');
    }
  };

  return (
    <Popover className="relative inline-flex">
      {({ close }) => (
        <>
          <Popover.Button className="text-base transition hover:text-[#6d28d9] focus:outline-none" title="Отправить письмо">
            <EnvelopeIcon />
          </Popover.Button>
          <Transition as={Fragment} enter="transition duration-100 ease-out" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition duration-75 ease-in" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Popover.Panel className="absolute right-0 z-50 mt-8 w-80 rounded-lg bg-white p-2 text-left shadow-xl ring-1 ring-black ring-opacity-10">
              <div className="px-3 py-2 text-sm font-semibold text-heading">Отправить уведомление</div>
              <div className="px-3 pb-2 text-xs text-gray-500">{email || 'Email не указан'}</div>
              {templatesLoading ? <div className="px-3 py-3 text-sm">Загрузка шаблонов…</div> : data?.data?.map((template: EmailTemplate) => (
                <button key={template.key} type="button" disabled={isLoading || !email} onClick={() => handleSend(template, close)} className="w-full rounded-md px-3 py-3 text-left transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <div className="text-sm font-semibold text-[#6d28d9]">{isLoading ? 'Отправляем…' : template.title}</div>
                  <div className="mt-1 text-xs leading-5 text-gray-500">{template.description}</div>
                </button>
              ))}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
