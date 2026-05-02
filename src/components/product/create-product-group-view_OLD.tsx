import { useState, useEffect, useMemo } from 'react';
import { useModalAction, useModalState } from '@/components/ui/modal/modal.context';
import { useProductsQuery } from '@/data/product';
import { useCategoryAttributesQuery } from '@/data/category';
import { useCategoriesQuery } from '@/data/category';
import { useShopQuery } from '@/data/shop';
import { useRouter } from 'next/router';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Label from '@/components/ui/label';
import Select from '@/components/ui/select/select';
import { toast } from 'react-toastify';
import { HttpClient } from '@/data/client/http-client';
import Card from '@/components/common/card';

type ProductRow = {
  id: string;
  name: string;
  currentCategoryId?: number;
  currentPrice: number;
  currentSku: string;
  currentAttributes: Record<number, string>;
  categoryId: number;
  price: number;
  sku: string;
  attributes: Record<number, string>;
  status?: string; // Статус товара
};

export default function CreateProductGroupView() {
  console.log('CreateProductGroupView - Component rendering');
  
  const { data } = useModalState();
  const { closeModal } = useModalAction();
  const router = useRouter();
  const { locale } = router;
  
  // Получаем выбранные ID товаров и полные данные товаров из data
  const selectedProductIds = (data?.productIds || []) as string[];
  const preloadedProducts = (data?.products || []) as any[]; // Полные данные товаров из списка
  
  console.log('CreateProductGroupView - Mounted', {
    selectedProductIds,
    preloadedProductsCount: preloadedProducts.length,
    data,
    productIdsCount: selectedProductIds.length,
    routerReady: router.isReady,
    hasData: !!data,
  });
  
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [commonCategoryId, setCommonCategoryId] = useState<number | null>(null);
  const [groupKey, setGroupKey] = useState<string>(''); // Только системный ключ для связи товаров
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Получаем shop_id - безопасно
  const shopSlug = router.isReady ? (router.query.shop as string) : null;
  const { data: shopData } = useShopQuery(
    { slug: shopSlug || '' },
    { enabled: !!shopSlug && router.isReady }
  );
  const shopId = shopData?.id;

  // Загружаем выбранные товары
  useEffect(() => {
    if (!router.isReady) {
      return; // Ждем готовности роутера
    }
    
    console.log('CreateProductGroupView - useEffect triggered', {
      selectedProductIds,
      length: selectedProductIds.length,
      routerReady: router.isReady,
      shopSlug,
      shopId,
    });
    
    if (selectedProductIds.length === 0) {
      console.warn('CreateProductGroupView - No products selected');
      setError('Не выбрано ни одного товара');
      return;
    }
    
    if (!shopId) {
      console.warn('CreateProductGroupView - No shopId');
      setError('Не удалось определить магазин');
      return;
    }

    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const productsData: ProductRow[] = [];
        
        // Сначала пробуем использовать предзагруженные данные из списка
        if (preloadedProducts && preloadedProducts.length > 0) {
          console.log('Using preloaded products from list:', preloadedProducts.length);
          for (const product of preloadedProducts) {
            // Проверяем, что товар из того же магазина
            if (shopId && product.shop_id && Number(product.shop_id) !== Number(shopId)) {
              console.warn(`Product ${product.id} belongs to different shop`);
              toast.warning(`Товар "${product.name}" принадлежит другому магазину и будет пропущен`);
              continue;
            }
            
            // Если у товара нет полных данных, загружаем отдельно
            const hasFullData = product.categories && Array.isArray(product.categories) && product.categories.length > 0;
            let productData = product;
            
            if (!hasFullData && product.slug) {
              try {
                productData = await HttpClient.get(`products/${product.slug}`, {
                  with: 'type;shop;categories;tags;attributes',
                  language: locale || 'ru',
                });
              } catch (loadError: any) {
                console.warn(`Failed to load full data for product ${product.id}, using partial data`);
              }
            } else if (!hasFullData && !product.slug) {
              try {
                productData = await HttpClient.get(`products/${product.id}`, {
                  with: 'type;shop;categories;tags;attributes',
                  language: locale || 'ru',
                });
              } catch (loadError: any) {
                console.error(`Failed to load product ${product.id}:`, loadError);
                if (loadError?.response?.status === 404) {
                  toast.warning(`Товар с ID ${product.id} не найден и будет пропущен`);
                }
                continue;
              }
            }
            
            if (!productData) continue;
            
            const categoryId = productData.categories?.[0]?.id || productData.category_id;
            const attributes: Record<number, string> = {};
            
            if (productData.attributes && Array.isArray(productData.attributes)) {
              productData.attributes.forEach((attr: any) => {
                if (attr.pivot?.value) {
                  attributes[attr.id] = attr.pivot.value || '';
                }
              });
            } else if (productData.attribute_values && typeof productData.attribute_values === 'object') {
              Object.entries(productData.attribute_values).forEach(([key, value]) => {
                attributes[Number(key)] = String(value);
              });
            }
            
            productsData.push({
              id: String(productData.id),
              name: productData.name || '',
              currentCategoryId: categoryId,
              currentPrice: productData.price || 0,
              currentSku: productData.sku || '',
              currentAttributes: attributes,
              categoryId: categoryId || 0,
              price: productData.price || 0,
              sku: productData.sku || '',
              attributes: { ...attributes },
              status: productData.status || 'draft',
            });
          }
        } else {
          // Если предзагруженных данных нет, загружаем по ID (fallback)
          console.log('No preloaded products, loading by IDs...');
          for (const productId of selectedProductIds) {
            try {
              console.log(`Loading product ${productId}...`);
              // Пробуем сначала по ID, потом по slug если есть
              let product = null;
              try {
                product = await HttpClient.get(`products/${productId}`, {
                  with: 'type;shop;categories;tags;attributes',
                  language: locale || 'ru',
                });
              } catch (idError: any) {
                // Если не получилось по ID, возможно нужен slug
                console.warn(`Failed to load product ${productId} by ID, trying alternative methods...`);
                throw idError;
              }
              
              if (!product) {
                console.warn(`Product ${productId} returned empty response`);
                continue;
              }
              
              // Проверяем, что товар из того же магазина
              if (shopId && product.shop_id && Number(product.shop_id) !== Number(shopId)) {
                console.warn(`Product ${product.id} belongs to different shop`);
                toast.warning(`Товар "${product.name}" принадлежит другому магазину и будет пропущен`);
                continue;
              }
              
              const categoryId = product.categories?.[0]?.id || product.category_id;
              const attributes: Record<number, string> = {};
              
              if (product.attributes && Array.isArray(product.attributes)) {
                product.attributes.forEach((attr: any) => {
                  if (attr.pivot?.value) {
                    attributes[attr.id] = attr.pivot.value || '';
                  }
                });
              } else if (product.attribute_values && typeof product.attribute_values === 'object') {
                Object.entries(product.attribute_values).forEach(([key, value]) => {
                  attributes[Number(key)] = String(value);
                });
              }
              
              productsData.push({
                id: String(product.id),
                name: product.name || '',
                currentCategoryId: categoryId,
                currentPrice: product.price || 0,
                currentSku: product.sku || '',
                currentAttributes: attributes,
                categoryId: categoryId || 0,
                price: product.price || 0,
                sku: product.sku || '',
                attributes: { ...attributes },
                status: product.status || 'draft',
              });
            } catch (error: any) {
              console.error(`Error loading product ${productId}:`, error);
              if (error?.response?.status === 404) {
                toast.warning(`Товар с ID ${productId} не найден и будет пропущен`);
              }
            }
          }
        }

        // Проверяем, что загружено минимум 2 товара
        if (productsData.length < 2) {
          const errorMessage = productsData.length === 0
            ? 'Не удалось загрузить ни одного товара. Проверьте, что товары существуют и доступны.'
            : `Загружено только ${productsData.length} товар(ов). Для создания группы необходимо минимум 2 товара.`;
          setError(errorMessage);
          toast.error(errorMessage);
          // НЕ закрываем модальное окно - показываем ошибку пользователю
          return;
        }

        setProducts(productsData);
        
        // Определяем общую категорию
        const categoryIds = productsData.map(p => p.currentCategoryId).filter(Boolean) as number[];
        if (categoryIds.length > 0) {
          const mostCommonCategory = categoryIds.reduce((a, b, i, arr) =>
            arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
          );
          setCommonCategoryId(mostCommonCategory);
          // Устанавливаем общую категорию для всех товаров
          setProducts(prev => prev.map(p => ({
            ...p,
            categoryId: mostCommonCategory,
          })));
        }
        
        // Генерируем числовой системный ключ группы
        // Формат: timestamp + случайное число (например: 1735312345678)
        const numericGroupKey = String(Date.now() + Math.floor(Math.random() * 1000));
        setGroupKey(numericGroupKey);

        // Анализ статусов товаров (информационное сообщение)
        const statusCounts: Record<string, number> = {};
        productsData.forEach(p => {
          const status = p.status || 'draft';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        const uniqueStatuses = Object.keys(statusCounts);
        
        if (uniqueStatuses.length > 1) {
          console.log('CreateProductGroupView - Products have different statuses:', statusCounts);
          // Показываем информационное сообщение о разных статусах
          const statusLabels: Record<string, string> = {
            'draft': 'черновики',
            'publish': 'опубликованные',
            'under_review': 'на модерации',
            'approved': 'одобренные',
            'rejected': 'отклоненные',
            'unpublish': 'снятые с публикации',
          };
          const statusText = uniqueStatuses.map(s => `${statusCounts[s]} ${statusLabels[s] || s}`).join(', ');
          toast.info(`В группе товары с разными статусами: ${statusText}. Статусы сохранятся у каждого товара.`, {
            autoClose: 5000,
          });
        }
      } catch (error: any) {
        console.error('Error loading products:', error);
        const errorMessage = error?.response?.status === 404
          ? 'Товары не найдены. Проверьте, что выбранные товары существуют.'
          : 'Ошибка при загрузке товаров: ' + (error?.message || 'Неизвестная ошибка');
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (shopId && selectedProductIds.length > 0) {
      loadProducts().catch((err) => {
        console.error('CreateProductGroupView - Error in loadProducts:', err);
        setError('Ошибка при загрузке товаров: ' + (err?.message || 'Неизвестная ошибка'));
        setIsLoading(false);
      });
    }
  }, [selectedProductIds, preloadedProducts, locale, router.isReady, shopSlug, shopId]);

  // Загружаем категории (только если роутер готов)
  const { categories } = useCategoriesQuery({ limit: 1000 });

  // Загружаем атрибуты выбранной категории (только если категория выбрана)
  const { data: attributesData } = useCategoryAttributesQuery(
    commonCategoryId || undefined
  );
  
  const availableAttributes = useMemo(() => {
    if (!attributesData?.data) return [];
    const attrs = Array.isArray(attributesData.data) 
      ? attributesData.data 
      : (attributesData.data?.attributes || []);
    return attrs;
  }, [attributesData]);

  // Обновление данных товара
  const updateProduct = (productId: string, field: keyof ProductRow, value: any) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, [field]: value } : p
    ));
  };

  // Обновление атрибута товара
  const updateProductAttribute = (productId: string, attributeId: number, value: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const newAttributes = { ...p.attributes };
        if (value) {
          newAttributes[attributeId] = value;
        } else {
          delete newAttributes[attributeId];
        }
        return { ...p, attributes: newAttributes };
      }
      return p;
    }));
  };

  // Детальная валидация перед сохранением
  const validate = (): string | null => {
    // Проверка системного ключа группы
    if (!groupKey.trim()) {
      return 'Системный ключ группы не может быть пустым';
    }

    // Проверка формата group_key (только цифры)
    if (!/^\d+$/.test(groupKey)) {
      return 'Ключ группы должен быть числовым';
    }
    
    if (products.length < 2) {
      return 'Выберите минимум 2 товара для создания группы';
    }
    
    // Проверяем, что все товары из одной категории
    const categoryIds = products.map(p => p.categoryId).filter(Boolean);
    if (categoryIds.length === 0) {
      return 'У всех товаров должна быть выбрана категория';
    }
    
    const uniqueCategories = new Set(categoryIds);
    if (uniqueCategories.size > 1) {
      return 'Все товары должны быть из одной категории';
    }

    if (!commonCategoryId) {
      return 'Выберите общую категорию для всех товаров';
    }
    
    // Детальная проверка каждого товара
    const errors: string[] = [];
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const productIndex = i + 1;
      
      // Проверка названия
      if (!product.name || !product.name.trim()) {
        errors.push(`Товар #${productIndex} (ID: ${product.id}): отсутствует название`);
      }
      
      // Проверка цены
      if (product.price === undefined || product.price === null) {
        errors.push(`Товар #${productIndex} "${product.name}": не указана цена`);
      } else if (isNaN(Number(product.price))) {
        errors.push(`Товар #${productIndex} "${product.name}": цена должна быть числом`);
      } else if (Number(product.price) < 0) {
        errors.push(`Товар #${productIndex} "${product.name}": цена не может быть отрицательной`);
      }
      
      // Проверка категории
      if (!product.categoryId || product.categoryId === 0) {
        errors.push(`Товар #${productIndex} "${product.name}": не указана категория`);
      }
      
      // Проверка SKU (обязательно)
      if (!product.sku || !product.sku.trim()) {
        errors.push(`Товар #${productIndex} "${product.name}": не указан SKU (артикул)`);
      }
      
      // Проверка атрибутов (опционально)
      if (product.attributes && typeof product.attributes !== 'object') {
        errors.push(`Товар #${productIndex} "${product.name}": атрибуты должны быть объектом`);
      }
    }
    
    if (errors.length > 0) {
      // Показываем первую ошибку в toast, остальные в консоли
      const firstError = errors[0];
      const allErrors = errors.join('; ');
      console.error('Ошибки валидации:', allErrors);
      return firstError;
    }
    
    return null;
  };

  // Сохранение группы
  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      // Если ошибка содержит переносы строк, показываем как многострочное сообщение
      if (validationError.includes('\n')) {
        toast.error(validationError.split('\n')[0], {
          autoClose: 5000,
        });
        // Дополнительно выводим в консоль для отладки
        console.error('Validation errors:', validationError);
      } else {
        toast.error(validationError);
      }
      return;
    }

    // Дополнительная проверка перед отправкой
    if (!shopId) {
      toast.error('Не удалось определить магазин. Обновите страницу и попробуйте снова.');
      return;
    }

    setIsSaving(true);
    try {
      console.log('CreateProductGroupView - Starting save:', {
        groupKey,
        productsCount: products.length,
        shopId,
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          categoryId: p.categoryId,
          price: p.price,
        })),
      });
      // Проверяем, что все товары из одного магазина
      if (!shopId) {
        toast.error('Не удалось определить магазин');
        return;
      }

      // Подготавливаем данные для отправки
      const variantsData = products.map((product) => {
        // Убеждаемся, что атрибуты передаются в правильном формате
        // Формат: { attributeId: "value" } например { "78": "200х130 см" }
        const attributeValues: Record<string, string> = {};
        if (product.attributes && typeof product.attributes === 'object') {
          Object.entries(product.attributes).forEach(([key, value]) => {
            // Преобразуем ключ в строку (ID атрибута)
            const attrId = String(key);
            // Преобразуем значение в строку
            const attrValue = String(value || '').trim();
            // Сохраняем только непустые значения
            if (attrValue !== '') {
              attributeValues[attrId] = attrValue;
            }
          });
        }
        
        console.log('[CreateProductGroup] Preparing product data:', {
          id: product.id,
          name: product.name,
          attributesCount: Object.keys(attributeValues).length,
          attributes: attributeValues,
        });
        
        return {
          id: Number(product.id),
          name: product.name,
          category_id: product.categoryId,
          price: product.price,
          sku: product.sku || '',
          attribute_values: attributeValues, // Передаем в формате { "78": "200х130 см" }
        };
      });

      // Отправляем запрос на создание группы
      const response = await HttpClient.post('products/wizard/create-group', {
        group_name: products[0]?.name || 'Группа товаров', // Используем название первого товара
        group_key: groupKey,
        products: variantsData,
        shop_id: shopId,
      });

      if (response?.success) {
        const message = response?.message || `Групповой товар успешно создан`;
        toast.success(message);
        
        console.log('CreateProductGroupView - Group created successfully:', {
          groupKey: response?.group_key || groupKey,
          productsCount: response?.data?.length || products.length,
        });
        
        closeModal();
        
        // Небольшая задержка перед обновлением для лучшего UX
        setTimeout(() => {
          router.reload();
        }, 500);
      } else {
        throw new Error(response?.message || 'Ошибка при создании группы');
      }
    } catch (error: any) {
      console.error('Error creating product group:', error);
      toast.error('Ошибка при создании группы: ' + (error?.response?.data?.message || error?.message || 'Неизвестная ошибка'));
    } finally {
      setIsSaving(false);
    }
  };

  // Обновление общей категории для всех товаров
  const handleCommonCategoryChange = (categoryId: number) => {
    setCommonCategoryId(categoryId);
    setProducts(prev => prev.map(p => ({
      ...p,
      categoryId: categoryId,
    })));
  };

  // Если роутер не готов, показываем загрузку
  if (!router.isReady) {
    return (
      <Card className="p-6 min-w-[400px] max-w-[600px]">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </Card>
    );
  }

  // Если ошибка или нет выбранных товаров, показываем сообщение
  if (error || (selectedProductIds.length === 0 && !isLoading)) {
    return (
      <Card className="p-6 min-w-[400px] max-w-[600px]">
        <div className="text-center py-8">
          <p className="text-lg font-semibold text-gray-900 mb-4">
            {error || 'Не выбрано ни одного товара'}
          </p>
          <p className="text-sm text-gray-600 mb-6">
            {selectedProductIds.length === 0 
              ? 'Выберите минимум 2 товара в списке, чтобы создать групповой товар.'
              : 'Проверьте настройки и попробуйте снова.'}
          </p>
          <div className="flex justify-center space-x-3">
            {error && selectedProductIds.length > 0 && (
              <Button 
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  // Перезагружаем товары
                  const loadProducts = async () => {
                    try {
                      const productsData: ProductRow[] = [];
                      for (const productId of selectedProductIds) {
                        try {
                          const product = await HttpClient.get(`products/${productId}`, {
                            with: 'type;shop;categories;tags;attributes',
                            language: locale || 'ru',
                          });
                          if (product && shopId && (!product.shop_id || Number(product.shop_id) === Number(shopId))) {
                            const categoryId = product.categories?.[0]?.id || product.category_id;
                            const attributes: Record<number, string> = {};
                            if (product.attributes && Array.isArray(product.attributes)) {
                              product.attributes.forEach((attr: any) => {
                                if (attr.pivot?.value) {
                                  attributes[attr.id] = attr.pivot.value || '';
                                }
                              });
                            }
                            productsData.push({
                              id: String(product.id),
                              name: product.name || '',
                              currentCategoryId: categoryId,
                              currentPrice: product.price || 0,
                              currentSku: product.sku || '',
                              currentAttributes: attributes,
                              categoryId: categoryId || 0,
                              price: product.price || 0,
                              sku: product.sku || '',
                              attributes: { ...attributes },
                              status: product.status || 'draft',
                            });
                          }
                        } catch (err) {
                          console.error(`Error loading product ${productId}:`, err);
                        }
                      }
                      if (productsData.length >= 2) {
                        setProducts(productsData);
                        setError(null);
                        const categoryIds = productsData.map(p => p.currentCategoryId).filter(Boolean) as number[];
                        if (categoryIds.length > 0) {
                          const mostCommonCategory = categoryIds.reduce((a, b, i, arr) =>
                            arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
                          );
                          setCommonCategoryId(mostCommonCategory);
                          setProducts(prev => prev.map(p => ({ ...p, categoryId: mostCommonCategory })));
                        }
                        if (productsData.length > 0) {
                          // Генерируем числовой ключ группы
                          const numericGroupKey = String(Date.now() + Math.floor(Math.random() * 1000));
                          setGroupKey(numericGroupKey);
                        }
                      } else {
                        setError(`Загружено только ${productsData.length} товар(ов). Для создания группы необходимо минимум 2 товара.`);
                      }
                    } catch (err: any) {
                      setError('Ошибка при загрузке товаров: ' + (err?.message || 'Неизвестная ошибка'));
                    } finally {
                      setIsLoading(false);
                    }
                  };
                  loadProducts();
                }} 
                variant="outline"
              >
                Попробовать снова
              </Button>
            )}
            <Button onClick={closeModal} variant="outline">
              Закрыть
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6 min-w-[800px] max-w-[1200px]">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка товаров...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 min-w-[800px] max-w-[1200px] max-h-[90vh] overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Создание группового товара
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Выбрано товаров: {products.length}
        </p>
        
        {/* Инструкция */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 Инструкция по заполнению:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Заполните все поля, отмеченные символом <span className="font-semibold">*</span> (обязательные)</li>
            <li>Для каждого товара укажите <span className="font-semibold">SKU</span> (артикул) и <span className="font-semibold">Цену</span></li>
            <li>Выберите <span className="font-semibold">атрибуты</span> для каждого товара - значения должны быть <span className="font-semibold">разными</span> для разных товаров</li>
            <li>Все товары должны быть из <span className="font-semibold">одной категории</span></li>
            <li>Системный ключ группы генерируется автоматически и используется для связи товаров</li>
          </ul>
        </div>
      </div>

      {/* Общие настройки группы */}
      <Card className="p-4 mb-6">
        <div className="space-y-4">
          <div>
            <Label>Системный ключ группы (автоматически)</Label>
            <Input
              value={groupKey}
              onChange={(e) => setGroupKey(e.target.value)}
              placeholder="group-key"
              disabled={true}
              className="bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Используется системой для связи товаров в группе. Генерируется автоматически.
            </p>
          </div>

          <div>
            <Label>Общая категория для всех товаров <span className="text-red-500">*</span></Label>
            <Select
              options={categories || []}
              getOptionLabel={(option: any) => option.name}
              getOptionValue={(option: any) => String(option.id)}
              value={commonCategoryId ? categories?.find((c: any) => c.id === commonCategoryId) : null}
              onChange={(option: any) => {
                if (option) {
                  handleCommonCategoryChange(Number(option.id));
                }
              }}
              isClearable={false}
              className="text-sm"
              styles={{
                control: (base: any) => ({ ...base, fontSize: '14px', minHeight: '38px' }),
                menu: (base: any) => ({ ...base, fontSize: '14px' }),
                option: (base: any) => ({ ...base, fontSize: '14px', padding: '8px 12px' }),
              }}
            />
            {commonCategoryId && products.some(p => p.currentCategoryId !== commonCategoryId) && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ Некоторые товары имеют другую категорию. Они будут обновлены.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Таблица товаров */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Товары в группе</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                  Название
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                  Статус
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                  SKU <span className="text-red-500">*</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                  Цена <span className="text-red-500">*</span>
                </th>
                {availableAttributes.map((attr: any) => (
                  <th key={attr.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                    {attr.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => {
                // Функция для получения цвета статуса
                const getStatusColor = (status: string = 'draft') => {
                  const statusLower = status.toLowerCase();
                  switch (statusLower) {
                    case 'publish':
                    case 'published':
                      return 'bg-green-100 text-green-800';
                    case 'draft':
                      return 'bg-yellow-100 text-yellow-800';
                    case 'under_review':
                    case 'under-review':
                      return 'bg-blue-100 text-blue-800';
                    case 'approved':
                      return 'bg-green-100 text-green-800';
                    case 'rejected':
                      return 'bg-red-100 text-red-800';
                    case 'unpublish':
                    case 'unpublished':
                      return 'bg-gray-100 text-gray-800';
                    default:
                      return 'bg-gray-100 text-gray-800';
                  }
                };

                const getStatusLabel = (status: string = 'draft') => {
                  const statusLower = status.toLowerCase();
                  switch (statusLower) {
                    case 'publish':
                    case 'published':
                      return 'Опубликован';
                    case 'draft':
                      return 'Черновик';
                    case 'under_review':
                    case 'under-review':
                      return 'На модерации';
                    case 'approved':
                      return 'Одобрен';
                    case 'rejected':
                      return 'Отклонен';
                    case 'unpublish':
                    case 'unpublished':
                      return 'Снят с публикации';
                    default:
                      return status;
                  }
                };

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap border-r border-gray-300">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">ID: {product.id}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-r border-gray-300">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                        {getStatusLabel(product.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-r border-gray-300">
                      <Input
                        value={product.sku || ''}
                        onChange={(e) => updateProduct(product.id, 'sku', e.target.value)}
                        className="w-full text-sm"
                        placeholder="Введите SKU"
                        disabled={false}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-r border-gray-300">
                      <Input
                        type="number"
                        value={product.price || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const numVal = val === '' ? 0 : parseFloat(val);
                          updateProduct(product.id, 'price', isNaN(numVal) ? 0 : numVal);
                        }}
                        className="w-full text-sm"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        disabled={false}
                      />
                    </td>
                  {availableAttributes.map((attr: any) => {
                    const currentValue = product.attributes[attr.id] || '';
                    const attributeValues = attr.values || [];
                    
                    return (
                      <td key={attr.id} className="px-4 py-3 whitespace-nowrap border-r border-gray-300">
                        {attributeValues.length > 0 ? (
                          <Select
                            options={attributeValues.map((v: any) => ({
                              id: typeof v === 'string' ? v : v.id,
                              name: typeof v === 'string' ? v : v.value || v.name,
                            }))}
                            getOptionLabel={(option: any) => option.name}
                            getOptionValue={(option: any) => String(option.id)}
                            value={currentValue ? {
                              id: currentValue,
                              name: currentValue,
                            } : null}
                            onChange={(option: any) => {
                              // Сохраняем значение (name), а не ID
                              updateProductAttribute(product.id, attr.id, option ? String(option.name || option.value || option.id) : '');
                            }}
                            isClearable={true}
                            className="text-sm"
                            styles={{
                              control: (base: any) => ({ ...base, fontSize: '14px', minHeight: '32px' }),
                              menu: (base: any) => ({ ...base, fontSize: '14px', zIndex: 9999 }),
                              option: (base: any) => ({ ...base, fontSize: '14px', padding: '6px 12px' }),
                              singleValue: (base: any) => ({ ...base, fontSize: '14px' }),
                            }}
                          />
                        ) : (
                          <Input
                            value={currentValue}
                            onChange={(e) => updateProductAttribute(product.id, attr.id, e.target.value)}
                            className="w-full text-sm"
                            placeholder="Значение"
                          />
                        )}
                      </td>
                    );
                  })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          onClick={closeModal}
          variant="outline"
          disabled={isSaving}
        >
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || products.length < 2}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? 'Создание...' : `Создать группу (${products.length} товаров)`}
        </Button>
      </div>
    </Card>
  );
}

