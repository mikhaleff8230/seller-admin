import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadClient } from '@/data/client/upload';
import { ONBOARDING_API, OnboardingImage } from '@/data/seller-onboarding';
import styles from './onboarding.module.css';

export default function ProductImageUploader({ value, onChange, onBusy, disabled }: {
  value?: OnboardingImage | null; onChange: (image: OnboardingImage) => void; onBusy: (busy: boolean) => void; disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    multiple: false, maxSize: 10 * 1024 * 1024, disabled: disabled || busy,
    useFsAccessApi: false,
    onDropRejected: () => setError('Выберите JPG, PNG или WEBP размером до 10 МБ.'),
    onDrop: async (files) => {
      if (!files.length) return;
      setBusy(true); onBusy(true); setError('');
      try {
        const response = await uploadClient.upload(files, `${ONBOARDING_API}/photo`);
        const image = Array.isArray(response) ? response[0] : response;
        if (!image?.original) throw new Error('Empty upload');
        onChange(image as OnboardingImage);
      } catch { setError('Не удалось загрузить фотографию. Попробуйте ещё раз.'); }
      finally { setBusy(false); onBusy(false); }
    },
  });
  return <div>
    <div {...getRootProps({ className: `${styles.upload} ${isDragActive ? styles.drag : ''}`, role: 'button', 'aria-label': 'Добавить фото товара', 'aria-busy': busy })}>
      <input {...getInputProps({ 'aria-label': 'Фотография товара' })} />
      {value && !busy ? <><img src={value.original} alt="Фотография вашего товара" className={styles.preview} /><span className={styles.photoAction}>Заменить фотографию</span></> : <>
        <span className={busy ? styles.spinner : styles.uploadIcon}>{!busy && '+'}</span>
        <strong>{busy ? 'Загружаем фотографию…' : isDragActive ? 'Отпустите фото здесь' : 'Добавить фото'}</strong>
        <small>Выберите файл или перетащите сюда</small><small>JPG, PNG, WEBP · до 10 МБ</small>
      </>}
    </div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </div>;
}
