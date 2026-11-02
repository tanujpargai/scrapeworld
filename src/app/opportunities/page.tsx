'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Coins,
  Building2,
  Filter,
  DollarSign,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface Opportunity {
  id: string;
  businessId: string;
  title: string;
  description: string | null;
  serviceType: string;
  priority: string;
  estimatedValue: number | null;
  opportunityScore: number | null;
  status: string;
  business: {
    name: string;
    industry: string | null;
    leadIntelligence?: {
      leadScore: number;
      leadTier: string;
    } | null;
  };
}

export default function OpportunitiesPage() {
  const [service, setService] = useState('');
  const [priority, setPriority] = useState('');
  const [industry, setIndustry] = useState('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        service,
        priority,
        industry,
        limit: '100',
        offset: '0',
      });
      const res = await fetch(`/api/opportunities?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.opportunities || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (e) {
      console.error('Error fetching opportunities:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [service, priority, industry]);

  const totalValue = opportunities.reduce((acc, o) => acc + (o.estimatedValue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Coins className="w-8 h-8 text-[#F59E0B]" />
            <span>Revenue Opportunities</span>
          </h1>
          <p className="text-[#A1A1AA] mt-1 text-sm">
            List and filter potential service deals discovered automatically by competitive gap analysis.
          </p>
        </div>

        {/* Total Pipeline value badge */}
        <div className="p-4 bg-[#111113] border border-[#27272A] rounded-lg shrink-0 flex items-center gap-3">
          <div>
            <p className="text-[10px] text-[#A1A1AA] uppercase font-bold">Total Discovered Value</p>
            <p className="text-xl font-mono font-bold text-[#22C55E] mt-0.5">${totalValue.toLocaleString()}</p>
          </div>
          <DollarSign className="w-8 h-8 text-[#22C55E] bg-[#22C55E]/10 p-1.5 rounded-full" />
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-5 bg-[#111113] border border-[#27272A] rounded-lg flex flex-col md:flex-row gap-4">
        {/* Industry Filter */}
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase mb-1.5 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Filter Industry
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full bg-[#09090B] border border-[#27272A] text-xs text-[#FAFAFA] rounded p-2 focus:outline-none focus:border-[#2563EB]"
          >
            <option value="">All Industries</option>
            <option value="clinic">Clinics</option>
            <option value="salon">Salons</option>
            <option value="gym">Gyms</option>
            <option value="restaurant">Restaurants</option>
          </select>
        </div>

        {/* Service Filter */}
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase mb-1.5 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Service
          </label>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full bg-[#09090B] border border-[#27272A] text-xs text-[#FAFAFA] rounded p-2 focus:outline-none focus:border-[#2563EB]"
          >
            <option value="">All Services</option>
            <option value="WEBSITE">Website Dev / Optimization</option>
            <option value="SEO">Local SEO / Citations</option>
            <option value="AUTOMATION">Automation / Booking</option>
            <option value="AI">AI Integration</option>
            <option value="MARKETING">Social Media Marketing</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase mb-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Filter Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-[#09090B] border border-[#27272A] text-xs text-[#FAFAFA] rounded p-2 focus:outline-none focus:border-[#2563EB]"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">URGENT</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B]" />
          </div>
        ) : opportunities.length === 0 ? (
          <p className="text-sm text-[#A1A1AA] py-12 text-center">No open opportunities match the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#27272A] text-[#A1A1AA] font-bold">
                  <th className="pb-3">Business</th>
                  <th className="pb-3">Proposed Service</th>
                  <th className="pb-3 text-center">Priority</th>
                  <th className="pb-3 text-right">Est. Deal Value</th>
                  <th className="pb-3 text-center">Lead Score</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1b1e]">
                {opportunities.map((opp) => {
                  const leadScore = opp.business?.leadIntelligence?.leadScore ?? '—';
                  const leadTier = opp.business?.leadIntelligence?.leadTier ?? '';

                  return (
                    <tr key={opp.id} className="hover:bg-[#1b1b1f]/50">
                      <td className="py-4">
                        <div className="font-bold text-[#FAFAFA]">{opp.business.name}</div>
                        <div className="text-[10px] text-[#A1A1AA] mt-0.5">{opp.business.industry || 'Unknown'}</div>
                      </td>
                      <td className="py-4">
                        <div className="font-semibold text-[#FAFAFA]">{opp.title}</div>
                        <div className="text-[10px] text-[#A1A1AA] mt-0.5 max-w-[320px] truncate" title={opp.description || ''}>
                          {opp.description}
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          opp.priority === 'URGENT' || opp.priority === 'HIGH' ? 'bg-[#EF4444]/15 text-[#EF4444]' :
                          opp.priority === 'MEDIUM' ? 'bg-[#F59E0B]/15 text-[#F59E0B]' :
                          'bg-[#2563EB]/15 text-[#2563EB]'
                        }`}>
                          {opp.priority}
                        </span>
                      </td>
                      <td className="py-4 text-right font-mono font-bold text-[#22C55E]">
                        ${opp.estimatedValue ? opp.estimatedValue.toLocaleString() : '0'}
                      </td>
                      <td className="py-4 text-center font-mono font-semibold">
                        {leadScore !== '—' ? (
                          <div className="inline-flex items-center gap-1">
                            <span>{leadScore}</span>
                            <span className="text-[10px] text-[#A1A1AA]">({leadTier})</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-0.5 bg-[#2563EB]/10 text-[#2563EB] rounded text-[10px] font-bold">
                          {opp.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <Link
                          href={`/business/${opp.businessId}`}
                          className="px-3 py-1 bg-[#2563EB] hover:bg-[#2563EB]/80 text-[#FAFAFA] font-medium rounded text-[11px] transition-colors"
                        >
                          View Lead
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
