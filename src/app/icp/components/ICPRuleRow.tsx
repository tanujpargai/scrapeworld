'use client';

import React, { useState } from 'react';
import type { ICPRule, ICPRuleType, ICPOperator } from '@/types/icp';
import {
  COMMON_FIELDS,
  OPERATOR_OPTIONS,
  RULE_TYPES,
} from './constants';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  AlertCircle,
  HelpCircle,
  Hash,
  Type,
  ToggleLeft,
  Sliders,
  ShieldAlert,
  CheckCircle2,
  Ban,
  Power,
} from 'lucide-react';

interface ICPRuleRowProps {
  rule: ICPRule;
  index: number;
  totalRules: number;
  onChange: (updatedRule: ICPRule) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
}

export default function ICPRuleRow({
  rule,
  index,
  totalRules,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
}: ICPRuleRowProps) {
  const [isCustomField, setIsCustomField] = useState(
    !COMMON_FIELDS.some((f) => f.value === rule.condition.field) && !!rule.condition.field
  );

  const currentOperator = OPERATOR_OPTIONS.find((o) => o.value === rule.condition.operator);
  const isExistenceOp = rule.condition.operator === 'exists' || rule.condition.operator === 'does_not_exist';
  const isBetweenOp = rule.condition.operator === 'between';
  const isKeywordOrListOp = [
    'must_contain',
    'must_not_contain',
    'contains_any',
    'contains_all',
    'is_one_of',
    'is_not_one_of',
  ].includes(rule.condition.operator);

  // Field type inference
  const matchedFieldOption = COMMON_FIELDS.find((f) => f.value === rule.condition.field);
  const isNumericField = matchedFieldOption?.type === 'number';
  const isBooleanField = matchedFieldOption?.type === 'boolean';

  // Validation
  const hasEmptyField = !rule.condition.field || rule.condition.field.trim() === '';
  const hasEmptyValue =
    !isExistenceOp &&
    (rule.condition.value === undefined || rule.condition.value === null || String(rule.condition.value).trim() === '');
  const hasEmptySecondValue =
    isBetweenOp &&
    (rule.condition.secondValue === undefined || rule.condition.secondValue === null || String(rule.condition.secondValue).trim() === '');
  const hasErrors = hasEmptyField || hasEmptyValue || hasEmptySecondValue;

  const handleTypeChange = (newType: ICPRuleType) => {
    onChange({
      ...rule,
      type: newType,
      // Default weight for soft signal
      weight: newType === 'SOFT_SIGNAL' ? (rule.weight ?? 15) : undefined,
    });
  };

  const handleFieldSelect = (val: string) => {
    if (val === '__custom__') {
      setIsCustomField(true);
      onChange({
        ...rule,
        condition: {
          ...rule.condition,
          field: '',
        },
      });
    } else {
      setIsCustomField(false);
      onChange({
        ...rule,
        condition: {
          ...rule.condition,
          field: val,
        },
      });
    }
  };

  const handleOperatorChange = (op: ICPOperator) => {
    onChange({
      ...rule,
      condition: {
        ...rule.condition,
        operator: op,
      },
    });
  };

  const handleValueChange = (valStr: string) => {
    let finalVal: any = valStr;
    if (isNumericField && valStr !== '' && !isNaN(Number(valStr))) {
      finalVal = Number(valStr);
    } else if (isBooleanField) {
      finalVal = valStr === 'true';
    }
    onChange({
      ...rule,
      condition: {
        ...rule.condition,
        value: finalVal,
      },
    });
  };

  const handleSecondValueChange = (valStr: string) => {
    let finalVal: any = valStr;
    if (isNumericField && valStr !== '' && !isNaN(Number(valStr))) {
      finalVal = Number(valStr);
    }
    onChange({
      ...rule,
      condition: {
        ...rule.condition,
        secondValue: finalVal,
      },
    });
  };

  const typeConfig = {
    HARD_FILTER: {
      border: 'border-rose-500/30 hover:border-rose-500/50',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      icon: ShieldAlert,
      label: 'Hard Filter',
      desc: 'Must pass or lead is rejected',
    },
    SOFT_SIGNAL: {
      border: 'border-blue-500/30 hover:border-blue-500/50',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      icon: CheckCircle2,
      label: 'Scoring Signal',
      desc: 'Awards or deducts opportunity points',
    },
    EXCLUSION: {
      border: 'border-amber-500/30 hover:border-amber-500/50',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: Ban,
      label: 'Exclusion',
      desc: 'Disqualifies lead if condition is met',
    },
  }[rule.type];

  const isEnabled = rule.enabled !== false;

  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-200 ${
        isEnabled
          ? `bg-[#141417] ${typeConfig.border}`
          : 'bg-[#0f0f12] border-dashed border-[#27272A] opacity-60'
      } ${hasErrors && isEnabled ? 'ring-1 ring-red-500/40' : ''}`}
    >
      {/* Top Header: Reorder, Name, Type selector, Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#27272A]/80">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          {/* Reordering */}
          <div className="flex items-center bg-[#1E1E22] rounded border border-[#27272A] p-0.5">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-1 rounded text-[#A1A1AA] hover:text-white hover:bg-[#27272A] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Move Up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === totalRules - 1}
              className="p-1 rounded text-[#A1A1AA] hover:text-white hover:bg-[#27272A] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Move Down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-xs font-mono text-[#71717A] px-1">#{index + 1}</span>

          {/* Rule Name Input */}
          <input
            type="text"
            value={rule.name}
            onChange={(e) => onChange({ ...rule, name: e.target.value })}
            placeholder="e.g. Established Business (>20 Reviews)"
            className="flex-1 bg-[#1A1A1E] border border-[#27272A] rounded px-2.5 py-1 text-sm font-medium text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        {/* Right side: Type Pill Selector & Row Actions */}
        <div className="flex items-center gap-2">
          {/* Rule Type Tabs */}
          <div className="flex bg-[#1A1A1E] p-0.5 rounded-md border border-[#27272A] text-xs">
            {RULE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleTypeChange(t.value)}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  rule.type === t.value
                    ? rule.type === 'HARD_FILTER'
                      ? 'bg-rose-500/20 text-rose-300 shadow-sm'
                      : rule.type === 'SOFT_SIGNAL'
                      ? 'bg-blue-500/20 text-blue-300 shadow-sm'
                      : 'bg-amber-500/20 text-amber-300 shadow-sm'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Enable / Disable Rule Switch */}
          <button
            type="button"
            onClick={() => onChange({ ...rule, enabled: !isEnabled })}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors border ${
              isEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
            }`}
            title={isEnabled ? 'Rule enabled — click to disable' : 'Rule disabled — click to enable'}
          >
            <Power className="w-3 h-3" />
            <span>{isEnabled ? 'Active' : 'Disabled'}</span>
          </button>

          {/* Duplicate & Delete */}
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1.5 text-[#A1A1AA] hover:text-white hover:bg-[#27272A] rounded transition-colors"
            title="Duplicate Rule"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-[#A1A1AA] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
            title="Delete Rule"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Condition Builder Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 items-start">
        {/* Field Selector */}
        <div className="md:col-span-4 space-y-1">
          <label className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider flex items-center justify-between">
            <span>Target Field</span>
            {isCustomField ? (
              <button
                type="button"
                onClick={() => {
                  setIsCustomField(false);
                  handleFieldSelect(COMMON_FIELDS[0].value);
                }}
                className="text-[10px] text-[#2563EB] hover:underline"
              >
                Select standard
              </button>
            ) : null}
          </label>

          {isCustomField ? (
            <input
              type="text"
              value={rule.condition.field}
              onChange={(e) =>
                onChange({
                  ...rule,
                  condition: { ...rule.condition, field: e.target.value },
                })
              }
              placeholder="e.g. meta.customCategory"
              className="w-full bg-[#1A1A1E] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] font-mono placeholder-[#71717A] focus:outline-none focus:border-[#2563EB]"
            />
          ) : (
            <select
              value={rule.condition.field}
              onChange={(e) => handleFieldSelect(e.target.value)}
              className="w-full bg-[#1A1A1E] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
            >
              {Object.entries(
                COMMON_FIELDS.reduce((acc, field) => {
                  acc[field.category] = acc[field.category] || [];
                  acc[field.category].push(field);
                  return acc;
                }, {} as Record<string, typeof COMMON_FIELDS>)
              ).map(([category, fields]) => (
                <optgroup key={category} label={category}>
                  {fields.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="__custom__">⚙️ Custom Field (path)...</option>
            </select>
          )}
        </div>

        {/* Operator Selector */}
        <div className="md:col-span-4 space-y-1">
          <label className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">
            Operator
          </label>
          <select
            value={rule.condition.operator}
            onChange={(e) => handleOperatorChange(e.target.value as ICPOperator)}
            className="w-full bg-[#1A1A1E] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
          >
            {Object.entries(
              OPERATOR_OPTIONS.reduce((acc, op) => {
                acc[op.category] = acc[op.category] || [];
                acc[op.category].push(op);
                return acc;
              }, {} as Record<string, typeof OPERATOR_OPTIONS>)
            ).map(([category, ops]) => (
              <optgroup key={category} label={category}>
                {ops.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Value Inputs */}
        <div className="md:col-span-4 space-y-1">
          <label className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider flex items-center justify-between">
            <span>Comparison Value</span>
            {isKeywordOrListOp && (
              <span className="text-[10px] text-[#71717A] lowercase">comma-separated</span>
            )}
          </label>

          {isExistenceOp ? (
            <div className="h-8 flex items-center px-2.5 bg-[#1A1A1E]/50 border border-dashed border-[#27272A] rounded text-xs text-[#71717A] italic">
              No comparison value needed
            </div>
          ) : isBetweenOp ? (
            <div className="flex items-center gap-1.5">
              <input
                type={isNumericField ? 'number' : 'text'}
                value={rule.condition.value ?? ''}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder="Min"
                className="w-1/2 bg-[#1A1A1E] border border-[#27272A] rounded px-2 py-1.5 text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#2563EB]"
              />
              <span className="text-xs text-[#71717A]">to</span>
              <input
                type={isNumericField ? 'number' : 'text'}
                value={rule.condition.secondValue ?? ''}
                onChange={(e) => handleSecondValueChange(e.target.value)}
                placeholder="Max"
                className="w-1/2 bg-[#1A1A1E] border border-[#27272A] rounded px-2 py-1.5 text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          ) : isBooleanField ? (
            <select
              value={String(rule.condition.value ?? 'true')}
              onChange={(e) => handleValueChange(e.target.value)}
              className="w-full bg-[#1A1A1E] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="true">True (Yes / Present)</option>
              <option value="false">False (No / Absent)</option>
            </select>
          ) : (
            <input
              type={isNumericField ? 'number' : 'text'}
              value={rule.condition.value ?? ''}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={
                isKeywordOrListOp
                  ? 'e.g. dentist, clinic, orthodontics'
                  : isNumericField
                  ? 'e.g. 50'
                  : 'e.g. target text'
              }
              className="w-full bg-[#1A1A1E] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#2563EB]"
            />
          )}
        </div>
      </div>

      {/* Secondary Row: Soft Signal Weight (if applicable) & Explanation Note */}
      <div className="mt-3 pt-2.5 border-t border-[#27272A]/40 flex flex-wrap items-center gap-3">
        {/* Soft Signal Weight Slider/Input */}
        {rule.type === 'SOFT_SIGNAL' && (
          <div className="flex items-center gap-2 bg-[#1A1A1E] px-3 py-1.5 rounded border border-[#27272A]">
            <span className="text-xs font-medium text-[#A1A1AA] flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              Weight:
            </span>
            <input
              type="range"
              min="-50"
              max="50"
              step="5"
              value={rule.weight ?? 15}
              onChange={(e) => onChange({ ...rule, weight: Number(e.target.value) })}
              className="w-24 accent-[#2563EB] cursor-pointer"
            />
            <input
              type="number"
              min="-100"
              max="100"
              value={rule.weight ?? 15}
              onChange={(e) => onChange({ ...rule, weight: Number(e.target.value) })}
              className="w-14 bg-[#141417] border border-[#27272A] rounded px-1.5 py-0.5 text-xs text-center font-bold text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
            />
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                (rule.weight ?? 15) >= 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {(rule.weight ?? 15) >= 0 ? `+${rule.weight ?? 15}` : rule.weight} pts
            </span>
          </div>
        )}

        {/* Custom Explanation Input */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={rule.explanation ?? ''}
            onChange={(e) => onChange({ ...rule, explanation: e.target.value })}
            placeholder="Optional audit explanation (e.g. 'Outdated CMS represents strong pitch angle')"
            className="w-full bg-[#1A1A1E] border border-[#27272A] rounded px-2.5 py-1 text-xs text-[#A1A1AA] placeholder-[#52525B] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        {/* Validation Error Warning */}
        {hasErrors && (
          <div className="flex items-center gap-1 text-xs text-rose-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Missing required condition values</span>
          </div>
        )}
      </div>
    </div>
  );
}
