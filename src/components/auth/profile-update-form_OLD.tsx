import Input from '@/components/ui/input';
import { useForm, Controller } from 'react-hook-form';
import Button from '@/components/ui/button';
import Description from '@/components/ui/description';
import Card from '@/components/common/card';
import { useUpdateUserMutation } from '@/data/user';
import TextArea from '@/components/ui/text-area';
import { useTranslation } from 'next-i18next';
import FileInput from '@/components/ui/file-input';
import pick from 'lodash/pick';
import SwitchInput from '@/components/ui/switch-input';
import Label from '@/components/ui/label';
import SelectInput from '@/components/ui/select-input';
import ContractViewer from '@/components/auth/contract-viewer';
import { adminOnly, getAuthCredentials, hasAccess } from '@/utils/auth-utils';

type FormValues = {
  name: string;
  profile: {
    id: string;
    bio: string;
    contact: string;
    avatar: {
      thumbnail: string;
      original: string;
      id: string;
    };
    notifications: {
      email: string;
      enable: boolean;
    };
    seller_id?: string;
    market_role?: string;
    ownership_form?: string;
    full_name?: string;
    company_name?: string;
    registration_address?: string;
    actual_address?: string;
    tax_id?: string;
    payment_method?: string;
    company_account?: string;
    bank_bik?: string;
    bank_name?: string;
    currency?: string;
    contract_text?: string;
    contract_read?: boolean;
    contract_accepted?: boolean;
    contract_signed_at?: string;
  };
};

