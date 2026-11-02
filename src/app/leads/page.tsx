'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileDown,
  RefreshCw,
  Plus,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Target,
  Sparkles,
  ShieldCheck,
  Calendar,
  Clock,
  Filter,
  CheckSquare,
  Square,
  Tag,
} from 'lucide-react';
import type { ManagedLead, LeadStatus, LeadNote } from '@/types/leadManagement';
import { ALL_LEAD_STATUSES } from '@/types/leadManagement';

export default function LeadsPage() {
  // Data state
  const [leads, setLeads] = useState<ManagedLead[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    new: 0,
    qualified: 0,
    contacted: 0,
    replied: 0,
    meeting: 0,
    won: 0,
    lost: 0,
    disqualified: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filters & Sorting state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [icpFilter, setIcpFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [sortField, setSortField] = useState<'icpScore' | 'priority' | 'dateDiscovered' | 'businessName'>('icpScore');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Expandable sections state
  const [expandedNotesIds, setExpandedNotesIds] = useState<Set<string>>(new Set());
  const [expandedIntelIds, setExpandedIntelIds] = useState<Set<string>>(new Set());
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({});
  const [submittingNoteId, setSubmittingNoteId] = useState<string | null>(null);

  // Fetch leads from API
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (icpFilter !== 'ALL') params.append('icp', icpFilter);
      if (serviceFilter !== 'ALL') params.append('service', serviceFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (search) params.append('search', search);
      params.append('sort', sortField);
      params.append('order', sortOrder);

      const res = await fetch(`/api/leads/managed?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to fetch managed leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, icpFilter, serviceFilter, priorityFilter, sortField, sortOrder]);

  // Extract unique ICP names and Services for dropdowns
  const availableIcps = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) {
      if (l.icpName) set.add(l.icpName);
    }
    return Array.from(set);
  }, [leads]);

  const availableServices = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) {
      if (l.targetService) set.add(l.targetService);
    }
    return Array.from(set);
  }, [leads]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  // Status update handler
  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );

      const res = await fetch(`/api/leads/managed/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        // Rollback on error
        fetchLeads();
      } else {
        setActionMessage(`Status updated to ${newStatus}`);
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      fetchLeads();
    }
  };

  // Note addition handler
  const handleAddNote = async (leadId: string) => {
    const content = newNoteText[leadId]?.trim();
    if (!content) return;

    try {
      setSubmittingNoteId(leadId);
      const res = await fetch(`/api/leads/managed/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, author: 'User' }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId ? { ...l, notes: [data.note, ...l.notes] } : l
          )
        );
        setNewNoteText((prev) => ({ ...prev, [leadId]: '' }));
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSubmittingNoteId(null);
    }
  };

  // Sync from evaluations handler
  const handleSyncFromEvaluations = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/leads/managed/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(data.message || 'Leads synchronized from evaluations!');
        setTimeout(() => setActionMessage(null), 4000);
        fetchLeads();
      }
    } catch (err) {
      console.error('Failed to sync leads:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  // Export handlers
  const handleExportSelected = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds).join(',');
    window.open(`/api/leads/managed/export?ids=${encodeURIComponent(ids)}`, '_blank');
  };

  const handleExportQualified = () => {
    window.open('/api/leads/managed/export?qualifiedOnly=true', '_blank');
  };

  // Helper colors for status
  const getStatusBadgeClass = (status: LeadStatus) => {
    switch (status) {
      case 'QUALIFIED':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60';
      case 'MEETING':
        return 'bg-purple-950/60 text-purple-300 border-purple-700/60';
      case 'WON':
        return 'bg-blue-950/60 text-blue-300 border-blue-700/60';
      case 'CONTACTED':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60';
      case 'REPLIED':
        return 'bg-amber-950/60 text-amber-300 border-amber-700/60';
      case 'NEW':
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      case 'DISQUALIFIED':
      case 'LOST':
        return 'bg-rose-950/50 text-rose-300 border-rose-800/50';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-rose-950/60 text-rose-300 border-rose-700/60';
      case 'MEDIUM':
        return 'bg-amber-950/60 text-amber-300 border-amber-700/60';
      case 'LOW':
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090B] p-6 lg:p-8 text-[#FAFAFA] font-sans">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#27272A] gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Agency Lead Management</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[#2563EB]/20 text-[#3B82F6] border border-[#2563EB]/40">
              Phase 7
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            ICP-qualified prospect pipeline with verified opportunity intelligence and lightweight status tracking.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncFromEvaluations}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-[#18181B] hover:bg-zinc-800 border border-[#27272A] text-zinc-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-[#3B82F6]' : ''}`} />
            Sync Evaluations
          </button>

          <button
            onClick={handleExportSelected}
            disabled={selectedIds.size === 0}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              selectedIds.size > 0
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-600 text-zinc-100'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <FileDown className="w-3.5 h-3.5" />
            Export Selected ({selectedIds.size})
          </button>

          <button
            onClick={handleExportQualified}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md bg-[#2563EB] hover:bg-blue-600 border border-blue-500 text-white shadow-sm transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export Qualified
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="mt-4 p-3 rounded-md bg-emerald-950/80 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-6">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
            statusFilter === 'ALL' ? 'bg-[#18181B] border-[#2563EB]' : 'bg-[#111113] border-[#27272A] hover:border-zinc-700'
          }`}
        >
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">Total Leads</div>
          <div className="text-xl font-bold text-zinc-100 mt-1">{metrics.total}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('QUALIFIED')}
          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
            statusFilter === 'QUALIFIED' ? 'bg-[#18181B] border-emerald-500' : 'bg-[#111113] border-[#27272A] hover:border-zinc-700'
          }`}
        >
          <div className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">Qualified</div>
          <div className="text-xl font-bold text-emerald-300 mt-1">{metrics.qualified}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('CONTACTED')}
          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
            statusFilter === 'CONTACTED' ? 'bg-[#18181B] border-cyan-500' : 'bg-[#111113] border-[#27272A] hover:border-zinc-700'
          }`}
        >
          <div className="text-[11px] text-cyan-400 uppercase tracking-wider font-semibold">Contacted</div>
          <div className="text-xl font-bold text-cyan-300 mt-1">{metrics.contacted}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('MEETING')}
          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
            statusFilter === 'MEETING' ? 'bg-[#18181B] border-purple-500' : 'bg-[#111113] border-[#27272A] hover:border-zinc-700'
          }`}
        >
          <div className="text-[11px] text-purple-400 uppercase tracking-wider font-semibold">Meeting</div>
          <div className="text-xl font-bold text-purple-300 mt-1">{metrics.meeting}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('WON')}
          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
            statusFilter === 'WON' ? 'bg-[#18181B] border-blue-500' : 'bg-[#111113] border-[#27272A] hover:border-zinc-700'
          }`}
        >
          <div className="text-[11px] text-blue-400 uppercase tracking-wider font-semibold">Won</div>
          <div className="text-xl font-bold text-blue-300 mt-1">{metrics.won}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('DISQUALIFIED')}
          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
            statusFilter === 'DISQUALIFIED' ? 'bg-[#18181B] border-rose-500' : 'bg-[#111113] border-[#27272A] hover:border-zinc-700'
          }`}
        >
          <div className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold">Disqualified</div>
          <div className="text-xl font-bold text-rose-300 mt-1">{metrics.disqualified}</div>
        </div>
      </div>

      {/* ── TOOLBAR & FILTERS ── */}
      <div className="bg-[#111113] border border-[#27272A] rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search business, city, phone, email, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] text-sm text-zinc-200 pl-9 pr-3 py-1.5 rounded-md focus:outline-none focus:border-[#2563EB]"
            />
          </form>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-[#18181B] border border-[#27272A] text-xs text-zinc-300 px-3 py-2 rounded-md focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Statuses</option>
              {ALL_LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  Status: {s}
                </option>
              ))}
            </select>
          </div>

          {/* Target Service Filter */}
          <div>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] text-xs text-zinc-300 px-3 py-2 rounded-md focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Services</option>
              <option value="WEBSITE">Web Development</option>
              <option value="MARKETING">Digital Marketing</option>
              <option value="SEO">Local SEO</option>
              <option value="AUTOMATION">Automation</option>
              {availableServices
                .filter((s) => !['WEBSITE', 'MARKETING', 'SEO', 'AUTOMATION'].includes(s.toUpperCase()))
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </div>

          {/* ICP Profile Filter */}
          <div>
            <select
              value={icpFilter}
              onChange={(e) => setIcpFilter(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] text-xs text-zinc-300 px-3 py-2 rounded-md focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All ICP Profiles</option>
              {availableIcps.map((icp) => (
                <option key={icp} value={icp}>
                  {icp}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('-');
                setSortField(f as any);
                setSortOrder(o as any);
              }}
              className="w-full bg-[#18181B] border border-[#27272A] text-xs text-zinc-300 px-3 py-2 rounded-md focus:outline-none focus:border-[#2563EB]"
            >
              <option value="icpScore-desc">Highest ICP Score</option>
              <option value="icpScore-asc">Lowest ICP Score</option>
              <option value="priority-desc">High Priority First</option>
              <option value="dateDiscovered-desc">Newest Discovered</option>
              <option value="businessName-asc">Business Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── BATCH SELECTION BAR ── */}
      <div className="flex items-center justify-between px-2 mb-3 text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors"
          >
            {leads.length > 0 && selectedIds.size === leads.length ? (
              <CheckSquare className="w-4 h-4 text-[#3B82F6]" />
            ) : (
              <Square className="w-4 h-4 text-zinc-500" />
            )}
            <span>Select All ({leads.length})</span>
          </button>
          {selectedIds.size > 0 && (
            <span className="text-zinc-300 font-medium">
              {selectedIds.size} prospect{selectedIds.size > 1 ? 's' : ''} selected
            </span>
          )}
        </div>
        <div>
          Showing {leads.length} prospect{leads.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── LEADS LIST ── */}
      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6] mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Loading agency prospects...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="py-20 text-center bg-[#111113] border border-[#27272A] rounded-lg">
          <Target className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-300">No managed leads found</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 mb-4">
            No prospects match your current filter settings. Click &quot;Sync Evaluations&quot; to import qualified leads from completed scraper runs.
          </p>
          <button
            onClick={handleSyncFromEvaluations}
            className="px-4 py-2 text-xs font-medium rounded-md bg-[#2563EB] text-white hover:bg-blue-600"
          >
            Sync Leads from Scraper Evaluations
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => {
            const isSelected = selectedIds.has(lead.id);
            const notesExpanded = expandedNotesIds.has(lead.id);

            return (
              <div
                key={lead.id}
                className={`bg-[#111113] border rounded-lg transition-all ${
                  isSelected ? 'border-[#2563EB]/80 ring-1 ring-[#2563EB]/40' : 'border-[#27272A] hover:border-zinc-700'
                }`}
              >
                {/* ── TOP SUMMARY ROW ── */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Selection + Core Business Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleSelect(lead.id)}
                        className="mt-1 text-zinc-500 hover:text-zinc-300"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#3B82F6]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-zinc-100 truncate">
                            {lead.businessName}
                          </h3>

                          {/* Target Service Badge */}
                          <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {lead.targetService}
                          </span>

                          {/* ICP Profile Tag */}
                          <span className="text-[11px] px-2 py-0.5 rounded text-zinc-400 bg-zinc-900 border border-zinc-800">
                            ICP: {lead.icpName}
                          </span>
                        </div>

                        {/* Location and Discovery Dates */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 mt-1.5">
                          {lead.contact.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                              {lead.contact.city}
                              {lead.contact.state ? `, ${lead.contact.state}` : ''}
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                            Discovered: {new Date(lead.dateDiscovered).toLocaleDateString()}
                          </span>

                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            Evaluated: {new Date(lead.lastEvaluatedDate).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Contact Channels Grid */}
                        <div className="flex flex-wrap items-center gap-3 text-xs mt-3">
                          {lead.contact.phone ? (
                            <a
                              href={`tel:${lead.contact.phone}`}
                              className="flex items-center gap-1 text-zinc-300 hover:text-[#3B82F6] transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{lead.contact.phone}</span>
                            </a>
                          ) : (
                            <span className="text-zinc-500 flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-zinc-600" /> No Phone
                            </span>
                          )}

                          {lead.contact.email ? (
                            <a
                              href={`mailto:${lead.contact.email}`}
                              className="flex items-center gap-1 text-zinc-300 hover:text-[#3B82F6] transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5 text-blue-400" />
                              <span>{lead.contact.email}</span>
                            </a>
                          ) : (
                            <span className="text-zinc-500 flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-zinc-600" /> No Email
                            </span>
                          )}

                          {lead.contact.ownerName && (
                            <span className="flex items-center gap-1 text-zinc-300">
                              <User className="w-3.5 h-3.5 text-purple-400" />
                              <span>Decision Maker: {lead.contact.ownerName}</span>
                            </span>
                          )}

                          {lead.website ? (
                            <a
                              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-zinc-300 hover:text-[#3B82F6] transition-colors"
                            >
                              <Globe className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="truncate max-w-[200px]">{lead.website.replace(/^https?:\/\//, '')}</span>
                              <ExternalLink className="w-3 h-3 text-zinc-500" />
                            </a>
                          ) : (
                            <span className="text-rose-400/80 flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-rose-500" /> No Website
                            </span>
                          )}
                        </div>

                        {/* Social Links */}
                        {lead.socialLinks && lead.socialLinks.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {lead.socialLinks.map((s, idx) => (
                              <a
                                key={idx}
                                href={s.url || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 transition-colors"
                              >
                                {s.platform}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Score, Priority & Status Selector */}
                    <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        {/* Priority Badge */}
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getPriorityBadgeClass(
                            lead.priority
                          )}`}
                        >
                          {lead.priority}
                        </span>

                        {/* ICP Score */}
                        <div className="text-right">
                          <span className="text-lg font-extrabold text-zinc-100">
                            {lead.icpScore}
                          </span>
                          <span className="text-xs text-zinc-500">/100</span>
                        </div>
                      </div>

                      {/* Status Selector Dropdown */}
                      <div className="relative">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-md border appearance-none pr-7 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2563EB] ${getStatusBadgeClass(
                            lead.status
                          )}`}
                        >
                          {ALL_LEAD_STATUSES.map((status) => (
                            <option key={status} value={status} className="bg-[#18181B] text-zinc-200 font-normal">
                              Status: {status}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-2.5 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── DEDICATED OPPORTUNITY SECTION (MANDATED FOR PHASE 7) ── */}
                <div className="border-t border-[#27272A] bg-[#141417] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#3B82F6]" />
                      <span className="text-xs font-extrabold tracking-wider uppercase text-zinc-200">
                        {lead.opportunity.type}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getPriorityBadgeClass(
                          lead.opportunity.priority
                        )}`}
                      >
                        {lead.opportunity.priority} Opportunity
                      </span>
                    </div>

                    <div className="text-xs text-zinc-400">
                      Recommended: <span className="font-semibold text-zinc-200">{lead.opportunity.relevantService}</span>
                    </div>
                  </div>

                  {/* Why this company is a prospect */}
                  <div className="mb-3.5 text-xs text-zinc-300 leading-relaxed bg-[#18181B] p-2.5 rounded border border-[#27272A]">
                    <span className="font-semibold text-[#3B82F6]">Why this company is a prospect: </span>
                    {lead.opportunity.whyProspect}
                  </div>

                  {/* Two-column Reason Breakdown: Qualifying Signals vs Detected Issues */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Qualifying Signals */}
                    <div className="bg-[#111113] p-3 rounded border border-emerald-900/40">
                      <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Qualifying Signals
                      </div>
                      <ul className="space-y-1.5">
                        {lead.opportunity.qualifyingSignals.map((sig, i) => (
                          <li key={i} className="text-zinc-300 flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold shrink-0">•</span>
                            <span>{sig}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Detected Issues */}
                    <div className="bg-[#111113] p-3 rounded border border-rose-900/40">
                      <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Issues Detected
                      </div>
                      <ul className="space-y-1.5">
                        {lead.opportunity.detectedIssues.map((iss, i) => (
                          <li key={i} className="text-zinc-300 flex items-start gap-1.5">
                            <span className="text-rose-400 font-bold shrink-0">•</span>
                            <span>{iss}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* ── PHASE 3 OPPORTUNITY INTELLIGENCE & OUTREACH BRIEF ── */}
                  {((lead.opportunity.opportunities && lead.opportunity.opportunities.length > 0) || lead.opportunity.outreachBrief) && (
                    <div className="mt-3.5 pt-3 border-t border-zinc-800/80">
                      <button
                        onClick={() => {
                          setExpandedIntelIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(lead.id)) next.delete(lead.id);
                            else next.add(lead.id);
                            return next;
                          });
                        }}
                        className="flex items-center gap-1.5 text-xs text-[#3B82F6] hover:text-blue-400 font-semibold transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {expandedIntelIds.has(lead.id) ? 'Hide' : 'View'} Evidence-Based Opportunities & Outreach Brief ({lead.opportunity.opportunities?.length || 0})
                        </span>
                        {expandedIntelIds.has(lead.id) ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {expandedIntelIds.has(lead.id) && (
                        <div className="mt-3 space-y-3">
                          {/* Granular Opportunities */}
                          {lead.opportunity.opportunities?.map((opp, idx) => (
                            <div key={idx} className="bg-[#18181B] p-3 rounded border border-zinc-800 text-xs">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-zinc-100">{opp.title}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                    opp.division === 'INTEGRAL_LABS' ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/60' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                  }`}>
                                    {opp.division === 'INTEGRAL_LABS' ? 'Integral Labs' : 'Integral Marketing'}
                                  </span>
                                </div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  opp.priority === 'HIGH' ? 'text-amber-400 bg-amber-950/60' : 'text-zinc-400 bg-zinc-800'
                                }`}>
                                  {opp.priority} Priority ({opp.priorityScore}/100)
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-2 text-[11px]">
                                <div className="bg-[#111113] p-2 rounded border border-zinc-800/60">
                                  <span className="font-semibold text-zinc-400 block mb-0.5">1. Observed Fact</span>
                                  <p className="text-zinc-300">{opp.observedFact}</p>
                                </div>
                                <div className="bg-[#111113] p-2 rounded border border-zinc-800/60">
                                  <span className="font-semibold text-zinc-400 block mb-0.5">2. Interpretation</span>
                                  <p className="text-zinc-300">{opp.interpretation}</p>
                                </div>
                                <div className="bg-[#111113] p-2 rounded border border-zinc-800/60">
                                  <span className="font-semibold text-zinc-400 block mb-0.5">3. Recommended Action</span>
                                  <p className="text-zinc-300">{opp.recommendedAction}</p>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Outreach Brief */}
                          {lead.opportunity.outreachBrief && (
                            <div className="bg-[#111113] p-3.5 rounded border border-[#2563EB]/40 text-xs">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-blue-400 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Personalized Outreach Brief (AI-Free Rule Draft)
                                </span>
                                <span className="text-[10px] text-zinc-500">Human review required</span>
                              </div>
                              <p className="text-zinc-300 italic bg-[#18181B] p-2.5 rounded border border-zinc-800 text-[11px] leading-relaxed mb-2">
                                &quot;{lead.opportunity.outreachBrief.suggestedOpeningAngle}&quot;
                              </p>
                              {lead.opportunity.outreachBrief.uncertaintiesToVerify?.length > 0 && (
                                <div className="text-[11px] text-zinc-400 mt-2">
                                  <span className="font-semibold text-amber-400">Pre-Outreach Checklist: </span>
                                  {lead.opportunity.outreachBrief.uncertaintiesToVerify.join(' ')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── NOTES & ACTIVITY SECTION ── */}
                <div className="border-t border-[#27272A] px-4 py-3 bg-[#0d0d0f] flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setExpandedNotesIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(lead.id)) next.delete(lead.id);
                        else next.add(lead.id);
                        return next;
                      });
                    }}
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Agency Notes ({lead.notes?.length || 0})</span>
                    {notesExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                  </button>

                  <div className="text-[11px] text-zinc-500">
                    {lead.notes && lead.notes.length > 0 ? (
                      <span>Last Note: &quot;{lead.notes[0].content.substring(0, 40)}...&quot;</span>
                    ) : (
                      <span>No notes recorded</span>
                    )}
                  </div>
                </div>

                {/* Expanded Notes Drawer */}
                {notesExpanded && (
                  <div className="border-t border-[#27272A] p-4 bg-[#111113] space-y-3">
                    {/* Add Note Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add prospecting note (e.g. called owner, follow up Thursday, sent Loom video)..."
                        value={newNoteText[lead.id] || ''}
                        onChange={(e) =>
                          setNewNoteText((prev) => ({ ...prev, [lead.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddNote(lead.id);
                        }}
                        className="flex-1 bg-[#18181B] border border-[#27272A] text-xs text-zinc-200 px-3 py-2 rounded focus:outline-none focus:border-[#2563EB]"
                      />
                      <button
                        onClick={() => handleAddNote(lead.id)}
                        disabled={submittingNoteId === lead.id || !(newNoteText[lead.id]?.trim())}
                        className="px-3 py-2 bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Note
                      </button>
                    </div>

                    {/* Note List */}
                    {lead.notes && lead.notes.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {lead.notes.map((note) => (
                          <div
                            key={note.id}
                            className="p-2.5 rounded bg-[#18181B] border border-[#27272A] text-xs"
                          >
                            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                              <span className="font-semibold text-zinc-300">{note.author || 'User'}</span>
                              <span>{new Date(note.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-zinc-200 leading-relaxed">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 py-1">No notes added yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
