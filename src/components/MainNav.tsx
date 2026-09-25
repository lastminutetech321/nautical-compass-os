import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  BookOpen,
  Mail,
  Scale,
  Building2,
  Banknote,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { ncClient } from '@/lib/ncClient';

export function MainNav() {
  const location = useLocation();
  const { user } = useAuth();

  // Query public legal access status
  const { data: publicLegalAccess } = useQuery({
    queryKey: ['publicLegalAccess'],
    queryFn: async () => {
      const result = await ncClient.entitlements.get_public_legal_access();
      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isPublicLegalOpen = publicLegalAccess?.open === true;

  if (!user) return null;

  const routes = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/documents',
      label: 'Documents',
      icon: FileText,
    },
    {
      href: '/packets',
      label: 'Master Action Packets',
      icon: FileText,
      badge: isPublicLegalOpen ? 'FREE' : null,
    },
    {
      href: '/get-paid',
      label: 'Get Paid',
      icon: Banknote,
    },
    {
      href: '/contacts',
      label: 'Contacts',
      icon: Users,
    },
    {
      href: '/correspondence',
      label: 'Correspondence',
      icon: Mail,
    },
    {
      href: '/legal',
      label: 'Legal Resources',
      icon: Scale,
    },
    {
      href: '/court-info',
      label: 'Court Information',
      icon: Building2,
    },
    {
      href: '/library',
      label: 'Library',
      icon: BookOpen,
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {routes.map((route) => {
        const Icon = route.icon;
        const isActive = location.pathname === route.href;

        return (
          <Link
            key={route.href}
            to={route.href}
            className={cn(
              'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {route.label}
            {route.badge && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-5">
                {route.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
