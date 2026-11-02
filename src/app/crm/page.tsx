'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Columns,
  Coins,
  ChevronRight,
  TrendingUp,
  Activity,
  Briefcase,
  AlertCircle,
  Loader2,
  Trash2,
  Calendar,
} from 'lucide-react';

interface Deal {
  id: string;
  title: string;
  value: number | null;
  probability: number | null;
  status: string;
  businessId: string;
  pipelineId: string;
  outreachChannel: string | null;
  outreachOutcome: string;
  business: {
    id: string;
    name: string;
    website: string | null;
    phone: string | null;
    email: string | null;
    industry: string | null;
    leadIntelligence?: {
      leadScore: number;
      leadTier: string;
      urgencyScore: number;
      buyerProbability: number;
      estimatedDealValue: number;
      salesReadinessScore?: number | null;
    } | null;
  };
}

interface PipelineStage {
  id: string;
  name: string;
  position: number;
  deals: Deal[];
}

export default function CRMPage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dragging states
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);

  // Fetch pipeline columns and deals
  const fetchPipeline = async () => {
    try {
      const res = await fetch('/api/crm/pipeline');
      if (res.ok) {
        const data = await res.json();
        setStages(data.pipeline || []);
      } else {
        setError('Failed to fetch CRM stages.');
      }
    } catch (e) {
      console.error('CRM fetch error:', e);
      setError('Network error fetching pipeline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  // HTML5 Drag Start
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggingDealId(dealId);
    e.dataTransfer.setData('text/plain', dealId);
  };

  // HTML5 Drag Over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
  };

  // HTML5 Drop
  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const dealId = draggingDealId || e.dataTransfer.getData('text/plain');
    if (!dealId) return;

    // Find the current stage and deal
    let foundDeal: Deal | null = null;
    let sourceStageId = '';

    for (const stage of stages) {
      const d = stage.deals.find(x => x.id === dealId);
      if (d) {
        foundDeal = d;
        sourceStageId = stage.id;
        break;
      }
    }

    if (!foundDeal || sourceStageId === targetStageId) {
      setDraggingDealId(null);
      return;
    }

    // Instantly persist in React local state for smooth UX
    const updatedStages = stages.map(stage => {
      if (stage.id === sourceStageId) {
        return {
          ...stage,
          deals: stage.deals.filter(x => x.id !== dealId),
        };
      }
      if (stage.id === targetStageId) {
        // Move the deal inside target stage and update its pipelineId
        const updatedDeal = { ...foundDeal!, pipelineId: targetStageId };
        return {
          ...stage,
          deals: [updatedDeal, ...stage.deals],
        };
      }
      return stage;
    });

    setStages(updatedStages);
    setDraggingDealId(null);

    // Save update in database
    try {
      setActioning(true);
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineId: targetStageId }),
      });
      if (!res.ok) {
        console.error('Failed to save deal stage shift');
        // Rollback state if server returns error
        fetchPipeline();
      }
    } catch (err) {
      console.error('Network error saving deal move:', err);
      fetchPipeline();
    } finally {
      setActioning(false);
    }
  };

  // Delete Deal helper
  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;
    try {
      setStages(prev => prev.map(s => ({
        ...s,
        deals: s.deals.filter(d => d.id !== dealId)
      })));
      await fetch(`/api/deals/${dealId}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
      fetchPipeline();
    }
  };

  const handleUpdateOutreach = async (dealId: string, updates: any) => {
    try {
      setStages(prev => prev.map(s => ({
        ...s,
        deals: s.deals.map(d => d.id === dealId ? { ...d, ...updates } : d)
      })));
      await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.error(e);
      fetchPipeline();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
        <p className="text-xs text-[#A1A1AA]">Loading Kanban board pipeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Columns className="w-8 h-8 text-[#2563EB]" />
            <span>CRM Sales Pipeline</span>
          </h1>
          <p className="text-[#A1A1AA] mt-1 text-sm">
            Drag and drop deals between sales qualification columns. Changes are saved instantly.
          </p>
        </div>
        {actioning && (
          <span className="text-xs text-[#A1A1AA] flex items-center gap-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" /> Saving changes...
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 text-red-500 text-xs rounded border border-red-500/20 shrink-0">
          {error}
        </div>
      )}

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 select-none">
        <div className="flex gap-4 h-full min-w-[1600px] items-stretch">
          {stages.map((stage) => (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className="w-[240px] bg-[#111113] border border-[#27272A] rounded-lg flex flex-col h-full"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-[#27272A] flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-[#FAFAFA] tracking-wider uppercase">{stage.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#27272A] font-mono text-[10px] font-bold text-[#FAFAFA]">
                  {stage.deals.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[400px]">
                {stage.deals.length === 0 ? (
                  <div className="h-full border border-dashed border-[#27272A] rounded-md flex items-center justify-center p-4">
                    <p className="text-[10px] text-[#A1A1AA] text-center">Drag leads here</p>
                  </div>
                ) : (
                  stage.deals.map((deal) => {
                    const biz = deal.business || {};
                    const leadIntel = biz.leadIntelligence;
                    const dealVal = deal.value ?? leadIntel?.estimatedDealValue ?? 0;
                    const leadScore = leadIntel?.leadScore ?? '—';
                    const winConf = deal.probability ?? leadIntel?.buyerProbability ?? 0;
                    const readiness = leadIntel?.salesReadinessScore ?? '—';

                    return (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        className="p-3 bg-[#09090B] border border-[#27272A] hover:border-[#2563EB] rounded-md cursor-grab active:cursor-grabbing space-y-3 transition-colors"
                      >
                        {/* Title & Delete */}
                        <div className="flex items-start justify-between gap-1">
                          <Link
                            href={`/business/${deal.businessId}`}
                            className="font-bold text-xs text-[#FAFAFA] hover:text-[#2563EB] hover:underline leading-tight"
                          >
                            {biz.name}
                          </Link>
                          <button
                            onClick={() => handleDeleteDeal(deal.id)}
                            className="text-[#A1A1AA] hover:text-[#EF4444] shrink-0 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Deal Stats */}
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-[#A1A1AA] block">Deal Value</span>
                            <span className="font-mono font-bold text-[#22C55E]">${dealVal.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[#A1A1AA] block">Win Conf</span>
                            <span className="font-mono text-[#FAFAFA]">{winConf}%</span>
                          </div>
                        </div>

                        {/* Scores row */}
                        <div className="flex items-center justify-between border-t border-[#17171a] pt-2 text-[9px] text-[#A1A1AA]">
                          <span className="flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3 text-[#2563EB]" /> {leadScore}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Activity className="w-3 h-3 text-[#F59E0B]" /> R: {readiness}
                          </span>
                        </div>

                        {/* Outreach Tracking */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-[#17171a] mt-2">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#A1A1AA]">Channel</span>
                            <select 
                              className="bg-[#111113] border border-[#27272A] text-[#FAFAFA] rounded px-1 py-0.5 text-[9px] w-24"
                              value={deal.outreachChannel || ''}
                              onChange={(e) => handleUpdateOutreach(deal.id, { outreachChannel: e.target.value || null })}
                            >
                              <option value="">Select Channel</option>
                              <option value="EMAIL">Email</option>
                              <option value="WHATSAPP">WhatsApp</option>
                              <option value="PHONE">Phone</option>
                              <option value="LINKEDIN">LinkedIn</option>
                              <option value="INSTAGRAM">Instagram</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#A1A1AA]">Outcome</span>
                            <select 
                              className="bg-[#111113] border border-[#27272A] text-[#FAFAFA] rounded px-1 py-0.5 text-[9px] w-24"
                              value={deal.outreachOutcome || 'NONE'}
                              onChange={(e) => handleUpdateOutreach(deal.id, { outreachOutcome: e.target.value })}
                            >
                              <option value="NONE">None</option>
                              <option value="NO_RESPONSE">No Response</option>
                              <option value="INTERESTED">Interested</option>
                              <option value="NOT_INTERESTED">Not Interested</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
