'use client';

import React, { useState } from 'react';
import type { ICPProfile, ICPEvaluation } from '@/types/icp';
import { SAMPLE_TEST_BUSINESSES } from './constants';
import {
  X,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  Loader2,
  Code2,
  Building,
  Target,
  ArrowRight,
} from 'lucide-react';

interface ICPSandboxModalProps {
  profile: ICPProfile;
  isOpen: boolean;
  onClose: () => void;
}

export default function ICPSandboxModal({
  profile,
  isOpen,
  onClose,
}: ICPSandboxModalProps) {
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [customMode, setCustomMode] = useState(false);
  const [customJson, setCustomJson] = useState(
    JSON.stringify(SAMPLE_TEST_BUSINESSES[0].business, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [evaluation, setEvaluation] = useState<ICPEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunEvaluation = async () => {
    setLoading(true);
    setError(null);
    setEvaluation(null);

    let businessData: any;
    try {
      if (customMode) {
        businessData = JSON.parse(customJson);
      } else {
        businessData = SAMPLE_TEST_BUSINESSES[selectedSampleIndex].business;
      }
    } catch (err: any) {
      setJsonError(`Invalid JSON: ${err.message}`);
      setLoading(false);
      return;
    }
    setJsonError(null);

    try {
      const res = await fetch('/api/icp/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          business: businessData,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Evaluation failed');
      }

      setEvaluation(json.data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during evaluation');
    } finally {
      setLoading(false);
    }
  };

  const currentBusiness = customMode
    ? null
    : SAMPLE_TEST_BUSINESSES[selectedSampleIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#111113] border border-[#27272A] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#27272A] flex items-center justify-between bg-[#141417]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#FAFAFA] flex items-center gap-2">
                ICP Evaluation Sandbox
                <span className="text-xs font-normal text-[#A1A1AA] bg-[#27272A] px-2 py-0.5 rounded">
                  {profile.name}
                </span>
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Simulate real-time lead qualification against sample or custom business records.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Target Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                Select Test Subject
              </label>
              <button
                type="button"
                onClick={() => setCustomMode(!customMode)}
                className="text-xs text-[#2563EB] hover:underline flex items-center gap-1"
              >
                <Code2 className="w-3.5 h-3.5" />
                {customMode ? 'Switch to Preset Businesses' : 'Paste Custom Business JSON'}
              </button>
            </div>

            {!customMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SAMPLE_TEST_BUSINESSES.map((sample, idx) => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => {
                      setSelectedSampleIndex(idx);
                      setEvaluation(null);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedSampleIndex === idx
                        ? 'border-[#2563EB] bg-[#2563EB]/10 text-white'
                        : 'border-[#27272A] bg-[#18181B] text-[#A1A1AA] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="font-semibold text-sm text-[#FAFAFA] flex items-center gap-2">
                      <Building className="w-4 h-4 text-[#2563EB]" />
                      {sample.name}
                    </div>
                    <div className="text-xs text-[#71717A] mt-1">{sample.category}</div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-[#A1A1AA]">
                      <span>⭐ {sample.business.rating}</span>
                      <span>💬 {sample.business.reviewCount} reviews</span>
                      <span>
                        🌐 {sample.business.website ? 'Has site' : 'No site'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                <textarea
                  value={customJson}
                  onChange={(e) => {
                    setCustomJson(e.target.value);
                    setJsonError(null);
                  }}
                  rows={8}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg p-3 text-xs font-mono text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
                  placeholder="Paste business JSON..."
                />
                {jsonError && (
                  <p className="text-xs text-rose-400 font-medium">{jsonError}</p>
                )}
              </div>
            )}
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-between pt-2 border-t border-[#27272A]">
            <div className="text-xs text-[#71717A]">
              Rules configured in ICP: <strong className="text-white">{profile.rules.length}</strong> (
              {profile.rules.filter((r) => r.type === 'HARD_FILTER').length} hard,{' '}
              {profile.rules.filter((r) => r.type === 'SOFT_SIGNAL').length} soft,{' '}
              {profile.rules.filter((r) => r.type === 'EXCLUSION').length} exclusions)
            </div>
            <button
              type="button"
              onClick={handleRunEvaluation}
              disabled={loading}
              className="bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Execute Evaluation
                </>
              )}
            </button>
          </div>

          {/* Evaluation Results Area */}
          {error && (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {evaluation && (
            <div className="rounded-xl bg-[#141417] border border-[#27272A] p-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Primary Decision Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-[#18181B] border border-[#27272A]">
                <div className="flex items-center gap-3">
                  {evaluation.matched ? (
                    <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      <XCircle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs uppercase tracking-wider font-semibold text-[#A1A1AA]">
                      Evaluation Verdict
                    </div>
                    <div className="text-lg font-bold text-white flex items-center gap-2">
                      {evaluation.matched ? 'QUALIFIED LEAD' : 'DISQUALIFIED / REJECTED'}
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded font-semibold border ${
                          evaluation.priority === 'HIGH'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : evaluation.priority === 'MEDIUM'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {evaluation.priority} PRIORITY
                      </span>
                    </div>
                  </div>
                </div>

                {/* Opportunity Score Dial */}
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider font-semibold text-[#A1A1AA]">
                    Opportunity Score
                  </div>
                  <div className="text-3xl font-extrabold text-[#2563EB]">
                    {evaluation.score}
                    <span className="text-sm font-normal text-[#71717A]">/100</span>
                  </div>
                </div>
              </div>

              {/* Breakdown Grid: Hard Filters, Exclusions, Scoring Signals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hard Filters & Exclusions Audit */}
                <div className="space-y-3 p-4 rounded-lg bg-[#18181B] border border-[#27272A]">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-[#2563EB]" />
                    Hard Filters & Exclusions
                  </h4>

                  {/* Failed hard filters */}
                  {evaluation.failedHardFilters.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-rose-400">
                        Failed Hard Filters ({evaluation.failedHardFilters.length}):
                      </span>
                      {evaluation.failedHardFilters.map((fail, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20"
                        >
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fail}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Triggered exclusions */}
                  {evaluation.triggeredExclusions.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-amber-400">
                        Triggered Exclusions ({evaluation.triggeredExclusions.length}):
                      </span>
                      {evaluation.triggeredExclusions.map((ex, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{ex}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Passed hard filters */}
                  {evaluation.passedHardFilters.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-emerald-400">
                        Passed Hard Filters ({evaluation.passedHardFilters.length}):
                      </span>
                      {evaluation.passedHardFilters.map((pass, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20"
                        >
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{pass}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {evaluation.passedHardFilters.length === 0 &&
                    evaluation.failedHardFilters.length === 0 &&
                    evaluation.triggeredExclusions.length === 0 && (
                      <div className="text-xs text-[#71717A] italic">
                        No hard filters or exclusions configured.
                      </div>
                    )}
                </div>

                {/* Score Contributions & Signals */}
                <div className="space-y-3 p-4 rounded-lg bg-[#18181B] border border-[#27272A]">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Signal Contributions ({evaluation.scoreContributions.length})
                  </h4>

                  {evaluation.scoreContributions.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {evaluation.scoreContributions.map((contrib, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs bg-[#141417] px-2.5 py-1.5 rounded border border-[#27272A]"
                        >
                          <span className="text-[#FAFAFA] truncate max-w-[200px]">
                            {contrib.ruleName}
                          </span>
                          <span
                            className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                              contrib.pointsAwarded >= 0
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {contrib.pointsAwarded >= 0 ? `+${contrib.pointsAwarded}` : contrib.pointsAwarded} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[#71717A] italic">
                      No scoring signals triggered.
                    </div>
                  )}
                </div>
              </div>

              {/* Explanations & Audit Trail */}
              {evaluation.reasons.length > 0 && (
                <div className="p-4 rounded-lg bg-[#18181B] border border-[#27272A] space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                    Audit Trail & Decision Explanations
                  </h4>
                  <ul className="space-y-1 text-xs text-[#A1A1AA]">
                    {evaluation.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#141417] border-t border-[#27272A] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-medium rounded-lg transition-colors"
          >
            Close Sandbox
          </button>
        </div>
      </div>
    </div>
  );
}
