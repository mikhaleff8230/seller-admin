import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import PasswordInput from '@/components/ui/password-input';
import { useTranslation } from 'next-i18next';
import * as yup from 'yup';
import Link from '@/components/ui/link';
import Form from '@/components/ui/forms/form';
import { Routes } from '@/config/routes';
import { useLogin, useSendOtpCode, useOtpLogin, useVerifyPinCode } from '@/data/user';
import type { LoginInput, OtpLoginInput, PinLoginInput } from '@/types';
import { useEffect, useState } from 'react';
import Alert from '@/components/ui/alert';
import Router from 'next/router';
import {
  allowedRoles,
  hasAccess,
  setAuthCredentials,
} from '@/utils/auth-utils';
import AuthTabs from './auth-tabs';
import PhoneInput from '@/components/ui/forms/phone-input';
import PinCodeInput from './pin-code-input';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import { AUTH_CRED } from '@/utils/constants';
import { formatRussianPhone, phoneHref } from '@/utils/format-phone';

const loginFormSchema = yup.object().shape({
  email: yup
    .string()
    .email('form:error-email-format')
    .required('form:error-email-required'),
  password: yup.string().required('form:error-password-required'),
});

const LoginForm = () => {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'phone' | 'email'>('phone');
  
  // Состояние для OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [callTo, setCallTo] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  
  // Состояние для PIN
  const [pinCode, setPinCode] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [showPinForm, setShowPinForm] = useState(false);
  
  const { mutate: login, isLoading } = useLogin();
  const { mutate: sendOtp } = useSendOtpCode();
  const { mutate: otpLogin } = useOtpLogin();
  const { mutate: verifyPin } = useVerifyPinCode();

  useEffect(() => {
    // Страница входа должна начинаться с чистой сессии. Иначе просроченный
    // токен попадает даже в публичные запросы и создаёт непонятные 403.
    Cookies.remove(AUTH_CRED);
  }, []);

  function onSubmit({ email, password }: LoginInput) {
    login(
      {
        email,
        password,
      },
      {
        onSuccess: (data) => {
          if (data?.token) {
            if (hasAccess(allowedRoles, data?.permissions)) {
              setAuthCredentials(data?.token, data?.permissions);
              Router.push(Routes.dashboard);
              return;
            }
            setErrorMessage('form:error-enough-permission');
          } else {
            setErrorMessage('form:error-credential-wrong');
          }
        },
        onError: () => {},
      }
    );
  }

  // Обработчик отправки OTP
  const handleSendOtp = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    
    setIsSendingOtp(true);
    setOtpError('');
    sendOtp(
      { phone_number: phoneNumber, mode: 'login' },
      {
        onSuccess: (data: any) => {
          if (!data.success) {
            setIsSendingOtp(false);
            setOtpError(data.message || 'Не удалось подготовить звонок. Попробуйте ещё раз.');
            return;
          }
          if (data.success && data.id) {
            if (!data.is_contact_exist) {
              setIsSendingOtp(false);
              setOtpError('Аккаунт продавца с таким номером не найден. Зарегистрируйтесь или проверьте номер.');
              return;
            }
            setOtpId(data.id);
            setCallTo(data.call_to || null);
            setIsSendingOtp(false);
            toast.success('Позвоните на указанный номер для подтверждения');
          } else {
            setIsSendingOtp(false);
            setOtpError('Не удалось подготовить звонок. Попробуйте ещё раз.');
          }
        },
        onError: (error: any) => {
          setIsSendingOtp(false);
          setOtpError('Не удалось подготовить звонок. Проверьте номер и попробуйте ещё раз.');
        },
      }
    );
  };

  // Обработчик проверки OTP кода
  const handleVerifyOtp = (code: string) => {
    if (!otpId) return;
    
    setIsVerifyingOtp(true);
    setOtpError('');
    otpLogin(
      {
        otp_id: otpId,
        code: code,
        phone_number: phoneNumber,
      },
      {
        onSuccess: (data) => {
          if (data?.token) {
            if (hasAccess(allowedRoles, data?.permissions)) {
              setAuthCredentials(data?.token, data?.permissions);
              Router.push(Routes.dashboard);
              return;
            }
            setOtpError('Недостаточно прав доступа');
            setIsVerifyingOtp(false);
          } else if (callTo && data?.success === false) {
            // Подтверждение звонком ещё ожидается — продолжаем опрос без ошибки.
            setIsVerifyingOtp(false);
          } else {
            setOtpError('Ошибка входа');
            setIsVerifyingOtp(false);
          }
        },
        onError: (error: any) => {
          setIsVerifyingOtp(false);
          if (callTo) return;
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

  // Обработчик проверки PIN кода
  const handleVerifyPin = (code: string) => {
    if (!phoneNumber) {
      setPinError('Введите номер телефона');
      return;
    }
    
    setIsVerifyingPin(true);
    setPinError('');
    verifyPin(
      {
        phone_number: phoneNumber,
        pin_code: code,
      },
      {
        onSuccess: (data) => {
          if (data?.token) {
            if (hasAccess(allowedRoles, data?.permissions)) {
              setAuthCredentials(data?.token, data?.permissions);
              Router.push(Routes.dashboard);
              return;
            }
            setPinError('Недостаточно прав доступа');
            setIsVerifyingPin(false);
          } else {
            setPinError('Ошибка входа');
            setIsVerifyingPin(false);
          }
        },
        onError: (error: any) => {
          setIsVerifyingPin(false);
          setPinError(error.response?.data?.message || 'Неверный PIN-код');
          toast.error(error.response?.data?.message || 'Неверный PIN-код');
        },
      }
    );
  };

  // Сброс состояния при смене вкладки
  const handleTabChange = (tab: 'phone' | 'email') => {
    setActiveTab(tab);
    setOtpId(null);
    setCallTo(null);
    setOtpError('');
    setPhoneNumber('');
    setShowPinForm(false);
    setPinCode('');
    setPinError('');
  };

  return (
    <>
      <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-3 text-center">
        <span className="text-sm text-violet-900">Нет аккаунта продавца? </span>
        <Link
          href={Routes.register}
          className="font-semibold text-violet-700 underline decoration-2 underline-offset-2 hover:text-violet-900"
        >
          Зарегистрироваться
        </Link>
      </div>

      {/* Переключатель вкладок */}
      <AuthTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Форма входа по телефону */}
      {activeTab === 'phone' && (
        <div className="space-y-4">
          {!showPinForm ? (
            <>
              {!otpId ? (
                <>
                  {/* Поле ввода телефона */}
                  <div>
                    <p className="mb-4 rounded-lg bg-violet-50 p-3 text-sm leading-5 text-violet-900">
                      Введите номер телефона, привязанный к аккаунту продавца. Для подтверждения позвоните на номер, который появится ниже. Звонок бесплатный и завершится автоматически.
                    </p>
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

                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || !phoneNumber}
                    loading={isSendingOtp}
                    className="mb-4 w-full !bg-violet-700 !text-white hover:!bg-violet-800"
                  >
                    {isSendingOtp ? 'Получаем номер...' : 'Получить номер для звонка'}
                  </Button>

                  <div className="relative my-4 flex flex-col items-center justify-center text-sm text-heading">
                    <hr className="w-full" />
                    <span className="absolute -top-2.5 bg-light px-2 -ms-4 start-2/4">
                      {t('common:text-or')}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPinForm(true)}
                    className="w-full hover:!border-violet-700 hover:!bg-violet-50 hover:!text-violet-700"
                  >
                    Войти по PIN-коду
                  </Button>
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
            </>
          ) : (
            <>
              {/* Форма входа по PIN-коду */}
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

              <div>
                <label className="mb-2 block text-sm font-medium text-heading">
                  PIN-код
                </label>
                <PinCodeInput
                  length={4}
                  value={pinCode}
                  onChange={setPinCode}
                  onComplete={handleVerifyPin}
                  disabled={isVerifyingPin}
                  error={pinError}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPinForm(false);
                  setPinCode('');
                  setPinError('');
                }}
                disabled={isVerifyingPin}
                className="w-full"
              >
                Вернуться ко входу по звонку
              </Button>
            </>
          )}
        </div>
      )}

      {otpError ? (
        <Alert
          message={otpError}
          variant="error"
          closeable={true}
          className="mt-5"
          onClose={() => setOtpError('')}
        />
      ) : null}

      {/* Форма входа по email */}
      {activeTab === 'email' && (
        <Form<LoginInput> validationSchema={loginFormSchema} onSubmit={onSubmit}>
          {({ register, formState: { errors } }) => (
            <>
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
                forgotPassHelpText={t('form:input-forgot-password-label')}
                {...register('password')}
                error={t(errors?.password?.message!)}
                variant="outline"
                className="mb-4"
                forgotPageLink={Routes.forgotPassword}
              />
              <Button className="w-full" loading={isLoading} disabled={isLoading}>
                {t('form:button-label-login')}
              </Button>

            </>
          )}
        </Form>
      )}

      {errorMessage ? (
        <Alert
          message={t(errorMessage)}
          variant="error"
          closeable={true}
          className="mt-5"
          onClose={() => setErrorMessage(null)}
        />
      ) : null}
    </>
  );
};

export default LoginForm;
