import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { toast } from 'react-toastify';
import Card from '@/components/common/card';
import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal/modal';
import {
  AiService,
  AiServiceJob,
  useAiServicesQuery,
  useApplyAiJobMutation,
  useCancelAiJobMutation,
  useConfirmAiJobMutation,
  useCreateAiJobMutation,
  useRejectAiJobMutation,
  useSellerAiJobsQuery,
} from '@/data/ai-services';

type ProductAiServicesProps = {
  product?: any | null;
};

const serviceTypeLabels: Record<string, string> = {
  photo: 'Фото',
  text: 'Текст',
  analysis: 'Анализ',
  pricing: 'Цена',
};

const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  waiting_confirmation: 'Ожидает подтверждения',
  paid: 'Оплачено',
  processing: 'AI обрабатывает',
  completed: 'Готово',
  failed: 'Ошибка',
  cancelled: 'Отменено',
  refunded: 'Возврат',
};

function getImageUrl(product?: any | null) {
  const image = product?.image;
  const gallery = Array.isArray(product?.gallery) ? product.gallery : [];
  const firstGalleryImage = gallery[0];
  const source = image || firstGalleryImage;

  if (!source) {
    return '';
  }

  if (typeof source === 'string') {
    return source;
  }

  return source.original || source.thumbnail || source.url || '';
}

function isPhotoService(service: AiService) {
  return service.service_type === 'photo' || service.code.startsWith('photo_');
}

function isPhotoJob(job: AiServiceJob) {
  const serviceType = job.service?.service_type;
  const code = job.service?.code || '';
  return serviceType === 'photo' || code.startsWith('photo_') || Boolean(job.output_image_url);
}

