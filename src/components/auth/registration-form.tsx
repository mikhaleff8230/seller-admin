import Alert from '@/components/ui/alert';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import PasswordInput from '@/components/ui/password-input';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Routes } from '@/config/routes';
import { useTranslation } from 'next-i18next';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Link from '@/components/ui/link';
import {
  allowedRoles,
  hasAccess,
  setAuthCredentials,
} from '@/utils/auth-utils';
import { Permission } from '@/types';
import { useRegisterMutation, useSendOtpCode, useOtpLogin } from '@/data/user';
import AuthTabs from './auth-tabs';
import PhoneInput from '@/components/ui/forms/phone-input';
import OtpCodeInput from './otp-code-input';
import { toast } from 'react-toastify';
import { trackSellerRegistrationSuccess } from '@/lib/metrika';
import { formatRussianPhone, normalizeRussianPhone, phoneHref } from '@/utils/format-phone';
import RegistrationConsents from './registration-consents';

type FormValues = {
  name: string;
  email: string;
  password: string;
  permission: Permission;
};

const registrationFormSchema = yup.object().shape({
  name: yup.string().required('form:error-name-required'),
  email: yup
    .string()
    .email('form:error-email-format')
    .required('form:error-email-required'),
  password: yup.string().required('form:error-password-required'),
  permission: yup.string().default('store_owner').oneOf(['store_owner']),
});