export default function ProfileUpdate({ me }: any) {
  const { t } = useTranslation();
  const { mutate: updateUser, isLoading: loading } = useUpdateUserMutation();
  const { permissions } = getAuthCredentials();
  let permission = hasAccess(adminOnly, permissions);
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      ...(me &&
        pick(me, [
          'name',
          'profile.bio',
          'profile.contact',
          'profile.avatar',
          'profile.notifications.email',
          'profile.notifications.enable',
          'profile.seller_id',
          'profile.market_role',
          'profile.ownership_form',
          'profile.full_name',
          'profile.company_name',
          'profile.registration_address',
          'profile.actual_address',
          'profile.tax_id',
          'profile.payment_method',
          'profile.company_account',
          'profile.bank_bik',
          'profile.bank_name',
          'profile.currency',
          'profile.contract_text',
          'profile.contract_read',
          'profile.contract_accepted',
          'profile.contract_signed_at',
        ])),
    },
  });

  async function onSubmit(values: FormValues) {
    const { name, profile } = values;
    const { notifications } = profile;
    
    // Валидация обязательного поля market_role
    if (!profile?.market_role) {
      return;
    }
    
    // Удаляем seller_id из данных обновления (генерируется автоматически и защищен от изменения)
    const { seller_id, ...profileData } = profile;
    
    const input = {
      id: me?.id,
      input: {
        name: name,
        profile: {
          id: me?.profile?.id,
          bio: profileData?.bio,
          contact: profileData?.contact,
          avatar: {
            thumbnail: profileData?.avatar?.thumbnail,
            original: profileData?.avatar?.original,
            id: profileData?.avatar?.id,
          },
          notifications: {
            ...notifications,
          },
          market_role: profileData?.market_role,
          ownership_form: profileData?.ownership_form,
          full_name: profileData?.full_name,
          company_name: profileData?.company_name,
          registration_address: profileData?.registration_address,
          actual_address: profileData?.actual_address,
          tax_id: profileData?.tax_id,
          payment_method: profileData?.payment_method,
          company_account: profileData?.company_account,
          bank_bik: profileData?.bank_bik,
          bank_name: profileData?.bank_name,
          currency: profileData?.currency || 'RUB',
          contract_text: profileData?.contract_text,
          contract_read: profileData?.contract_read || false,
          contract_accepted: profileData?.contract_accepted || false,
          contract_signed_at: profileData?.contract_accepted && !profileData?.contract_signed_at 
            ? new Date().toISOString() 
            : profileData?.contract_signed_at,
        },
      },
    };
    updateUser({ ...input });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Секция "Кто вы?" - обязательное поле */}
      <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
        <Description
          title="Кто вы?"
          details="Выберите вашу роль на платформе"
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />

        <Card className="mb-5 w-full sm:w-8/12 md:w-2/3">
          <Controller
            name="profile.market_role"
            control={control}
            rules={{ required: 'Выберите вашу роль' }}
            render={({ field }) => (
              <div className="space-y-4">
                <label className="flex items-center cursor-pointer p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    value="brand"
                    checked={field.value === 'brand'}
                    onChange={() => field.onChange('brand')}
                    className="w-5 h-5 text-accent border-gray-300 focus:ring-accent focus:ring-2"
                  />
                  <span className="ml-3 text-base font-medium text-heading">
                    Создатель / Бренд
                  </span>
                </label>
                <label className="flex items-center cursor-pointer p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    value="seller"
                    checked={field.value === 'seller'}
                    onChange={() => field.onChange('seller')}
                    className="w-5 h-5 text-accent border-gray-300 focus:ring-accent focus:ring-2"
                  />
                  <span className="ml-3 text-base font-medium text-heading">
                    Селлер (Ozon / WB)
                  </span>
                </label>
              </div>
            )}
          />
          {errors.profile?.market_role && (
            <p className="mt-2 text-sm text-red-600">
              {errors.profile.market_role.message as string}
            </p>
          )}
        </Card>
      </div>

      <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
        <Description
          title={t('form:input-label-avatar')}
          details={t('form:avatar-help-text')}
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />

        <Card className="w-full sm:w-8/12 md:w-2/3">
          <FileInput name="profile.avatar" control={control} multiple={false} />
        </Card>
      </div>
      {permission ? (
        <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
          <Description
            title={t('form:form-notification-title')}
            details={t('form:form-notification-description')}
            className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
          />

          <Card className="mb-5 w-full sm:w-8/12 md:w-2/3">
            <Input
              label={t('form:input-notification-email')}
              {...register('profile.notifications.email')}
              error={t(errors?.profile?.notifications?.email?.message!)}
              variant="outline"
              className="mb-5"
              type="email"
            />
            <div className="flex items-center gap-x-4">
              <SwitchInput
                name="profile.notifications.enable"
                control={control}
              />
              <Label className="mb-0">
                {t('form:input-enable-notification')}
              </Label>
            </div>
          </Card>
        </div>
      ) : (
        ''
      )}
      <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
        <Description
          title={t('form:input-label-name')}
          details={t('form:profile-info-help-text')}
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />

        <Card className="mb-5 w-full sm:w-8/12 md:w-2/3">
          <Input
            label={t('form:input-label-name')}
            {...register('name')}
            error={t(errors.name?.message!)}
            variant="outline"
            className="mb-5"
          />
          <TextArea
            label={t('form:input-label-bio')}
            {...register('profile.bio')}
            error={t(errors.profile?.bio?.message!)}
            variant="outline"
            className="mb-6"
          />
          <Input
            label={t('form:input-label-contact')}
            {...register('profile.contact')}
            error={t(errors.profile?.contact?.message!)}
            variant="outline"
            className="mb-5"
          />
        </Card>
      </div>

      <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
        <Description
          title="Информация о компании"
          details="Общая информация"
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />

        <Card className="mb-5 w-full sm:w-8/12 md:w-2/3">
          <div className="mb-5">
            <Input
              label="Seller ID"
              {...register('profile.seller_id')}
              error={t(errors.profile?.seller_id?.message!)}
              variant="outline"
              disabled={true}
            />
            <p className="mt-1 text-xs text-gray-500">
              Seller ID генерируется автоматически при регистрации и не может быть изменен
            </p>
          </div>
          <div className="mb-5">
            <Label className="mb-2 block">Форма собственности</Label>
            <SelectInput
              control={control}
              name="profile.ownership_form"
              options={[
                { value: 'ООО', label: 'ООО' },
                { value: 'ИП', label: 'ИП' },
                { value: 'Самозанятый', label: 'Самозанятый' },
              ]}
              getOptionLabel={(option: any) => option.label}
              getOptionValue={(option: any) => option.value}
              placeholder="Выберите форму собственности"
            />
          </div>
          <Input
            label="ФИО"
            {...register('profile.full_name')}
            error={t(errors.profile?.full_name?.message!)}
            variant="outline"
            className="mb-5"
          />
          <Input
            label="Название компании"
            {...register('profile.company_name')}
            error={t(errors.profile?.company_name?.message!)}
            variant="outline"
            className="mb-5"
          />
          <TextArea
            label="Адрес регистрации"
            {...register('profile.registration_address')}
            error={t(errors.profile?.registration_address?.message!)}
            variant="outline"
            className="mb-5"
          />
          <TextArea
            label="Фактический адрес"
            {...register('profile.actual_address')}
            error={t(errors.profile?.actual_address?.message!)}
            variant="outline"
            className="mb-5"
          />
          <Input
            label="ИНН"
            {...register('profile.tax_id')}
            error={t(errors.profile?.tax_id?.message!)}
            variant="outline"
            className="mb-5"
          />
        </Card>
      </div>

      <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
        <Description
          title="Реквизиты"
          details="Банковские реквизиты компании"
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />

        <Card className="mb-5 w-full sm:w-8/12 md:w-2/3">
          <div className="mb-5">
            <Label className="mb-2 block">Платёжный метод</Label>
            <SelectInput
              control={control}
              name="profile.payment_method"
              options={[
                { value: 'bank_account', label: 'Банковский счёт' },
              ]}
              getOptionLabel={(option: any) => option.label}
              getOptionValue={(option: any) => option.value}
            />
          </div>
          <Input
            label="Расчётный счёт компании"
            {...register('profile.company_account')}
            error={t(errors.profile?.company_account?.message!)}
            variant="outline"
            className="mb-5"
          />
          <Input
            label="БИК банка"
            {...register('profile.bank_bik')}
            error={t(errors.profile?.bank_bik?.message!)}
            variant="outline"
            className="mb-5"
          />
          <Input
            label="Название банка"
            {...register('profile.bank_name')}
            error={t(errors.profile?.bank_name?.message!)}
            variant="outline"
            className="mb-5"
          />
          <div className="mb-5">
            <Label className="mb-2 block">Валюта</Label>
            <SelectInput
              control={control}
              name="profile.currency"
              options={[
                { value: 'RUB', label: 'RUB' },
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
              ]}
              getOptionLabel={(option: any) => option.label}
              getOptionValue={(option: any) => option.value}
            />
          </div>
        </Card>
        <div className="w-full text-end">
          <Button loading={loading} disabled={loading}>
            {t('form:button-label-save')}
          </Button>
        </div>
      </div>

      <div className="my-5 flex flex-wrap border-b border-dashed border-border-base pb-8 sm:my-8">
        <Description
          title="Договор"
          details="Ознакомьтесь с договором и подтвердите его принятие"
          className="w-full px-0 pb-5 sm:w-4/12 sm:py-8 sm:pe-4 md:w-1/3 md:pe-5"
        />

        <div className="w-full sm:w-8/12 md:w-2/3">
          <ContractViewer
            contractText={me?.profile?.contract_text}
            contractRead={watch('profile.contract_read') || false}
            contractAccepted={watch('profile.contract_accepted') || false}
            onReadChange={(checked) => {
              setValue('profile.contract_read', checked);
            }}
            onAcceptedChange={(checked) => {
              setValue('profile.contract_accepted', checked);
              if (checked) {
                setValue('profile.contract_signed_at', new Date().toISOString());
              } else {
                setValue('profile.contract_signed_at', undefined);
              }
            }}
          />
        </div>
      </div>
    </form>
  );
}
