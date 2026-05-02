import Card from '@/components/common/card';
import Search from '@/components/common/search';
import { ArrowDown } from '@/components/icons/arrow-down';
import { ArrowUp } from '@/components/icons/arrow-up';
import { MoreIcon } from '@/components/icons/more-icon';
import ShopLayout from '@/components/layouts/shop';
import CategoryTypeFilter from '@/components/product/category-type-filter';
import Label from '@/components/ui/label';
import Select from '@/components/ui/select/select';
import ProductList from '@/components/product/product-list';
import Button from '@/components/ui/button';
import ErrorMessage from '@/components/ui/error-message';
import LinkButton from '@/components/ui/link-button';
import Loader from '@/components/ui/loader/loader';
import { useModalAction } from '@/components/ui/modal/modal.context';
import { toast } from 'react-toastify';
import { Config } from '@/config';
import { Routes } from '@/config/routes';
import { useProductsQuery } from '@/data/product';
import { useShopQuery } from '@/data/shop';
import { useMeQuery } from '@/data/user';
import { productClient } from '@/data/client/product';
import { Category, SortOrder, Type, ProductType } from '@/types';
import {
  adminOnly,
  adminOwnerAndStaffOnly,
  getAuthCredentials,
  hasAccess,
} from '@/utils/auth-utils';
import cn from 'classnames';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function ProductsPage() {
  const router = useRouter();
  const { permissions } = getAuthCredentials();
  const { data: me } = useMeQuery();
  const {
    query: { shop },
  } = useRouter();
  const { data: shopData, isLoading: fetchingShop } = useShopQuery({
    slug: shop as string,
  });
  const shopId = shopData?.id!;
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [productType, setProductType] = useState<string>('');
  const [groupKey, setGroupKey] = useState<string>('');
  const [showOnlyMainProducts, setShowOnlyMainProducts] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [orderBy, setOrder] = useState('created_at');
  const [sortedBy, setColumn] = useState<SortOrder>(SortOrder.Desc);
  // Фильтры всегда открыты
  const [visible, setVisible] = useState(true);
  const { openModal } = useModalAction();
  const { locale, query } = useRouter();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isUngrouping, setIsUngrouping] = useState(false);
  
  // Получаем group_key из query параметров для фильтрации
  useEffect(() => {
    if (query.group_key && typeof query.group_key === 'string') {
      setGroupKey(query.group_key);
    }
  }, [query.group_key]);

  // Кнопка открытия-скрытия фильтров закомментирована - фильтры всегда открыты
  // const toggleVisible = () => {
  //   setVisible((v) => !v);
  // };

  const { products, paginatorInfo, loading, error } = useProductsQuery(
    {
      language: locale,
      name: searchTerm,
      limit: 20,
      shop_id: shopId,
      type,
      categories: category,
      product_type: productType,
      group_key: groupKey || undefined,
      orderBy,
      sortedBy,
      page,
    },
    {
      enabled: Boolean(shopId),
    }
  );

  // Логирование для отладки
  useEffect(() => {
    if (products && products.length > 0) {
      const productsWithGroupKey = products.filter((p: any) => p?.group_key);
      console.log('📦 Товары в списке:', {
        total: products.length,
        withGroupKey: productsWithGroupKey.length,
        groupKeys: productsWithGroupKey.map((p: any) => ({ id: p.id, name: p.name, group_key: p.group_key })),
        filterGroupKey: groupKey || 'нет',
        shopId: shopId,
      });
    }
  }, [products, groupKey, shopId]);

  function handleImportModal() {
    openModal('EXPORT_IMPORT_PRODUCT', shopId);
  }

  if (loading || fetchingShop)
    return <Loader text={t('common:text-loading')} />;
  if (error) return <ErrorMessage message={error.message} />;

  function handleSearch({ searchText }: { searchText: string }) {
    setSearchTerm(searchText);
  }

  function handlePagination(current: any) {
    setPage(current);
  }

  // Проверяем, можно ли разгруппировать выбранные товары
  const canUngroup = () => {
    if (selectedProducts.length === 0) return false;
    if (!products) return false;
    
    const selectedProductsData = products.filter((p: any) => 
      selectedProducts.includes(p.id)
    );
    
    // Проверяем, что все выбранные товары имеют одинаковый group_key
    const groupKeys = selectedProductsData
      .map((p: any) => p?.group_key)
      .filter(Boolean);
    
    if (groupKeys.length === 0) return false; // Нет товаров с group_key
    if (groupKeys.length !== selectedProductsData.length) return false; // Не все товары в группе
    
    // Проверяем, что все group_key одинаковые
    const uniqueGroupKeys = [...new Set(groupKeys)];
    return uniqueGroupKeys.length === 1;
  };

  // Проверяем, можно ли редактировать группу (аналогично canUngroup)
  const canEditGroup = () => {
    return canUngroup(); // Та же логика - все товары должны быть в одной группе
  };

  const getSelectedGroupKey = () => {
    if (!canUngroup() || !products) return null;
    const selectedProductsData = products.filter((p: any) => 
      selectedProducts.includes(p.id)
    );
    return selectedProductsData[0]?.group_key || null;
  };

  // Обработчик редактирования группы
  const handleEditGroup = () => {
    if (!canEditGroup() || !products) return;
    
    const groupKey = getSelectedGroupKey();
    if (!groupKey) return;

    // Получаем все товары группы (не только выбранные)
    const allGroupProducts = products.filter((p: any) => p?.group_key === groupKey);
    
    openModal('EDIT_PRODUCT_GROUP', {
      groupKey: groupKey,
      productIds: allGroupProducts.map((p: any) => p.id),
      products: allGroupProducts,
    });
  };

  // Обработчик разгруппировки
  const handleUngroup = async () => {
    if (!canUngroup() || !shopId) return;
    
    const groupKey = getSelectedGroupKey();
    if (!groupKey) return;

    if (!confirm('Вы уверены, что хотите разгруппировать выбранные товары? Это удалит связь между товарами в группе.')) {
      return;
    }

    setIsUngrouping(true);
    try {
      const response = await productClient.ungroupProducts({
        group_key: groupKey,
        shop_id: Number(shopId),
      });

      if (response?.success) {
        toast.success(response.message || 'Товары успешно разгруппированы');
        setSelectedProducts([]);
        // Обновляем список товаров
        router.reload();
      } else {
        toast.error(response?.message || 'Ошибка при разгруппировке товаров');
      }
    } catch (error: any) {
      console.error('Error ungrouping products:', error);
      toast.error(error?.response?.data?.message || 'Ошибка при разгруппировке товаров');
    } finally {
      setIsUngrouping(false);
    }
  };

  if (
    !hasAccess(adminOnly, permissions) &&
    !me?.shops?.map((shop) => shop.id).includes(shopId) &&
    me?.managed_shop?.id != shopId
  ) {
    router.replace(Routes.dashboard);
  }

  return (
    <>
      <Card className="mb-8 flex flex-col">
        <div className="flex w-full flex-col items-center md:flex-row">
          <div className="mb-4 md:mb-0 md:w-1/4">
            <h1 className="text-lg font-semibold text-heading">
              {t('form:input-label-products')}
            </h1>
          </div>

          <div className="flex w-full flex-col items-center md:w-3/4 md:flex-row">
            {/* Кнопки создания товаров в первом ряду */}
            {locale === Config.defaultLanguage && (
              <div className="flex w-full items-center gap-2 md:gap-3">
                <LinkButton
                  href={`/${shop}/products/create`}
                  className="h-12 flex-1 md:flex-none bg-blue-600 hover:bg-blue-700"
                  variant="solid"
                >
                  <span className="hidden md:block">
                    ➕ {t('form:button-label-add-product') || 'Добавить товары'}
                  </span>
                  <span className="md:hidden">
                    ➕ {t('form:button-label-add') || 'Добавить'}
                  </span>
                </LinkButton>
                <LinkButton
                  href={`/${shop}/product-groups/create`}
                  className="h-12 bg-green-600 hover:bg-green-700 flex-1 md:flex-none"
                  variant="solid"
                >
                  <span className="hidden md:block">
                    + {t('form:button-label-add-product-group')}
                  </span>
                  <span className="md:hidden">
                    + {t('form:button-label-add-group')}
                  </span>
                </LinkButton>
                {/* Кнопка создания группового товара - всегда видна */}
                <Button
                  onClick={() => {
                    if (selectedProducts.length === 0) {
                      toast.error('Выберите минимум 2 товара.');
                      return;
                    }
                    if (selectedProducts.length === 1) {
                      toast.error('Выберите минимум 2 товара.');
                      return;
                    }
                    // Передаем полные объекты товаров из списка
                    const selectedProductsData = (products || []).filter((p: any) => 
                      selectedProducts.includes(p.id)
                    );
                    openModal('CREATE_PRODUCT_GROUP', { 
                      productIds: selectedProducts,
                      products: selectedProductsData // Передаем полные данные
                    });
                  }}
                  className="h-12 bg-purple-600 hover:bg-purple-700 flex-1 md:flex-none text-white"
                  variant="solid"
                >
                  <span className="hidden md:block">
                    🔗 Создать групповой товар{selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ''}
                  </span>
                  <span className="md:hidden">
                    🔗 Группа{selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ''}
                  </span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Поисковая строка во втором ряду */}
        <div className="mt-4 w-full">
          <Search
            onSearch={handleSearch}
            placeholderText={t('form:input-placeholder-search-name')}
          />
        </div>

        <div className="flex w-full">

            {/* Кнопка импорта CSV для мобильных - закомментирована */}
            {/* <Button
              onClick={handleImportModal}
              className="mt-5 w-full md:hidden"
            >
              {t('common:text-export-import')}
            </Button> */}

            {/* Кнопка открытия-скрытия фильтров - закомментирована, фильтры всегда открыты */}
            {/* <button
              className="mt-5 flex items-center whitespace-nowrap text-base font-semibold text-accent md:mt-0 md:ms-5"
              onClick={toggleVisible}
            >
              {t('common:text-filter')}{' '}
              {visible ? (
                <ArrowUp className="ms-2" />
              ) : (
                <ArrowDown className="ms-2" />
              )}
            </button> */}

            {/* Кнопка троеточие с импортом CSV - закомментирована */}
            {/* <button
              onClick={handleImportModal}
              className="hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-50 transition duration-300 ms-5 hover:bg-gray-100 md:flex"
            >
              <MoreIcon className="w-3.5 text-body" />
            </button> */}
          </div>

        {/* Фильтры всегда открыты - убрано условное отображение */}
        <div className="flex w-full">
          <div className="mt-5 flex w-full flex-col border-t border-gray-200 pt-5 md:mt-8 md:flex-row md:items-center md:pt-8">
            <CategoryTypeFilter
              className="w-full"
              type={type}
              onCategoryFilter={(category: Category) => {
                setCategory(category?.slug!);
                setPage(1);
              }}
              onTypeFilter={(type: Type) => {
                setType(type?.slug!);
                setPage(1);
              }}
            />
            <div className="mt-5 w-full md:mt-0 md:ms-5 md:w-auto">
              <Label>{t('common:filter-by-product-type')}</Label>
              <Select
                options={[
                  { value: '', label: t('common:all-products') },
                  { value: ProductType.Simple, label: t('common:simple-products') },
                  { value: ProductType.Variable, label: t('common:variable-products') },
                ]}
                getOptionLabel={(option: any) => option.label}
                getOptionValue={(option: any) => option.value}
                placeholder={t('common:filter-by-product-type-placeholder')}
                onChange={(option: any) => {
                  setProductType(option?.value || '');
                  setPage(1);
                }}
                value={[
                  { value: '', label: t('common:all-products') },
                  { value: ProductType.Simple, label: t('common:simple-products') },
                  { value: ProductType.Variable, label: t('common:variable-products') },
                ].find(opt => opt.value === productType)}
                isClearable={true}
              />
            </div>
            {groupKey && (
              <div className="mt-5 w-full md:mt-0 md:ms-5 md:w-auto">
                <div className="flex items-center gap-2">
                  <Label className="text-purple-600">
                    Фильтр: Группа <code className="bg-purple-100 px-2 py-1 rounded text-xs">{groupKey}</code>
                  </Label>
                  <Button
                    onClick={() => {
                      setGroupKey('');
                      router.replace(`/${shop}/products`, undefined, { shallow: true });
                    }}
                    variant="outline"
                    size="small"
                  >
                    ✕ Сбросить
                  </Button>
                </div>
              </div>
            )}
            
            {/* Фильтр "Показывать только главные товары" */}
            {!groupKey && (
              <div className="mt-5 w-full md:mt-0 md:ms-5 md:w-auto">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyMainProducts}
                    onChange={(e) => setShowOnlyMainProducts(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Показывать только главные товары (скрыть варианты)
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      </Card>
      <ProductList
        products={showOnlyMainProducts 
          ? (products || []).filter((p: any, index: number, arr: any[]) => {
              // Показываем только товары без group_key или первый товар в каждой группе
              const hasGroupKey = !!p?.group_key;
              if (!hasGroupKey) return true;
              // Первый товар в группе = главный (по порядку создания)
              const groupProducts = arr.filter((pr: any) => pr?.group_key === p.group_key);
              return groupProducts.indexOf(p) === 0;
            })
          : products
        }
        paginatorInfo={paginatorInfo}
        onPagination={handlePagination}
        onOrder={setOrder}
        onSort={(currentSortDirection: SortOrder) => {
          setColumn(currentSortDirection === SortOrder.Desc ? SortOrder.Asc : SortOrder.Desc);
        }}
        selectedProducts={selectedProducts}
        onSelectedProductsChange={setSelectedProducts}
        onUngroup={handleUngroup}
        canUngroup={canUngroup()}
        isUngrouping={isUngrouping}
        onEditGroup={handleEditGroup}
        canEditGroup={canEditGroup()}
        onBulkDelete={undefined}
        isDeleting={false}
      />
    </>
  );
}
ProductsPage.authenticate = {
  permissions: adminOwnerAndStaffOnly,
};
ProductsPage.Layout = ShopLayout;

export const getServerSideProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale, ['table', 'common', 'form'])),
  },
});
