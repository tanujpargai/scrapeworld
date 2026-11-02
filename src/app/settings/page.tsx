'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Radio,
  Server,
  Activity,
  Loader2,
  RefreshCw,
  Cpu,
  Coins,
  ShieldCheck,
  Star,
  ListTodo,
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
    searchJobs: number;
  };
  queues?: {
    totalPending: number;
    verification?: { waiting: number; active: number; completed: number; failed: number; total: number };
    owner?: { waiting: number; active: number; completed: number; failed: number; total: number };
    social?: { waiting: number; active: number; completed: number; failed: number; total: number };
    audit?: { waiting: number; active: number; completed: number; failed: number; total: number };
    ai?: { waiting: number; active: number; completed: number; failed: number; total: number };
    gmaps?: { waiting: number; active: number; completed: number; failed: number; total: number };
  };
}

export default function SettingsPage() {
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/system-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error('Error fetching system health:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const dbOnline = status?.health?.database === 'Connected';
  const redisOnline = status?.health?.redis === 'Connected';
  const workerActive = status?.health?.worker === 'Active';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-8 h-8 text-[#2563EB]" />
            <span>System Health & Settings</span>
          </h1>
          <p className="text-[#A1A1AA] mt-1 text-sm">
            Live database connections, queue capacities, scraping pipeline counts, and engine states.
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-4 py-2 bg-[#27272A] hover:bg-[#27272A]/80 text-[#FAFAFA] rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>Force Refresh</span>
        </button>
      </div>

      {loading && !status ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Diagnostics */}
          <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#2563EB]" /> Live Services Connection
            </h2>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <span className="text-xs text-[#A1A1AA] flex items-center gap-1.5">
                  <Database className="w-4 h-4 shrink-0" /> PostgreSQL Database:
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dbOnline ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#EF4444]'}`}>
                  {status?.health?.database || 'Disconnected'}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <span className="text-xs text-[#A1A1AA] flex items-center gap-1.5">
                  <Radio className="w-4 h-4 shrink-0" /> Redis Message Broker:
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${redisOnline ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#EF4444]'}`}>
                  {status?.health?.redis || 'Disconnected'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A1A1AA] flex items-center gap-1.5">
                  <Server className="w-4 h-4 shrink-0" /> BullMQ Workers Daemon:
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${workerActive ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#EF4444]'}`}>
                  {status?.health?.worker || 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Database Entities Count */}
          <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#22C55E]" /> Database Metrics
            </h2>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-[#09090B] border border-[#27272A] rounded">
                <p className="text-[10px] text-[#A1A1AA] uppercase">Businesses</p>
                <p className="text-lg font-bold font-mono text-[#FAFAFA] mt-1">{status?.counts?.businesses ?? 0}</p>
              </div>
              <div className="p-3 bg-[#09090B] border border-[#27272A] rounded">
                <p className="text-[10px] text-[#A1A1AA] uppercase">Lead Intelligence</p>
                <p className="text-lg font-bold font-mono text-[#FAFAFA] mt-1">{status?.counts?.leads ?? 0}</p>
              </div>
              <div className="p-3 bg-[#09090B] border border-[#27272A] rounded">
                <p className="text-[10px] text-[#A1A1AA] uppercase">Opportunities</p>
                <p className="text-lg font-bold font-mono text-[#FAFAFA] mt-1">{status?.counts?.opportunities ?? 0}</p>
              </div>
              <div className="p-3 bg-[#09090B] border border-[#27272A] rounded">
                <p className="text-[10px] text-[#A1A1AA] uppercase">CRM Deals</p>
                <p className="text-lg font-bold font-mono text-[#FAFAFA] mt-1">{status?.counts?.deals ?? 0}</p>
              </div>
              <div className="p-3 bg-[#09090B] border border-[#27272A] rounded">
                <p className="text-[10px] text-[#A1A1AA] uppercase">Website Scans</p>
                <p className="text-lg font-bold font-mono text-[#FAFAFA] mt-1">{status?.counts?.audits ?? 0}</p>
              </div>
              <div className="p-3 bg-[#09090B] border border-[#27272A] rounded">
                <p className="text-[10px] text-[#A1A1AA] uppercase">Tasks Count</p>
                <p className="text-lg font-bold font-mono text-[#FAFAFA] mt-1">{status?.counts?.tasks ?? 0}</p>
              </div>
            </div>
          </div>

          {/* Queue Capacities */}
          <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-[#F59E0B]" /> BullMQ Queue Capacities
            </h2>
            <div className="space-y-3.5 pt-2 text-xs">
              <div className="flex items-center justify-between border-b border-[#1b1b1f] pb-2">
                <span className="text-[#A1A1AA]">Website Verification Queue:</span>
                <span className="font-mono font-semibold text-[#FAFAFA]">
                  {status?.queues?.verification?.total || 0} jobs (Active: {status?.queues?.verification?.active || 0})
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1b1b1f] pb-2">
                <span className="text-[#A1A1AA]">Owner Discovery Queue:</span>
                <span className="font-mono font-semibold text-[#FAFAFA]">
                  {status?.queues?.owner?.total || 0} jobs (Active: {status?.queues?.owner?.active || 0})
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1b1b1f] pb-2">
                <span className="text-[#A1A1AA]">Social Discovery Queue:</span>
                <span className="font-mono font-semibold text-[#FAFAFA]">
                  {status?.queues?.social?.total || 0} jobs (Active: {status?.queues?.social?.active || 0})
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1b1b1f] pb-2">
                <span className="text-[#A1A1AA]">Website Scan/Audit Queue:</span>
                <span className="font-mono font-semibold text-[#FAFAFA]">
                  {status?.queues?.audit?.total || 0} jobs (Active: {status?.queues?.audit?.active || 0})
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1b1b1f] pb-2">
                <span className="text-[#A1A1AA]">AI Report Queue:</span>
                <span className="font-mono font-semibold text-[#FAFAFA]">
                  {status?.queues?.ai?.total || 0} jobs (Active: {status?.queues?.ai?.active || 0})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A1A1AA]">Gmaps Scraping Queue:</span>
                <span className="font-mono font-semibold text-[#FAFAFA]">
                  {status?.queues?.gmaps?.total || 0} jobs (Active: {status?.queues?.gmaps?.active || 0})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
