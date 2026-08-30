import { useMemo } from 'react';
import { StylesConfig } from 'react-select';
import Select from '@/components/ui/select/select';
import { selectStyles } from '@/components/ui/select/select.styles';
import { Category } from '@/types';
import formStyles from './onboarding.module.css';

type CategoryOption = { value: number; label: string };

const styles: StylesConfig = {
  ...selectStyles,
  control: (base, state) => ({
    ...base,
    minHeight: 60,
    backgroundColor: state.isFocused ? '#fff' : '#f0edf5',
    borderRadius: '10px 10px 0 0',
    borderColor: state.isFocused ? '#8b5cf6' : 'transparent',
    borderBottomColor: state.isFocused ? '#8b5cf6' : '#d8d1e0',
    boxShadow: state.isFocused ? '0 0 0 3px #8b5cf614' : 'none',
    opacity: state.isDisabled ? 0.5 : 1,
    ':hover': { borderColor: '#8b5cf6' },
  }),
  valueContainer: (base) => ({ ...base, padding: '8px 14px' }),
  input: (base) => ({ ...base, color: '#29232e', fontSize: 18 }),
  singleValue: (base) => ({ ...base, color: '#29232e', fontSize: 18 }),
  placeholder: (base) => ({ ...base, color: '#93899d', fontSize: 16 }),
  menu: (base) => ({ ...base, zIndex: 20, borderRadius: 10, overflow: 'hidden' }),
  option: (base, state) => ({
    ...base,
    padding: '12px 14px',
    fontSize: 14,
    color: state.isSelected ? '#6d28d9' : '#29232e',
    backgroundColor: state.isSelected ? '#eee8f7' : state.isFocused ? '#f3eff9' : '#fff',
    cursor: 'pointer',
  }),
};

const normalize = (value: string) => value.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');

export default function CategorySelect({ categories, value, onChange, loading, disabled }: {
  categories: Pick<Category, 'id' | 'name'>[];
  value?: number | null;
  onChange: (value: number | null) => void;
  loading: boolean;
  disabled: boolean;
}) {
  const options = useMemo(() => categories.map((category) => ({
    value: Number(category.id), label: category.name,
  })), [categories]);

  return <Select
    className={formStyles.categorySelect}
    inputId="product-category"
    instanceId="onboarding-category"
    name="category_id"
    options={options}
    value={options.find((option) => option.value === value) ?? null}
    onChange={(option) => onChange((option as CategoryOption | null)?.value ?? null)}
    filterOption={(option, input) => normalize(option.label).startsWith(normalize(input))}
    placeholder={loading ? 'Загружаем…' : 'Начните вводить название'}
    noOptionsMessage={() => 'Категории не найдены'}
    loadingMessage={() => 'Загружаем категории…'}
    screenReaderStatus={({ count }) => `Найдено категорий: ${count}`}
    isSearchable
    isLoading={loading}
    isDisabled={disabled || loading}
    required
    menuPlacement="auto"
    maxMenuHeight={240}
    styles={styles}
  />;
}
