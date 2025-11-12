import { UserRole } from '../types';
import {
  LayoutDashboard,
  TrendingUp,
  FolderOpen,
  BarChart3,
  Activity,
  Newspaper,
  FileText,
  Users,
  Settings,
  X,
} from 'lucide-react';
import { classNames } from '../lib/utils';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'manager', 'analyst', 'investor'],
  },
  {
    id: 'stock-analysis',
    label: 'Stock Analysis',
    icon: TrendingUp,
    roles: ['admin', 'manager', 'analyst', 'investor'],
  },
  {
    id: 'portfolios',
    label: 'Portfolios',
    icon: FolderOpen,
    roles: ['admin', 'manager', 'analyst', 'investor'],
  },
  {
    id: 'metrics',
    label: 'Metrics & Insights',
    icon: BarChart3,
    roles: ['admin', 'manager', 'analyst'],
  },
  {
    id: 'backtesting',
    label: 'Backtesting',
    icon: Activity,
    roles: ['admin', 'manager', 'analyst'],
  },
  {
    id: 'market',
    label: 'Market Overview',
    icon: Newspaper,
    roles: ['admin', 'manager', 'analyst', 'investor'],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    roles: ['admin', 'manager', 'analyst'],
  },
  {
    id: 'admin',
    label: 'Admin Panel',
    icon: Users,
    roles: ['admin'],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    roles: ['admin', 'manager', 'analyst', 'investor'],
  },
];

export function Sidebar({ currentPage, onNavigate, userRole, isOpen = true, onClose }: SidebarProps) {
  const filteredItems = navItems.filter((item) => item.roles.includes(userRole));

  const handleNavigate = (page: string) => {
    onNavigate(page);
    // Close sidebar on mobile after navigation
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={classNames(
          'fixed top-0 left-0 z-50',
          'w-[280px] lg:w-[240px] bg-card border-r border-border',
          'h-screen overflow-y-auto',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border h-[70px]">
          <span className="text-lg">Menu</span>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        
        {/* Desktop spacing for header */}
        <div className="hidden lg:block h-[70px]" aria-hidden="true"></div>

        <nav className="p-4" aria-label="Main navigation">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={classNames(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}