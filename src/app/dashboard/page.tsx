import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import {
  Building2,
  FileSpreadsheet,
  Lightbulb,
  Briefcase,
  Star,
  Gauge,
  ArrowUpRight,
} from 'lucide-react';

export const revalidate = 0; // Disable caching to fetch live data

export default async function DashboardPage() {
  // Fetch executive stats
  const [
    bizCount,
    auditCount,
    opportunityCount,
    dealCount,
    leadIntelStats,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.website.count(),
    prisma.opportunity.count(),
    prisma.deal.count(),
    prisma.leadIntelligence.aggregate({
      _avg: {
        leadScore: true,
        salesReadinessScore: true,
      },
    }),
  ]);

  const avgLeadScore = Math.round(leadIntelStats._avg.leadScore ?? 0);
  const avgSalesReadiness = Math.round(leadIntelStats._avg.salesReadinessScore ?? 0);

  // Fetch recent searches
  const recentSearches = await prisma.collection.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Fetch Top 10 Leads
  const topLeads = await prisma.leadIntelligence.findMany({
    orderBy: { opportunityScore: 'desc' },
    take: 10,
    include: {
      business: true,
    },
  });

  const cards = [
    { name: 'Total Businesses', value: bizCount, icon: Building2, color: 'text-[#2563EB]' },
    { name: 'Total Audits', value: auditCount, icon: FileSpreadsheet, color: 'text-[#22C55E]' },
    { name: 'Total Opportunities', value: opportunityCount, icon: Lightbulb, color: 'text-[#F59E0B]' },
    { name: 'Total Deals', value: dealCount, icon: Briefcase, color: 'text-[#EF4444]' },
    { name: 'Average Lead Score', value: `${avgLeadScore}/100`, icon: Star, color: 'text-yellow-500' },
    { name: 'Average Sales Readiness', value: `${avgSalesReadiness}/100`, icon: Gauge, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
        <p className="text-[#A1A1AA] mt-2 text-sm">Real-time status overview of Scrape World business discovery and pipeline analytics.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className="p-6 bg-[#111113] border border-[#27272A] rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#A1A1AA]">{card.name}</p>
                <p className="text-2xl font-bold mt-2 text-[#FAFAFA] font-mono">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-[#1b1b1f] ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Columns: Recent Searches & Top 10 Leads */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Searches */}
        <div className="xl:col-span-1 p-6 bg-[#111113] border border-[#27272A] rounded-lg flex flex-col">
          <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
            <span>Recent Searches</span>
            <Link href="/discovery" className="text-xs text-[#2563EB] hover:underline flex items-center gap-1">
              Start Search <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </h2>
          <div className="flex-1 overflow-x-auto">
            {recentSearches.length === 0 ? (
              <p className="text-sm text-[#A1A1AA] py-4">No search runs found.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#27272A] text-[#A1A1AA] font-medium">
                    <th className="pb-2">Keyword</th>
                    <th className="pb-2">Location</th>
                    <th className="pb-2 text-right">Count</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1b1e]">
                  {recentSearches.map((run) => (
                    <tr key={run.id} className="text-[#FAFAFA]">
                      <td className="py-2.5 font-medium max-w-[100px] truncate">{run.keyword}</td>
                      <td className="py-2.5 max-w-[80px] truncate">{run.location}</td>
                      <td className="py-2.5 text-right font-mono">{run.totalFound ?? 0}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          run.status === 'COMPLETED' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                          run.status === 'RUNNING' ? 'bg-[#2563EB]/15 text-[#2563EB]' :
                          run.status === 'FAILED' ? 'bg-[#EF4444]/15 text-[#EF4444]' :
                          'bg-[#F59E0B]/15 text-[#F59E0B]'
                        }`}>
                          {run.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top 10 Leads */}
        <div className="xl:col-span-2 p-6 bg-[#111113] border border-[#27272A] rounded-lg">
          <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
            <span>Top 10 High-Priority Leads</span>
            <Link href="/leads" className="text-xs text-[#2563EB] hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </h2>
          <div className="overflow-x-auto">
            {topLeads.length === 0 ? (
              <p className="text-sm text-[#A1A1AA] py-4">No lead intelligence records computed yet.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#27272A] text-[#A1A1AA] font-medium">
                    <th className="pb-2">Business Name</th>
                    <th className="pb-2 text-center">Score</th>
                    <th className="pb-2 text-center">Tier</th>
                    <th className="pb-2 text-center">Size</th>
                    <th className="pb-2 text-center">ATP</th>
                    <th className="pb-2 text-center">Reachability</th>
                    <th className="pb-2 text-center">Closing Prob</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1b1e]">
                  {topLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#1b1b1f]/50">
                      <td className="py-3 font-semibold text-[#FAFAFA]">{lead.business.name}</td>
                      <td className="py-3 text-center font-mono font-bold text-[#FAFAFA]">{lead.leadScore}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          lead.leadTier === 'A+' ? 'bg-yellow-500/15 text-yellow-500' :
                          lead.leadTier === 'A' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                          lead.leadTier.startsWith('B') ? 'bg-[#2563EB]/15 text-[#2563EB]' :
                          'bg-[#A1A1AA]/15 text-[#A1A1AA]'
                        }`}>
                          {lead.leadTier}
                        </span>
                      </td>
                      <td className="py-3 text-center text-[10px] font-bold text-[#FAFAFA]">{lead.businessSize || 'N/A'}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${lead.abilityToPay === 'High' ? 'bg-[#22C55E]/15 text-[#22C55E]' : lead.abilityToPay === 'Medium' ? 'bg-yellow-500/15 text-yellow-500' : 'bg-[#EF4444]/15 text-[#EF4444]'}`}>
                          {lead.abilityToPay || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 text-center font-mono text-[#FAFAFA]">{lead.reachabilityScore ?? 'N/A'}/100</td>
                      <td className="py-3 text-center font-mono text-[#FAFAFA]">{lead.closingProbability ?? 'N/A'}%</td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/business/${lead.businessId}`}
                          className="px-2.5 py-1 bg-[#2563EB] hover:bg-[#2563EB]/80 text-[#FAFAFA] font-medium rounded text-[11px] transition-colors"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
