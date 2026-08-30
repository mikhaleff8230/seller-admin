import Link from 'next/link';
import { OnboardingState } from '@/data/seller-onboarding';
import { formatPrice } from '@/utils/use-price';
import styles from './onboarding.module.css';

export default function SuccessStep({ state }: { state: OnboardingState }) {
  const product = state.product;
  if (!product) return <><h1 className={styles.title}>Ваш магазин готов</h1><Link className={styles.button} href="/">Перейти в кабинет</Link></>;
  return <div className={styles.success}>
    <div className={styles.check} aria-hidden>✓</div>
    <p className={styles.eyebrow}>{product.visible ? 'Отличное начало' : 'Товар сохранён'}</p>
    <h1 className={styles.title}>{product.visible ? <>Вы открыли<br />свой магазин!</> : <>Первый товар<br />уже в магазине</>}</h1>
    <p className={styles.subtitle}>{product.visible ? 'Ваш товар опубликован и доступен покупателям.' : 'Карточка сохранена. Её текущий статус доступен в кабинете.'}</p>
    <article className={styles.card}>
      {product.image?.original && <img src={product.image.original} alt={product.name} />}
      <div className={styles.cardBody}>
        <p className={styles.price}>{formatPrice({ amount: Number(product.price), currencyCode: 'RUB', locale: 'ru-RU', fractions: Number(product.price) % 1 ? 2 : 0 })}</p>
        <h2 className={styles.productName}>{product.name}</h2>
        {product.visible && <span className={styles.badge}>● Опубликован</span>}
      </div>
    </article>
    <div className={styles.shop}><span className={styles.helper}>Ваш магазин</span><strong>{state.shop.name}</strong><span className={styles.helper}>{product.visible ? 'Первый товар опубликован' : 'Первый товар создан'}</span></div>
    <div className={styles.actions}>
      {product.visible && <a className={styles.button} href={state.shop.url}>Посмотреть мой магазин <span aria-hidden>↗</span></a>}
      <Link className={styles.secondary} href={`/${state.shop.slug}/products/create`}>Добавить ещё товар</Link>
    </div>
    <Link className={styles.quiet} href={state.completed_at ? '/' : '/?onboarding=skip'}>Перейти в кабинет</Link>
  </div>;
}
