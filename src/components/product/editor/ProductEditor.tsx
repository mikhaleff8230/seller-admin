import { useEffect } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductEditorSchema, ProductEditorFormData } from '@/schemas/product-editor.schema';
import { useProductEditorStore } from '@/store/useProductEditorStore';
import { Product } from '@/types';
import StepGeneral from './steps/StepGeneral';
import StepMedia from './steps/StepMedia';
import StepAttributes from './steps/StepAttributes';
// РЈР±СЂР°Р»Рё РёРјРїРѕСЂС‚ StepVariations - РІР°СЂРёР°С†РёРё СЃРѕР·РґР°СЋС‚СЃСЏ С‡РµСЂРµР· СЃРїРёСЃРѕРє С‚РѕРІР°СЂРѕРІ
import StepPricing from './steps/StepPricing';
import StepCourse from './steps/StepCourse';
import StepPreview from './steps/StepPreview';
import EditorNavigation from './EditorNavigation';
import EditorActions from './EditorActions';
import { useRouter } from 'next/router';
import { useCreateProductMutation, useUpdateProductMutation, useProductQuery } from '@/data/product';
import { useShopQuery } from '@/data/shop';
import { toast } from 'react-toastify';
import { useTranslation } from 'next-i18next';
import { formatSlug } from '@/utils/use-slug';
import { manufacturerClient } from '@/data/client/manufacturer';
import { productClient } from '@/data/client/product';
import { Config } from '@/config';

type ProductEditorProps = {
  initialProduct?: Product | null;
  productId?: string | number;
};

const STEPS = [
  { id: 'general', label: 'РћСЃРЅРѕРІРЅР°СЏ РёРЅС„РѕСЂРјР°С†РёСЏ', component: StepGeneral },
  { id: 'media', label: 'РњРµРґРёР°', component: StepMedia },
  { id: 'attributes', label: 'РҐР°СЂР°РєС‚РµСЂРёСЃС‚РёРєРё', component: StepAttributes },
  // РЈР±СЂР°Р»Рё С€Р°Рі РІР°СЂРёР°С†РёР№ - РІР°СЂРёР°С†РёРё СЃРѕР·РґР°СЋС‚СЃСЏ С‡РµСЂРµР· СЃРїРёСЃРѕРє С‚РѕРІР°СЂРѕРІ
  { id: 'pricing', label: 'Р¦РµРЅР° Рё РЅР°Р»РёС‡РёРµ', component: StepPricing },
  { id: 'course', label: 'РљСѓСЂСЃ Рё РїРѕРґРїРёСЃРєР°', component: StepCourse },
  { id: 'preview', label: 'РџСЂРµРґРїСЂРѕСЃРјРѕС‚СЂ', component: StepPreview },
];

