import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  ListTodo,
  Settings,
  Database,
  Coins,
  FileText
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/entities', label: 'Entities', icon: Database },
  { path: '/records', label: 'Records', icon: FileText },
  { path: '/agents', label: 'Agents', icon: Users },
  { path: '/tasks', label: 'Tasks', icon: ListTodo },
  { path: '/map', label: 'Master Action Packets', icon: FileText },
  { path: '/get-paid', label: 'Get Paid', icon: Coins },
  { path: '/settings', label: 'Settings', icon: Settings }
];

export function MainNav() {
  const location = useLocation();

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {navItems.map(({ path, label, icon: Icon }) => {
        const isActive = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={cn(
              'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