function getJobResultText(job: AiServiceJob) {
  const output = job.output_payload || {};

  if (output.title || output.description) {
    return [output.title, output.description].filter(Boolean).join('\n\n');
  }

  if (output.quick_sale_price || output.regular_price || output.max_price) {
    return [
      `Быстрая продажа: ${output.quick_sale_price ?? '-'}`,
      `Обычная цена: ${output.regular_price ?? '-'}`,
      `Максимальная цена: ${output.max_price ?? '-'}`,
      output.reason,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (output.photo_quality || output.category || output.visible_defects) {
    return JSON.stringify(output, null, 2);
  }

  return output.message || '';
}

function isJobApplied(job: AiServiceJob) {
  return Boolean(job.output_payload?.applied);
}

function isJobRejected(job: AiServiceJob) {
  return Boolean(job.output_payload?.rejected);
}

export default function ProductAiServices({ product }: ProductAiServicesProps) {
  const productId = product?.id ? Number(product.id) : undefined;
  const imageUrl = useMemo(() => getImageUrl(product), [product]);
  const { setValue, getValues } = useFormContext();
  const { services, isLoading: servicesLoading } = useAiServicesQuery(productId);
  const { jobs, isLoading: jobsLoading } = useSellerAiJobsQuery(productId, Boolean(productId));
  const createJob = useCreateAiJobMutation();
  const confirmJob = useConfirmAiJobMutation();
  const cancelJob = useCancelAiJobMutation();
  const applyJob = useApplyAiJobMutation();
  const rejectJob = useRejectAiJobMutation();
  const [selectedService, setSelectedService] = useState<AiService | null>(null);

  const latestJobs = useMemo(() => jobs.slice(0, 5), [jobs]);
  const balance = services.find((service) => typeof service.seller_balance === 'number')?.seller_balance;
  const isBusy =
    createJob.isLoading ||
    confirmJob.isLoading ||
    applyJob.isLoading ||
    rejectJob.isLoading;

  const canRunService = (service: AiService) => {
    if (!productId) {
      return false;
    }

    if (isPhotoService(service) && !imageUrl) {
      return false;
    }

    return service.can_charge !== false;
  };

  const handleConfirm = async () => {
    if (!selectedService || !productId) {
      return;
    }

    const created = await createJob.mutateAsync({
      service_code: selectedService.code,
      product_id: productId,
      input_image_url: imageUrl || undefined,
      context: {
        product_name: product?.name,
        product_price: product?.price,
      },
    });

    await confirmJob.mutateAsync(created.job_id);
    setSelectedService(null);
  };

  const handleApplyTextResult = (job: AiServiceJob) => {
    const output = job.output_payload || {};

    if (output.title) {
      setValue('name', output.title, { shouldDirty: true });
    }

    if (output.description) {
      setValue('description', output.description, { shouldDirty: true });
    }

    toast.success('Текст применён в форму. Не забудьте сохранить товар.');
  };

  const handleApplyPhotoResult = async (job: AiServiceJob) => {
    const response = await applyJob.mutateAsync(job.id);
    const galleryItem = response.gallery_item;

    if (galleryItem) {
      const gallery = Array.isArray(getValues('gallery')) ? getValues('gallery') : [];
      const exists = gallery.some(
        (img: any) =>
          (img?.original || img?.url || img?.thumbnail) ===
          (galleryItem.original || galleryItem.url || galleryItem.thumbnail)
      );

      if (!exists) {
        setValue('gallery', [...gallery, galleryItem], { shouldDirty: true });
      }
    }

    toast.info('Оригинальное фото не изменено. AI-результат добавлен в галерею.');
  };

  const handleRejectResult = (job: AiServiceJob) => {
    rejectJob.mutate(job.id);
  };

  const handleRetry = (job: AiServiceJob) => {
    const service = job.service || services.find((item) => item.id === job.ai_service_id);

    if (!service) {
      toast.error('Не удалось найти AI-услугу для повтора.');
      return;
    }

    if (!canRunService(service)) {
      toast.error('Недостаточно баланса или данных для повторного запуска.');
      return;
    }

    setSelectedService(service);
  };

  return (
    <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
      <div className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5">
        <h3 className="mb-2 text-lg font-semibold text-heading">AI-услуги SANCAN</h3>
        <p className="text-sm leading-6 text-body">
          Улучшение фото, описание, анализ и оценка цены списываются с баланса продавца только после подтверждения.
        </p>
      </div>

      <Card className="w-full sm:w-8/12 md:w-2/3">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8eef8] bg-[#f7fbff] p-4">
          <div>
            <p className="text-sm font-semibold text-heading">Баланс продавца</p>
            <p className="mt-1 text-2xl font-bold text-[#005bff]">
              {typeof balance === 'number' ? balance.toFixed(2) : '...'} кредитов
            </p>
          </div>
          <div className="max-w-md text-sm leading-6 text-body">
            AI не заменяет оригинальное фото автоматически. Результат сохраняется отдельно, продавец сам решает применять его или нет.
          </div>
        </div>

        {!productId ? (
          <div className="rounded-xl border border-dashed border-[#d7dce7] bg-white p-5 text-sm text-body">
            Сначала сохраните товар. После создания карточки здесь появятся AI-инструменты для фото, описания и цены.
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              {servicesLoading ? (
                <div className="rounded-xl border border-[#edf0f5] p-4 text-sm text-body">Загружаем AI-услуги...</div>
              ) : (
                services.map((service) => {
                  const disabled = !canRunService(service);

                  return (
                    <button
                      key={service.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedService(service)}
                      className={`rounded-xl border p-4 text-left transition ${
                        disabled
                          ? 'cursor-not-allowed border-[#eef0f4] bg-[#f6f7f9] text-[#9aa3b2]'
                          : 'border-[#e6ecf5] bg-white hover:border-[#005bff] hover:shadow-sm'
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-xs font-semibold text-[#005bff]">
                            {serviceTypeLabels[service.service_type] || service.service_type}
                          </span>
                          <h4 className="mt-3 text-base font-semibold text-heading">{service.name}</h4>
                        </div>
                        <span className="whitespace-nowrap rounded-full bg-[#fff2d8] px-3 py-1 text-sm font-bold text-[#9b6100]">
                          {service.cost} кр.
                        </span>
                      </div>
                      <p className="min-h-[44px] text-sm leading-5 text-body">{service.description}</p>
                      {isPhotoService(service) && !imageUrl ? (
                        <p className="mt-3 text-xs font-medium text-red-500">Для фото-услуг нужно загрузить фото товара.</p>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-6">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-heading">Последние AI-задачи</h4>
              {jobsLoading ? (
                <div className="rounded-xl border border-[#edf0f5] p-4 text-sm text-body">Загружаем историю...</div>
              ) : latestJobs.length ? (
                <div className="space-y-3">
                  {latestJobs.map((job) => {
                    const applied = isJobApplied(job);
                    const rejected = isJobRejected(job);
                    const isProcessing = ['paid', 'processing', 'waiting_confirmation'].includes(job.status);

                    return (
                      <div key={job.id} className="rounded-xl border border-[#edf0f5] bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-heading">{job.service?.name || `AI-задача #${job.id}`}</p>
                            <p className="mt-1 text-sm text-body">
                              {statusLabels[job.status] || job.status} · {job.cost}{' '}
                              {job.currency === 'credits' ? 'кр.' : '₽'}
                            </p>
                            {applied ? (
                              <p className="mt-1 text-xs font-medium text-green-600">Результат применён в галерею</p>
                            ) : null}
                            {rejected ? (
                              <p className="mt-1 text-xs font-medium text-gray-500">Результат отклонён</p>
                            ) : null}
                          </div>
                          {job.status === 'waiting_confirmation' ? (
                            <Button
                              size="small"
                              variant="outline"
                              type="button"
                              onClick={() => cancelJob.mutate(job.id)}
                            >
                              Отменить
                            </Button>
                          ) : null}
                        </div>

                        {isProcessing ? (
                          <p className="mt-3 text-sm text-body">Задача выполняется, статус обновится автоматически...</p>
                        ) : null}

                        {job.status === 'failed' && job.error_message ? (
                          <div className="mt-3 space-y-3">
                            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{job.error_message}</p>
                            <Button size="small" type="button" variant="outline" onClick={() => handleRetry(job)}>
                              Повторить
                            </Button>
                          </div>
                        ) : null}

                        {job.status === 'completed' ? (
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            {job.input_image_url || job.output_image_url ? (
                              <div className="grid grid-cols-2 gap-3 md:col-span-2">
                                {job.input_image_url ? (
                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase text-body">Оригинал</p>
                                    <img
                                      src={job.input_image_url}
                                      alt="Original product"
                                      className="aspect-square w-full rounded-lg object-cover"
                                    />
                                  </div>
                                ) : null}
                                {job.output_image_url ? (
                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase text-body">AI-результат</p>
                                    <img
                                      src={job.output_image_url}
                                      alt="AI result"
                                      className="aspect-square w-full rounded-lg object-cover"
                                    />
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {getJobResultText(job) ? (
                              <pre className="max-h-64 overflow-auto rounded-lg bg-[#f7f8fb] p-3 text-xs leading-5 text-heading md:col-span-2">
                                {getJobResultText(job)}
                              </pre>
                            ) : null}

                            <div className="flex flex-wrap gap-2 md:col-span-2">
                              {job.service?.code === 'generate_description' ? (
                                <Button size="small" type="button" onClick={() => handleApplyTextResult(job)}>
                                  Применить текст
                                </Button>
                              ) : isPhotoJob(job) ? (
                                <Button
                                  size="small"
                                  type="button"
                                  loading={applyJob.isLoading}
                                  disabled={applied || rejected || !job.output_image_url}
                                  onClick={() => handleApplyPhotoResult(job)}
                                >
                                  {applied ? 'Применено' : 'Применить результат'}
                                </Button>
                              ) : null}

                              {job.status === 'completed' && !rejected ? (
                                <Button
                                  size="small"
                                  type="button"
                                  variant="outline"
                                  loading={rejectJob.isLoading}
                                  disabled={applied}
                                  onClick={() => handleRejectResult(job)}
                                >
                                  Отклонить
                                </Button>
                              ) : null}

                              <Button size="small" type="button" variant="outline" onClick={() => handleRetry(job)}>
                                Повторить
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#d7dce7] bg-white p-5 text-sm text-body">
                  Пока нет AI-задач по этому товару.
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <Modal open={Boolean(selectedService)} onClose={() => setSelectedService(null)}>
        <div className="w-full max-w-md rounded-lg bg-white p-6 text-left shadow-xl">
          <h3 className="text-xl font-semibold text-heading">Запустить AI-услугу?</h3>
          {selectedService ? (
            <>
              <div className="mt-5 rounded-xl bg-[#f7fbff] p-4">
                <p className="text-sm text-body">Услуга</p>
                <p className="mt-1 font-semibold text-heading">{selectedService.name}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-body">Стоимость</p>
                    <p className="font-bold text-heading">{selectedService.cost} кредитов</p>
                  </div>
                  <div>
                    <p className="text-body">Баланс</p>
                    <p className="font-bold text-heading">
                      {typeof selectedService.seller_balance === 'number'
                        ? selectedService.seller_balance.toFixed(2)
                        : '...'}{' '}
                      кредитов
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-body">
                После подтверждения средства будут списаны с баланса. Если задача завершится ошибкой, backend вернёт списание автоматически.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setSelectedService(null)}>
                  Отмена
                </Button>
                <Button
                  type="button"
                  loading={isBusy}
                  disabled={isBusy || selectedService.can_charge === false}
                  onClick={handleConfirm}
                >
                  Запустить за {selectedService.cost} кр.
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
