import { ChangeEvent, useEffect, useId, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useProductEditorStore } from '@/store/useProductEditorStore';
import { productClient } from '@/data/client/product';

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'];
const VIDEO_ACCEPT = '.mp4,.mov,.webm';

const formatFileSize = (bytes?: number) => {
  if (!bytes || !Number.isFinite(bytes)) return '';
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

const isSupportedVideo = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return Boolean(extension && VIDEO_EXTENSIONS.includes(extension));
};

export default function VideoCoverCard() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const coverPreferenceBeforeChangeRef = useRef<boolean | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const { watch, setValue, formState } = useFormContext<ProductEditorFormData>();
  const {
    isLoading: isSaving,
    product,
    videoUploadStatus,
    videoUploadProgress,
    videoUploadError,
    setVideoUploadState,
  } = useProductEditorStore();

  const selectedVideo = watch('video');
  const videos = watch('videos');
  const videoAsCover = Boolean(watch('video_as_cover'));
  const removeVideo = Boolean(watch('remove_video'));
  const hasSelectedFile =
    typeof File !== 'undefined' && selectedVideo instanceof File;
  const existingVideo = Array.isArray(videos) ? videos[0] : undefined;
  const videoOperationPending = Boolean(
    hasSelectedFile || removeVideo || formState.dirtyFields.video_as_cover
  );
  const serverStatus = String(existingVideo?.status || '').toLowerCase();
  const effectiveStatus =
    videoUploadStatus !== 'idle'
      ? videoUploadStatus
      : serverStatus === 'pending' || serverStatus === 'processing'
        ? 'processing'
        : serverStatus === 'failed'
          ? 'error'
          : 'idle';
  const showStatus =
    effectiveStatus !== 'idle' &&
    (videoUploadStatus !== 'idle' ||
      serverStatus === 'pending' ||
      serverStatus === 'processing' ||
      serverStatus === 'failed');

  useEffect(() => {
    if (!hasSelectedFile && !removeVideo) {
      coverPreferenceBeforeChangeRef.current = null;
    }
  }, [hasSelectedFile, removeVideo]);

  useEffect(() => {
    if (!hasSelectedFile) {
      setLocalPreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(selectedVideo as File);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [hasSelectedFile, selectedVideo]);

  useEffect(() => {
    const productId = product?.id;
    if (
      !productId ||
      (serverStatus !== 'pending' && serverStatus !== 'processing')
    ) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const poll = async () => {
      try {
        const response = await productClient.getVideoStatus(productId);
        if (cancelled) return;

        if (Array.isArray(response?.videos)) {
          setValue('videos', response.videos, { shouldDirty: false });
        }
        if (typeof response?.video_as_cover !== 'undefined') {
          setValue('video_as_cover', Boolean(response.video_as_cover), {
            shouldDirty: false,
          });
        }

        const status = String(response?.status || '').toLowerCase();
        if (status === 'ready') {
          setVideoUploadState({
            videoUploadStatus: 'ready',
            videoUploadProgress: 100,
            videoUploadError: '',
          });
          return;
        }
        if (status === 'failed' || status === 'error') {
          setVideoUploadState({
            videoUploadStatus: 'error',
            videoUploadProgress: 100,
            videoUploadError:
              response?.processing_error ||
              'Видео не прошло проверку. Выберите файл заново.',
          });
          return;
        }

        attempt += 1;
        if (attempt < 120) timer = setTimeout(poll, 2500);
      } catch {
        attempt += 1;
        if (!cancelled && attempt < 120) timer = setTimeout(poll, 5000);
      }
    };

    setVideoUploadState({
      videoUploadStatus: 'processing',
      videoUploadProgress: 100,
      videoUploadError: '',
    });
    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [product?.id, serverStatus, setValue, setVideoUploadState]);
  const existingVideoUrl =
    existingVideo?.video_url ||
    existingVideo?.url ||
    existingVideo?.preview_url ||
    '';
  const posterUrl = existingVideo?.poster_url || existingVideo?.thumbnail_url || '';
  const previewUrl = localPreviewUrl || (!removeVideo ? existingVideoUrl : '');
  const visibleFileName = hasSelectedFile
    ? (selectedVideo as File).name
    : existingVideo?.file_name || 'Загруженное видео';
  const visibleFileSize = hasSelectedFile
    ? (selectedVideo as File).size
    : Number(existingVideo?.file_size || 0);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isSaving) return;
    const file = event.target.files?.[0];
    setError('');
    setVideoUploadState({
      videoUploadStatus: 'idle',
      videoUploadProgress: 0,
      videoUploadError: '',
    });
    if (!file) return;

    if (!isSupportedVideo(file)) {
      setError('Выберите видео в формате MP4, MOV или WebM.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setError('Видео слишком большое. Максимальный размер — 50 МБ.');
      event.target.value = '';
      return;
    }

    coverPreferenceBeforeChangeRef.current = videoAsCover;
    setValue('video', file, { shouldDirty: true, shouldValidate: true });
    setValue('remove_video', false, { shouldDirty: true });
    setValue('video_as_cover', true, { shouldDirty: true });
  };

  const handleRemove = () => {
    if (isSaving) return;
    setError('');
    setVideoUploadState({
      videoUploadStatus: 'idle',
      videoUploadProgress: 0,
      videoUploadError: '',
    });
    if (hasSelectedFile) {
      const previousCover = coverPreferenceBeforeChangeRef.current ?? false;
      setValue('video', undefined, { shouldDirty: true });
      setValue('remove_video', false, { shouldDirty: true });
      setValue('video_as_cover', previousCover, { shouldDirty: true });
      coverPreferenceBeforeChangeRef.current = null;
    } else if (existingVideo) {
      coverPreferenceBeforeChangeRef.current = videoAsCover;
      setValue('remove_video', true, { shouldDirty: true });
      setValue('video_as_cover', false, { shouldDirty: true });
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const undoRemoval = () => {
    if (isSaving) return;
    const previousCover = coverPreferenceBeforeChangeRef.current ?? false;
    setValue('remove_video', false, { shouldDirty: true });
    setValue('video_as_cover', previousCover, { shouldDirty: true });
    coverPreferenceBeforeChangeRef.current = null;
  };

  return (
    <div className="wb-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="wb-card-title">Видеообложка</h2>
          <p className="m-0 text-xs leading-5 text-gray-500">
            MP4 / MOV / WebM, до 50 МБ
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {(previewUrl || removeVideo) && (
            <span className={`wb-badge ${removeVideo ? 'text-red-600' : ''}`}>
              {removeVideo ? 'Будет удалено' : hasSelectedFile ? 'Новое' : 'Загружено'}
            </span>
          )}
          {videoAsCover && previewUrl && <span className="wb-badge">Обложка товара</span>}
        </div>
      </div>

      {showStatus && (
        <div
          className={
            'mt-3 rounded-lg border p-3 ' +
            (effectiveStatus === 'error'
              ? 'border-red-200 bg-red-50'
              : effectiveStatus === 'ready'
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-gray-50')
          }
          role="status"
        >
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-heading">
            <span>
              {effectiveStatus === 'uploading'
                ? 'Загружаем видео'
                : effectiveStatus === 'processing'
                  ? 'Видео загружено — проверяем и готовим обложку'
                  : effectiveStatus === 'ready'
                    ? 'Видеообложка готова'
                    : 'Видео не удалось подготовить'}
            </span>
            <span>
              {effectiveStatus === 'uploading'
                ? String(videoUploadProgress) + '%'
                : effectiveStatus === 'processing'
                  ? 'Можно продолжить работу'
                  : effectiveStatus === 'ready'
                    ? 'Готово'
                    : 'Повторите загрузку'}
            </span>
          </div>
          {(effectiveStatus === 'uploading' || effectiveStatus === 'processing') && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
              <div
                className={
                  'h-full rounded-full bg-[#232323] transition-all ' +
                  (effectiveStatus === 'processing' ? 'animate-pulse' : '')
                }
                style={{
                  width:
                    effectiveStatus === 'processing'
                      ? '100%'
                      : String(Math.max(2, videoUploadProgress)) + '%',
                }}
              />
            </div>
          )}
          {effectiveStatus === 'processing' && (
            <p className="mb-0 mt-2 text-[11px] leading-4 text-gray-500">
              Карточка уже сохранена. Обработка продолжится в фоне, страницу можно покинуть.
            </p>
          )}
          {effectiveStatus === 'error' && (
            <p className="mb-0 mt-2 text-[11px] leading-4 text-red-700">
              {videoUploadError ||
                existingVideo?.processing_error ||
                'Карточка сохранена. Выберите видео заново и повторите сохранение.'}
            </p>
          )}
        </div>
      )}

      {isSaving && videoOperationPending && effectiveStatus === 'idle' && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3" role="status">
          <p className="m-0 text-xs font-semibold text-heading">
            {removeVideo ? 'Сохраняем удаление видео…' : 'Сначала сохраняем карточку…'}
          </p>
        </div>
      )}
      {removeVideo ? (
        <div className="mt-3 rounded-lg border border-dashed border-red-200 bg-red-50 p-3">
          <p className="m-0 text-xs leading-5 text-red-700">
            Видео и его обложка будут удалены после сохранения.
          </p>
          <button
            type="button"
            onClick={undoRemoval}
            disabled={isSaving}
            className="mt-2 text-xs font-semibold text-heading underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Отменить удаление
          </button>
        </div>
      ) : previewUrl ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-black">
          <video
            key={previewUrl}
            src={previewUrl}
            poster={!localPreviewUrl ? posterUrl || undefined : undefined}
            className="aspect-video w-full object-contain"
            controls
            muted
            playsInline
            preload="metadata"
          />
          <div className="flex items-center justify-between gap-2 bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="m-0 truncate text-xs font-semibold text-heading" title={visibleFileName}>
                {visibleFileName}
              </p>
              {visibleFileSize > 0 && (
                <p className="m-0 text-[11px] text-gray-500">{formatFileSize(visibleFileSize)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isSaving}
              className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {hasSelectedFile && existingVideo ? 'Отменить замену' : 'Удалить'}
            </button>
          </div>
        </div>
      ) : null}

      <label
        htmlFor={inputId}
        className={`mt-3 flex min-h-[72px] items-center justify-center rounded-lg border-2 border-dashed border-gray-200 px-3 text-center text-xs font-semibold text-heading transition ${
          isSaving ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gray-400'
        }`}
      >
        {previewUrl ? 'Заменить видео' : 'Добавить видео'}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={VIDEO_ACCEPT}
        className="sr-only"
        disabled={isSaving}
        onChange={handleFileChange}
      />

      {hasSelectedFile && !isSaving && (
        <p className="mb-0 mt-2 text-xs leading-5 text-gray-500">
          Сначала сохраним карточку, затем отдельно загрузим видео с отображением прогресса.
        </p>
      )}

      {error && <p className="mb-0 mt-2 text-xs leading-5 text-red-600">{error}</p>}

      {(previewUrl || (existingVideo && !removeVideo)) && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <div>
            <p className="m-0 text-xs font-semibold text-heading">Использовать как обложку</p>
            <p className="m-0 mt-1 text-[11px] leading-4 text-gray-500">
              На витрине покажем кадр, а при наведении — превью.
            </p>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              setValue('video_as_cover', !videoAsCover, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            className={`relative h-7 w-14 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
              videoAsCover ? 'bg-[#232323]' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={videoAsCover}
            aria-label="Использовать видео как обложку"
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                videoAsCover ? 'left-8' : 'left-1'
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
}
