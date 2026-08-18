import cn from 'classnames';

interface AuthTabsProps {
  activeTab: 'phone' | 'email';
  onTabChange: (tab: 'phone' | 'email') => void;
}

export default function AuthTabs({ activeTab, onTabChange }: AuthTabsProps) {
  return (
    <div className="mb-6 flex rounded-xl bg-violet-50 p-1.5 dark:bg-dark-400">
      <button
        type="button"
        onClick={() => onTabChange('phone')}
        className={cn(
          'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
          {
            'bg-violet-700 text-white shadow-sm': activeTab === 'phone',
            'text-violet-700 hover:bg-violet-100 dark:text-gray-300': activeTab === 'email',
          }
        )}
      >
        По звонку
      </button>
      <button
        type="button"
        onClick={() => onTabChange('email')}
        className={cn(
          'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
          {
            'bg-violet-700 text-white shadow-sm': activeTab === 'email',
            'text-violet-700 hover:bg-violet-100 dark:text-gray-300': activeTab === 'phone',
          }
        )}
      >
        По email
      </button>
    </div>
  );
}

