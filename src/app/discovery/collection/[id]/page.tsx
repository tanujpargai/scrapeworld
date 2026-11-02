'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Download,
  Folder,
  MapPin,
  Loader2,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Percent,
  Users,
  CheckCircle,
  Briefcase,
  Search,
  Filter,
  Star,
  Activity,
  AlertTriangle,
  Target,
  CheckCircle2,
  XCircle,
  X,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { ICPLeadResult } from '@/types/icp';
import { ExplanationService, FormattedICPExplanation } from '@/services/icp/ExplanationService';

interface Business {
  id: string;
  name: string;
  website: string | null;
  verifiedWebsite: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  industry: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  leadIntelligence?: {
    leadScore: number;
    leadTier: string;
    salesReadinessScore: number | null;
    salesReadinessTier: string | null;
    reachabilityScore: number | null;
    contactabilityTier: string | null;
    opportunityScore?: number | null;
  } | null;
  socialProfiles: Array<{ platform: string; url: string }>;
  opportunities: Array<{ serviceType: string }>;
  segments?: string[];
  icpEvaluation?: ICPLeadResult | null;
  icpScore?: number;
  icpPriority?: 'HIGH' | 'MEDIUM' | 'LOW';
  icpMatched?: boolean;
}

interface CollectionDetails {
  id: string;
  keyword: string;
  location: string;
  status: string;
  targetCount: number;
  totalFound: number;
  totalProcessed: number;
  createdAt: string;
  currentKeyword: string | null;
  currentLocation: string | null;
  businessesFailed: number;
  businessesAudited: number;
  stats: any;
  leadCount: number;
  reachableLeads: number;
  verifiedWebsites: number;
  ownersFound: number;
  socialProfilesFound: number;
  avgLeadScore: number;
  avgSalesReadiness: number;
  opportunitiesCount: number;
  completionPercent: number;
  estimatedAvailable: number;
  saturationStatus: string;
  businesses: Business[];
  keywords?: string[];
  locations?: string[];
  icpSummary?: {
    id: string;
    name: string;
    targetService: string;
    qualifiedCount: number;
    rejectedCount: number;
    matchRate: number;
    totalEvaluated: number;
  } | null;
  segments?: Array<{
    segmentId: string;
    name: string;
    leadCount: number;
    avgReachability: number;
    avgAbilityToPay: string;
    avgClosingProbability: number;
    avgOpportunityScore: number;
    recommendedOffer: string;
  }>;
}

