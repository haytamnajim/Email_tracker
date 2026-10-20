import { Inbox, Tag, Users, Bell, MessageSquare } from 'lucide-react';

export type CategoryType = 'primary' | 'promotions' | 'social' | 'updates' | 'forums';

interface CategoryTabsProps {
  activeCategory: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
  unreadCount?: number;
}

export default function CategoryTabs({
  activeCategory,
  onSelectCategory,
  unreadCount = 0,
}: CategoryTabsProps) {
  const categories = [
    {
      id: 'primary' as const,
      label: 'Principale',
      icon: Inbox,
      activeColor: '#0b57d0',
      activeDarkColor: '#a8c7fa',
      badge: unreadCount > 0 ? unreadCount : null,
      badgeColor: 'bg-[#0b57d0] text-white',
    },
    {
      id: 'promotions' as const,
      label: 'Promotions',
      icon: Tag,
      activeColor: '#188038',
      activeDarkColor: '#81c995',
      badge: '3 nouv.',
      badgeColor: 'bg-[#188038] text-white',
    },
    {
      id: 'social' as const,
      label: 'Réseaux sociaux',
      icon: Users,
      activeColor: '#1a73e8',
      activeDarkColor: '#8ab4f8',
      badge: null,
      badgeColor: '',
    },
    {
      id: 'updates' as const,
      label: 'Notifications',
      icon: Bell,
      activeColor: '#e37400',
      activeDarkColor: '#fdd663',
      badge: '1 nouv.',
      badgeColor: 'bg-[#e37400] text-white',
    },
    {
      id: 'forums' as const,
      label: 'Forums',
      icon: MessageSquare,
      activeColor: '#a142f4',
      activeDarkColor: '#d7aefb',
      badge: null,
      badgeColor: '',
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Catégories de messages"
      className="flex border-b border-[#e0e2e7] dark:border-[#3c4043] bg-white dark:bg-[#141414] select-none overflow-x-auto"
    >
      {categories.map((cat) => {
        const active = activeCategory === cat.id;
        const IconComponent = cat.icon;
        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`relative flex items-center gap-3 px-4 py-3 min-w-[140px] md:min-w-[180px] max-w-[220px] text-left transition-colors cursor-pointer hover:bg-[#f8f9fa] dark:hover:bg-[#202124] ${
              active
                ? 'text-[#0b57d0] dark:text-[#a8c7fa] font-semibold'
                : 'text-[#444746] dark:text-[#c4c7c5] font-medium'
            }`}
          >
            <IconComponent
              className="h-4 w-4 shrink-0"
              style={{
                color: active ? cat.activeColor : undefined,
              }}
            />
            <span className="truncate text-sm">{cat.label}</span>

            {cat.badge && (
              <span
                className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cat.badgeColor}`}
              >
                {cat.badge}
              </span>
            )}

            {/* Barre indicatrice active en bas façon Gmail */}
            {active && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-[#0b57d0] dark:bg-[#a8c7fa]"
                style={{ backgroundColor: cat.activeColor }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
