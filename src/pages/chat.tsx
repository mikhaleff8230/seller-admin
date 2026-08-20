import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
import Layout from '@/components/layouts/app';
import { HttpClient } from '@/data/client/http-client';
import { useMeQuery } from '@/data/user';
import { adminOwnerAndStaffOnly } from '@/utils/auth-utils';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { toast } from 'react-toastify';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const extractConversations = (response: any) => response?.conversations || response?.data?.data || response?.data || [];
const attachmentUrl = (attachment: any) => {
  const value = attachment?.url || attachment?.file_path || '';
  if (!value || /^https?:\/\//i.test(value)) return value;
  const api = (process.env.NEXT_PUBLIC_REST_API_ENDPOINT || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  return `${api}/storage/${String(value).replace(/^\/?storage\//, '').replace(/^\//, '')}`;
};

export default function SellerChatPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMeQuery();
  const selectedId = typeof router.query.id === 'string' ? router.query.id : '';
  const [search, setSearch] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: conversationsResponse, isLoading: conversationsLoading } = useQuery(
    ['chat-conversations'],
    () => HttpClient.get<any>('/chat/conversations'),
    { refetchInterval: 30000 }
  );
  const conversations: any[] = extractConversations(conversationsResponse);
  const filtered = useMemo(() => conversations.filter((conversation) => {
    const value = `${conversation?.title || ''} ${conversation?.user?.name || ''} ${conversation?.shop?.name || ''} ${conversation?.latest_message?.body || ''}`.toLowerCase();
    return value.includes(search.trim().toLowerCase());
  }), [conversations, search]);

  const { data: conversationResponse, isLoading: messagesLoading } = useQuery(
    ['chat-conversation', selectedId],
    () => HttpClient.get<any>(`/chat/conversations/${selectedId}`),
    { enabled: Boolean(selectedId), refetchInterval: 8000 }
  );
  const conversation = conversationResponse?.conversation;
  const messages: any[] = conversationResponse?.messages || [];

  useEffect(() => {
    if (!selectedId) return;
    HttpClient.post(`/chat/conversations/${selectedId}/read`, {})
      .then(() => queryClient.invalidateQueries(['chat-conversations']))
      .catch(() => undefined);
  }, [selectedId, messages.length, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = useMutation(
    (payload: FormData) => HttpClient.post('/chat/messages', payload),
    {
      onSuccess: () => {
        setBody('');
        setFiles([]);
        queryClient.invalidateQueries(['chat-conversation', selectedId]);
        queryClient.invalidateQueries(['chat-conversations']);
      },
      onError: (error: any) => toast.error(error?.response?.data?.message || 'Не удалось отправить сообщение'),
    }
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId || (!body.trim() && !files.length)) return;
    const payload = new FormData();
    payload.append('conversation_id', selectedId);
    if (body.trim()) payload.append('body', body.trim());
    files.forEach((file) => payload.append('attachments[]', file));
    send.mutate(payload);
  };

  const nameFor = (item: any) => item?.title || item?.user?.name || item?.shop?.name || 'Диалог';

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[560px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <aside className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-gray-200 md:w-[360px]`}>
        <div className="border-b border-gray-200 p-4">
          <h1 className="text-xl font-bold text-heading">Чат</h1>
          <div className="relative mt-3">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск диалогов" className="h-10 w-full rounded-full bg-gray-100 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#232323]/20" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? <div className="p-6 text-center text-sm text-muted">Загрузка…</div> : null}
          {!conversationsLoading && !filtered.length ? <div className="p-8 text-center text-sm text-muted">Диалогов пока нет</div> : null}
          {filtered.map((item) => (
            <button key={item.id} type="button" onClick={() => router.push({ pathname: '/chat', query: { id: item.id } }, undefined, { shallow: true })} className={`flex w-full gap-3 border-b border-gray-100 p-4 text-left transition hover:bg-gray-50 ${String(item.id) === selectedId ? 'bg-gray-100' : ''}`}>
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#232323] font-bold text-white">
                {nameFor(item).charAt(0).toUpperCase()}
                {Number(item.unseen) > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px]">{Number(item.unseen) > 99 ? '99+' : item.unseen}</span> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2"><b className="truncate text-sm text-heading">{nameFor(item)}</b>{item.latest_message?.created_at ? <small className="shrink-0 text-[10px] text-muted">{dayjs(item.latest_message.created_at).fromNow()}</small> : null}</span>
                <span className="mt-1 block truncate text-xs text-muted">{item.latest_message?.body || 'Новый диалог'}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className={`${selectedId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
        {!selectedId ? <div className="flex h-full items-center justify-center bg-gray-50 p-8 text-center text-muted">Выберите диалог слева</div> : (
          <>
            <header className="flex h-[68px] shrink-0 items-center gap-3 border-b border-gray-200 px-4">
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 md:hidden" onClick={() => router.push('/chat', undefined, { shallow: true })} aria-label="Назад">←</button>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#232323] font-bold text-white">{nameFor(conversation).charAt(0).toUpperCase()}</span>
              <div className="min-w-0"><h2 className="truncate font-bold text-heading">{nameFor(conversation)}</h2><p className="text-xs text-muted">Диалог SANCAN</p></div>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4 md:p-6">
              {messagesLoading && !messages.length ? <div className="text-center text-sm text-muted">Загрузка…</div> : null}
              {!messagesLoading && !messages.length ? <div className="py-10 text-center text-sm text-muted">Нет сообщений. Начните общение.</div> : null}
              {messages.map((message) => {
                const own = String(message.user_id) === String(me?.id);
                const attachments = message.attachments || message.chat_attachments || [];
                return <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm md:max-w-[70%] ${own ? 'rounded-br-md bg-[#232323] text-white' : 'rounded-bl-md bg-white text-heading'}`}>
                  {!own && message.user?.name ? <div className="mb-1 text-xs font-bold opacity-70">{message.user.name}</div> : null}
                  {message.body ? <div className="whitespace-pre-wrap break-words">{message.body}</div> : null}
                  {attachments.map((attachment: any) => {
                    const url = attachmentUrl(attachment);
                    return attachment.file_type === 'image' ? <a key={attachment.id || url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={attachment.file_name || 'Вложение'} className="mt-2 max-h-64 rounded-lg object-contain" /></a> : <a key={attachment.id || url} href={url} target="_blank" rel="noreferrer" className="mt-2 block underline">{attachment.file_name || 'Скачать файл'}</a>;
                  })}
                  <div className={`mt-1 text-right text-[10px] ${own ? 'text-white/60' : 'text-muted'}`}>{dayjs(message.created_at).format('HH:mm')}</div>
                </div></div>;
              })}
              <div ref={endRef} />
            </div>
            {files.length ? <div className="flex flex-wrap gap-2 border-t border-gray-200 px-4 py-2">{files.map((file) => <span key={file.name} className="rounded-full bg-gray-100 px-3 py-1 text-xs">{file.name}</span>)}</div> : null}
            <form onSubmit={submit} className="flex shrink-0 items-end gap-2 border-t border-gray-200 bg-white p-3">
              <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-xl" title="Прикрепить">⊕<input type="file" multiple className="hidden" onChange={(event) => setFiles(Array.from(event.target.files || []).filter((file) => file.size <= 10 * 1024 * 1024))} /></label>
              <textarea value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(event as any); } }} rows={1} placeholder="Написать сообщение…" className="max-h-28 min-h-[40px] flex-1 resize-none rounded-2xl bg-gray-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#232323]/20" />
              <button type="submit" disabled={send.isLoading || (!body.trim() && !files.length)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#232323] text-white disabled:opacity-40" aria-label="Отправить">➤</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

SellerChatPage.authenticate = { permissions: adminOwnerAndStaffOnly };
SellerChatPage.Layout = Layout;

export const getStaticProps = async ({ locale }: any) => ({
  props: { ...(await serverSideTranslations(locale, ['common'])) },
});
