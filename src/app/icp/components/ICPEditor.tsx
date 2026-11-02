'use client';

import React, { useState } from 'react';
import type { ICPProfile, ICPRule, ICPRuleType } from '@/types/icp';
import { TARGET_SERVICES } from './constants';
import ICPRuleRow from './ICPRuleRow';
import ICPSandboxModal from './ICPSandboxModal';
import {
  Save,
  ArrowLeft,
  Plus,
  Sparkles,
  SlidersHorizontal,
  ShieldAlert,
  CheckCircle2,
  Ban,
  AlertCircle,
  HelpCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

interface ICPEditorProps {
  initialProfile: ICPProfile;
  isNew?: boolean;
  onSave: (savedProfile: ICPProfile) => void;
  onCancel: () => void;
}

export default function ICPEditor({
  initialProfile,
  isNew = false,
  onSave,
  onCancel,
}: ICPEditorProps) {
  const [profile, setProfile] = useState<ICPProfile>(initialProfile);
  const [activeTab, setActiveTab] = useState<'ALL' | ICPRuleType>('ALL');
  const [showScoringConfig, setShowScoringConfig] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Stats calculation
  const hardFiltersCount = profile.rules.filter((r) => r.type === 'HARD_FILTER').length;
  const softSignalsCount = profile.rules.filter((r) => r.type === 'SOFT_SIGNAL').length;
  const exclusionsCount = profile.rules.filter((r) => r.type === 'EXCLUSION').length;
  const totalPositiveWeight = profile.rules
    .filter((r) => r.type === 'SOFT_SIGNAL' && (r.weight ?? 0) > 0)
    .reduce((sum, r) => sum + (r.weight ?? 0), 0);

  // Validation
  const validateProfile = (): string[] => {
    const errors: string[] = [];
    if (!profile.name.trim()) {
      errors.push('Profile name is required');
    }
    if (profile.rules.length === 0) {
      errors.push('At least one qualification rule is required');
    }
    profile.rules.forEach((rule, idx) => {
      if (!rule.name.trim()) {
        errors.push(`Rule #${idx + 1} is missing a name`);
      }
      if (!rule.condition.field || !rule.condition.field.trim()) {
        errors.push(`Rule #${idx + 1} (${rule.name || 'Untitled'}) has no target field specified`);
      }
      const isExistence =
        rule.condition.operator === 'exists' || rule.condition.operator === 'does_not_exist';
      if (
        !isExistence &&
        (rule.condition.value === undefined ||
          rule.condition.value === null ||
          String(rule.condition.value).trim() === '')
      ) {
        errors.push(
          `Rule #${idx + 1} (${rule.name || 'Untitled'}) requires a comparison value`
        );
      }
    });
    return errors;
  };

  const handleSave = async () => {
    const errors = validateProfile();
    if (errors.length > 0) {
      setSaveError(errors[0]);
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const url = isNew ? '/api/icp' : `/api/icp/${profile.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save ICP profile');
      }

      onSave(json.data);
    } catch (err: any) {
      setSaveError(err.message || 'Error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = (type: ICPRuleType = 'HARD_FILTER') => {
    const newRule: ICPRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name:
        type === 'HARD_FILTER'
          ? 'Must have at least 15 reviews'
          : type === 'SOFT_SIGNAL'
          ? 'Slow website performance detected'
          : 'Exclude direct agency competitors',
      type,
      condition: {
        field: type === 'HARD_FILTER' ? 'reviewCount' : type === 'SOFT_SIGNAL' ? 'websiteData.performanceScore' : 'industry',
        operator: type === 'HARD_FILTER' ? 'greater_than_or_equal' : type === 'SOFT_SIGNAL' ? 'less_than' : 'contains_any',
        value: type === 'HARD_FILTER' ? 15 : type === 'SOFT_SIGNAL' ? 50 : 'agency, marketing',
      },
      weight: type === 'SOFT_SIGNAL' ? 20 : undefined,
      explanation:
        type === 'HARD_FILTER'
          ? 'Requires proof of business traction'
          : type === 'SOFT_SIGNAL'
          ? 'Slow site represents strong redesign pitch'
          : 'Do not pitch competitor agencies',
    };

    setProfile({
      ...profile,
      rules: [...profile.rules, newRule],
    });
  };

  const handleUpdateRule = (index: number, updatedRule: ICPRule) => {
    const newRules = [...profile.rules];
    newRules[index] = updatedRule;
    setProfile({ ...profile, rules: newRules });
  };

  const handleDeleteRule = (index: number) => {
    const newRules = profile.rules.filter((_, idx) => idx !== index);
    setProfile({ ...profile, rules: newRules });
  };

  const handleDuplicateRule = (index: number) => {
    const target = profile.rules[index];
    const duplicated: ICPRule = {
      ...target,
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${target.name} (Copy)`,
    };
    const newRules = [...profile.rules];
    newRules.splice(index + 1, 0, duplicated);
    setProfile({ ...profile, rules: newRules });
  };

  const handleMoveRule = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= profile.rules.length) return;

    const newRules = [...profile.rules];
    const [moved] = newRules.splice(index, 1);
    newRules.splice(targetIndex, 0, moved);
    setProfile({ ...profile, rules: newRules });
  };

  const filteredRulesWithIndices = profile.rules
    .map((rule, originalIndex) => ({ rule, originalIndex }))
    .filter(({ rule }) => activeTab === 'ALL' || rule.type === activeTab);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#111113] border border-[#27272A]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white transition-colors"
            title="Back to Profiles"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {isNew ? 'Create New Ideal Customer Profile' : `Edit: ${profile.name}`}
              <span
                className={`text-xs px-2.5 py-0.5 rounded font-semibold border ${
                  profile.isActive !== false
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {profile.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </h1>
            <p className="text-xs text-[#A1A1AA]">
              Define explicit hard filters, soft opportunity scoring weights, and auto-disqualifications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsSandboxOpen(true)}
            className="bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[#2563EB]" />
            Test in Sandbox
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Error Alert */}
      {saveError && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Profile Metadata Section */}
      <div className="rounded-xl bg-[#111113] border border-[#27272A] p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A1A1AA]">
          Profile Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#FAFAFA]">Profile Name *</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="e.g. Web Dev: Redesign & Performance Modernization"
              className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#FAFAFA]">Target Agency Service</label>
            <select
              value={profile.targetService ?? 'CUSTOM'}
              onChange={(e) => setProfile({ ...profile, targetService: e.target.value })}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2563EB]"
            >
              {TARGET_SERVICES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-[#FAFAFA]">Description</label>
            <textarea
              value={profile.description ?? ''}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              rows={2}
              placeholder="Brief description of the customer persona and commercial intent..."
              className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#FAFAFA]">Target Niche / Industry</label>
            <input
              type="text"
              value={profile.targetNiche ?? ''}
              onChange={(e) => setProfile({ ...profile, targetNiche: e.target.value })}
              placeholder="e.g. Medical Clinics, Law Firms, Home Services"
              className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="flex items-center gap-3 pt-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-white">
              <input
                type="checkbox"
                checked={profile.isActive !== false}
                onChange={(e) => setProfile({ ...profile, isActive: e.target.checked })}
                className="w-4 h-4 accent-[#2563EB] rounded cursor-pointer"
              />
              <span>Enable Profile in Discovery & Lead Scoring</span>
            </label>
          </div>
        </div>
      </div>

      {/* Advanced Scoring & Thresholds Toggle */}
      <div className="rounded-xl bg-[#111113] border border-[#27272A] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowScoringConfig(!showScoringConfig)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#18181B]/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-[#2563EB]" />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Scoring Engine & Priority Thresholds
              </span>
              <span className="text-xs text-[#71717A] ml-2">
                (Mode: {profile.scoringConfig?.mode || 'additive'}, High Priority:{' '}
                {profile.scoringConfig?.highPriorityThreshold ?? 70}+ pts)
              </span>
            </div>
          </div>
          {showScoringConfig ? (
            <ChevronUp className="w-4 h-4 text-[#A1A1AA]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#A1A1AA]" />
          )}
        </button>

        {showScoringConfig && (
          <div className="p-5 border-t border-[#27272A] bg-[#141417] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[#FAFAFA] font-medium">Scoring Mode</label>
              <select
                value={profile.scoringConfig?.mode ?? 'additive'}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    scoringConfig: {
                      ...profile.scoringConfig,
                      mode: e.target.value as any,
                    },
                  })
                }
                className="w-full bg-[#18181B] border border-[#27272A] rounded p-2 text-white"
              >
                <option value="additive">Additive (Clamped to 100)</option>
                <option value="proportional">Proportional (% of positive weights)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#FAFAFA] font-medium">High Priority Threshold</label>
              <input
                type="number"
                min="0"
                max="100"
                value={profile.scoringConfig?.highPriorityThreshold ?? 70}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    scoringConfig: {
                      ...profile.scoringConfig,
                      highPriorityThreshold: Number(e.target.value),
                    },
                  })
                }
                className="w-full bg-[#18181B] border border-[#27272A] rounded p-2 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#FAFAFA] font-medium">Medium Priority Threshold</label>
              <input
                type="number"
                min="0"
                max="100"
                value={profile.scoringConfig?.mediumPriorityThreshold ?? 40}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    scoringConfig: {
                      ...profile.scoringConfig,
                      mediumPriorityThreshold: Number(e.target.value),
                    },
                  })
                }
                className="w-full bg-[#18181B] border border-[#27272A] rounded p-2 text-white"
              />
            </div>

            <div className="md:col-span-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-[#A1A1AA]">
                <input
                  type="checkbox"
                  checked={profile.scoringConfig?.zeroScoreOnDisqualification ?? false}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      scoringConfig: {
                        ...profile.scoringConfig,
                        zeroScoreOnDisqualification: e.target.checked,
                      },
                    })
                  }
                  className="w-3.5 h-3.5 accent-[#2563EB] rounded cursor-pointer"
                />
                <span>Set Opportunity Score to 0 if disqualified by Hard Filter or Exclusion</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Rules Builder Header & Filter Tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#2563EB]" />
              Rules & Criteria ({profile.rules.length})
            </h2>
            <span className="text-xs text-[#71717A]">
              • Total Signal Weight Budget: +{totalPositiveWeight} pts
            </span>
          </div>

          {/* Quick Add Dropdown / Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddRule('HARD_FILTER')}
              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              + Hard Filter
            </button>
            <button
              type="button"
              onClick={() => handleAddRule('SOFT_SIGNAL')}
              className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              + Scoring Signal
            </button>
            <button
              type="button"
              onClick={() => handleAddRule('EXCLUSION')}
              className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              + Exclusion
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 border-b border-[#27272A] pb-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'ALL'
                ? 'bg-[#27272A] text-white'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            All Rules ({profile.rules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HARD_FILTER')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'HARD_FILTER'
                ? 'bg-rose-500/20 text-rose-300'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Hard Filters ({hardFiltersCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SOFT_SIGNAL')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'SOFT_SIGNAL'
                ? 'bg-blue-500/20 text-blue-300'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Scoring Signals ({softSignalsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('EXCLUSION')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'EXCLUSION'
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            Exclusions ({exclusionsCount})
          </button>
        </div>

        {/* Dynamic Rules List */}
        <div className="space-y-3 pt-2">
          {filteredRulesWithIndices.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-[#111113] border border-dashed border-[#27272A] space-y-3">
              <SlidersHorizontal className="w-8 h-8 text-[#52525B] mx-auto" />
              <p className="text-sm text-[#A1A1AA]">
                {activeTab === 'ALL'
                  ? 'No rules configured yet in this ICP profile.'
                  : `No ${activeTab.replace('_', ' ').toLowerCase()} rules found.`}
              </p>
              <button
                type="button"
                onClick={() =>
                  handleAddRule(activeTab === 'ALL' ? 'HARD_FILTER' : activeTab)
                }
                className="bg-[#2563EB] hover:bg-blue-600 text-white text-xs px-3.5 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add First Rule
              </button>
            </div>
          ) : (
            filteredRulesWithIndices.map(({ rule, originalIndex }) => (
              <ICPRuleRow
                key={rule.id}
                rule={rule}
                index={originalIndex}
                totalRules={profile.rules.length}
                onChange={(updated) => handleUpdateRule(originalIndex, updated)}
                onDelete={() => handleDeleteRule(originalIndex)}
                onMoveUp={() => handleMoveRule(originalIndex, 'UP')}
                onMoveDown={() => handleMoveRule(originalIndex, 'DOWN')}
                onDuplicate={() => handleDuplicateRule(originalIndex)}
              />
            ))
          )}
        </div>
      </div>

      {/* Floating Bottom Save Toolbar */}
      <div className="fixed bottom-0 left-64 right-0 bg-[#111113]/95 backdrop-blur-md border-t border-[#27272A] p-4 flex items-center justify-between z-40 px-8 shadow-2xl">
        <div className="flex items-center gap-4 text-xs text-[#A1A1AA]">
          <span>
            Rules: <strong className="text-white">{profile.rules.length}</strong>
          </span>
          <span>
            Hard Filters: <strong className="text-rose-400">{hardFiltersCount}</strong>
          </span>
          <span>
            Scoring Signals: <strong className="text-blue-400">{softSignalsCount}</strong>
          </span>
          <span>
            Exclusions: <strong className="text-amber-400">{exclusionsCount}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white text-xs font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setIsSandboxOpen(true)}
            className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[#2563EB]" />
            Test Sandbox
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sandbox Modal */}
      <ICPSandboxModal
        profile={profile}
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
      />
    </div>
  );
}
