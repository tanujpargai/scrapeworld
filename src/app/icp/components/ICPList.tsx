'use client';

import React, { useState } from 'react';
import type { ICPProfile } from '@/types/icp';
import { TARGET_SERVICES } from './constants';
import ICPSandboxModal from './ICPSandboxModal';
import {
  Plus,
  Search,
  Sparkles,
  Copy,
  Trash2,
  Edit,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  Ban,
  SlidersHorizontal,
  Target,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface ICPListProps {
  profiles: ICPProfile[];
  loading: boolean;
  onSelectProfile: (profile: ICPProfile) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

export default function ICPList({
  profiles,
  loading,
  onSelectProfile,
  onCreateNew,
  onRefresh,
}: ICPListProps) {
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [sandboxProfile, setSandboxProfile] = useState<ICPProfile | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(null), 4000);
  };

  const handleToggleActive = async (profile: ICPProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(profile.id);

    try {
      const res = await fetch(`/api/icp/${profile.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !profile.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to toggle status');
      }
      showNotification(`Profile '${profile.name}' is now ${!profile.isActive ? 'Active' : 'Inactive'}`);
      onRefresh();
    } catch (err: any) {
      alert(`Error toggling profile: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDuplicate = async (profile: ICPProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(profile.id);

    try {
      const res = await fetch(`/api/icp/${profile.id}/duplicate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to duplicate profile');
      }
      showNotification(`Profile duplicated as '${json.data.name}'`);
      onRefresh();
    } catch (err: any) {
      alert(`Error duplicating profile: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(id);

    try {
      const res = await fetch(`/api/icp/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete profile');
      }
      setDeleteConfirmId(null);
      showNotification('Profile deleted successfully');
      onRefresh();
    } catch (err: any) {
      alert(`Error deleting profile: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm('Restore default agency profiles? This will re-seed Web Dev Redesign and Marketing Agency profiles.')) {
      return;
    }

    setSeedLoading(true);
    try {
      const res = await fetch('/api/icp/seed', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to restore default profiles');
      }
      showNotification('Agency default ICP profiles restored!');
      onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSeedLoading(false);
    }
  };

  // Filter profiles
  const filtered = profiles.filter((p) => {
    const matchesSearch =
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
      (p.targetNiche && p.targetNiche.toLowerCase().includes(search.toLowerCase()));

    const matchesService =
      serviceFilter === '' || p.targetService === serviceFilter;

    return matchesSearch && matchesService;
  });

  return (
    <div className="space-y-6">
      {/* Banner message */}
      {bannerMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center justify-between animate-in fade-in">
          <span>{bannerMessage}</span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] flex items-center gap-2.5">
            <SlidersHorizontal className="w-6 h-6 text-[#2563EB]" />
            Ideal Customer Profiles (ICP)
          </h1>
          <p className="text-[#A1A1AA] mt-1 text-xs sm:text-sm">
            Configure dynamic qualification rules, hard filters, soft opportunity scoring weights, and exclusions for lead discovery.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={seedLoading}
            className="bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#A1A1AA] hover:text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
            title="Restore Agency ICP Defaults"
          >
            {seedLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            Restore Defaults
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            className="bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Create ICP Profile
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#111113] border border-[#27272A]">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search profiles by name, niche, or description..."
            className="w-full bg-[#18181B] border border-[#27272A] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
          >
            <option value="">All Services</option>
            {TARGET_SERVICES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Profile Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-xs text-[#A1A1AA] gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
          Loading ICP profiles...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-[#111113] border border-dashed border-[#27272A] space-y-4">
          <Target className="w-10 h-10 text-[#52525B] mx-auto" />
          <div>
            <h3 className="text-sm font-semibold text-white">No ICP Profiles Found</h3>
            <p className="text-xs text-[#A1A1AA] mt-1">
              {search || serviceFilter
                ? 'No profiles match your filter criteria.'
                : 'Get started by creating your first profile or restoring agency defaults.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleSeedDefaults}
              className="bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs px-3.5 py-2 rounded-lg transition-colors"
            >
              Restore Defaults
            </button>
            <button
              type="button"
              onClick={onCreateNew}
              className="bg-[#2563EB] hover:bg-blue-600 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Create ICP
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filtered.map((p) => {
            const hardFiltersCount = p.rules.filter((r) => r.type === 'HARD_FILTER').length;
            const softSignalsCount = p.rules.filter((r) => r.type === 'SOFT_SIGNAL').length;
            const exclusionsCount = p.rules.filter((r) => r.type === 'EXCLUSION').length;
            const isBusy = actionLoadingId === p.id;
            const serviceLabel =
              TARGET_SERVICES.find((s) => s.value === p.targetService)?.label ||
              p.targetService ||
              'General';

            return (
              <div
                key={p.id}
                className="rounded-xl bg-[#111113] border border-[#27272A] hover:border-[#3F3F46] p-5 flex flex-col justify-between transition-all duration-200 group"
              >
                {/* Card Top: Name & Active Toggle */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {serviceLabel}
                        </span>
                        {p.targetNiche && (
                          <span className="text-[11px] text-[#A1A1AA] truncate max-w-[180px]">
                            • {p.targetNiche}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white mt-1.5 group-hover:text-blue-400 transition-colors">
                        {p.name}
                      </h3>
                    </div>

                    {/* Active toggle button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleActive(p, e)}
                      disabled={isBusy}
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1.5 transition-colors ${
                        p.isActive !== false
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          p.isActive !== false ? 'bg-emerald-400' : 'bg-zinc-500'
                        }`}
                      />
                      {p.isActive !== false ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  {/* Description */}
                  {p.description && (
                    <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}

                  {/* Rules Breakdown Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-[#18181B] border border-[#27272A] text-rose-300">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>{hardFiltersCount} Hard</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-[#18181B] border border-[#27272A] text-blue-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>{softSignalsCount} Signals</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-[#18181B] border border-[#27272A] text-amber-300">
                      <Ban className="w-3.5 h-3.5 text-amber-400" />
                      <span>{exclusionsCount} Exclusions</span>
                    </div>

                    <div className="text-[11px] text-[#71717A] ml-auto">
                      High Priority: &ge;{p.scoringConfig?.highPriorityThreshold ?? 70} pts
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Action Toolbar */}
                <div className="mt-5 pt-4 border-t border-[#27272A] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectProfile(p)}
                      className="bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border border-[#2563EB]/30"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit Rules
                    </button>

                    <button
                      type="button"
                      onClick={() => setSandboxProfile(p)}
                      className="bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border border-[#27272A]"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                      Test Sandbox
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleDuplicate(p, e)}
                      disabled={isBusy}
                      className="p-1.5 text-[#A1A1AA] hover:text-white hover:bg-[#27272A] rounded-lg transition-colors"
                      title="Duplicate Profile"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {deleteConfirmId === p.id ? (
                      <div className="flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                        <span className="text-[10px] text-rose-300">Delete?</span>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(p.id, e)}
                          className="text-[10px] text-white font-bold px-1 hover:underline"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="text-[10px] text-[#A1A1AA] px-1 hover:underline"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(p.id);
                        }}
                        className="p-1.5 text-[#A1A1AA] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sandbox Modal */}
      {sandboxProfile && (
        <ICPSandboxModal
          profile={sandboxProfile}
          isOpen={!!sandboxProfile}
          onClose={() => setSandboxProfile(null)}
        />
      )}
    </div>
  );
}