const RegistrationForm = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'phone' | 'email'>('phone');
  
  // Состояние для OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [callTo, setCallTo] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consents, setConsents] = useState({ terms: false, privacy: false, emailMarketing: false, pushMarketing: false });
  const consentPayload = {
    accept_terms: consents.terms,
    accept_privacy: consents.privacy,
    marketing_email_consent: consents.emailMarketing,
    marketing_push_consent: consents.pushMarketing,
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    resolver: yupResolver(registrationFormSchema),
    defaultValues: {
      permission: Permission.StoreOwner,
    },
  });
  
  const router = useRouter();
  const { t } = useTranslation();
  const { mutate: registerUser, isLoading: loading } = useRegisterMutation();
  const { mutate: sendOtp } = useSendOtpCode();
  const { mutate: otpLogin } = useOtpLogin();

  async function onSubmit({ name, email, password, permission }: FormValues) {
    if (!consents.terms || !consents.privacy) {
      toast.error('Примите обязательные документы и согласие на обработку данных');
      return;
    }
    registerUser(
      {
        name,
        email,
        password,
        permission,
        ...consentPayload,
      },
      {
        onSuccess: (data) => {
          if (data?.token) {
            if (hasAccess(allowedRoles, data?.permissions)) {
              trackSellerRegistrationSuccess();
              setAuthCredentials(data?.token, data?.permissions);
              router.push(Routes.dashboard);
              return;
            }
            setErrorMessage('form:error-enough-permission');
          } else {
            setErrorMessage('form:error-credential-wrong');
          }
        },
        onError: (error: any) => {
          Object.keys(error?.response?.data || {}).forEach((field: any) => {
            setError(field, {
              type: 'manual',
              message: error?.response?.data[field],
            });
          });
        },
      }
    );
  }

  // Обработчик отправки OTP
  const handleSendOtp = () => {
    if (!consents.terms || !consents.privacy) {
      toast.error('Примите обязательные документы и согласие на обработку данных');
      return;
    }
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    
    if (!name) {
      toast.error('Введите имя');
      return;
    }
    
    setIsSendingOtp(true);
    setOtpError('');
    sendOtp(
      { phone_number: normalizeRussianPhone(phoneNumber), mode: 'register' },
      {
        onSuccess: (data: any) => {
          if (!data.success) {
            setIsSendingOtp(false);
            setOtpError(data.message || 'Не удалось подготовить звонок. Попробуйте ещё раз.');
            return;
          }
          if (data.success && data.id) {
            if (data.is_contact_exist) {
              setIsSendingOtp(false);
              setOtpError('Этот номер уже зарегистрирован. Перейдите на страницу входа.');
              return;
            }
            setOtpId(data.id);
            setCallTo(data.call_to || null);
            setIsSendingOtp(false);
            toast.success('Позвоните на указанный номер для подтверждения');
          } else {
            setIsSendingOtp(false);
            toast.error('Ошибка отправки кода');
          }
        },
        onError: (error: any) => {
          setIsSendingOtp(false);
          toast.error(error.response?.data?.message || 'Ошибка отправки кода');
        },
      }
    );
  };

  // Обработчик проверки OTP кода и регистрации
  const handleVerifyOtp = (code: string) => {
    if (!otpId) return;
    
    setIsVerifyingOtp(true);
    setOtpError('');
    
    // Используем otpLogin для регистрации (он создаст пользователя, если его нет)
    // Передаем permission как строку 'store_owner' - точно так же, как в обычной регистрации
    const permissionValue = 'store_owner'; // Явно передаем строку
    console.log('Sending OTP registration request:', {
      otp_id: otpId,
      phone_number: phoneNumber,
      name: name,
      email: email || `${phoneNumber.replace(/\D/g, '')}@phone.auth`,
      permission: permissionValue,
    });
    
    otpLogin(
      {
        otp_id: otpId,
        code: code,
        phone_number: normalizeRussianPhone(phoneNumber),
        name: name,
        email: email || `${phoneNumber.replace(/\D/g, '')}@phone.auth`,
      permission: permissionValue, // Передаем строку 'store_owner'
      ...consentPayload,
      },
      {
        onSuccess: (data) => {
          if (data?.token) {
            // Логируем для отладки
            console.log('Registration success, permissions:', data?.permissions);
            console.log('Permission details:', {
              permissions: data?.permissions,
              permissionsLength: data?.permissions?.length,
              allowedRoles: allowedRoles,
              hasStoreOwner: data?.permissions?.includes('store_owner'),
              hasCustomer: data?.permissions?.includes('customer'),
            });
            
            if (hasAccess(allowedRoles, data?.permissions)) {
              trackSellerRegistrationSuccess();
              setAuthCredentials(data?.token, data?.permissions);
              router.push(Routes.dashboard);
              return;
            }
            // Если прав недостаточно, выводим более подробную ошибку
            console.error('Access denied. User permissions:', data?.permissions, 'Allowed roles:', allowedRoles);
            setOtpError('Регистрация успешна, но недостаточно прав. Обратитесь к администратору.');
            setIsVerifyingOtp(false);
          } else if (callTo && data?.success === false) {
            // Подтверждение звонком ещё ожидается — продолжаем опрос без ошибки.
            setIsVerifyingOtp(false);
          } else {
            setOtpError('Ошибка регистрации');
            setIsVerifyingOtp(false);
          }
        },
        onError: (error: any) => {
          setIsVerifyingOtp(false);
          if (callTo) return;
          console.error('Registration error:', error);
          setOtpError(error.response?.data?.message || 'Неверный код');
          toast.error(error.response?.data?.message || 'Неверный код');
        },
      }
    );
  };

  useEffect(() => {
    if (!otpId || !callTo || isVerifyingOtp) return;
    const timer = window.setInterval(() => handleVerifyOtp(''), 2500);
    return () => window.clearInterval(timer);
  }, [otpId, callTo, isVerifyingOtp]);

  // Сброс состояния при смене вкладки
  const handleTabChange = (tab: 'phone' | 'email') => {
    setActiveTab(tab);
    setOtpId(null);
    setCallTo(null);
    setOtpCode('');
    setOtpError('');
    setPhoneNumber('');
    setName('');
    setEmail('');
  };

  return (
    <>
      {/* Переключатель вкладок */}
      <AuthTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Форма регистрации по телефону */}
      {activeTab === 'phone' && (
        <div className="space-y-4">
          {!otpId ? (
            <>
              {/* Поле ввода имени */}
              <div>
                <label className="mb-2 block text-sm font-medium text-heading">
                  {t('form:input-label-name')}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  variant="outline"
                  className="mb-4"
                  placeholder="(можно ваше Имя)"
                />
              </div>

              {/* Поле ввода телефона */}
              <div>
                <label className="mb-2 block text-sm font-medium text-heading">
                  Телефон
                </label>
                <PhoneInput
                  country="ru"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  className="mb-4"
                />
              </div>

              {/* Поле email (опционально) */}
              <div>
                <label className="mb-2 block text-sm font-medium text-heading">
                  {t('form:input-label-email')} (опционально)
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="outline"
                  className="mb-4"
                  placeholder={t('form:input-label-email')}
                />
              </div>

              <Button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || !phoneNumber || !name}
                loading={isSendingOtp}
                className="mb-4 w-full !bg-violet-700 !text-white hover:!bg-violet-800"
              >
                {isSendingOtp ? 'Получаем номер...' : 'Получить номер для звонка'}
              </Button>
              <RegistrationConsents {...consents} onChange={(field, value) => setConsents((current) => ({ ...current, [field]: value }))} />
            </>
          ) : (
            <>
              <div>
                <p className="mb-2 text-center text-sm text-body">
                  Позвоните с номера {phoneNumber} на
                </p>
                <a href={phoneHref(callTo)} className="block text-center text-2xl font-bold tracking-wide text-accent">
                  {formatRussianPhone(callTo)}
                </a>
                <p className="mt-2 text-center text-xs text-body">Звонок будет сброшен автоматически. Проверяем подтверждение…</p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOtpId(null);
                    setCallTo(null);
                    setOtpCode('');
                    setOtpError('');
                  }}
                  disabled={isVerifyingOtp}
                  className="flex-1"
                >
                  Изменить номер
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || isVerifyingOtp}
                  className="flex-1"
                >
                  Получить новый номер
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Форма регистрации по email */}
      {activeTab === 'email' && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label={t('form:input-label-name')}
            {...register('name')}
            variant="outline"
            className="mb-4"
            error={t(errors?.name?.message!)}
            placeholder="(можно ваше Имя)"
          />
          <Input
            label={t('form:input-label-email')}
            {...register('email')}
            type="email"
            variant="outline"
            className="mb-4"
            error={t(errors?.email?.message!)}
          />
          <PasswordInput
            label={t('form:input-label-password')}
            {...register('password')}
            error={t(errors?.password?.message!)}
            variant="outline"
            className="mb-4"
          />
          <RegistrationConsents {...consents} onChange={(field, value) => setConsents((current) => ({ ...current, [field]: value }))} />
          <Button className="w-full !bg-violet-700 !text-white hover:!bg-violet-800" loading={loading} disabled={loading}>
            {t('form:text-register')}
          </Button>

          {errorMessage ? (
            <Alert
              message={t(errorMessage)}
              variant="error"
              closeable={true}
              className="mt-5"
              onClose={() => setErrorMessage(null)}
            />
          ) : null}
        </form>
      )}

      <div className="relative mt-8 mb-6 flex flex-col items-center justify-center text-sm text-heading sm:mt-11 sm:mb-8">
        <hr className="w-full" />
        <span className="start-2/4 -ms-4 absolute -top-2.5 bg-light px-2">
          {t('common:text-or')}
        </span>
      </div>
      <div className="text-center text-sm text-body sm:text-base">
        {t('form:text-already-account')}{' '}
        <Link
          href={Routes.login}
          className="ms-1 font-semibold !text-violet-700 underline transition-colors duration-200 hover:!text-violet-900 hover:no-underline focus:!text-violet-900 focus:no-underline focus:outline-none"
        >
          {t('form:button-label-login')}
        </Link>
      </div>
    </>
  );
};

export default RegistrationForm;