export default function ProductEditor({ initialProduct, productId }: ProductEditorProps) {
  const { t } = useTranslation();
  const router = useRouter();
  
  // РџСЂРѕРІРµСЂРєР°, С‡С‚Рѕ router РіРѕС‚РѕРІ
  // --- РћР“Р РђРќРР§Р•РќРР• РџРћ РљРћР›РР§Р•РЎРўР’РЈ РўРћР’РђР РћР’ ---
  // (Р»РѕРіРёРєР° РѕРіСЂР°РЅРёС‡РµРЅРёСЏ Рё РїСЂРѕРІРµСЂРєРё PRO Р±СѓРґРµС‚ РІСЃС‚СЂРѕРµРЅР° РЅРёР¶Рµ)

  
  // Р—Р°РіСЂСѓР·РєР° РґР°РЅРЅС‹С… РјР°РіР°Р·РёРЅР° РґР»СЏ РїРѕР»СѓС‡РµРЅРёСЏ shop_id
  const { data: shopData, isLoading: loadingShop } = useShopQuery(
    { slug: router.query.shop as string },
    {
      enabled: !!router.query.shop,
    }
  );
  const shopId = shopData?.id;
  
  const {
    currentStep,
    setCurrentStep,
    product,
    setProduct,
    updateProduct,
    reset,
    setIsLoading,
    clearErrors,
    setError,
    errors,
  } = useProductEditorStore();

  const { mutate: createProduct, isLoading: creating } = useCreateProductMutation();
  const { mutate: updateProductMutation, isLoading: updating } = useUpdateProductMutation();

  // РЎРѕС…СЂР°РЅСЏРµРј 12-Р·РЅР°С‡РЅС‹Р№ РєРѕРґ РёР· slug_numeric_code РёР»Рё РёР· slug (РЅРµРёР·РјРµРЅСЏРµРјС‹Р№, РёР·РІР»РµРєР°РµС‚СЃСЏ РїСЂРё Р·Р°РіСЂСѓР·РєРµ)
  const [slugNumericCode, setSlugNumericCode] = React.useState<string | null>(
    (initialProduct as any)?.slug_numeric_code || null
  );

  // Р¤СѓРЅРєС†РёСЏ РґР»СЏ РёР·РІР»РµС‡РµРЅРёСЏ РєРѕРґР° РёР· slug (Р»СЋР±РѕР№ С„РѕСЂРјР°С‚)
  const extractSlugCode = (slug: string): { baseSlug: string; code: string | null } => {
    if (!slug) return { baseSlug: '', code: null };
    
    // РС‰РµРј РїРѕСЃР»РµРґРЅРёР№ СЃРµРіРјРµРЅС‚, РєРѕС‚РѕСЂС‹Р№ СЏРІР»СЏРµС‚СЃСЏ С‡РёСЃР»РѕРј (РєРѕРґ)
    // Р¤РѕСЂРјР°С‚: {slug}-{РєРѕРґ} РёР»Рё {slug}-{РєРѕРґ}-{РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Р№ РєРѕРґ}
    // РР·РІР»РµРєР°РµРј РїРѕСЃР»РµРґРЅРёР№ С‡РёСЃР»РѕРІРѕР№ СЃРµРіРјРµРЅС‚ РєР°Рє РєРѕРґ
    const match = slug.match(/^(.+)-(\d+)$/);
    if (match) {
      return {
        baseSlug: match[1], // Р‘Р°Р·РѕРІР°СЏ С‡Р°СЃС‚СЊ Р±РµР· РєРѕРґР°
        code: match[2], // РљРѕРґ (Р»СЋР±РѕР№ РґР»РёРЅС‹)
      };
    }
    
    // Р•СЃР»Рё С„РѕСЂРјР°С‚ РЅРµ СЂР°СЃРїРѕР·РЅР°РЅ, РІРѕР·РІСЂР°С‰Р°РµРј slug РєР°Рє РµСЃС‚СЊ
    return { baseSlug: slug, code: null };
  };

  // РР·РІР»РµРєР°РµРј РєРѕРґ РёР· slug РёР»Рё РёСЃРїРѕР»СЊР·СѓРµРј slug_numeric_code РёР· API
  const initialSlugData = initialProduct?.slug 
    ? extractSlugCode(initialProduct.slug)
    : { baseSlug: '', code: null };
  
  // Р•СЃР»Рё РєРѕРґ РЅРµ РЅР°Р№РґРµРЅ РІ slug, РЅРѕ РµСЃС‚СЊ РІ slug_numeric_code (РЅРѕРІРѕРµ РїРѕР»Рµ)
  if (!initialSlugData.code && (initialProduct as any)?.slug_numeric_code) {
    initialSlugData.code = (initialProduct as any).slug_numeric_code;
    initialSlugData.baseSlug = initialProduct?.slug || '';
  }
  
  // РЎРѕС…СЂР°РЅСЏРµРј РєРѕРґ РґР»СЏ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёСЏ РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё
  // РџСЂРёРѕСЂРёС‚РµС‚: slug_numeric_code РёР· API > РєРѕРґ РёР· slug
  React.useEffect(() => {
    if ((initialProduct as any)?.slug_numeric_code) {
      // РСЃРїРѕР»СЊР·СѓРµРј slug_numeric_code РёР· API (РїСЂРёРѕСЂРёС‚РµС‚)
      setSlugNumericCode((initialProduct as any).slug_numeric_code);
    } else if (initialSlugData.code) {
      // Fallback: РёР·РІР»РµРєР°РµРј РєРѕРґ РёР· slug
      setSlugNumericCode(initialSlugData.code);
    }
  }, [initialProduct]);

  // РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ С„РѕСЂРјС‹ СЃ Р±РµР·РѕРїР°СЃРЅС‹РјРё Р·РЅР°С‡РµРЅРёСЏРјРё РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ
  const defaultValues: Partial<ProductEditorFormData> = {
    name: initialProduct?.name || '',
    slug: initialSlugData.baseSlug, // РџРѕРєР°Р·С‹РІР°РµРј С‚РѕР»СЊРєРѕ Р±Р°Р·РѕРІСѓСЋ С‡Р°СЃС‚СЊ Р±РµР· РєРѕРґР°
    description: initialProduct?.description || '',
    type_id: initialProduct?.type 
      ? { id: initialProduct.type.id, name: initialProduct.type.name }
      : ((initialProduct as any)?.type_id ? (initialProduct as any).type_id : undefined),
    category_ids: Array.isArray(initialProduct?.categories) 
      ? initialProduct.categories.map((c) => Number(c.id)).filter(Boolean) 
      : [],
    price: initialProduct?.price ?? 0,
    sale_price: initialProduct?.sale_price ?? null,
    quantity: initialProduct?.quantity ?? 0,
    sku: initialProduct?.sku || '',
    preview_url: (initialProduct as any)?.preview_url || '',
    is_external: Boolean((initialProduct as any)?.is_external),
    external_product_url: (initialProduct as any)?.external_product_url || '',
    digital_product_type:
      ((initialProduct as any)?.digital_product_type as string) || 'file',
    prompt_text: (initialProduct as any)?.prompt_text || '',
    external_url: (initialProduct as any)?.external_url || '',
    digital_license_keys: (initialProduct as any)?.digital_license_keys || '',
    digital_account_json: JSON.stringify(
      (initialProduct as any)?.account_data || { login: '', password: '' },
      null,
      2
    ),
    subscription_days:
      (initialProduct as any)?.subscription_days != null &&
      (initialProduct as any)?.subscription_days !== ''
        ? Number((initialProduct as any).subscription_days)
        : undefined,
    billing_access_type:
      (((initialProduct as any)?.billing_access_type as string) || 'subscription') as
        | 'subscription'
        | 'one_time'
        | 'lifetime',
    duration_days:
      (initialProduct as any)?.duration_days != null && (initialProduct as any)?.duration_days !== ''
        ? Number((initialProduct as any).duration_days)
        : undefined,
    course: (() => {
      const c = (initialProduct as any)?.course;
      if (!c || typeof c !== 'object') {
        return {
          title: initialProduct?.name || '',
          description: (initialProduct as any)?.description || '',
          lessons: [] as Array<Record<string, unknown>>,
        };
      }
      const lessonsRaw = Array.isArray(c.lessons) ? c.lessons : [];
      return {
        title: typeof c.title === 'string' ? c.title : initialProduct?.name || '',
        description: typeof c.description === 'string' ? c.description : '',
        lessons: lessonsRaw.map((L: any, idx: number) => ({
          id: L.id != null ? L.id : undefined,
          title: L.title != null ? String(L.title) : '',
          content_type: L.content_type != null ? String(L.content_type) : 'video',
          content_url: L.content_url != null ? String(L.content_url) : '',
          content_body: L.content_body != null ? String(L.content_body) : '',
          position: L.position != null ? Number(L.position) : idx,
          drip_days: L.drip_days != null ? Number(L.drip_days) : 0,
        })),
      };
    })(),
    digital_file_input: (() => {
      const digitalFile = (initialProduct as any)?.digital_file;
      if (!digitalFile) return undefined;
      return {
        id: digitalFile?.attachment_id,
        thumbnail: '',
        original: digitalFile?.url,
        url: digitalFile?.url,
      };
    })(),
    weight: initialProduct?.weight,
    width: initialProduct?.width ? parseFloat(String(initialProduct.width)) : undefined,
    height: initialProduct?.height ? parseFloat(String(initialProduct.height)) : undefined,
    length: initialProduct?.length ? parseFloat(String(initialProduct.length)) : undefined,
    address: (() => {
      const p = initialProduct as any;
      return typeof p?.address === 'string' ? p.address : '';
    })(),
    lat: (() => {
      const p = initialProduct as any;
      const gp = p?.geo_point ?? p?.geoPoint;
      return gp?.lat != null ? Number(gp.lat) : undefined;
    })(),
    lng: (() => {
      const p = initialProduct as any;
      const gp = p?.geo_point ?? p?.geoPoint;
      return gp?.lng != null ? Number(gp.lng) : undefined;
    })(),
    region_id: (() => {
      const p = initialProduct as any;
      return p?.region_id != null && p?.region_id !== ''
        ? Number(p.region_id)
        : undefined;
    })(),
    status: (initialProduct?.status as any) || 'draft',
    group_key: (initialProduct as any)?.group_key,
    is_group_product: !!(initialProduct as any)?.group_key,
    group_variants: Array.isArray((initialProduct as any)?.group_variants) 
      ? (initialProduct as any).group_variants 
      : [],
    brand: initialProduct?.manufacturer?.name || (initialProduct as any)?.brand || '',
    tags: Array.isArray((initialProduct as any)?.tags) ? (initialProduct as any).tags : [],
    // variations: Array.isArray((initialProduct as any)?.variations) ? (initialProduct as any).variations : [], // РЈР±СЂР°Р»Рё - Р±РѕР»СЊС€Рµ РЅРµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ
    videos: Array.isArray((initialProduct as any)?.videos) 
      ? (initialProduct as any).videos 
      : [],
    image: initialProduct?.image ? {
      id: Number(initialProduct.image.id) || undefined,
      url: initialProduct.image.thumbnail || initialProduct.image.original || '',
      thumbnail: initialProduct.image.thumbnail || '',
      original: initialProduct.image.original || '',
    } : undefined,
    gallery: Array.isArray(initialProduct?.gallery) 
      ? initialProduct.gallery.map((img) => ({
          id: Number(img.id) || undefined,
          url: img.thumbnail || img.original || '',
          thumbnail: img.thumbnail || '',
          original: img.original || '',
        })).filter(Boolean) 
      : [],
    // РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ Р°С‚СЂРёР±СѓС‚РѕРІ РёР· С‚РѕРІР°СЂР°
    attribute_values: (() => {
      // РџСЂРѕР±СѓРµРј РїРѕР»СѓС‡РёС‚СЊ Р°С‚СЂРёР±СѓС‚С‹ РёР· СЂР°Р·РЅС‹С… РёСЃС‚РѕС‡РЅРёРєРѕРІ
      if (initialProduct && typeof initialProduct === 'object') {
        // Р•СЃР»Рё РµСЃС‚СЊ attribute_values РЅР°РїСЂСЏРјСѓСЋ
        if ((initialProduct as any).attribute_values && typeof (initialProduct as any).attribute_values === 'object' && !Array.isArray((initialProduct as any).attribute_values)) {
          return (initialProduct as any).attribute_values;
        }
        // Р•СЃР»Рё РµСЃС‚СЊ attributes РєР°Рє РјР°СЃСЃРёРІ СЃ pivot
        if (Array.isArray((initialProduct as any).attributes)) {
          const attrs: Record<number, string> = {};
          (initialProduct as any).attributes.forEach((attr: any) => {
            if (attr && attr.id && attr.pivot?.value) {
              attrs[Number(attr.id)] = String(attr.pivot.value);
            }
          });
          if (Object.keys(attrs).length > 0) {
            return attrs;
          }
        }
      }
      return undefined;
    })(),
  };

  const methods = useForm<ProductEditorFormData>({
    resolver: zodResolver(ProductEditorSchema),
    mode: 'onBlur',
    shouldFocusError: false,
    defaultValues: {
      ...defaultValues,
      // РЈР±РµР¶РґР°РµРјСЃСЏ, С‡С‚Рѕ РІСЃРµ РјР°СЃСЃРёРІС‹ РёРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°РЅС‹
      category_ids: Array.isArray(defaultValues.category_ids) ? defaultValues.category_ids : [],
      gallery: Array.isArray(defaultValues.gallery) ? defaultValues.gallery : [],
      tags: Array.isArray(defaultValues.tags) ? defaultValues.tags : [],
      group_variants: Array.isArray(defaultValues.group_variants) ? defaultValues.group_variants : [],
      // variations: Array.isArray(defaultValues.variations) ? defaultValues.variations : [], // РЈР±СЂР°Р»Рё - Р±РѕР»СЊС€Рµ РЅРµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ
      videos: Array.isArray(defaultValues.videos) ? defaultValues.videos : [],
      attributes: Array.isArray(defaultValues.attributes) ? defaultValues.attributes : [],
      grouping_attributes: Array.isArray((defaultValues as any).grouping_attributes) ? (defaultValues as any).grouping_attributes : [],
      // РРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј attribute_values РµСЃР»Рё РѕРЅРё РµСЃС‚СЊ
      attribute_values: defaultValues.attribute_values && typeof defaultValues.attribute_values === 'object' && !Array.isArray(defaultValues.attribute_values)
        ? defaultValues.attribute_values
        : undefined,
      is_external: Boolean(defaultValues.is_external),
      external_product_url: defaultValues.external_product_url || '',
      digital_file_input: defaultValues.digital_file_input,
      digital_product_type: defaultValues.digital_product_type || 'file',
      prompt_text: defaultValues.prompt_text || '',
      external_url: defaultValues.external_url || '',
      digital_license_keys: defaultValues.digital_license_keys || '',
      digital_account_json: defaultValues.digital_account_json || '{"login":"","password":""}',
      subscription_days: defaultValues.subscription_days,
      billing_access_type: defaultValues.billing_access_type ?? 'subscription',
      duration_days: defaultValues.duration_days,
      course: defaultValues.course ?? {
        title: '',
        description: '',
        lessons: [],
      },
    },
  });

  const shopGeoPrefilledRef = React.useRef(false);

  React.useEffect(() => {
    if (!shopData || shopGeoPrefilledRef.current) return;
    const p = initialProduct as any;
    const gp = p?.geo_point ?? p?.geoPoint;
    const hasProductGeoOrAddr =
      (typeof p?.address === 'string' && p.address.trim().length > 0) ||
      (gp != null && gp.lat != null && gp.lng != null);
    if (hasProductGeoOrAddr) {
      shopGeoPrefilledRef.current = true;
      return;
    }
    const loc = shopData.settings?.location;
    const a = shopData.address;
    const line =
      loc?.formattedAddress ||
      [a?.street_address, a?.city, a?.state, a?.zip, a?.country].filter(Boolean).join(', ');
    if (line) {
      methods.setValue('address', line);
    }
    if (loc?.lat != null && loc?.lng != null) {
      methods.setValue('lat', Number(loc.lat));
      methods.setValue('lng', Number(loc.lng));
    }
    shopGeoPrefilledRef.current = true;
  }, [shopData, initialProduct, methods]);

  // РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ СЃ store Рё СЃРѕС…СЂР°РЅРµРЅРёРµ РєРѕРґР° slug
  useEffect(() => {
    if (initialProduct) {
      setProduct(initialProduct);
      
      // РР·РІР»РµРєР°РµРј РєРѕРґ РёР· slug РїСЂРё Р·Р°РіСЂСѓР·РєРµ
      if (initialProduct.slug) {
        const slugData = extractSlugCode(initialProduct.slug);
        setSlugNumericCode(slugData.code);
      } else {
        setSlugNumericCode(null);
      }
      
      // РЈРџР РћР©Р•РќРќРђРЇ Р›РћР“РРљРђ: Р—Р°РіСЂСѓР¶Р°РµРј РІСЃРµ РІР°СЂРёР°РЅС‚С‹ РіСЂСѓРїРїС‹ РїСЂРё СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёРё Р»СЋР±РѕРіРѕ С‚РѕРІР°СЂР° РіСЂСѓРїРїС‹
      const groupKey = (initialProduct as any)?.group_key;
      if (groupKey) {
        productClient.getVariants({ group_key: groupKey })
            .then((response: any) => {
              if (response?.success && response?.data && Array.isArray(response.data)) {
              // РЎРѕСЂС‚РёСЂСѓРµРј РїРѕ ID (РїРµСЂРІС‹Р№ СЃРѕР·РґР°РЅРЅС‹Р№ = РіР»Р°РІРЅС‹Р№)
              const sortedProducts = response.data.sort((a: any, b: any) => Number(a.id) - Number(b.id));
              
              const loadedVariants = sortedProducts.map((product: any) => ({
                id: String(product.id),
                name: product.name || initialProduct.name,
                slug: product.slug || '',
                attributes: product.attribute_values || product.attributes || {},
                price: product.price || 0,
                sale_price: product.sale_price || null,
                quantity: product.quantity || 0,
                sku: product.sku || '',
                internal_article: product.internal_article || '',
                gallery: product.gallery || [],
                image: product.image || null,
              }));
              
              // РћР±РЅРѕРІР»СЏРµРј С„РѕСЂРјСѓ СЃ Р·Р°РіСЂСѓР¶РµРЅРЅС‹РјРё РІР°СЂРёР°РЅС‚Р°РјРё
              methods.setValue('group_variants', loadedVariants);
              methods.setValue('is_group_product', true);
              
              console.log('ProductEditor - Loaded group variants:', {
                groupKey,
                variantsCount: loadedVariants.length,
                firstVariantId: loadedVariants[0]?.id, // РџРµСЂРІС‹Р№ = РіР»Р°РІРЅС‹Р№
                variants: loadedVariants,
              });
            }
          })
          .catch((error) => {
            console.error('Error loading group variants:', error);
          });
      }
    }
  }, [initialProduct, setProduct, router.locale, methods]);

  // РћР±СЂР°Р±РѕС‚РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ
  const handleSave = async (data: ProductEditorFormData, publish: boolean = false) => {
    setIsLoading(true);
    clearErrors();

    try {
      // РќРѕСЂРјР°Р»РёР·СѓРµРј РјР°СЃСЃРёРІС‹ СЃСЂР°Р·Сѓ
      const categoryIdsArray = Array.isArray(data.category_ids) ? data.category_ids : [];
      let galleryArray = Array.isArray(data.gallery) ? data.gallery : [];
      const tagsArray = Array.isArray(data.tags) ? data.tags : [];
      const groupVariantsArray = Array.isArray(data.group_variants) ? data.group_variants : [];
      // РЈР±СЂР°Р»Рё variations - Р±РѕР»СЊС€Рµ РЅРµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ
      // const variationsArray = Array.isArray(data.variations) ? data.variations : [];
      const videosArray = Array.isArray(data.videos) ? data.videos : [];
      
      // Р¤РёР»СЊС‚СЂСѓРµРј РіР°Р»РµСЂРµСЋ, РёСЃРєР»СЋС‡Р°СЏ РіР»Р°РІРЅРѕРµ С„РѕС‚Рѕ (РµСЃР»Рё РѕРЅРѕ С‚Р°Рј РµСЃС‚СЊ)
      if (data.image && galleryArray.length > 0) {
        const imageId = data.image.id || data.image.thumbnail || data.image.url;
        if (imageId) {
          galleryArray = galleryArray.filter((img: any) => {
            if (!img) return true;
            const imgId = img.id || img.thumbnail || img.url;
            return imgId !== imageId;
          });
        }
      }
      
      // РџСЂРµРѕР±СЂР°Р·СѓРµРј category_ids РІ С„РѕСЂРјР°С‚ API
      const categoryId = categoryIdsArray.length > 0 ? categoryIdsArray[0] : undefined;
      const categories = categoryIdsArray.length > 0 ? categoryIdsArray.map((id: number) => String(id)) : [];
      
      const normalizedData = {
        ...data,
        category_ids: categoryIdsArray,
        gallery: galleryArray,
        tags: tagsArray,
        group_variants: groupVariantsArray,
        // variations: variationsArray, // РЈР±СЂР°Р»Рё - Р±РѕР»СЊС€Рµ РЅРµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ
        videos: videosArray,
        is_external: Boolean((data as any).is_external),
        external_product_url: (data as any).external_product_url || '',
        digital_file_input: (data as any).digital_file_input,
        digital_product_type: (data as any).digital_product_type || 'file',
        prompt_text: (data as any).prompt_text,
        external_url: (data as any).external_url,
        digital_license_keys: (data as any).digital_license_keys,
        digital_account_json: (data as any).digital_account_json,
        subscription_days: (data as any).subscription_days,
        billing_access_type: (data as any).billing_access_type,
        duration_days: (data as any).duration_days,
        course: (data as any).course,
        attribute_values: data.attribute_values && typeof data.attribute_values === 'object' && !Array.isArray(data.attribute_values)
          ? data.attribute_values
          : undefined,
      };
      const resolvedDigitalFileUrl =
        normalizedData.digital_file_input?.original ||
        normalizedData.digital_file_input?.url ||
        normalizedData.digital_file_input?.thumbnail ||
        (initialProduct as any)?.digital_file?.url ||
        undefined;
      
      // РџСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё РІ С‡РµСЂРЅРѕРІРёРє СЂР°Р·СЂРµС€Р°РµРј СЃРѕС…СЂР°РЅРµРЅРёРµ РІСЃРµРіРґР°
      // РџСЂРё РїСѓР±Р»РёРєР°С†РёРё РїСЂРѕРІРµСЂСЏРµРј РѕР±СЏР·Р°С‚РµР»СЊРЅС‹Рµ РїРѕР»СЏ
      const validationErrors: string[] = [];
      
      if (publish) {
        // Р’Р°Р»РёРґР°С†РёСЏ С‚РѕР»СЊРєРѕ РїСЂРё РїСѓР±Р»РёРєР°С†РёРё
        if (!normalizedData.name || !normalizedData.name.trim()) {
          validationErrors.push('РќР°Р·РІР°РЅРёРµ С‚РѕРІР°СЂР°');
        }
        if (categoryIdsArray.length === 0) {
          validationErrors.push('РљР°С‚РµРіРѕСЂРёСЏ');
        }
        if (normalizedData.price === undefined || normalizedData.price === null || isNaN(Number(normalizedData.price))) {
          validationErrors.push('Р¦РµРЅР°');
        }
        if (normalizedData.quantity === undefined || normalizedData.quantity === null || normalizedData.quantity < 0) {
          validationErrors.push('РљРѕР»РёС‡РµСЃС‚РІРѕ');
        }

        const dType = String(normalizedData.digital_product_type || 'file');

        if (dType === 'file') {
          if (normalizedData.is_external) {
            if (!normalizedData.external_product_url || !String(normalizedData.external_product_url).trim()) {
              validationErrors.push('Р’РЅРµС€РЅРёР№ URL С†РёС„СЂРѕРІРѕРіРѕ С‚РѕРІР°СЂР°');
            }
          } else if (!normalizedData.digital_file_input?.id) {
            validationErrors.push('РђСЂС…РёРІ С†РёС„СЂРѕРІРѕРіРѕ С‚РѕРІР°СЂР°');
          }
        } else if (dType === 'prompt') {
          if (!String((data as any).prompt_text || '').trim()) {
            validationErrors.push('РўРµРєСЃС‚ РїСЂРѕРјРїС‚Р°');
          }
        } else if (dType === 'link') {
          if (!String((data as any).external_url || '').trim()) {
            validationErrors.push('URL РґР»СЏ РґРѕСЃС‚СѓРїР° РїРѕ СЃСЃС‹Р»РєРµ (external_url)');
          }
        } else if (dType === 'account') {
          try {
            const raw = String((data as any).digital_account_json || '').trim();
            if (!raw) {
              validationErrors.push('Р”Р°РЅРЅС‹Рµ Р°РєРєР°СѓРЅС‚Р° (JSON)');
            } else {
              JSON.parse(raw);
            }
          } catch {
            validationErrors.push('Р”Р°РЅРЅС‹Рµ Р°РєРєР°СѓРЅС‚Р° (РЅРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ JSON)');
          }
        } else if (dType === 'key') {
          if (!String((data as any).digital_license_keys || '').trim()) {
            validationErrors.push('РЈРєР°Р¶РёС‚Рµ РєР»СЋС‡Рё (РїРѕ РѕРґРЅРѕРјСѓ РІ СЃС‚СЂРѕРєРµ)');
          }
        } else if (dType === 'subscription') {
          const sd = (data as any).subscription_days;
          const dd = (data as any).duration_days;
          const hasPeriod =
            (dd != null && dd !== '' && Number(dd) >= 1) ||
            (sd != null && sd !== '' && Number(sd) >= 1);
          if (!hasPeriod) {
            validationErrors.push(
              'РЎСЂРѕРє РґРѕСЃС‚СѓРїР°: СѓРєР°Р¶РёС‚Рµ В«РџРµСЂРёРѕРґ РґРѕСЃС‚СѓРїР°, РґРЅРµР№В» РЅР° С€Р°РіРµ РєСѓСЂСЃР° РёР»Рё В«РЎСЂРѕРє РїРѕРґРїРёСЃРєРёВ» РЅР° С€Р°РіРµ С†РµРЅС‹ (РјРёРЅРёРјСѓРј 1 РґРµРЅСЊ)'
            );
          }
          const rawLessons = (data as any).course?.lessons;
          const lessonsList = Array.isArray(rawLessons) ? rawLessons : [];
          const validLessons = lessonsList.filter(
            (L: any) => L && String(L.title || '').trim().length > 0
          );
          if (validLessons.length < 1) {
            validationErrors.push('Р”РѕР±Р°РІСЊС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ СѓСЂРѕРє РєСѓСЂСЃР° СЃ РЅР°Р·РІР°РЅРёРµРј');
          }
        }
        
        // Р•СЃР»Рё РµСЃС‚СЊ РѕС€РёР±РєРё РІР°Р»РёРґР°С†РёРё, РЅРµ СЃРѕС…СЂР°РЅСЏРµРј
        if (validationErrors.length > 0) {
          const errorMessage = `Р”Р»СЏ РїСѓР±Р»РёРєР°С†РёРё РЅРµРѕР±С…РѕРґРёРјРѕ Р·Р°РїРѕР»РЅРёС‚СЊ РѕР±СЏР·Р°С‚РµР»СЊРЅС‹Рµ РїРѕР»СЏ: ${validationErrors.join(', ')}`;
          toast.error(errorMessage);
          setIsLoading(false);
          // РЎРѕС…СЂР°РЅСЏРµРј РѕС€РёР±РєРё РґР»СЏ РѕС‚РѕР±СЂР°Р¶РµРЅРёСЏ РІ EditorActions
          setError('validation', validationErrors.join(', '));
          return;
        }
      }
      
      // Р”Р»СЏ РЅРѕРІРѕРіРѕ С‚РѕРІР°СЂР° РјРёРЅРёРјР°Р»СЊРЅР°СЏ РїСЂРѕРІРµСЂРєР° (С‚РѕР»СЊРєРѕ РґР»СЏ С‡РµСЂРЅРѕРІРёРєР°)
      if (!productId && !publish) {
        if (!normalizedData.name || !normalizedData.name.trim()) {
          // Р”Р»СЏ С‡РµСЂРЅРѕРІРёРєР° РїСЂРѕСЃС‚Рѕ РёСЃРїРѕР»СЊР·СѓРµРј Р·Р°РіР»СѓС€РєСѓ
          normalizedData.name = 'РќРѕРІС‹Р№ С‚РѕРІР°СЂ';
        }
      }
      
      // РџРѕР»СѓС‡Р°РµРј type_id РёР· С„РѕСЂРјС‹, СЃСѓС‰РµСЃС‚РІСѓСЋС‰РµРіРѕ С‚РѕРІР°СЂР° РёР»Рё РёСЃРїРѕР»СЊР·СѓРµРј РїРµСЂРІС‹Р№ РґРѕСЃС‚СѓРїРЅС‹Р№ С‚РёРї
      let typeId: string | undefined;
      
      // РЎРЅР°С‡Р°Р»Р° РїС‹С‚Р°РµРјСЃСЏ РїРѕР»СѓС‡РёС‚СЊ РёР· С„РѕСЂРјС‹ (РµСЃР»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РІС‹Р±СЂР°Р»)
      if (normalizedData.type_id) {
        if (typeof normalizedData.type_id === 'object' && normalizedData.type_id !== null && 'id' in normalizedData.type_id) {
          typeId = String(normalizedData.type_id.id);
        } else if (typeof normalizedData.type_id === 'string' || typeof normalizedData.type_id === 'number') {
          typeId = String(normalizedData.type_id);
        }
      }
      
      // Р•СЃР»Рё РЅРµ РЅР°С€Р»Рё РІ С„РѕСЂРјРµ, Р±РµСЂРµРј РёР· СЃСѓС‰РµСЃС‚РІСѓСЋС‰РµРіРѕ С‚РѕРІР°СЂР°
      if (!typeId && initialProduct?.type?.id) {
        typeId = String(initialProduct.type.id);
      }
      
      // Р•СЃР»Рё РІСЃРµ РµС‰Рµ РЅРµС‚, Р±РµСЂРµРј РёР· initialProduct.type_id
      if (!typeId && (initialProduct as any)?.type_id) {
        typeId = String((initialProduct as any).type_id);
      }
      
      // Р•СЃР»Рё type_id РЅРµ СѓРєР°Р·Р°РЅ, РІС‹РґР°РµРј РѕС€РёР±РєСѓ С‚РѕР»СЊРєРѕ РїСЂРё РїСѓР±Р»РёРєР°С†РёРё
      if (!typeId) {
        if (publish) {
          validationErrors.push('РўРёРї С‚РѕРІР°СЂР°');
          toast.error('Р”Р»СЏ РїСѓР±Р»РёРєР°С†РёРё РЅРµРѕР±С…РѕРґРёРјРѕ РІС‹Р±СЂР°С‚СЊ С‚РёРї С‚РѕРІР°СЂР°');
          setIsLoading(false);
          setError('validation', validationErrors.join(', '));
          return;
        } else {
          // Р”Р»СЏ С‡РµСЂРЅРѕРІРёРєР° РёСЃРїРѕР»СЊР·СѓРµРј РїРµСЂРІС‹Р№ РґРѕСЃС‚СѓРїРЅС‹Р№ С‚РёРї РёР»Рё РїСЂРѕРїСѓСЃРєР°РµРј
          toast.warning('РўРёРї С‚РѕРІР°СЂР° РЅРµ РІС‹Р±СЂР°РЅ. РўРѕРІР°СЂ Р±СѓРґРµС‚ СЃРѕС…СЂР°РЅРµРЅ РІ С‡РµСЂРЅРѕРІРёРє.');
        }
      }
      
      // РџСЂРѕРІРµСЂСЏРµРј shop_id
      if (!shopId) {
        toast.error('РњР°РіР°Р·РёРЅ РЅРµ РЅР°Р№РґРµРЅ. Р”РѕР¶РґРёС‚РµСЃСЊ Р·Р°РіСЂСѓР·РєРё РґР°РЅРЅС‹С… РјР°РіР°Р·РёРЅР°.');
        setIsLoading(false);
        return;
      }
      
      // РћР±СЂР°Р±РѕС‚РєР° Р±СЂРµРЅРґР° (brand) -> manufacturer_id
      let manufacturerId: string | undefined;
      if (normalizedData.brand && normalizedData.brand.trim()) {
        try {
          // РС‰РµРј СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёР№ manufacturer РїРѕ РёРјРµРЅРё
          const manufacturersResponse = await manufacturerClient.paginated({
            name: normalizedData.brand.trim(),
            language: router.locale || 'ru',
            limit: 1,
          });
          
          if (manufacturersResponse?.data && manufacturersResponse.data.length > 0) {
            // РќР°Р№РґРµРЅ СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёР№ manufacturer
            manufacturerId = String(manufacturersResponse.data[0].id);
          } else {
            // РЎРѕР·РґР°РµРј РЅРѕРІС‹Р№ manufacturer
            const newManufacturer = await manufacturerClient.create({
              name: normalizedData.brand.trim(),
              type_id: typeId, // РСЃРїРѕР»СЊР·СѓРµРј type_id С‚РѕРІР°СЂР°
              language: router.locale || 'ru',
              shop_id: String(shopId),
            });
            manufacturerId = String(newManufacturer.id);
          }
        } catch (error: any) {
          console.error('РћС€РёР±РєР° РїСЂРё РѕР±СЂР°Р±РѕС‚РєРµ Р±СЂРµРЅРґР°:', error);
          toast.error('РћС€РёР±РєР° РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё Р±СЂРµРЅРґР°: ' + (error?.message || 'РќРµРёР·РІРµСЃС‚РЅР°СЏ РѕС€РёР±РєР°'));
          setIsLoading(false);
          return;
        }
      }
      
      // Р’СЃРµ С‚РѕРІР°СЂС‹ С‚РµРїРµСЂСЊ simple (СѓР±СЂР°Р»Рё РІР°СЂРёР°С‚РёРІРЅС‹Р№ С‚РѕРІР°СЂ)
      const productType = 'simple';
      
      // РћР±СЂР°Р±РѕС‚РєР° slug СЃ СЃРѕС…СЂР°РЅРµРЅРёРµРј РєРѕРґР°
      // Р’РђР–РќРћ: РћС‚РїСЂР°РІР»СЏРµРј С‚РѕР»СЊРєРѕ Р±Р°Р·РѕРІС‹Р№ slug Р‘Р•Р— РєРѕРґР°
      // РљРѕРґ С…СЂР°РЅРёС‚СЃСЏ РѕС‚РґРµР»СЊРЅРѕ РІ slug_numeric_code Рё РіРµРЅРµСЂРёСЂСѓРµС‚СЃСЏ/СЃРѕС…СЂР°РЅСЏРµС‚СЃСЏ РЅР° Р±СЌРєРµРЅРґРµ
      let finalSlug = normalizedData.slug || '';
      
      if (!finalSlug) {
        // Р•СЃР»Рё slug РЅРµС‚, РіРµРЅРµСЂРёСЂСѓРµРј РёР· РЅР°Р·РІР°РЅРёСЏ (С‚РѕР»СЊРєРѕ РґР»СЏ РЅРѕРІС‹С… С‚РѕРІР°СЂРѕРІ)
        if (!productId && normalizedData.name) {
          finalSlug = formatSlug(normalizedData.name);
        }
      } else {
        // РЈР±РёСЂР°РµРј РєРѕРґ РёР· slug РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ (РµСЃР»Рё РѕРЅ С‚Р°Рј РµСЃС‚СЊ)
        // РћС‚РїСЂР°РІР»СЏРµРј С‚РѕР»СЊРєРѕ Р±Р°Р·РѕРІСѓСЋ С‡Р°СЃС‚СЊ slug
        const userSlugData = extractSlugCode(finalSlug);
        finalSlug = userSlugData.baseSlug;
      }
      
      // Р’РђР–РќРћ: Р›РѕРіРёРєР° СЃС‚Р°С‚СѓСЃР°
      // 1. Р•СЃР»Рё publish = true (РєРЅРѕРїРєР° "РћРїСѓР±Р»РёРєРѕРІР°С‚СЊ") - РІСЃРµРіРґР° 'publish'
      // 2. Р•СЃР»Рё publish = false (РєРЅРѕРїРєР° "РЎРѕС…СЂР°РЅРёС‚СЊ"):
      //    - Р•СЃР»Рё С‚РѕРІР°СЂ СѓР¶Рµ РѕРїСѓР±Р»РёРєРѕРІР°РЅ - СЃРѕС…СЂР°РЅСЏРµРј 'publish' (РЅРµ СЃР±СЂР°СЃС‹РІР°РµРј СЃС‚Р°С‚СѓСЃ)
      //    - Р•СЃР»Рё С‚РѕРІР°СЂ РІ С‡РµСЂРЅРѕРІРёРєРµ - СЃРѕС…СЂР°РЅСЏРµРј 'draft'
      let finalStatus: string;
      if (publish) {
        finalStatus = 'publish';
      } else {
        // РџСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё СЃРѕС…СЂР°РЅСЏРµРј С‚РµРєСѓС‰РёР№ СЃС‚Р°С‚СѓСЃ С‚РѕРІР°СЂР° (РµСЃР»Рё РѕРЅ РѕРїСѓР±Р»РёРєРѕРІР°РЅ) РёР»Рё 'draft'
        finalStatus = (initialProduct?.status === 'publish') ? 'publish' : (data.status || 'draft');
      }
      
      let accountDataFromForm: Record<string, unknown> | null = null;
      try {
        const rawAcc = String((data as any).digital_account_json || '').trim();
        if (rawAcc) {
          accountDataFromForm = JSON.parse(rawAcc) as Record<string, unknown>;
        }
      } catch {
        accountDataFromForm = null;
      }

      // Р¤РѕСЂРјРёСЂСѓРµРј РґР°РЅРЅС‹Рµ РґР»СЏ РѕС‚РїСЂР°РІРєРё РЅР° API СЃРѕРіР»Р°СЃРЅРѕ РёРЅС‚РµСЂС„РµР№СЃСѓ CreateProduct
      const submitData: any = {
        // РћР‘РЇР—РђРўР•Р›Р¬РќР«Р• РїРѕР»СЏ РґР»СЏ CreateProduct
        name: normalizedData.name || '',
        slug: finalSlug, // РўРѕР»СЊРєРѕ Р±Р°Р·РѕРІР°СЏ С‡Р°СЃС‚СЊ, Р‘Р•Р— РєРѕРґР°
        type_id: typeId,
        price: normalizedData.price ?? 0,
        unit: 'С€С‚.', // РћР±СЏР·Р°С‚РµР»СЊРЅРѕРµ РїРѕР»Рµ РґР»СЏ CreateProduct
        
        // РћРїС†РёРѕРЅР°Р»СЊРЅС‹Рµ РїРѕР»СЏ
        description: normalizedData.description || '',
        sale_price: normalizedData.sale_price ?? null,
        quantity: normalizedData.quantity ?? 0,
        sku: normalizedData.sku || '',
        preview_url: normalizedData.preview_url || '',
        is_digital: true,
        digital_product_type: normalizedData.digital_product_type || 'file',
        prompt_text: (data as any).prompt_text || null,
        external_url: (data as any).external_url || null,
        subscription_days:
          (data as any).subscription_days != null && (data as any).subscription_days !== ''
            ? Number((data as any).subscription_days)
            : null,
        billing_access_type: (data as any).billing_access_type || null,
        duration_days:
          (data as any).duration_days != null && (data as any).duration_days !== ''
            ? Number((data as any).duration_days)
            : null,
        digital_license_keys: (data as any).digital_license_keys ?? '',
        ...(normalizedData.digital_product_type === 'account' && accountDataFromForm
          ? { account_data: accountDataFromForm }
          : {}),
        is_external: Boolean(normalizedData.is_external),
        external_product_url: normalizedData.is_external
          ? (normalizedData.external_product_url || '')
          : undefined,
        status: finalStatus,
        shop_id: shopId ? String(shopId) : undefined,
        language: router.locale || 'ru',
        product_type: productType,
        ...(!normalizedData.is_external && normalizedData.digital_file_input?.id
          ? {
              digital_file: {
                attachment_id: normalizedData.digital_file_input.id,
                ...(resolvedDigitalFileUrl ? { url: resolvedDigitalFileUrl } : {}),
                ...(productId && {
                  id: (initialProduct as any)?.digital_file?.id,
                }),
              },
            }
          : {}),
        // РљР°С‚РµРіРѕСЂРёРё: РїРµСЂРµРґР°РµРј category_id РёР»Рё categories РІ Р·Р°РІРёСЃРёРјРѕСЃС‚Рё РѕС‚ API
        ...(categoryId ? { category_id: String(categoryId) } : {}),
        ...(Array.isArray(categories) && categories.length > 0 ? { categories } : {}),
        // РР·РѕР±СЂР°Р¶РµРЅРёСЏ
        ...(normalizedData.image ? { image: normalizedData.image } : {}),
        ...(Array.isArray(galleryArray) && galleryArray.length > 0 ? { gallery: galleryArray } : {}),
        // РўРµРіРё: РґР»СЏ СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёС… С‚РµРіРѕРІ РїРµСЂРµРґР°РµРј id, РґР»СЏ РЅРѕРІС‹С… - РѕР±СЉРµРєС‚ СЃ name
        ...(Array.isArray(tagsArray) && tagsArray.length > 0 ? {
          tags: tagsArray.map((tag: any) => {
            // Р•СЃР»Рё Сѓ С‚РµРіР° РµСЃС‚СЊ id - СЌС‚Рѕ СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёР№ С‚РµРі, РїРµСЂРµРґР°РµРј С‚РѕР»СЊРєРѕ id
            if (tag?.id) {
              return tag.id;
            }
            // Р•СЃР»Рё Сѓ С‚РµРіР° РЅРµС‚ id, РЅРѕ РµСЃС‚СЊ name - СЌС‚Рѕ РЅРѕРІС‹Р№ С‚РµРі, РїРµСЂРµРґР°РµРј РѕР±СЉРµРєС‚ СЃ name
            if (tag?.name) {
              return { name: tag.name };
            }
            // Р•СЃР»Рё СЌС‚Рѕ СѓР¶Рµ СЃС‚СЂРѕРєР° РёР»Рё С‡РёСЃР»Рѕ - РїРµСЂРµРґР°РµРј РєР°Рє РµСЃС‚СЊ (РґР»СЏ РѕР±СЂР°С‚РЅРѕР№ СЃРѕРІРјРµСЃС‚РёРјРѕСЃС‚Рё)
            return tag;
          }).filter((tag: any) => tag !== null && tag !== undefined)
        } : {}),
        // РђС‚СЂРёР±СѓС‚С‹ - РІСЃРµРіРґР° РїРµСЂРµРґР°РµРј, РґР°Р¶Рµ РµСЃР»Рё РїСѓСЃС‚С‹Рµ (РґР»СЏ РѕС‡РёСЃС‚РєРё РїСЂРё РѕР±РЅРѕРІР»РµРЅРёРё)
        attribute_values: normalizedData.attribute_values && typeof normalizedData.attribute_values === 'object' && !Array.isArray(normalizedData.attribute_values)
          ? Object.entries(normalizedData.attribute_values).reduce((acc: any, [key, value]) => {
              // Р¤РёР»СЊС‚СЂСѓРµРј С‚РѕР»СЊРєРѕ РЅРµРїСѓСЃС‚С‹Рµ Р·РЅР°С‡РµРЅРёСЏ
              if (value !== null && value !== undefined && value !== '') {
                // РџСЂРµРѕР±СЂР°Р·СѓРµРј РєР»СЋС‡ РІ С‡РёСЃР»Рѕ, РµСЃР»Рё СЌС‚Рѕ ID Р°С‚СЂРёР±СѓС‚Р°
                const attrId = isNaN(Number(key)) ? key : Number(key);
                // РџСЂРµРѕР±СЂР°Р·СѓРµРј Р·РЅР°С‡РµРЅРёРµ РІ СЃС‚СЂРѕРєСѓ
                const attrValue = Array.isArray(value) 
                  ? value.filter(v => v !== null && v !== undefined && v !== '').join(',')
                  : String(value);
                if (attrValue.trim() !== '') {
                  acc[attrId] = attrValue;
                }
              }
              return acc;
            }, {})
          : {},
        // Р“СЂСѓРїРїРѕРІС‹Рµ С‚РѕРІР°СЂС‹
        ...(normalizedData.group_key ? { group_key: normalizedData.group_key } : {}),
        // Р’РёРґРµРѕ
        ...(Array.isArray(videosArray) && videosArray.length > 0 ? { videos: videosArray } : {}),
        // РџСЂРѕРёР·РІРѕРґРёС‚РµР»СЊ (manufacturer_id)
        ...(manufacturerId ? { manufacturer_id: manufacturerId } : {}),
        // Р’РђР–РќРћ: РћС‚РїСЂР°РІР»СЏРµРј slug_numeric_code РѕС‚РґРµР»СЊРЅРѕ (С‚РѕР»СЊРєРѕ РґР»СЏ СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёС… С‚РѕРІР°СЂРѕРІ)
        // Р‘СЌРєРµРЅРґ РёСЃРїРѕР»СЊР·СѓРµС‚ РµРіРѕ РґР»СЏ СЃРѕС…СЂР°РЅРµРЅРёСЏ РєРѕРґР° РїСЂРё РѕР±РЅРѕРІР»РµРЅРёРё
        ...(productId && slugNumericCode ? { slug_numeric_code: slugNumericCode } : {}),
        ...(normalizedData.digital_product_type === 'subscription'
          ? {
              course: (() => {
                const cr = (data as any).course;
                if (!cr || typeof cr !== 'object') {
                  return {
                    title: String(normalizedData.name || ''),
                    description: '',
                    lessons: [],
                  };
                }
                const rawLessons = Array.isArray(cr.lessons) ? cr.lessons : [];
                const lessons = rawLessons.map((L: any, idx: number) => {
                  const idNum =
                    L.id != null && L.id !== '' && !Number.isNaN(Number(L.id))
                      ? Number(L.id)
                      : undefined;
                  return {
                    ...(idNum ? { id: idNum } : {}),
                    title: String(L.title || '').trim() || `РЈСЂРѕРє ${idx + 1}`,
                    content_type: (L.content_type && String(L.content_type)) || 'video',
                    content_url: L.content_url ? String(L.content_url) : null,
                    content_body: L.content_body ? String(L.content_body) : null,
                    position: L.position != null ? Number(L.position) : idx,
                    drip_days: L.drip_days != null ? Math.max(0, Number(L.drip_days)) : 0,
                  };
                });
                return {
                  title: String(cr.title || '').trim() || String(normalizedData.name || ''),
                  description: cr.description != null ? String(cr.description) : '',
                  lessons,
                };
              })(),
            }
          : {}),
      };
      
      // Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅР°СЏ РІР°Р»РёРґР°С†РёСЏ РїРµСЂРµРґ РѕС‚РїСЂР°РІРєРѕР№ (С‚РѕР»СЊРєРѕ РїСЂРё РїСѓР±Р»РёРєР°С†РёРё)
      // Р­С‚Р° РїСЂРѕРІРµСЂРєР° СѓР¶Рµ РІС‹РїРѕР»РЅРµРЅР° РІС‹С€Рµ, РЅРѕ РѕСЃС‚Р°РІР»СЏРµРј РґР»СЏ Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё
      if (publish && validationErrors.length > 0) {
        const errorMessage = `Р”Р»СЏ РїСѓР±Р»РёРєР°С†РёРё РЅРµРѕР±С…РѕРґРёРјРѕ Р·Р°РїРѕР»РЅРёС‚СЊ РѕР±СЏР·Р°С‚РµР»СЊРЅС‹Рµ РїРѕР»СЏ: ${validationErrors.join(', ')}`;
        toast.error(errorMessage);
        setIsLoading(false);
        setError('validation', validationErrors.join(', '));
        return;
      }
      
      // Р’Р°Р»РёРґР°С†РёСЏ Р°С‚СЂРёР±СѓС‚РѕРІ - СѓР±РµР¶РґР°РµРјСЃСЏ, С‡С‚Рѕ РІСЃРµ Р·РЅР°С‡РµРЅРёСЏ РєРѕСЂСЂРµРєС‚РЅС‹
      if (submitData.attribute_values && typeof submitData.attribute_values === 'object') {
        try {
          // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ РІСЃРµ РєР»СЋС‡Рё Рё Р·РЅР°С‡РµРЅРёСЏ РІР°Р»РёРґРЅС‹
          Object.entries(submitData.attribute_values).forEach(([key, value]) => {
            if (key === null || key === undefined || key === '') {
              throw new Error(`РќРµРІР°Р»РёРґРЅС‹Р№ РєР»СЋС‡ Р°С‚СЂРёР±СѓС‚Р°: ${key}`);
            }
            if (value === null || value === undefined) {
              throw new Error(`РќРµРІР°Р»РёРґРЅРѕРµ Р·РЅР°С‡РµРЅРёРµ Р°С‚СЂРёР±СѓС‚Р° РґР»СЏ РєР»СЋС‡Р° ${key}`);
            }
          });
        } catch (validationError: any) {
          toast.error(`РћС€РёР±РєР° РІР°Р»РёРґР°С†РёРё Р°С‚СЂРёР±СѓС‚РѕРІ: ${validationError.message}`);
          setIsLoading(false);
          return;
        }
      }
      
      console.log('ProductEditor - Saving product:', {
        productId,
        publish,
        submitDataKeys: Object.keys(submitData),
        typeId,
        productType,
        categoryId,
        categoriesLength: categories?.length,
        galleryLength: galleryArray.length,
        tagsLength: tagsArray.length,
        tagsFormat: submitData.tags,
        attributeValues: normalizedData.attribute_values,
        attributeValuesKeys: normalizedData.attribute_values ? Object.keys(normalizedData.attribute_values) : [],
        submitAttributeValues: submitData.attribute_values,
        hasRequiredFields: !!(submitData.name && submitData.type_id && submitData.price !== undefined && submitData.unit),
        submitData: JSON.stringify(submitData, null, 2),
      });

      // РћР±СЂР°Р±РѕС‚РєР° РіСЂСѓРїРїРѕРІС‹С… С‚РѕРІР°СЂРѕРІ
      const groupVariants = groupVariantsArray;
      
      console.log('ProductEditor - Group variants check:', {
        is_group_product: normalizedData.is_group_product,
        group_key: normalizedData.group_key,
        groupVariantsCount: groupVariants.length,
        groupVariants: groupVariants.map((v: any) => ({
          name: v.name,
          sku: v.sku,
          price: v.price,
          attributes: v.attributes,
          galleryCount: v.gallery?.length || 0,
        })),
      });
      
      if (normalizedData.is_group_product && normalizedData.group_key && groupVariants.length > 0) {
        // РЈРџР РћР©Р•РќРќРђРЇ Р›РћР“РРљРђ: Р’СЃРµ С‚РѕРІР°СЂС‹ РІ РіСЂСѓРїРїРµ СЂР°РІРЅС‹, РЅРµС‚ "РіР»Р°РІРЅРѕРіРѕ" С‚РѕРІР°СЂР°
        // РЎРѕС…СЂР°РЅСЏРµРј РІСЃРµ РІР°СЂРёР°РЅС‚С‹ РіСЂСѓРїРїС‹, РІРєР»СЋС‡Р°СЏ С‚РµРєСѓС‰РёР№ С‚РѕРІР°СЂ (РµСЃР»Рё СЂРµРґР°РєС‚РёСЂСѓРµРј)
        
        // РџРѕРґРіРѕС‚Р°РІР»РёРІР°РµРј РґР°РЅРЅС‹Рµ РґР»СЏ РІСЃРµС… РІР°СЂРёР°РЅС‚РѕРІ
        const formDataForVariants = {
          ...normalizedData,
          type_id: typeId,
          category_id: categoryId,
          categories,
          shop_id: shopId,
        };
        
        // Р•СЃР»Рё СЂРµРґР°РєС‚РёСЂСѓРµРј СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёР№ С‚РѕРІР°СЂ - РѕР±РЅРѕРІР»СЏРµРј РµРіРѕ РґР°РЅРЅС‹Рµ РІ СЃРїРёСЃРєРµ РІР°СЂРёР°РЅС‚РѕРІ
        let variantsToSave = [...groupVariants];
        if (productId) {
          // РџСЂРѕРІРµСЂСЏРµРј, РµСЃС‚СЊ Р»Рё С‚РµРєСѓС‰РёР№ С‚РѕРІР°СЂ РІ СЃРїРёСЃРєРµ РІР°СЂРёР°РЅС‚РѕРІ
          const currentVariantIndex = variantsToSave.findIndex((v: any) => v.id === String(productId));
          if (currentVariantIndex !== -1) {
            // РўРµРєСѓС‰РёР№ С‚РѕРІР°СЂ СѓР¶Рµ РІ СЃРїРёСЃРєРµ - РѕР±РЅРѕРІР»СЏРµРј РµРіРѕ РґР°РЅРЅС‹Рµ
            const oldVariant = variantsToSave[currentVariantIndex];
            // РћР±СЂР°Р±Р°С‚С‹РІР°РµРј slug РґР»СЏ РІР°СЂРёР°РЅС‚Р°
            let variantSlug = normalizedData.slug || oldVariant.slug || '';
            if (variantSlug) {
              const variantSlugData = extractSlugCode(variantSlug);
              variantSlug = variantSlugData.baseSlug;
              // Р”РѕР±Р°РІР»СЏРµРј РєРѕРґ С‚РµРєСѓС‰РµРіРѕ С‚РѕРІР°СЂР°, РµСЃР»Рё РѕРЅ РµСЃС‚СЊ
              if (slugNumericCode) {
                variantSlug = `${variantSlug}-${slugNumericCode}`;
              }
            } else if (oldVariant.slug) {
              variantSlug = oldVariant.slug;
            }
            
            variantsToSave[currentVariantIndex] = {
              ...oldVariant,
              name: normalizedData.name || oldVariant.name || '',
              slug: variantSlug,
              price: normalizedData.price ?? oldVariant.price ?? 0,
              sale_price: normalizedData.sale_price ?? oldVariant.sale_price ?? null,
              quantity: normalizedData.quantity ?? oldVariant.quantity ?? 0,
              sku: normalizedData.sku || oldVariant.sku || '',
              attributes: normalizedData.attribute_values || oldVariant.attributes || {},
              gallery: galleryArray.length > 0 ? galleryArray : (oldVariant.gallery || []),
            };
            
            console.log('ProductEditor - Updated variant in group:', {
              productId,
              oldName: oldVariant.name,
              newName: variantsToSave[currentVariantIndex].name,
              oldSlug: oldVariant.slug,
              newSlug: variantsToSave[currentVariantIndex].slug,
            });
          } else {
            // РћР±СЂР°Р±Р°С‚С‹РІР°РµРј slug РґР»СЏ РЅРѕРІРѕРіРѕ РІР°СЂРёР°РЅС‚Р°
            let newVariantSlug = normalizedData.slug || '';
            if (newVariantSlug) {
              const newVariantSlugData = extractSlugCode(newVariantSlug);
              newVariantSlug = newVariantSlugData.baseSlug;
              // Р”РѕР±Р°РІР»СЏРµРј РєРѕРґ С‚РµРєСѓС‰РµРіРѕ С‚РѕРІР°СЂР°, РµСЃР»Рё РѕРЅ РµСЃС‚СЊ
              if (slugNumericCode) {
                newVariantSlug = `${newVariantSlug}-${slugNumericCode}`;
              }
            }
            
            // РўРµРєСѓС‰РёР№ С‚РѕРІР°СЂ РЅРµ РІ СЃРїРёСЃРєРµ - РґРѕР±Р°РІР»СЏРµРј РµРіРѕ РєР°Рє РІР°СЂРёР°РЅС‚
            variantsToSave.push({
              id: String(productId),
              name: normalizedData.name || initialProduct?.name || '',
              slug: newVariantSlug,
              price: normalizedData.price ?? initialProduct?.price ?? 0,
              sale_price: normalizedData.sale_price ?? initialProduct?.sale_price ?? null,
              quantity: normalizedData.quantity ?? initialProduct?.quantity ?? 0,
              sku: normalizedData.sku || initialProduct?.sku || '',
              attributes: normalizedData.attribute_values || {},
              gallery: galleryArray,
            });
            
            console.log('ProductEditor - Added variant to group:', {
              productId,
              name: variantsToSave[variantsToSave.length - 1].name,
            });
          }
        }
        
        // РЎРѕС…СЂР°РЅСЏРµРј РІСЃРµ РІР°СЂРёР°РЅС‚С‹ РіСЂСѓРїРїС‹
        const groupResponse = await handleGroupVariants(normalizedData.group_key!, variantsToSave, formDataForVariants, methods);
        
        // РћР±РЅРѕРІР»СЏРµРј slug РІ С„РѕСЂРјРµ РїРѕСЃР»Рµ СЃРѕС…СЂР°РЅРµРЅРёСЏ РіСЂСѓРїРїС‹
        if (productId && groupResponse?.data) {
          // РС‰РµРј С‚РµРєСѓС‰РёР№ С‚РѕРІР°СЂ РІ РѕС‚РІРµС‚Рµ
          const updatedProduct = Array.isArray(groupResponse.data) 
            ? groupResponse.data.find((p: any) => String(p.id) === String(productId))
            : null;
          
          if (updatedProduct?.slug) {
            const updatedSlugData = extractSlugCode(updatedProduct.slug);
            // РћР±РЅРѕРІР»СЏРµРј РєРѕРґ, РµСЃР»Рё РѕРЅ РёР·РјРµРЅРёР»СЃСЏ
            if (updatedSlugData.code) {
              setSlugNumericCode(updatedSlugData.code);
            }
            // РћР±РЅРѕРІР»СЏРµРј slug РІ С„РѕСЂРјРµ (С‚РѕР»СЊРєРѕ Р±Р°Р·РѕРІСѓСЋ С‡Р°СЃС‚СЊ)
            methods.setValue('slug', updatedSlugData.baseSlug);
            
            console.log('ProductEditor - Updated slug after group save:', {
              responseSlug: updatedProduct.slug,
              baseSlug: updatedSlugData.baseSlug,
              code: updatedSlugData.code,
            });
          }
        }
        
        if (productId) {
          toast.success(t('common:text-update-success'));
        } else {
          toast.success(t('common:text-create-success'));
          // Р РµРґРёСЂРµРєС‚ РЅР° РїРµСЂРІС‹Р№ СЃРѕР·РґР°РЅРЅС‹Р№ РІР°СЂРёР°РЅС‚
          // (Р±СѓРґРµС‚ РѕРїСЂРµРґРµР»РµРЅ РїРѕСЃР»Рµ СЃРѕР·РґР°РЅРёСЏ РІ handleGroupVariants)
        }
        setIsLoading(false);
      } else {
        // РћР±С‹С‡РЅРѕРµ СЃРѕС…СЂР°РЅРµРЅРёРµ (РЅРµ РіСЂСѓРїРїРѕРІРѕР№ С‚РѕРІР°СЂ)
        if (productId) {
          updateProductMutation(
            { id: productId, ...submitData } as any,
            {
              onSuccess: async (response: any) => {
                toast.success(t('common:text-update-success'));
                if (response) {
                  setProduct(response);
                }
                
                // РћР±РЅРѕРІР»СЏРµРј slug РІ С„РѕСЂРјРµ РёР· РѕС‚РІРµС‚Р° СЃРµСЂРІРµСЂР°
                if (response?.slug) {
                  const updatedSlugData = extractSlugCode(response.slug);
                  setSlugNumericCode(updatedSlugData.code);
                  methods.setValue('slug', updatedSlugData.baseSlug);
                }

                if (response?.digital_file) {
                  // РќРµ Р·Р°С‚РёСЂР°РµРј С„Р°Р№Р» РїРѕСЃР»Рµ save, РµСЃР»Рё API РЅРµ РІРµСЂРЅСѓР» url.
                  // РЎРѕС…СЂР°РЅСЏРµРј С‚РµРєСѓС‰РµРµ Р·РЅР°С‡РµРЅРёРµ С„РѕСЂРјС‹ РєР°Рє РёСЃС‚РѕС‡РЅРёРє РїСЂР°РІРґС‹.
                  const currentDigitalFileInput: any = methods.getValues('digital_file_input');
                  const mergedDigitalUrl =
                    response.digital_file?.url ||
                    currentDigitalFileInput?.original ||
                    currentDigitalFileInput?.url ||
                    resolvedDigitalFileUrl ||
                    '';
                  methods.setValue('digital_file_input', {
                    ...currentDigitalFileInput,
                    id: response.digital_file?.attachment_id || currentDigitalFileInput?.id,
                    thumbnail: '',
                    original: mergedDigitalUrl,
                    url: mergedDigitalUrl,
                  } as any);
                }
                if (typeof response?.is_external !== 'undefined') {
                  methods.setValue('is_external', Boolean(response.is_external));
                }
                if (typeof response?.external_product_url === 'string') {
                  methods.setValue('external_product_url', response.external_product_url);
                }
                
                setIsLoading(false);
              },
              onError: (error: any) => {
                console.error('ProductEditor - Update error:', error);
                
                // Р”РµС‚Р°Р»СЊРЅР°СЏ РѕР±СЂР°Р±РѕС‚РєР° РѕС€РёР±РѕРє
                let errorMessage = t('common:text-update-error');
                
                if (error?.response) {
                  const status = error.response.status;
                  const data = error.response.data;
                  
                  if (status === 500) {
                    errorMessage = 'РћС€РёР±РєР° СЃРµСЂРІРµСЂР° (500). РџСЂРѕРІРµСЂСЊС‚Рµ РґР°РЅРЅС‹Рµ С‚РѕРІР°СЂР° Рё РїРѕРїСЂРѕР±СѓР№С‚Рµ СЃРЅРѕРІР°.';
                    if (data?.message) {
                      errorMessage += ` Р”РµС‚Р°Р»Рё: ${data.message}`;
                    }
                  } else if (data?.message) {
                    errorMessage = data.message;
                  } else if (data?.errors && typeof data.errors === 'object') {
                    const firstError = Object.values(data.errors).flat()[0];
                    errorMessage = firstError ? String(firstError) : errorMessage;
                  }
                } else if (error?.message) {
                  errorMessage = error.message;
                }
                
                toast.error(errorMessage, {
                  autoClose: 5000,
                });
                setIsLoading(false);
              },
            }
          );
        } else {
          createProduct(submitData as any, {
            onSuccess: (response: any) => {
              toast.success(t('common:text-create-success'));
              if (response) {
                setProduct(response);
              }
              
              // РЎРѕС…СЂР°РЅСЏРµРј РєРѕРґ РёР· slug РѕС‚РІРµС‚Р° СЃРµСЂРІРµСЂР°
              if (response?.slug) {
                const createdSlugData = extractSlugCode(response.slug);
                setSlugNumericCode(createdSlugData.code);
              }
              
              if (response?.id) {
                router.push(`/${router.query.shop}/products/${response.slug}/edit-wizard`);
              }
              setIsLoading(false);
            },
            onError: (error: any) => {
              console.error('ProductEditor - Create error:', error);
              
              // Р”РµС‚Р°Р»СЊРЅР°СЏ РѕР±СЂР°Р±РѕС‚РєР° РѕС€РёР±РѕРє
              let errorMessage = t('common:text-create-error');
              
              if (error?.response) {
                const status = error.response.status;
                const data = error.response.data;
                
                if (status === 500) {
                  errorMessage = 'РћС€РёР±РєР° СЃРµСЂРІРµСЂР° (500). РџСЂРѕРІРµСЂСЊС‚Рµ РґР°РЅРЅС‹Рµ С‚РѕРІР°СЂР° Рё РїРѕРїСЂРѕР±СѓР№С‚Рµ СЃРЅРѕРІР°.';
                  if (data?.message) {
                    errorMessage += ` Р”РµС‚Р°Р»Рё: ${data.message}`;
                  }
                } else if (data?.message) {
                  errorMessage = data.message;
                } else if (data?.errors && typeof data.errors === 'object') {
                  const firstError = Object.values(data.errors).flat()[0];
                  errorMessage = firstError ? String(firstError) : errorMessage;
                }
              } else if (error?.message) {
                errorMessage = error.message;
              }
              
              toast.error(errorMessage, {
                autoClose: 5000,
              });
              setIsLoading(false);
            },
          });
        }
      }
    } catch (error: any) {
      console.error('ProductEditor - Error in handleSave:', error);
      
      // Р”РµС‚Р°Р»СЊРЅР°СЏ РѕР±СЂР°Р±РѕС‚РєР° РѕС€РёР±РѕРє
      let errorMessage = 'РќРµРёР·РІРµСЃС‚РЅР°СЏ РѕС€РёР±РєР°';
      
      if (error?.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 500) {
          errorMessage = 'РћС€РёР±РєР° СЃРµСЂРІРµСЂР° (500). РџСЂРѕРІРµСЂСЊС‚Рµ РґР°РЅРЅС‹Рµ С‚РѕРІР°СЂР° Рё РїРѕРїСЂРѕР±СѓР№С‚Рµ СЃРЅРѕРІР°.';
          if (data?.message) {
            errorMessage += ` Р”РµС‚Р°Р»Рё: ${data.message}`;
          }
          // РџРѕРєР°Р·С‹РІР°РµРј РґРµС‚Р°Р»Рё РѕС€РёР±РєРё РІ РєРѕРЅСЃРѕР»Рё РґР»СЏ РѕС‚Р»Р°РґРєРё
          console.error('Server error details:', {
            status,
            data,
            submitData: error?.config?.data ? JSON.parse(error.config.data) : null,
          });
        } else if (status === 404) {
          errorMessage = 'РўРѕРІР°СЂ РЅРµ РЅР°Р№РґРµРЅ. РћР±РЅРѕРІРёС‚Рµ СЃС‚СЂР°РЅРёС†Сѓ Рё РїРѕРїСЂРѕР±СѓР№С‚Рµ СЃРЅРѕРІР°.';
        } else if (status === 403 || status === 401) {
          errorMessage = 'РќРµС‚ РґРѕСЃС‚СѓРїР° РґР»СЏ РІС‹РїРѕР»РЅРµРЅРёСЏ СЌС‚РѕР№ РѕРїРµСЂР°С†РёРё.';
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (data?.error) {
          errorMessage = String(data.error);
        } else if (data?.errors && typeof data.errors === 'object') {
          // РћС€РёР±РєРё РІР°Р»РёРґР°С†РёРё
          const firstError = Object.values(data.errors).flat()[0];
          errorMessage = firstError ? String(firstError) : 'РћС€РёР±РєР° РІР°Р»РёРґР°С†РёРё РґР°РЅРЅС‹С…';
        } else {
          errorMessage = `РћС€РёР±РєР° СЃРµСЂРІРµСЂР° (${status})`;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      console.error('Detailed error info:', {
        error,
        message: errorMessage,
        response: error?.response,
        data: error?.response?.data,
      });
      
      toast.error(errorMessage || t('common:text-error'), {
        autoClose: 5000,
      });
      setIsLoading(false);
    }
  };

  // РћР±СЂР°Р±РѕС‚РєР° РІР°СЂРёР°РЅС‚РѕРІ РіСЂСѓРїРїС‹
  const handleGroupVariants = async (
    groupKey: string,
    variants: any[],
    formDataForVariants: any,
    methods: any
  ) => {
    if (!variants || variants.length === 0) {
      console.log('No variants to save');
      return;
    }

    // РџРѕР»СѓС‡Р°РµРј РґР°РЅРЅС‹Рµ РёР· РїРµСЂРµРґР°РЅРЅРѕР№ С„РѕСЂРјС‹
    const typeId = formDataForVariants.type_id 
      ? (typeof formDataForVariants.type_id === 'object' && formDataForVariants.type_id !== null && 'id' in formDataForVariants.type_id
          ? String(formDataForVariants.type_id.id)
          : String(formDataForVariants.type_id))
      : (initialProduct?.type?.id ? String(initialProduct.type.id) : undefined);
    
    if (!typeId) {
      console.error('type_id is required for group variants');
      toast.error('РћС€РёР±РєР°: РЅРµ СѓРєР°Р·Р°РЅ С‚РёРї С‚РѕРІР°СЂР°');
      return;
    }
    
    const categoryId = formDataForVariants.category_id;
    const categories = formDataForVariants.categories || [];
    const shopIdForVariants = formDataForVariants.shop_id || shopId;
    
    console.log('handleGroupVariants - Starting to save variants:', {
      groupKey,
      variantsCount: variants.length,
      typeId,
      categoryId,
      categories,
      shopId: shopIdForVariants,
    });

    // РџРѕРєР°Р·С‹РІР°РµРј РїСЂРѕРіСЂРµСЃСЃ
    toast.info(`РЎРѕС…СЂР°РЅРµРЅРёРµ ${variants.length} РІР°СЂРёР°РЅС‚РѕРІ...`);

    try {
      const { HttpClient } = await import('@/data/client/http-client');
      
      // РСЃРїРѕР»СЊР·СѓРµРј ProductWizardController РґР»СЏ СЃРѕС…СЂР°РЅРµРЅРёСЏ РІР°СЂРёР°РЅС‚РѕРІ
      try {
        
        // РџРѕРґРіРѕС‚Р°РІР»РёРІР°РµРј РґР°РЅРЅС‹Рµ РІР°СЂРёР°РЅС‚РѕРІ РґР»СЏ РѕС‚РїСЂР°РІРєРё РІ РєРѕРЅС‚СЂРѕР»Р»РµСЂ
        const variantsData = variants.map((variant) => ({
          ...(variant.id ? { id: Number(variant.id) } : {}),
          name: variant.name || formDataForVariants.name || '',
          // Р”Р»СЏ СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёС… С‚РѕРІР°СЂРѕРІ РёСЃРїРѕР»СЊР·СѓРµРј С‚РµРєСѓС‰РёР№ slug, РґР»СЏ РЅРѕРІС‹С… - РіРµРЅРµСЂРёСЂСѓРµРј С‚РѕР»СЊРєРѕ РµСЃР»Рё РЅРµС‚
          slug: variant.slug || (variant.id ? '' : `${groupKey}-${Date.now()}-${variants.indexOf(variant)}`),
          type_id: Number(typeId),
          shop_id: Number(shopIdForVariants || shopId),
          price: variant.price ?? 0,
          sale_price: variant.sale_price ?? null,
          quantity: variant.quantity ?? 0,
          sku: variant.sku || '',
          internal_article: variant.internal_article || '',
          description: formDataForVariants.description || '',
          status: formDataForVariants.status || 'draft',
          language: router.locale || 'ru',
          ...(categoryId ? { category_id: String(categoryId) } : {}),
          ...(categories.length > 0 ? { categories } : {}),
          ...(variant.gallery && Array.isArray(variant.gallery) && variant.gallery.length > 0
            ? { gallery: variant.gallery }
            : {}),
          ...(variant.attributes && typeof variant.attributes === 'object' && Object.keys(variant.attributes).length > 0
            ? { 
                attribute_values: Object.entries(variant.attributes).reduce((acc: any, [key, value]) => {
                  const attrId = isNaN(Number(key)) ? key : Number(key);
                  const attrValue = Array.isArray(value) 
                    ? value.filter(v => v !== null && v !== undefined && v !== '').join(',')
                    : String(value || '');
                  if (attrValue.trim() !== '') {
                    acc[attrId] = attrValue;
                  }
                  return acc;
                }, {})
              }
            : {}),
        }));

        console.log('handleGroupVariants - Sending to ProductWizardController:', {
          group_key: groupKey,
          variants_count: variantsData.length,
          variants: variantsData.map(v => ({ id: v.id, name: v.name, sku: v.sku })),
        });

        // РћС‚РїСЂР°РІР»СЏРµРј РІСЃРµ РІР°СЂРёР°РЅС‚С‹ РѕРґРЅРёРј Р·Р°РїСЂРѕСЃРѕРј РІ ProductWizardController
        console.log('handleGroupVariants - productClient check:', {
          hasProductClient: !!productClient,
          hasSaveVariants: typeof productClient?.saveVariants === 'function',
          productClientKeys: productClient ? Object.keys(productClient) : [],
        });
        
        if (!productClient || typeof productClient.saveVariants !== 'function') {
          throw new Error('productClient.saveVariants is not a function. productClient: ' + JSON.stringify(Object.keys(productClient || {})));
        }
        
        const response = await productClient.saveVariants({
          group_key: groupKey,
          variants: variantsData,
        });

        console.log('handleGroupVariants - Response from ProductWizardController:', response);

        if (response?.success && response?.data) {
          // РћР±РЅРѕРІР»СЏРµРј С„РѕСЂРјСѓ СЃ СЃРѕС…СЂР°РЅРµРЅРЅС‹РјРё РІР°СЂРёР°РЅС‚Р°РјРё
          const loadedVariants = response.data.map((product: any) => ({
            id: String(product.id),
            name: product.name || '',
            slug: product.slug || '',
            attributes: product.attribute_values || product.attributes || {},
            price: product.price || 0,
            sale_price: product.sale_price ?? null,
            quantity: product.quantity ?? 0,
            sku: product.sku || '',
            internal_article: product.internal_article || '',
            gallery: product.gallery || [],
            image: product.image || null,
          }));
          
          methods.setValue('group_variants', loadedVariants);
          console.log('handleGroupVariants - Updated form with saved variants:', loadedVariants);

          // РџРѕРєР°Р·С‹РІР°РµРј СЂРµР·СѓР»СЊС‚Р°С‚
          if (response.errors && response.errors.length > 0) {
            const savedCount = response.data.length;
            const totalCount = variantsData.length;
            const failedVariants = response.errors.map((e: any) => `${e.name} (${e.error})`).join(', ');
            toast.error(`РЎРѕС…СЂР°РЅРµРЅРѕ ${savedCount} РёР· ${totalCount} РІР°СЂРёР°РЅС‚РѕРІ. РћС€РёР±РєРё: ${failedVariants}`);
          } else {
            toast.success(`Р’СЃРµ ${response.data.length} РІР°СЂРёР°РЅС‚РѕРІ СѓСЃРїРµС€РЅРѕ СЃРѕС…СЂР°РЅРµРЅС‹`);
          }
          
          // Р’РѕР·РІСЂР°С‰Р°РµРј response РґР»СЏ РѕР±РЅРѕРІР»РµРЅРёСЏ slug
          return response;
        } else {
          throw new Error(response?.message || 'РћС€РёР±РєР° РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё РІР°СЂРёР°РЅС‚РѕРІ');
        }
      } catch (error: any) {
        console.error('handleGroupVariants - Error:', error);
        const errorMessage = error?.response?.data?.message || error?.message || 'РћС€РёР±РєР° РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё РІР°СЂРёР°РЅС‚РѕРІ';
        toast.error(errorMessage);
        throw error;
      }
    } catch (error: any) {
      console.error('handleGroupVariants - Fatal error:', error);
      
      // Р”РµС‚Р°Р»СЊРЅР°СЏ РѕР±СЂР°Р±РѕС‚РєР° РѕС€РёР±РѕРє
      let errorMessage = 'РќРµРёР·РІРµСЃС‚РЅР°СЏ РѕС€РёР±РєР°';
      
      if (error?.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 500) {
          errorMessage = 'РћС€РёР±РєР° СЃРµСЂРІРµСЂР° (500). РџСЂРѕРІРµСЂСЊС‚Рµ РґР°РЅРЅС‹Рµ С‚РѕРІР°СЂРѕРІ Рё РїРѕРїСЂРѕР±СѓР№С‚Рµ СЃРЅРѕРІР°.';
          if (data?.message) {
            errorMessage += ` Р”РµС‚Р°Р»Рё: ${data.message}`;
          }
        } else if (status === 404) {
          errorMessage = 'РўРѕРІР°СЂ РёР»Рё РіСЂСѓРїРїР° РЅРµ РЅР°Р№РґРµРЅС‹. РћР±РЅРѕРІРёС‚Рµ СЃС‚СЂР°РЅРёС†Сѓ Рё РїРѕРїСЂРѕР±СѓР№С‚Рµ СЃРЅРѕРІР°.';
        } else if (status === 403 || status === 401) {
          errorMessage = 'РќРµС‚ РґРѕСЃС‚СѓРїР° РґР»СЏ РІС‹РїРѕР»РЅРµРЅРёСЏ СЌС‚РѕР№ РѕРїРµСЂР°С†РёРё.';
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (data?.error) {
          errorMessage = String(data.error);
        } else {
          errorMessage = `РћС€РёР±РєР° СЃРµСЂРІРµСЂР° (${status})`;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      console.error('Detailed error info:', {
        error,
        message: errorMessage,
        response: error?.response,
        data: error?.response?.data,
      });
      
      toast.error('РљСЂРёС‚РёС‡РµСЃРєР°СЏ РѕС€РёР±РєР° РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё РІР°СЂРёР°РЅС‚РѕРІ: ' + errorMessage, {
        autoClose: 5000,
      });
      
      throw error;
    }
    
    // Р’РѕР·РІСЂР°С‰Р°РµРј null РІ СЃР»СѓС‡Р°Рµ РѕС€РёР±РєРё
    return null;
  };

  const handleNext = async () => {
    try {
      // Р’Р°Р»РёРґРёСЂСѓРµРј С‚РѕР»СЊРєРѕ РѕР±СЏР·Р°С‚РµР»СЊРЅС‹Рµ РїРѕР»СЏ С‚РµРєСѓС‰РµРіРѕ С€Р°РіР°
      let isValid = true;
      
      // Р”Р»СЏ С€Р°РіР° 0 (РћСЃРЅРѕРІРЅР°СЏ РёРЅС„РѕСЂРјР°С†РёСЏ) - РїСЂРѕРІРµСЂСЏРµРј name Рё category_ids
      if (currentStep === 0) {
        isValid = await methods.trigger(['name', 'category_ids']);
      }
      // Р”Р»СЏ С€Р°РіР° 1 (РњРµРґРёР°) - РІР°Р»РёРґР°С†РёСЏ РЅРµ РЅСѓР¶РЅР°, РІСЃРµ РїРѕР»СЏ РѕРїС†РёРѕРЅР°Р»СЊРЅС‹
      else if (currentStep === 1) {
        isValid = true; // РњРµРґРёР° РЅРµ РѕР±СЏР·Р°С‚РµР»СЊРЅС‹, РІСЃРµРіРґР° РјРѕР¶РЅРѕ РїРµСЂРµР№С‚Рё РґР°Р»СЊС€Рµ
      }
      // РЁР°Рі В«РљСѓСЂСЃ Рё РїРѕРґРїРёСЃРєР°В»: РїСЂРё subscription РїСЂРѕРІРµСЂСЏРµРј РїРѕР»СЏ РїРµСЂРёРѕРґР° РґРѕСЃС‚СѓРїР°
      else if (currentStep === 4) {
        const dtype = methods.getValues('digital_product_type');
        if (dtype === 'subscription') {
          isValid = await methods.trigger(['billing_access_type', 'duration_days', 'course']);
        } else {
          isValid = true;
        }
      }
      // Р”Р»СЏ РѕСЃС‚Р°Р»СЊРЅС‹С… С€Р°РіРѕРІ РїСЂРѕРІРµСЂСЏРµРј РѕР±С‰СѓСЋ РІР°Р»РёРґРЅРѕСЃС‚СЊ С„РѕСЂРјС‹
      else {
        isValid = await methods.trigger();
      }
      
      if (isValid) {
        const values = methods.getValues();
        // РЈР±РµР¶РґР°РµРјСЃСЏ, С‡С‚Рѕ РІСЃРµ РјР°СЃСЃРёРІС‹ РёРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°РЅС‹ РїСЂР°РІРёР»СЊРЅРѕ
        if (values.gallery !== undefined && !Array.isArray(values.gallery)) {
          values.gallery = [];
        }
        if (values.category_ids !== undefined && !Array.isArray(values.category_ids)) {
          values.category_ids = [];
        }
        if (values.tags !== undefined && !Array.isArray(values.tags)) {
          values.tags = [];
        }
        if (values.group_variants !== undefined && !Array.isArray(values.group_variants)) {
          values.group_variants = [];
        }
        // РЈР±СЂР°Р»Рё variations - Р±РѕР»СЊС€Рµ РЅРµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ
        if (values.videos !== undefined && !Array.isArray(values.videos)) {
          values.videos = [];
        }
        updateProduct(values as any);
        if (currentStep < STEPS.length - 1) {
          setCurrentStep(currentStep + 1);
        }
      }
    } catch (error) {
      console.error('Error in handleNext:', error);
      toast.error('Please check the current step fields before continuing.');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!router.isReady) {
    return <div className="flex items-center justify-center min-h-screen">Р—Р°РіСЂСѓР·РєР°...</div>;
  }

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <FormProvider {...methods}>
      <ProductEditorContent
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        STEPS={STEPS}
        CurrentStepComponent={CurrentStepComponent}
        handleNext={handleNext}
        handlePrev={handlePrev}
        handleSave={handleSave}
        creating={creating}
        updating={updating}
        productId={productId}
        initialProduct={initialProduct}
        t={t}
      />
    </FormProvider>
  );
}

// Р’РЅСѓС‚СЂРµРЅРЅРёР№ РєРѕРјРїРѕРЅРµРЅС‚ РєРѕРЅС‚РµРЅС‚Р° СЂРµРґР°РєС‚РѕСЂР° РІРЅСѓС‚СЂРё FormProvider
function ProductEditorContent({
  currentStep,
  setCurrentStep,
  STEPS,
  CurrentStepComponent,
  handleNext,
  handlePrev,
  handleSave,
  creating,
  updating,
  productId,
  initialProduct,
  t,
}: {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  STEPS: typeof STEPS;
  CurrentStepComponent: React.ComponentType;
  handleNext: () => void;
  handlePrev: () => void;
  handleSave: (data: ProductEditorFormData, publish: boolean) => Promise<void>;
  creating: boolean;
  updating: boolean;
  productId?: string | number;
  initialProduct?: Product | null;
  t: any;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-screen bg-gray-50 px-4 lg:px-6 py-4 lg:py-6">
        {/* Р›РµРІР°СЏ РЅР°РІРёРіР°С†РёСЏ */}
        <EditorNavigation
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
          productId={productId}
        />

        {/* РћСЃРЅРѕРІРЅРѕР№ РєРѕРЅС‚РµРЅС‚ */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-heading">
              {productId ? 'Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ С‚РѕРІР°СЂР°' : 'Р”РѕР±Р°РІРёС‚СЊ С‚РѕРІР°СЂ'}
            </h1>
            <p className="text-xs sm:text-sm text-body mt-1">
              РЁР°Рі {currentStep + 1} РёР· {STEPS.length}: {STEPS[currentStep].label}
            </p>
          </div>

          {/* РџСЂРѕРіСЂРµСЃСЃ-Р±Р°СЂ - СЃРєСЂС‹С‚ РЅР° РјРѕР±РёР»СЊРЅС‹С…, С‚Р°Рє РєР°Рє РµСЃС‚СЊ Р°РґР°РїС‚РёРІРЅР°СЏ РЅР°РІРёРіР°С†РёСЏ */}
          <div className="hidden sm:block mb-6 lg:mb-8">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-2 mx-1 rounded ${
                    index <= currentStep ? 'bg-accent' : 'bg-border-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* РљРѕРЅС‚РµРЅС‚ С€Р°РіР° */}
          <div className="min-h-[300px] sm:min-h-[400px]">
            <CurrentStepComponent />
          </div>

          {/* Р”РµР№СЃС‚РІРёСЏ */}
          <EditorActionsWrapper
            currentStep={currentStep}
            totalSteps={STEPS.length}
            onNext={handleNext}
            onPrev={handlePrev}
            handleSave={handleSave}
            isLoading={creating || updating}
            productId={productId}
          />
        </div>
      </div>
  );
}

// РћР±РµСЂС‚РєР° РґР»СЏ EditorActions СЃ РґРѕСЃС‚СѓРїРѕРј Рє FormContext
function EditorActionsWrapper({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  handleSave,
  isLoading,
  productId,
}: {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  handleSave: (data: ProductEditorFormData, publish: boolean) => Promise<void>;
  isLoading: boolean;
  productId?: string | number;
}) {
  const { getValues } = useFormContext<ProductEditorFormData>();
  
  // РЎС‚РѕРёРјРѕСЃС‚СЊ СЂР°Р·РјРµС‰РµРЅРёСЏ С‚РѕРІР°СЂР° (РґРѕР»Р¶РЅР° СЃРѕРІРїР°РґР°С‚СЊ СЃ PaymentService::PRODUCT_PLACEMENT_COST)
  // РЎС‚РѕРёРјРѕСЃС‚СЊ СЂР°Р·РјРµС‰РµРЅРёСЏ С‚РѕРІР°СЂР° РѕС‚РјРµРЅРµРЅР°. РќРёРєР°РєРёС… РѕРїР»Р°С‚ Рё РјРѕРґР°Р»РѕРє Р±РѕР»СЊС€Рµ РЅРµ С‚СЂРµР±СѓРµС‚СЃСЏ.
  const performSave = (publish: boolean) => {
    // Р•РґРёРЅР°СЏ Р»РѕРіРёРєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ: РІРµСЃСЊ payload С„РѕСЂРјРёСЂСѓРµС‚СЃСЏ РІРЅСѓС‚СЂРё handleSave.
    handleSave(getValues(), publish).catch((error: any) => {
      console.error('Error in handleSave:', error);
      toast.error(error?.message || 'РћС€РёР±РєР° РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё');
    });
  };
  
  return (
    <EditorActions
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={onNext}
      onPrev={onPrev}
      onSave={(publish) => {
        // Р’СЃСЏ Р»РѕРіРёРєР° РѕРїР»Р°С‚С‹ Рё РїРѕРґС‚РІРµСЂР¶РґРµРЅРёР№ СѓРґР°Р»РµРЅР°. РџСѓР±Р»РёРєР°С†РёСЏ/СЃРѕС…СЂР°РЅРµРЅРёРµ СЃРѕС…СЂР°РЅСЏРµС‚ С‚РѕРІР°СЂ РЅР°РїСЂСЏРјСѓСЋ.
        performSave(!!publish);
      }}
      isLoading={isLoading}
      productId={productId}
    />
  );
}