export default function CollectionDashboardPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const collectionId = params.id;

  const [collection, setCollection] = useState<CollectionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Table filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [readinessFilter, setReadinessFilter] = useState('');
  const [contactabilityFilter, setContactabilityFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [icpStatusFilter, setIcpStatusFilter] = useState<'ALL' | 'QUALIFIED' | 'REJECTED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [sortBy, setSortBy] = useState<
    'highest_score' | 'lowest_score' | 'highest_priority' | 'lowest_priority' | 'review_count' | 'rating' | 'name'
  >('highest_score');
  const [serviceFilter, setServiceFilter] = useState('');
  const [expandedWhyLeadIds, setExpandedWhyLeadIds] = useState<Set<string>>(new Set());
  const [auditLead, setAuditLead] = useState<Business | null>(null);

  const toggleWhyLead = (businessId: string) => {
    setExpandedWhyLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(businessId)) next.delete(businessId);
      else next.add(businessId);
      return next;
    });
  };

  // Row action status
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  const fetchCollectionDetails = async () => {
    try {
      const res = await fetch(`/api/discovery/status/${collectionId}`);
      if (res.ok) {
        const data = await res.json();
        setCollection(data.job || null);
      } else {
        setError('Collection not found');
      }
    } catch (e: any) {
      setError('Error loading collection details: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectionDetails();

    // Auto refresh progress
    const interval = setInterval(() => {
      fetchCollectionDetails();
    }, 5000);

    return () => clearInterval(interval);
  }, [collectionId]);

  // Run audit trigger
  const handleRunAudit = async (businessId: string) => {
    setActioningId(businessId);
    setActionMessage('');
    try {
      const res = await fetch(`/api/audit/${businessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'FAST' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage('FAST website audit queued successfully!');
        fetchCollectionDetails();
      } else {
        setActionMessage(data.error || 'Failed to trigger audit.');
      }
    } catch (err: any) {
      setActionMessage('Error: ' + err.message);
    } finally {
      setActioningId(null);
      setTimeout(() => setActionMessage(''), 5000);
    }
  };

  // Create Deal trigger
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
        setActionMessage(`Deal created! Title: ${data.deal.title}`);
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

  if (loading && !collection) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="w-12 h-12 animate-spin text-[#2563EB]" />
        <p className="text-[#A1A1AA] mt-4 text-sm font-semibold">Loading collection dashboard...</p>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="p-8 text-center bg-[#111113] border border-[#27272A] rounded-lg max-w-lg mx-auto mt-20">
        <AlertTriangle className="w-12 h-12 text-[#EF4444] mx-auto mb-4" />
        <h2 className="text-lg font-bold text-[#FAFAFA]">Access Error</h2>
        <p className="text-xs text-[#A1A1AA] mt-2 mb-6">{error || 'Collection not found'}</p>
        <Link
          href="/discovery"
          className="px-4 py-2 bg-[#2563EB] hover:bg-[#2563EB]/80 text-[#FAFAFA] rounded text-xs font-bold transition-colors"
        >
          Back to Collections
        </Link>
      </div>
    );
  }

  // Filter leads client-side
  let filteredBusinesses = collection.businesses?.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.industry && b.industry.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.city && b.city.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTier = !tierFilter || b.leadIntelligence?.leadTier === tierFilter;
    const matchesReadiness =
      !readinessFilter || b.leadIntelligence?.salesReadinessTier === readinessFilter;
    const matchesContactability =
      !contactabilityFilter || b.leadIntelligence?.contactabilityTier === contactabilityFilter;
    const matchesSegment = !segmentFilter || b.segments?.includes(segmentFilter);

    // ICP Match Status Filter
    const matchesIcp =
      icpStatusFilter === 'ALL' ||
      (icpStatusFilter === 'QUALIFIED' && b.icpMatched !== false) ||
      (icpStatusFilter === 'REJECTED' && b.icpMatched === false);

    // ICP Priority Filter
    const leadPriority = b.icpPriority || b.icpEvaluation?.priority;
    const matchesPriority =
      priorityFilter === 'ALL' || leadPriority === priorityFilter;

    // Service Opportunity Filter
    const matchesService =
      !serviceFilter ||
      b.opportunities?.some((o) => o.serviceType === serviceFilter) ||
      (collection.icpSummary?.targetService && collection.icpSummary.targetService.includes(serviceFilter)) ||
      (b.icpEvaluation?.icpName && b.icpEvaluation.icpName.toLowerCase().includes(serviceFilter.toLowerCase()));

    return (
      matchesSearch &&
      matchesTier &&
      matchesReadiness &&
      matchesContactability &&
      matchesSegment &&
      matchesIcp &&
      matchesPriority &&
      matchesService
    );
  }) || [];

  // Sort leads client-side
  filteredBusinesses.sort((a, b) => {
    const scoreA = a.icpScore ?? a.icpEvaluation?.score ?? a.leadIntelligence?.opportunityScore ?? 0;
    const scoreB = b.icpScore ?? b.icpEvaluation?.score ?? b.leadIntelligence?.opportunityScore ?? 0;

    const priorityWeights: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const prioA = priorityWeights[(a.icpPriority || a.icpEvaluation?.priority || 'LOW')] || 0;
    const prioB = priorityWeights[(b.icpPriority || b.icpEvaluation?.priority || 'LOW')] || 0;

    switch (sortBy) {
      case 'lowest_score':
        return scoreA - scoreB;
      case 'highest_priority':
        if (prioB !== prioA) return prioB - prioA;
        return scoreB - scoreA;
      case 'lowest_priority':
        if (prioA !== prioB) return prioA - prioB;
        return scoreA - scoreB;
      case 'review_count':
        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      case 'rating':
        return (b.rating ?? 0) - (a.rating ?? 0);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'highest_score':
      default:
        if (collection.icpSummary && a.icpMatched !== b.icpMatched) {
          return a.icpMatched ? -1 : 1;
        }
        return scoreB - scoreA;
    }
  });

  const completionPercent = collection.completionPercent ?? 0;
  const statusColors =
    collection.status === 'COMPLETED'
      ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30'
      : collection.status === 'RUNNING'
      ? 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 animate-pulse'
      : collection.status === 'SATURATED'
      ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
      : 'bg-[#A1A1AA]/10 text-[#A1A1AA] border-[#A1A1AA]/20';

  const hasIntel = collection.leadCount > 0;

  return (
    <div className="space-y-8">
      {/* Back navigation & Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/discovery"
          className="text-xs text-[#A1A1AA] hover:text-[#FAFAFA] flex items-center gap-1.5 self-start"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Collections
        </Link>

        <div className="flex items-center gap-2">
          <a
            href={`/api/discovery/export?collectionId=${collection.id}&format=csv`}
            download
            className="px-3.5 py-1.5 bg-[#27272A] hover:bg-[#27272A]/80 text-[#FAFAFA] rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </a>
          <a
            href={`/api/discovery/export?collectionId=${collection.id}&format=json`}
            download
            className="px-3.5 py-1.5 bg-[#111113] hover:bg-[#27272A] border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] rounded-md text-xs transition-colors"
          >
            Export JSON
          </a>
        </div>
      </div>

      {/* Collection Title Panel */}
      <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] flex items-center gap-2">
              <Folder className="w-6 h-6 text-[#2563EB]" />
              <span>
                {collection.keywords && collection.keywords.length > 0
                  ? collection.keywords.join(', ')
                  : collection.keyword}
              </span>
            </h1>
            <p className="text-xs text-[#A1A1AA] flex items-center gap-1.5 mt-2">
              <MapPin className="w-3.5 h-3.5 text-[#A1A1AA]" />
              <span>
                {collection.locations && collection.locations.length > 0
                  ? collection.locations.join(', ')
                  : collection.location}
              </span>
              <span>•</span>
              <span>Created {new Date(collection.createdAt).toLocaleDateString()}</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${statusColors}`}>
              {collection.status}
            </span>
            {collection.status === 'RUNNING' && (
              <p className="text-[10px] text-[#2563EB] animate-pulse">Scraper job is running in background...</p>
            )}
          </div>
        </div>

        {/* Goal completion display */}
        <div className="mt-6 p-4 bg-[#09090B] border border-[#27272A] rounded-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#A1A1AA]">Campaign Lead Extraction Progress:</span>
                <span className="font-mono text-[#FAFAFA]">
                  {collection.leadCount} / {collection.targetCount} Leads
                </span>
              </div>
              <div className="w-full bg-[#27272A] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 md:border-l md:border-[#27272A] md:pl-6 text-[11px] text-[#A1A1AA]">
              <div>
                <p className="font-bold">Completion</p>
                <p className="font-mono font-bold text-sm text-[#FAFAFA] mt-0.5">
                  {completionPercent}%
                </p>
              </div>
              <div>
                <p className="font-bold">Target Leads</p>
                <p className="font-mono font-bold text-sm text-[#FAFAFA] mt-0.5">
                  {collection.targetCount}
                </p>
              </div>
              <div>
                <p className="font-bold">Est. Available</p>
                <p className="font-mono font-bold text-sm text-[#FAFAFA] mt-0.5">
                  {collection.estimatedAvailable}
                </p>
              </div>
              <div>
                <p className="font-bold">Saturation Status</p>
                <p className="font-mono font-semibold text-xs text-[#F59E0B] mt-0.5">
                  {collection.saturationStatus}
                </p>
              </div>
            </div>
          </div>

          {collection.status === 'RUNNING' && (
            <div className="mt-4 pt-3 border-t border-[#1b1b1f] text-xs text-[#A1A1AA] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                <span>
                  Currently scraping: <strong className="text-[#FAFAFA]">"{collection.currentKeyword}"</strong> in{' '}
                  <strong className="text-[#FAFAFA]">"{collection.currentLocation}"</strong>
                </span>
              </div>
              <div className="font-mono text-[10px] space-x-3">
                <span>Processed: {collection.totalProcessed}</span>
                <span>•</span>
                <span>Audited: {collection.businessesAudited}</span>
                <span>•</span>
                <span>Failed: {collection.businessesFailed}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ICP Qualification Campaign Summary */}
      {collection.icpSummary && (
        <div className="p-6 bg-[#111113] border border-[#2563EB]/40 rounded-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-[#2563EB]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#2563EB]/20 text-[#60A5FA] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-[#2563EB]/40">
                  <Target className="w-3 h-3" /> Active ICP Filter
                </span>
                <span className="text-xs text-[#A1A1AA] font-mono">Service: {collection.icpSummary.targetService}</span>
              </div>
              <h2 className="text-xl font-bold text-[#FAFAFA] mt-1.5 flex items-center gap-2">
                {collection.icpSummary.name}
              </h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Leads are qualified and ranked based on hard filters, exclusion criteria, and weighted soft scoring signals.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 bg-[#09090B] border border-[#27272A] rounded text-center">
                <p className="text-[10px] text-[#A1A1AA] font-semibold uppercase">Qualified</p>
                <p className="font-mono text-lg font-bold text-[#22C55E] mt-0.5">{collection.icpSummary.qualifiedCount}</p>
              </div>
              <div className="px-3.5 py-2 bg-[#09090B] border border-[#27272A] rounded text-center">
                <p className="text-[10px] text-[#A1A1AA] font-semibold uppercase">Preserved / Rejected</p>
                <p className="font-mono text-lg font-bold text-[#F43F5E] mt-0.5">{collection.icpSummary.rejectedCount}</p>
              </div>
              <div className="px-3.5 py-2 bg-[#09090B] border border-[#27272A] rounded text-center">
                <p className="text-[10px] text-[#A1A1AA] font-semibold uppercase">Match Rate</p>
                <p className="font-mono text-lg font-bold text-[#38BDF8] mt-0.5">{collection.icpSummary.matchRate}%</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#27272A]/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[#A1A1AA]">
              Quick Status Filter:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIcpStatusFilter('ALL')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  icpStatusFilter === 'ALL'
                    ? 'bg-[#27272A] text-[#FAFAFA] border border-[#3F3F46]'
                    : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1B1B1E]'
                }`}
              >
                All Scraped ({collection.businesses?.length || 0})
              </button>
              <button
                onClick={() => setIcpStatusFilter('QUALIFIED')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  icpStatusFilter === 'QUALIFIED'
                    ? 'bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/40'
                    : 'text-[#A1A1AA] hover:text-[#4ADE80] hover:bg-[#1B1B1E]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Qualified ({collection.icpSummary.qualifiedCount})
              </button>
              <button
                onClick={() => setIcpStatusFilter('REJECTED')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  icpStatusFilter === 'REJECTED'
                    ? 'bg-[#F43F5E]/20 text-[#FB7185] border border-[#F43F5E]/40'
                    : 'text-[#A1A1AA] hover:text-[#FB7185] hover:bg-[#1B1B1E]'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Preserved / Rejected ({collection.icpSummary.rejectedCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Quality Analytics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="p-4 bg-[#111113] border border-[#27272A] rounded-lg text-center">
          <p className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">Reachable Leads</p>
          <p className="font-mono text-xl font-bold text-[#22C55E] mt-1">{collection.reachableLeads}</p>
        </div>
        <div className="p-4 bg-[#111113] border border-[#27272A] rounded-lg text-center">
          <p className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">Verified Websites</p>
          <p className="font-mono text-xl font-bold text-[#FAFAFA] mt-1">{collection.verifiedWebsites}</p>
        </div>
        <div className="p-4 bg-[#111113] border border-[#27272A] rounded-lg text-center">
          <p className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">Owners Found</p>
          <p className="font-mono text-xl font-bold text-[#FAFAFA] mt-1">{collection.ownersFound}</p>
        </div>
        <div className="p-4 bg-[#111113] border border-[#27272A] rounded-lg text-center">
          <p className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">Social profiles</p>
          <p className="font-mono text-xl font-bold text-[#FAFAFA] mt-1">{collection.socialProfilesFound}</p>
        </div>
        <div className="p-4 bg-[#111113] border border-[#27272A] rounded-lg text-center">
          <p className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">Avg Lead Score</p>
          <p className="font-mono text-xl font-bold text-[#2563EB] mt-1">
            {hasIntel ? `${collection.avgLeadScore} pts` : '—'}
          </p>
        </div>
        <div className="p-4 bg-[#111113] border border-[#27272A] rounded-lg text-center">
          <p className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-wider">Avg Sales Readiness</p>
          <p className="font-mono text-xl font-bold text-[#F59E0B] mt-1">
            {hasIntel ? `${collection.avgSalesReadiness}%` : '—'}
          </p>
        </div>
      </div>

      {/* Opportunity Segments Panel */}
      {collection.segments && collection.segments.length > 0 && (
        <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#FAFAFA]">Opportunity Segments</h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Auto-generated sales opportunities based on data intelligence.
              </p>
            </div>
            {segmentFilter && (
              <button 
                onClick={() => setSegmentFilter('')}
                className="text-xs text-[#EF4444] hover:underline"
              >
                Clear Segment Filter
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {collection.segments.map(seg => (
              <div 
                key={seg.segmentId} 
                onClick={() => setSegmentFilter(seg.segmentId)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${segmentFilter === seg.segmentId ? 'bg-[#2563EB]/10 border-[#2563EB]' : 'bg-[#09090B] border-[#27272A] hover:border-[#3F3F46]'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-[#FAFAFA] text-sm max-w-[80%]">{seg.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#27272A] text-[#FAFAFA] text-[10px] font-mono">
                    {seg.leadCount}
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Opp Score:</span>
                    <span className="font-mono font-bold text-[#2563EB]">{seg.avgOpportunityScore || 0}/100</span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Reachability:</span>
                    <span className="font-mono text-[#FAFAFA]">{seg.avgReachability}/100</span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Closing Prob:</span>
                    <span className="font-mono text-[#FAFAFA]">{seg.avgClosingProbability}%</span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Ability to Pay:</span>
                    <span className={`font-mono font-bold ${seg.avgAbilityToPay === 'HIGH' ? 'text-[#22C55E]' : seg.avgAbilityToPay === 'MEDIUM' ? 'text-yellow-500' : 'text-[#EF4444]'}`}>{seg.avgAbilityToPay}</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-[#27272A]">
                  <p className="text-[10px] text-[#A1A1AA] font-semibold uppercase">Recommend Pitch:</p>
                  <p className="text-xs text-[#FAFAFA] font-bold mt-0.5 truncate">{seg.recommendedOffer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directory Section */}
      <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#FAFAFA]">Collection Leads Directory</h2>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Showing {filteredBusinesses.length} of {collection.businesses?.length || 0} leads extracted in this collection
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#A1A1AA]" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#09090B] border border-[#27272A] rounded px-3 py-1.5 pl-8 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB] w-40"
              />
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#09090B] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
              title="Sort Leads"
            >
              <option value="highest_score">Sort: Highest Score</option>
              <option value="lowest_score">Sort: Lowest Score</option>
              <option value="highest_priority">Sort: High Priority First</option>
              <option value="lowest_priority">Sort: Low Priority First</option>
              <option value="review_count">Sort: Review Count</option>
              <option value="rating">Sort: Star Rating</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-[#09090B] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
              title="Filter by Priority"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>

            {/* ICP Status Filter */}
            {collection.icpSummary && (
              <select
                value={icpStatusFilter}
                onChange={(e) => setIcpStatusFilter(e.target.value as any)}
                className="bg-[#09090B] border border-[#2563EB]/40 rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
                title="Filter by ICP Qualification"
              >
                <option value="ALL">All ICP Statuses ({collection.businesses?.length || 0})</option>
                <option value="QUALIFIED">Qualified Matches ({collection.icpSummary.qualifiedCount})</option>
                <option value="REJECTED">Preserved / Disqualified ({collection.icpSummary.rejectedCount})</option>
              </select>
            )}

            {/* Service Opportunity Filter */}
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="bg-[#09090B] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
              title="Filter by Target Service"
            >
              <option value="">All Services</option>
              <option value="WEBSITE">Website Redesign</option>
              <option value="SEO">Local SEO</option>
              <option value="MARKETING">Digital Marketing</option>
              <option value="AUTOMATION">Automation & CRM</option>
            </select>

            {/* Tier Filter */}
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-[#09090B] border border-[#27272A] rounded px-2 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
              title="Filter by Intelligence Tier"
            >
              <option value="">All Tiers</option>
              <option value="A+">Tier A+</option>
              <option value="A">Tier A</option>
              <option value="B+">Tier B+</option>
              <option value="B">Tier B</option>
              <option value="C">Tier C</option>
            </select>

            {/* Readiness Filter */}
            <select
              value={readinessFilter}
              onChange={(e) => setReadinessFilter(e.target.value)}
              className="bg-[#09090B] border border-[#27272A] rounded px-2 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
              title="Filter by Sales Readiness"
            >
              <option value="">All Readiness</option>
              <option value="A+">Readiness A+</option>
              <option value="A">Readiness A</option>
              <option value="B">Readiness B</option>
              <option value="C">Readiness C</option>
              <option value="D">Readiness D</option>
            </select>
          </div>
        </div>

        {actionMessage && (
          <div className="mb-4 p-3 bg-[#2563EB]/15 border border-[#2563EB]/35 text-[#FAFAFA] rounded text-xs">
            {actionMessage}
          </div>
        )}

        <div className="overflow-x-auto">
          {filteredBusinesses.length === 0 ? (
            <p className="text-sm text-[#A1A1AA] py-8 text-center border-t border-[#27272A]">
              No leads match the selected filters.
            </p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#27272A] text-[#A1A1AA] font-bold">
                  <th className="pb-3">Business Name</th>
                  {collection.icpSummary && (
                    <>
                      <th className="pb-3 text-center">ICP Match</th>
                      <th className="pb-3 text-center">ICP Score</th>
                    </>
                  )}
                  <th className="pb-3 text-center">Why this lead?</th>
                  <th className="pb-3 text-center">Rating</th>
                  <th className="pb-3 text-center">Reviews</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Website</th>
                  <th className="pb-3 text-center">Lead Score</th>
                  <th className="pb-3 text-center">Sales Readiness</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1b1e]">
                {filteredBusinesses.map((biz) => {
                  const hasIntel = !!biz.leadIntelligence;
                  const leadScore = biz.leadIntelligence?.leadScore ?? '—';
                  const leadTier = biz.leadIntelligence?.leadTier ?? '';
                  const readiness =
                    biz.leadIntelligence?.salesReadinessScore !== null &&
                    biz.leadIntelligence?.salesReadinessScore !== undefined
                      ? `${biz.leadIntelligence.salesReadinessScore}/100`
                      : '—';
                  const isActioning = actioningId === biz.id;
                  const isExpanded = expandedWhyLeadIds.has(biz.id);

                  return (
                    <React.Fragment key={biz.id}>
                      <tr className="hover:bg-[#1b1b1f]/50">
                        <td className="py-3.5">
                          <div className="font-bold text-[#FAFAFA]">{biz.name}</div>
                          <div className="text-[10px] text-[#A1A1AA] mt-0.5">
                            {biz.industry || 'Unknown'} • {biz.city || 'Delhi'}
                          </div>
                        </td>

                        {/* ICP Status and Score if ICP enabled */}
                        {collection.icpSummary && (
                          <>
                            <td className="py-3.5 text-center">
                              {biz.icpEvaluation ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                    biz.icpMatched
                                      ? 'bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30'
                                      : 'bg-[#F43F5E]/15 text-[#FB7185] border border-[#F43F5E]/30'
                                  }`}
                                >
                                  {biz.icpMatched ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" /> MATCH
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3" /> REJECTED
                                    </>
                                  )}
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#A1A1AA] font-mono">—</span>
                              )}
                            </td>
                            <td className="py-3.5 text-center">
                              {biz.icpEvaluation ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span className="font-mono font-bold text-[#FAFAFA] text-xs">
                                    {biz.icpScore ?? biz.icpEvaluation.score}/100
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold uppercase tracking-wider ${
                                      (biz.icpPriority || biz.icpEvaluation.priority) === 'HIGH'
                                        ? 'text-[#22C55E]'
                                        : (biz.icpPriority || biz.icpEvaluation.priority) === 'MEDIUM'
                                        ? 'text-[#F59E0B]'
                                        : 'text-[#A1A1AA]'
                                    }`}
                                  >
                                    {biz.icpPriority || biz.icpEvaluation.priority}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-[#A1A1AA] font-mono">—</span>
                              )}
                            </td>
                          </>
                        )}

                        {/* Expandable Why This Lead Trigger */}
                        <td className="py-3.5 text-center">
                          <button
                            onClick={() => toggleWhyLead(biz.id)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all inline-flex items-center gap-1.5 border shadow-sm ${
                              isExpanded
                                ? 'bg-[#2563EB] text-[#FAFAFA] border-[#2563EB] shadow-blue-500/20'
                                : 'bg-[#18181B] hover:bg-[#27272A] text-[#60A5FA] border-[#27272A] hover:border-[#3F3F46]'
                            }`}
                            title="Expand explainable sales qualification signals"
                          >
                            <Sparkles className="w-3 h-3 text-[#38BDF8]" />
                            <span>Why this lead?</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>

                        <td className="py-3.5 text-center font-mono font-semibold text-[#FAFAFA]">
                          {biz.rating !== null ? `${biz.rating} ★` : '—'}
                        </td>
                        <td className="py-3.5 text-center font-mono text-[#FAFAFA]">
                          {biz.reviewCount !== null ? biz.reviewCount : '—'}
                        </td>
                        <td className="py-3.5 font-mono text-[#A1A1AA]">{biz.phone || '—'}</td>
                        <td className="py-3.5 max-w-[120px] truncate text-[#A1A1AA]">
                          {biz.website ? (
                            <a
                              href={biz.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline hover:text-[#2563EB] flex items-center gap-1"
                            >
                              Visit <ExternalLink className="w-3 h-3 inline shrink-0" />
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3.5 text-center">
                          {hasIntel ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-mono font-bold text-[#FAFAFA]">{leadScore}</span>
                              <span className="px-1.5 py-0.5 rounded bg-[#2563EB]/15 text-[#2563EB] text-[9px] font-bold">
                                {leadTier}
                              </span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3.5 text-center">
                          {hasIntel ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                biz.leadIntelligence?.salesReadinessScore &&
                                biz.leadIntelligence.salesReadinessScore >= 80
                                  ? 'bg-[#22C55E]/15 text-[#22C55E]'
                                  : biz.leadIntelligence?.salesReadinessScore &&
                                    biz.leadIntelligence.salesReadinessScore >= 60
                                  ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                                  : 'bg-[#EF4444]/15 text-[#EF4444]'
                              }`}
                            >
                              {readiness}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3.5 text-right space-x-1.5 shrink-0">
                          {biz.icpEvaluation && (
                            <button
                              onClick={() => setAuditLead(biz)}
                              className="px-2 py-1 bg-[#2563EB]/20 hover:bg-[#2563EB]/30 text-[#60A5FA] border border-[#2563EB]/40 font-semibold rounded text-[11px] transition-colors inline-flex items-center gap-1"
                              title="View complete ICP Qualification Audit"
                            >
                              <Target className="w-3.5 h-3.5" /> ICP Audit
                            </button>
                          )}
                          <Link
                            href={`/business/${biz.id}`}
                            className="px-2 py-1 bg-[#27272A] hover:bg-[#27272A]/80 text-[#FAFAFA] rounded font-medium text-[11px] transition-colors"
                          >
                            Open
                          </Link>
                          <button
                            onClick={() => handleRunAudit(biz.id)}
                            disabled={isActioning || !biz.website}
                            className="px-2 py-1 bg-[#F59E0B] hover:bg-[#F59E0B]/80 disabled:bg-[#F59E0B]/30 disabled:text-[#A1A1AA] text-black font-semibold rounded text-[11px] transition-colors inline-flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Audit
                          </button>
                          <button
                            onClick={() => handleCreateDeal(biz.id)}
                            disabled={isActioning}
                            className="px-2 py-1 bg-[#22C55E] hover:bg-[#22C55E]/80 disabled:bg-[#22C55E]/30 text-black font-semibold rounded text-[11px] transition-colors inline-flex items-center gap-1"
                          >
                            <Briefcase className="w-3.5 h-3.5" /> Deal
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Why This Lead Section */}
                      {isExpanded && (() => {
                        const exp = biz.icpEvaluation
                          ? ExplanationService.generateExplanation(biz.icpEvaluation, biz)
                          : null;
                        const scoreVal =
                          biz.icpScore ?? biz.icpEvaluation?.score ?? biz.leadIntelligence?.opportunityScore ?? 0;
                        const prioVal = biz.icpPriority || biz.icpEvaluation?.priority || 'LOW';
                        const targetServ =
                          collection.icpSummary?.targetService || biz.icpEvaluation?.icpName || 'Website & Marketing';

                        return (
                          <tr key={`${biz.id}-why-row`} className="bg-[#101014] border-b border-[#27272A]">
                            <td colSpan={collection.icpSummary ? 12 : 10} className="p-4 pl-6">
                              <div className="bg-[#09090B] border border-[#27272A] rounded-xl p-5 space-y-4 shadow-xl">
                                {/* Header bar */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#27272A]/80 pb-3">
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#FAFAFA] flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" /> Why this lead?
                                    </span>
                                    <span className="font-mono text-xs font-black text-[#FAFAFA] bg-[#27272A] px-2 py-0.5 rounded">
                                      ICP Match: {scoreVal}/100
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                        prioVal === 'HIGH'
                                          ? 'bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30'
                                          : prioVal === 'MEDIUM'
                                          ? 'bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30'
                                          : 'bg-[#71717A]/15 text-[#A1A1AA] border border-[#71717A]/30'
                                      }`}
                                    >
                                      Priority: {prioVal}
                                    </span>
                                    {biz.icpMatched !== undefined && (
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                          biz.icpMatched
                                            ? 'bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30'
                                            : 'bg-[#F43F5E]/15 text-[#FB7185] border border-[#F43F5E]/30'
                                        }`}
                                      >
                                        {biz.icpMatched ? (
                                          <CheckCircle2 className="w-3 h-3" />
                                        ) : (
                                          <XCircle className="w-3 h-3" />
                                        )}
                                        {biz.icpMatched ? 'QUALIFIED' : 'DISQUALIFIED'}
                                      </span>
                                    )}
                                    {targetServ && (
                                      <span className="px-2 py-0.5 rounded bg-[#2563EB]/10 text-[#60A5FA] border border-[#2563EB]/25 text-[10px] font-semibold">
                                        Opportunity: {targetServ}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <Link
                                      href={`/leads?search=${encodeURIComponent(biz.name)}`}
                                      className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-semibold"
                                    >
                                      Manage Prospect <ExternalLink className="w-3 h-3" />
                                    </Link>
                                    {biz.icpEvaluation && (
                                      <button
                                        onClick={() => setAuditLead(biz)}
                                        className="text-[11px] text-[#60A5FA] hover:text-[#93C5FD] hover:underline flex items-center gap-1 font-semibold"
                                      >
                                        Inspect Complete Rule Audit <ExternalLink className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Signals Breakdown Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                                  {/* Positive Signals */}
                                  <div className="space-y-2 bg-[#111113] p-3.5 rounded-lg border border-[#27272A]">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold text-[#4ADE80] uppercase tracking-wider flex items-center gap-1">
                                        <TrendingUp className="w-3.5 h-3.5" /> Positive Signals ({exp?.positiveSignals.length ?? (biz.icpEvaluation?.positiveSignals.length || 0)})
                                      </span>
                                    </div>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                      {exp && exp.positiveSignals.length > 0 ? (
                                        exp.positiveSignals.map((sig, i) => (
                                          <div
                                            key={i}
                                            className="text-[11px] font-medium text-[#D4D4D8] flex items-start gap-1.5 bg-[#22C55E]/10 p-1.5 rounded border border-[#22C55E]/20"
                                          >
                                            <span className="text-[#4ADE80] font-mono font-bold shrink-0">
                                              +{sig.points}
                                            </span>
                                            <span>{sig.ruleName}</span>
                                          </div>
                                        ))
                                      ) : biz.icpEvaluation?.positiveSignals && biz.icpEvaluation.positiveSignals.length > 0 ? (
                                        biz.icpEvaluation.positiveSignals.map((sig: string, i: number) => (
                                          <div
                                            key={i}
                                            className="text-[11px] font-medium text-[#D4D4D8] flex items-start gap-1.5 bg-[#22C55E]/10 p-1.5 rounded border border-[#22C55E]/20"
                                          >
                                            <span className="text-[#4ADE80] font-mono font-bold shrink-0">
                                              {sig.startsWith('+') ? '' : '+'}
                                              {sig.split(' ')[0]}
                                            </span>
                                            <span>{sig.replace(/^\+\d+\s*/, '')}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-[11px] text-[#71717A] italic">No positive signals awarded.</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Negative Signals */}
                                  <div className="space-y-2 bg-[#111113] p-3.5 rounded-lg border border-[#27272A]">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold text-[#FB7185] uppercase tracking-wider flex items-center gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Negative Signals ({exp?.negativeSignals.length ?? (biz.icpEvaluation?.negativeSignals.length || 0)})
                                      </span>
                                    </div>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                      {exp && exp.negativeSignals.length > 0 ? (
                                        exp.negativeSignals.map((sig, i) => (
                                          <div
                                            key={i}
                                            className="text-[11px] font-medium text-[#D4D4D8] flex items-start gap-1.5 bg-[#F43F5E]/10 p-1.5 rounded border border-[#F43F5E]/20"
                                          >
                                            <span className="text-[#FB7185] font-mono font-bold shrink-0">
                                              -{Math.abs(sig.points)}
                                            </span>
                                            <span>{sig.ruleName}</span>
                                          </div>
                                        ))
                                      ) : biz.icpEvaluation?.negativeSignals && biz.icpEvaluation.negativeSignals.length > 0 ? (
                                        biz.icpEvaluation.negativeSignals.map((sig: string, i: number) => (
                                          <div
                                            key={i}
                                            className="text-[11px] font-medium text-[#D4D4D8] flex items-start gap-1.5 bg-[#F43F5E]/10 p-1.5 rounded border border-[#F43F5E]/20"
                                          >
                                            <span className="text-[#FB7185] font-mono font-bold shrink-0">
                                              {sig.startsWith('-') ? '' : '-'}
                                              {sig.split(' ')[0]}
                                            </span>
                                            <span>{sig.replace(/^-\d+\s*/, '')}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-[11px] text-[#71717A] italic">No negative signals or penalties.</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Hard Filters */}
                                  <div className="space-y-2 bg-[#111113] p-3.5 rounded-lg border border-[#27272A]">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1">
                                        <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Hard Filters ({exp?.hardFilters.length ?? ((biz.icpEvaluation?.passedHardFilters.length || 0) + (biz.icpEvaluation?.failedHardFilters.length || 0))})
                                      </span>
                                    </div>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                      {exp && exp.hardFilters.length > 0 ? (
                                        exp.hardFilters.map((hf, i) => (
                                          <div
                                            key={i}
                                            className={`text-[11px] font-medium flex items-center gap-1.5 p-1.5 rounded border ${
                                              hf.passed
                                                ? 'bg-[#22C55E]/10 text-[#4ADE80] border-[#22C55E]/20'
                                                : 'bg-[#F43F5E]/10 text-[#FB7185] border-[#F43F5E]/20'
                                            }`}
                                          >
                                            <span className="font-bold">{hf.text}</span>
                                          </div>
                                        ))
                                      ) : biz.icpEvaluation ? (
                                        <>
                                          {biz.icpEvaluation.failedHardFilters.map((f: string, i: number) => (
                                            <div
                                              key={`f-${i}`}
                                              className="text-[11px] font-medium flex items-center gap-1.5 p-1.5 rounded border bg-[#F43F5E]/10 text-[#FB7185] border-[#F43F5E]/20"
                                            >
                                              <span className="font-bold">✗ {f}</span>
                                            </div>
                                          ))}
                                          {biz.icpEvaluation.passedHardFilters.map((p: string, i: number) => (
                                            <div
                                              key={`p-${i}`}
                                              className="text-[11px] font-medium flex items-center gap-1.5 p-1.5 rounded border bg-[#22C55E]/10 text-[#4ADE80] border-[#22C55E]/20"
                                            >
                                              <span className="font-bold">✓ {p}</span>
                                            </div>
                                          ))}
                                        </>
                                      ) : (
                                        <p className="text-[11px] text-[#71717A] italic">No mandatory hard filters evaluated.</p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Unknown Signals Banner */}
                                {exp && exp.unknownSignals.length > 0 && (
                                  <div className="bg-[#18181B] p-2.5 rounded-lg border border-[#27272A] flex flex-wrap items-center gap-2 text-[11px]">
                                    <span className="text-[#A1A1AA] font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                                      <Info className="w-3 h-3 text-[#71717A]" /> Unverified / Unknown Signals:
                                    </span>
                                    {exp.unknownSignals.map((u, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 rounded bg-[#27272A] text-[#A1A1AA] border border-[#3F3F46]"
                                        title={u.reason}
                                      >
                                        {u.text}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Executive Summary */}
                                {exp?.summaryText && (
                                  <p className="text-[11px] text-[#A1A1AA] border-t border-[#27272A]/70 pt-2.5 italic">
                                    {exp.summaryText}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ICP Qualification Audit Modal */}
      {auditLead && auditLead.icpEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111113] border border-[#27272A] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#27272A] flex items-start justify-between bg-[#09090B]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#2563EB]/20 text-[#60A5FA] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-[#2563EB]/30">
                    <Target className="w-3 h-3" /> ICP Qualification Audit
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                      auditLead.icpEvaluation.matched
                        ? 'bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30'
                        : 'bg-[#F43F5E]/15 text-[#FB7185] border border-[#F43F5E]/30'
                    }`}
                  >
                    {auditLead.icpEvaluation.matched ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> QUALIFIED
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" /> REJECTED
                      </>
                    )}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#FAFAFA]">{auditLead.name}</h3>
                <p className="text-xs text-[#A1A1AA]">
                  Target ICP: <strong className="text-[#FAFAFA]">{auditLead.icpEvaluation.icpName}</strong> • Evaluated at {new Date(auditLead.icpEvaluation.evaluatedAt).toLocaleTimeString()}
                </p>
              </div>

              <button
                onClick={() => setAuditLead(null)}
                className="p-1.5 text-[#A1A1AA] hover:text-[#FAFAFA] rounded-md hover:bg-[#27272A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Score & Priority Summary */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-[#09090B] border border-[#27272A] rounded-lg">
                <div className="text-center">
                  <p className="text-[10px] text-[#A1A1AA] font-bold uppercase">ICP Score</p>
                  <p className="font-mono text-xl font-bold text-[#FAFAFA] mt-0.5">
                    {auditLead.icpEvaluation.score}/100
                  </p>
                </div>
                <div className="text-center border-x border-[#27272A]">
                  <p className="text-[10px] text-[#A1A1AA] font-bold uppercase">Priority Level</p>
                  <p
                    className={`font-mono text-xl font-bold mt-0.5 ${
                      auditLead.icpEvaluation.priority === 'HIGH'
                        ? 'text-[#22C55E]'
                        : auditLead.icpEvaluation.priority === 'MEDIUM'
                        ? 'text-[#F59E0B]'
                        : 'text-[#A1A1AA]'
                    }`}
                  >
                    {auditLead.icpEvaluation.priority}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-[#A1A1AA] font-bold uppercase">Hard Filters</p>
                  <p
                    className={`font-mono text-xl font-bold mt-0.5 ${
                      auditLead.icpEvaluation.failedHardFilters.length === 0
                        ? 'text-[#22C55E]'
                        : 'text-[#F43F5E]'
                    }`}
                  >
                    {auditLead.icpEvaluation.failedHardFilters.length === 0 ? 'PASSED' : 'FAILED'}
                  </p>
                </div>
              </div>

              {/* Qualification Decision Reasons */}
              <div>
                <h4 className="text-xs font-bold text-[#FAFAFA] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#60A5FA]" /> Qualification Decision Summary
                </h4>
                <div className="space-y-1.5">
                  {auditLead.icpEvaluation.reasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-[#09090B] border border-[#27272A] text-[#D4D4D8] flex items-start gap-2"
                    >
                      <span className="text-[#60A5FA] mt-0.5">•</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hard Filter Results */}
              <div>
                <h4 className="text-xs font-bold text-[#FAFAFA] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Hard Filter Evaluation
                </h4>
                {auditLead.icpEvaluation.failedHardFilters.length > 0 && (
                  <div className="mb-2 space-y-1">
                    <p className="text-[11px] font-semibold text-[#FB7185]">Failed Conditions (Disqualified):</p>
                    {auditLead.icpEvaluation.failedHardFilters.map((fail, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-[#FB7185] flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>{fail}</span>
                      </div>
                    ))}
                  </div>
                )}
                {auditLead.icpEvaluation.passedHardFilters.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-[#4ADE80]">Passed Mandatory Filters:</p>
                    {auditLead.icpEvaluation.passedHardFilters.map((pass, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#4ADE80] flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{pass}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#71717A] italic">No mandatory hard filters evaluated.</p>
                )}
              </div>

              {/* Scoring Signal Points Contribution */}
              <div>
                <h4 className="text-xs font-bold text-[#FAFAFA] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#F59E0B]" /> Soft Scoring Signals & Weight Breakdown
                </h4>
                {auditLead.icpEvaluation.scoreContributions && auditLead.icpEvaluation.scoreContributions.length > 0 ? (
                  <div className="border border-[#27272A] rounded-lg overflow-hidden bg-[#09090B]">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-[#27272A] text-[#71717A] font-semibold bg-[#111113]">
                          <th className="p-2.5">Rule / Signal</th>
                          <th className="p-2.5 text-center">Weight</th>
                          <th className="p-2.5 text-center">Points</th>
                          <th className="p-2.5">Detail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1B1B1E]">
                        {auditLead.icpEvaluation.scoreContributions.map((contrib, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-medium text-[#FAFAFA]">{contrib.ruleName}</td>
                            <td className="p-2.5 text-center font-mono text-[#71717A]">+{contrib.weight}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-[#22C55E]">
                              +{contrib.pointsAwarded}
                            </td>
                            <td className="p-2.5 text-[#A1A1AA]">{contrib.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[#71717A] italic">No soft scoring signals configured or triggered.</p>
                )}
              </div>

              {/* Positive and Negative Signals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-[11px] font-bold text-[#4ADE80] uppercase tracking-wider mb-1.5">
                    Positive Signals ({auditLead.icpEvaluation.positiveSignals.length})
                  </h5>
                  <div className="space-y-1">
                    {auditLead.icpEvaluation.positiveSignals.length > 0 ? (
                      auditLead.icpEvaluation.positiveSignals.map((sig, idx) => (
                        <div key={idx} className="p-1.5 rounded bg-[#22C55E]/10 text-[#4ADE80] text-[11px]">
                          + {sig}
                        </div>
                      ))
                    ) : (
                      <p className="text-[#71717A] italic text-[11px]">None identified.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="text-[11px] font-bold text-[#FB7185] uppercase tracking-wider mb-1.5">
                    Negative Signals ({auditLead.icpEvaluation.negativeSignals.length})
                  </h5>
                  <div className="space-y-1">
                    {auditLead.icpEvaluation.negativeSignals.length > 0 ? (
                      auditLead.icpEvaluation.negativeSignals.map((sig, idx) => (
                        <div key={idx} className="p-1.5 rounded bg-[#F43F5E]/10 text-[#FB7185] text-[11px]">
                          - {sig}
                        </div>
                      ))
                    ) : (
                      <p className="text-[#71717A] italic text-[11px]">None identified.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#27272A] flex justify-end bg-[#09090B]">
              <button
                onClick={() => setAuditLead(null)}
                className="px-4 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded text-xs font-semibold transition-colors"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
