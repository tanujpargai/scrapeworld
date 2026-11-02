'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Folder,
  TrendingUp,
  Building2,
  Coins,
  ShieldCheck,
  Columns,
  CheckSquare,
  Settings,
  Database,
  Radio,
  Loader2,
  Server,
  Target,
  BarChart2,
  SlidersHorizontal,
} from 'lucide-react';

interface SystemStatusData {
  success: boolean;
  health?: {
    database: string;
    redis: string;
    worker: string;
  };
  counts?: {
    businesses: number;
    audits: number;
    leads: number;
    opportunities: number;
    deals: number;
    tasks: number;
  };
  queues?: {
    totalPending: number;
  };
}

export default function SidebarAndStatus({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  // Poll status every 6 seconds
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/system-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error('Failed to poll status', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Today', href: '/today', icon: Target },
    { name: 'Collections', href: '/discovery', icon: Folder },
    { name: 'ICP Profiles', href: '/icp', icon: SlidersHorizontal },
    { name: 'Top Leads', href: '/leads', icon: TrendingUp },
    { name: 'Businesses', href: '/businesses', icon: Building2 },
    { name: 'Opportunities', href: '/opportunities', icon: Coins },
    { name: 'Audits', href: '/audits', icon: ShieldCheck },
    { name: 'CRM', href: '/crm', icon: Columns },
    { name: 'Performance', href: '/crm/performance', icon: BarChart2 },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const dbOnline = status?.health?.database === 'Connected';
  const redisOnline = status?.health?.redis === 'Connected';
  const totalPending = status?.queues?.totalPending ?? 0;
  const businessCount = status?.counts?.businesses ?? 0;

  return (
    <div className="flex h-screen bg-[#09090B] text-[#FAFAFA] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111113] border-r border-[#27272A] flex flex-col justify-between">
        {/* Top: Logo & Navigation */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo */}
          <div className="p-6 border-b border-[#27272A] flex items-center gap-2">
            <Server className="w-6 h-6 text-[#2563EB]" />
            <span className="text-lg font-bold tracking-wider text-[#FAFAFA]">SCRAPE WORLD</span>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#2563EB] text-[#FAFAFA]'
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: System Status */}
        <div className="p-4 border-t border-[#27272A] bg-[#0c0c0e] text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#A1A1AA] flex items-center gap-1">
              <Database className="w-3.5 h-3.5" /> DB Status:
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <span className={`w-2.5 h-2.5 rounded-full ${dbOnline ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
              {status?.health?.database || 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#A1A1AA] flex items-center gap-1">
              <Radio className="w-3.5 h-3.5" /> Redis/Queue:
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <span className={`w-2.5 h-2.5 rounded-full ${redisOnline ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
              {status?.health?.redis || 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#A1A1AA]">Businesses:</span>
            <span className="font-mono text-xs text-[#FAFAFA] font-semibold">{businessCount} total</span>
          </div>

          <div className="flex items-center justify-between border-t border-[#27272A] pt-2">
            <span className="text-[#A1A1AA]">Queue Status:</span>
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin text-[#A1A1AA]" />
            ) : (
              <span className={`font-semibold font-mono ${totalPending > 0 ? 'text-[#F59E0B]' : 'text-[#22C55E]'}`}>
                {totalPending > 0 ? `${totalPending} pending` : 'Idle'}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#09090B]">
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
