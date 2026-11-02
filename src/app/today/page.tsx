'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Briefcase,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface Business {
  id: string;
  name: string;
  website: string | null;
  verifiedWebsite: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  industry: string | null;
  city: string | null;
  status: string;
  leadIntelligence?: {
    opportunityScore: number | null;
    leadTier: string;
    salesReadinessScore: number | null;
    reachabilityScore: number | null;
    abilityToPay: string | null;
  } | null;
  socialProfiles: Array<{ platform: string; url: string }>;
  segments?: string[];
}

export default function TodayPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Action state
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  const fetchTodayLeads = async () => {
    try {
      const res = await fetch('/api/today');
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
      } else {
        setError('Failed to fetch today\'s hot leads.');
      }
    } catch (e: any) {
      setError('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayLeads();
  }, []);

  const handleCreateDeal = async (businessId: string) => {
    setActioningId(businessId);
    setActionMessage('');
    try {
      const res = await fetch('/api/crm/deals/create-from-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(`Deal created! Title: ${data.deal?.title}`);
        fetchTodayLeads(); // Refresh list to remove if status changes
      } else {
        setActionMessage(data.error || 'Failed to create deal.');
      }
    } catch (err: any) {
      setActionMessage('Error: ' + err.message);
    } finally {
      setActioningId(null);
      setTimeout(() => setActionMessage(''), 5000);
    }
  };

  const handleChangeStatus = async (businessId: string, status: string) => {
    setActioningId(businessId);
    try {
      const res = await fetch(`/api/businesses/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchTodayLeads();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActioningId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="w-12 h-12 animate-spin text-[#2563EB]" />
        <p className="text-[#A1A1AA] mt-4 text-sm font-semibold">Fetching today's hot opportunities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-[#111113] border border-[#27272A] rounded-lg max-w-lg mx-auto mt-20">
        <AlertTriangle className="w-12 h-12 text-[#EF4444] mx-auto mb-4" />
        <h2 className="text-lg font-bold text-[#FAFAFA]">Access Error</h2>
        <p className="text-xs text-[#A1A1AA] mt-2 mb-6">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#FAFAFA] flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#2563EB]" />
            <span>Today's Opportunities</span>
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-2">
            Focus on these ready-to-contact, high-opportunity leads right now. Showing only "NEW" leads that match the READY_TO_CONTACT segment.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-[#2563EB]/15 border border-[#2563EB]/35 text-[#FAFAFA] rounded text-xs">
          {actionMessage}
        </div>
      )}

      <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#FAFAFA]">Hot Pipeline ({businesses.length})</h2>
        </div>

        <div className="overflow-x-auto">
          {businesses.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-[#22C55E] mx-auto mb-4 opacity-50" />
              <p className="text-[#A1A1AA]">Inbox Zero! You've cleared all top-priority ready-to-contact leads.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#27272A] text-[#A1A1AA] font-bold">
                  <th className="pb-3 text-center">Opp Score</th>
                  <th className="pb-3">Business</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3 text-center">Ability to Pay</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1b1e]">
                {businesses.map((biz) => {
                  const oppScore = biz.leadIntelligence?.opportunityScore ?? '—';
                  const isActioning = actioningId === biz.id;

                  return (
                    <tr key={biz.id} className="hover:bg-[#1b1b1f]/50">
                      <td className="py-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-[#2563EB]/15 text-[#2563EB] font-mono font-bold text-lg flex items-center justify-center mx-auto">
                          {oppScore}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="font-bold text-[#FAFAFA] text-sm">{biz.name}</div>
                        <div className="text-[10px] text-[#A1A1AA] mt-1">
                          {biz.industry || 'Local'} • {biz.city || 'Delhi'}
                        </div>
                        {biz.segments && biz.segments.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {biz.segments.filter(s => s !== 'READY_TO_CONTACT').map(seg => (
                              <span key={seg} className="px-1.5 py-0.5 rounded bg-[#27272A] text-[#A1A1AA] text-[9px] font-mono">
                                {seg.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="text-[#FAFAFA] font-mono">{biz.phone || 'No Phone'}</div>
                        <div className="text-[#A1A1AA] text-[10px] mt-1 max-w-[150px] truncate">
                          {biz.website ? (
                            <a href={biz.website} target="_blank" className="hover:underline hover:text-[#2563EB]">
                              {biz.website.replace(/^https?:\/\//, '')}
                            </a>
                          ) : 'No Website'}
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          biz.leadIntelligence?.abilityToPay === 'HIGH' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                          biz.leadIntelligence?.abilityToPay === 'MEDIUM' ? 'bg-yellow-500/15 text-yellow-500' :
                          'bg-[#A1A1AA]/15 text-[#A1A1AA]'
                        }`}>
                          {biz.leadIntelligence?.abilityToPay || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="py-4 text-right space-x-2 shrink-0">
                        <button
                          onClick={() => handleChangeStatus(biz.id, 'SKIPPED')}
                          disabled={isActioning}
                          className="px-3 py-1.5 bg-[#111113] hover:bg-[#27272A] border border-[#27272A] disabled:opacity-50 text-[#A1A1AA] font-semibold rounded text-[11px] transition-colors inline-flex items-center"
                        >
                          Skip
                        </button>
                        <button
                          onClick={() => handleCreateDeal(biz.id)}
                          disabled={isActioning}
                          className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#2563EB]/80 disabled:bg-[#2563EB]/30 text-[#FAFAFA] font-bold rounded text-[11px] transition-colors inline-flex items-center gap-1.5 shadow-lg shadow-[#2563EB]/20"
                        >
                          <Briefcase className="w-3.5 h-3.5" /> Start Pitch
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
