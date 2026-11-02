'use client';

import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Target, Coins, Loader2, Users } from 'lucide-react';

interface SegmentPerformance {
  id: string;
  name: string;
  totalLeads: number;
  contacted: number;
  replies: number;
  replyRate: number;
  meetings: number;
  meetingRate: number;
  proposals: number;
  proposalRate: number;
  clientsWon: number;
  closeRate: number;
  avgOpportunityScore: number;
  avgReachability: number;
  avgAbilityToPay: string;
  avgClosingProbability: number;
}

interface ChannelPerformance {
  channel: string;
  attempts: number;
  replies: number;
  meetings: number;
  wins: number;
  replyRate: number;
  closeRate: number;
}

export default function PerformancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [segmentData, setSegmentData] = useState<SegmentPerformance[]>([]);
  const [channelData, setChannelData] = useState<ChannelPerformance[]>([]);
  const [topSegments, setTopSegments] = useState<any>(null);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const res = await fetch('/api/crm/performance');
        if (!res.ok) throw new Error('Failed to fetch performance data');
        const data = await res.json();
        setSegmentData(data.segmentPerformance);
        setChannelData(data.channelPerformance);
        setTopSegments(data.topSegments);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error loading performance metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
        <p className="text-xs text-[#A1A1AA]">Compiling performance analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 text-red-500 rounded border border-red-500/20">
        {error}
      </div>
    );
  }

  const renderTop5 = (title: string, data: SegmentPerformance[], metricKey: keyof SegmentPerformance, suffix = '%') => (
    <div className="bg-[#111113] border border-[#27272A] rounded-lg p-4">
      <h3 className="text-xs font-bold text-[#FAFAFA] tracking-wider uppercase mb-4">{title}</h3>
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-[#A1A1AA] text-xs">No data yet</p>
        ) : (
          data.map((seg, i) => (
            <div key={seg.id} className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1AA] flex items-center gap-2">
                <span className="text-[#27272A] font-mono">{i + 1}</span> {seg.name}
              </span>
              <span className="text-xs font-bold font-mono text-[#22C55E]">
                {seg[metricKey]}{suffix}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart2 className="w-8 h-8 text-[#2563EB]" />
            <span>Outreach Performance</span>
          </h1>
          <p className="text-[#A1A1AA] mt-1 text-sm">
            Analytics for Segment and Channel conversion rates.
          </p>
        </div>
      </div>

      {/* Top 5 Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderTop5('Top 5 by Reply Rate', topSegments?.byReplyRate || [], 'replyRate')}
        {renderTop5('Top 5 by Meeting Rate', topSegments?.byMeetingRate || [], 'meetingRate')}
        {renderTop5('Top 5 by Close Rate', topSegments?.byCloseRate || [], 'closeRate')}
      </div>

      {/* Segment Performance Table */}
      <div className="bg-[#111113] border border-[#27272A] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#27272A]">
          <h3 className="text-sm font-bold text-[#FAFAFA] flex items-center gap-2">
            <Target className="w-4 h-4 text-[#2563EB]" /> Segment Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase text-[#A1A1AA] bg-[#0c0c0e] border-b border-[#27272A]">
              <tr>
                <th className="px-4 py-3 font-semibold">Segment</th>
                <th className="px-4 py-3 font-semibold text-right">Total Leads</th>
                <th className="px-4 py-3 font-semibold text-right">Contacted</th>
                <th className="px-4 py-3 font-semibold text-right">Replies</th>
                <th className="px-4 py-3 font-semibold text-right text-[#2563EB]">Reply %</th>
                <th className="px-4 py-3 font-semibold text-right">Meetings</th>
                <th className="px-4 py-3 font-semibold text-right text-[#F59E0B]">Meet %</th>
                <th className="px-4 py-3 font-semibold text-right">Proposals</th>
                <th className="px-4 py-3 font-semibold text-right">Wins</th>
                <th className="px-4 py-3 font-semibold text-right text-[#22C55E]">Close %</th>
                <th className="px-4 py-3 font-semibold text-right">Avg Opp Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {segmentData.map(seg => (
                <tr key={seg.id} className="hover:bg-[#18181b] transition-colors">
                  <td className="px-4 py-3 font-medium text-xs">{seg.name}</td>
                  <td className="px-4 py-3 text-right font-mono text-[#A1A1AA]">{seg.totalLeads}</td>
                  <td className="px-4 py-3 text-right font-mono">{seg.contacted}</td>
                  <td className="px-4 py-3 text-right font-mono">{seg.replies}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#2563EB]">{seg.replyRate}%</td>
                  <td className="px-4 py-3 text-right font-mono">{seg.meetings}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#F59E0B]">{seg.meetingRate}%</td>
                  <td className="px-4 py-3 text-right font-mono">{seg.proposals}</td>
                  <td className="px-4 py-3 text-right font-mono">{seg.clientsWon}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#22C55E]">{seg.closeRate}%</td>
                  <td className="px-4 py-3 text-right font-mono text-[#A1A1AA]">{seg.avgOpportunityScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Channel Performance Table */}
      <div className="bg-[#111113] border border-[#27272A] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#27272A]">
          <h3 className="text-sm font-bold text-[#FAFAFA] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#8B5CF6]" /> Channel Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase text-[#A1A1AA] bg-[#0c0c0e] border-b border-[#27272A]">
              <tr>
                <th className="px-4 py-3 font-semibold">Channel</th>
                <th className="px-4 py-3 font-semibold text-right">Attempts</th>
                <th className="px-4 py-3 font-semibold text-right">Replies</th>
                <th className="px-4 py-3 font-semibold text-right text-[#2563EB]">Reply %</th>
                <th className="px-4 py-3 font-semibold text-right">Meetings</th>
                <th className="px-4 py-3 font-semibold text-right">Wins</th>
                <th className="px-4 py-3 font-semibold text-right text-[#22C55E]">Close %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {channelData.map(ch => (
                <tr key={ch.channel} className="hover:bg-[#18181b] transition-colors">
                  <td className="px-4 py-3 font-medium text-xs">{ch.channel}</td>
                  <td className="px-4 py-3 text-right font-mono">{ch.attempts}</td>
                  <td className="px-4 py-3 text-right font-mono">{ch.replies}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#2563EB]">{ch.replyRate}%</td>
                  <td className="px-4 py-3 text-right font-mono">{ch.meetings}</td>
                  <td className="px-4 py-3 text-right font-mono">{ch.wins}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#22C55E]">{ch.closeRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
