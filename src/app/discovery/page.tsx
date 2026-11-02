'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Folder,
  Search,
  MapPin,
  Play,
  Loader2,
  Download,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Percent,
  Users,
  CheckCircle,
  BarChart2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Building,
} from 'lucide-react';

interface SearchJob {
  id: string;
  keyword: string;
  location: string;
  status: string;
  totalFound: number | null;
  totalProcessed: number | null;
  createdAt: string;
  targetCount: number | null;
  keywords: string[];
  locations: string[];
  currentKeyword: string | null;
  currentLocation: string | null;
  businessesFailed: number | null;
  businessesAudited: number | null;
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
}

export default function CollectionsPage() {
  // Unified Search Form State
  const [keywordInput, setKeywordInput] = useState('');
  const [locationInput, setLocationInput] = useState('Delhi');
  const [targetCount, setTargetCount] = useState<number>(250);
  const [selectedIcpId, setSelectedIcpId] = useState<string>('');
  const [icpProfiles, setIcpProfiles] = useState<Array<{ id: string; name: string; targetService?: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchSuccess, setSearchSuccess] = useState('');

  // Collections and Loading State
  const [collections, setCollections] = useState<SearchJob[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);

  // Load active ICP profiles for qualification dropdown
  useEffect(() => {
    fetch('/api/icp?active=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setIcpProfiles(data.data);
        }
      })
      .catch((err) => console.error('Error loading ICP profiles:', err));
  }, []);

  // Poll collections
  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/discovery/jobs');
      if (res.ok) {
        const data = await res.json();
        setCollections(data.jobs || []);
      }
    } catch (e) {
      console.error('Error fetching collections', e);
    } finally {
      setLoadingCollections(false);
    }
  };

  useEffect(() => {
    fetchCollections();
    const interval = setInterval(fetchCollections, 7000);
    return () => clearInterval(interval);
  }, []);

  // Form helpers
  const handlePresetSelect = (preset: number) => {
    setTargetCount(preset);
  };

  const handleStartSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywordInput.trim() || !locationInput.trim()) {
      setSearchError('Keyword and Location are required.');
      return;
    }

    setSearching(true);
    setSearchError('');
    setSearchSuccess('');

    try {
      const res = await fetch('/api/discovery/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keywordInput,
          location: locationInput,
          targetCount,
          icpId: selectedIcpId || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSearchSuccess(`Collection created and search queued successfully!`);
        setKeywordInput('');
        fetchCollections();
      } else {
        setSearchError(data.error || 'Failed to start discovery search.');
      }
    } catch (err: any) {
      setSearchError('Network error starting discovery: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  // Parse current inputs for the strategy preview
  const previewKeywords = keywordInput
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  const previewLocations = locationInput
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

  const getExpansionPreview = (locs: string[]) => {
    const expansions: string[] = [];
    locs.forEach((loc) => {
      const l = loc.toLowerCase();
      if (l.includes('delhi')) {
        expansions.push('Noida', 'Gurgaon', 'Ghaziabad', 'Faridabad');
      } else if (l.includes('mumbai')) {
        expansions.push('Thane', 'Navi Mumbai', 'Kalyan');
      } else if (l.includes('bangalore') || l.includes('bengaluru')) {
        expansions.push('Whitefield', 'Electronic City', 'Yelahanka');
      }
    });
    return expansions;
  };

  const activeExpansions = getExpansionPreview(previewLocations);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#FAFAFA] flex items-center gap-2">
            <Folder className="w-8 h-8 text-[#2563EB]" />
            <span>Lead Collections</span>
          </h1>
          <p className="text-[#A1A1AA] mt-2 text-sm">
            Launch multi-keyword search campaigns, monitor extraction targets, and analyze lead quality scores in real-time.
          </p>
        </div>
        <button
          onClick={fetchCollections}
          className="px-4 py-2 bg-[#111113] hover:bg-[#27272A] border border-[#27272A] text-xs font-semibold text-[#FAFAFA] rounded-md transition-colors flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
        </button>
      </div>

      {/* Grid: Search Form / Strategy Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search Input Card */}
        <div className="lg:col-span-2 p-6 bg-[#111113] border border-[#27272A] rounded-lg flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#FAFAFA]">
              <Sparkles className="w-5 h-5 text-[#2563EB]" />
              <span>Launch Discovery Campaign</span>
            </h2>
            <form onSubmit={handleStartSearch} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5 uppercase">
                    Keywords (comma separated)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-[#A1A1AA]" />
                    <input
                      type="text"
                      placeholder="e.g. Dentists, Orthodontists, Dental Clinics"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      className="w-full bg-[#09090B] border border-[#27272A] rounded-md py-2.5 pl-10 pr-4 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <p className="text-[10px] text-[#A1A1AA] mt-1">Supports multi-keyword concurrent discovery.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5 uppercase">
                    Locations (comma separated)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-[#A1A1AA]" />
                    <input
                      type="text"
                      placeholder="e.g. Delhi, Noida, Gurgaon"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      className="w-full bg-[#09090B] border border-[#27272A] rounded-md py-2.5 pl-10 pr-4 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <p className="text-[10px] text-[#A1A1AA] mt-1">Primary starting cities or sub-regions.</p>
                </div>
              </div>

              {/* ICP Qualification Profile Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Target ICP Qualification Profile (Optional)</span>
                  </label>
                  <Link href="/icp" className="text-[10px] text-[#2563EB] hover:underline font-medium">
                    Configure ICPs →
                  </Link>
                </div>
                <select
                  value={selectedIcpId}
                  onChange={(e) => setSelectedIcpId(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-md py-2.5 px-3 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">None (Standard Scrape — No ICP Filtering)</option>
                  {icpProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      🎯 {p.name} {p.targetService ? `(${p.targetService})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#71717A] mt-1">
                  When selected, the scraper automatically evaluates hard filters, calculates opportunity scores, and ranks prospects against your agency criteria.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-2 uppercase">
                  Target Lead Count: <span className="text-[#FAFAFA] font-bold">{targetCount} Leads</span>
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {[100, 250, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${
                        targetCount === preset
                          ? 'bg-[#2563EB] text-[#FAFAFA]'
                          : 'bg-[#09090B] border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
                      }`}
                    >
                      {preset} Leads
                    </button>
                  ))}
                  <div className="flex items-center gap-2 bg-[#09090B] border border-[#27272A] px-3 py-1 rounded">
                    <span className="text-xs text-[#A1A1AA]">Custom:</span>
                    <input
                      type="number"
                      min="10"
                      max="10000"
                      value={targetCount}
                      onChange={(e) => setTargetCount(Math.max(10, parseInt(e.target.value) || 10))}
                      className="w-16 bg-transparent border-none text-xs text-[#FAFAFA] font-mono focus:outline-none font-bold"
                    />
                  </div>
                </div>
              </div>

              {searchError && <p className="text-xs text-[#EF4444] font-medium">{searchError}</p>}
              {searchSuccess && <p className="text-xs text-[#22C55E] font-medium">{searchSuccess}</p>}

              <button
                type="submit"
                disabled={searching}
                className="w-full py-3 bg-[#2563EB] hover:bg-[#2563EB]/80 disabled:bg-[#2563EB]/50 text-[#FAFAFA] font-bold rounded-md text-sm transition-colors flex items-center justify-center gap-2"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Launching Campaign Queue...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Launch Campaign
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Discovery Strategy Panel */}
        <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#FAFAFA]">
              <TrendingUp className="w-5 h-5 text-[#22C55E]" />
              <span>Discovery Strategy Preview</span>
            </h2>

            <div className="space-y-4 text-xs">
              <div className="bg-[#09090B] p-3 border border-[#27272A] rounded">
                <p className="text-[#A1A1AA] uppercase text-[9px] font-bold tracking-wider">Queue Strategy</p>
                <p className="font-semibold text-[#FAFAFA] mt-1">
                  {previewKeywords.length > 0 ? previewKeywords.length : 1} keyword(s) ×{' '}
                  {previewLocations.length > 0 ? previewLocations.length : 1} location(s)
                </p>
              </div>

              <div className="bg-[#09090B] p-3 border border-[#27272A] rounded">
                <p className="text-[#A1A1AA] uppercase text-[9px] font-bold tracking-wider">Estimated Allocation</p>
                <p className="font-semibold text-[#FAFAFA] mt-1">
                  Targeting {targetCount} leads total (avg.{' '}
                  {Math.round(targetCount / Math.max(1, previewKeywords.length * previewLocations.length))} per query segment).
                </p>
              </div>

              <div className="bg-[#09090B] p-3 border border-[#27272A] rounded">
                <p className="text-[#A1A1AA] uppercase text-[9px] font-bold tracking-wider">Radius Expansion</p>
                {activeExpansions.length > 0 ? (
                  <div className="mt-1 space-y-1">
                    <p className="text-[#22C55E] font-medium">Automatic NCR coverage active:</p>
                    <p className="text-[#A1A1AA] leading-relaxed">
                      Expanding to {activeExpansions.join(', ')} sequentially if target is unmet.
                    </p>
                  </div>
                ) : (
                  <p className="text-[#A1A1AA] mt-1">
                    Standard local search radius expansion fallback (Cardinal directions).
                  </p>
                )}
              </div>

              <div className="bg-[#09090B] p-3 border border-[#27272A] rounded flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#F59E0B] font-bold uppercase text-[9px] tracking-wider">Auto-Stop Thresholds</p>
                  <p className="text-[#A1A1AA] mt-0.5 leading-relaxed">
                    Extraction pauses immediately when target is hit OR market saturation reaches 90%.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collections Grid Section */}
      <div>
        <h2 className="text-xl font-bold text-[#FAFAFA] mb-6 flex items-center gap-2">
          <Folder className="w-5 h-5 text-[#2563EB]" />
          <span>Active & Saved Collections</span>
        </h2>

        {loadingCollections ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#111113] border border-[#27272A] rounded-lg">
            <Loader2 className="w-10 h-10 animate-spin text-[#2563EB]" />
            <p className="text-sm text-[#A1A1AA] mt-3">Loading collection profiles...</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-16 bg-[#111113] border border-[#27272A] rounded-lg">
            <p className="text-sm text-[#A1A1AA]">No collections created yet. Use the form above to start a campaign.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {collections.map((c) => {
              const statusColors =
                c.status === 'COMPLETED'
                  ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30'
                  : c.status === 'RUNNING'
                  ? 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30 animate-pulse'
                  : c.status === 'SATURATED'
                  ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                  : 'bg-[#A1A1AA]/10 text-[#A1A1AA] border-[#A1A1AA]/20';

              const completionText = `${c.leadCount} / ${c.targetCount || 100}`;
              const completionPercent = c.completionPercent ?? 0;
              const hasIntel = c.leadCount > 0;

              return (
                <div
                  key={c.id}
                  className="bg-[#111113] border border-[#27272A] rounded-lg p-6 flex flex-col justify-between hover:border-[#2563EB]/60 transition-all shadow-md"
                >
                  {/* Top Block: Title, Location & Status */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#FAFAFA] tracking-tight truncate max-w-[260px]">
                          {c.keywords && c.keywords.length > 0 ? c.keywords.join(', ') : c.keyword}
                        </h3>
                        <p className="text-xs text-[#A1A1AA] flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-[#A1A1AA]" />
                          <span>
                            {c.locations && c.locations.length > 0 ? c.locations.join(', ') : c.location}
                          </span>
                        </p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${statusColors}`}>
                        {c.status}
                      </span>
                    </div>

                    {/* Progress tracking display */}
                    <div className="bg-[#09090B] border border-[#27272A] rounded p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-[#A1A1AA]">Goal Progress:</span>
                        <span className="font-mono text-[#FAFAFA]">{completionText} Leads</span>
                      </div>
                      
                      {/* Styled progress bar */}
                      <div className="w-full bg-[#27272A] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                          style={{ width: `${completionPercent}%` }}
                        />
                      </div>

                      {/* Details row */}
                      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-[#1b1b1f] text-[10px] text-[#A1A1AA]">
                        <div>
                          <p className="font-bold">Completion</p>
                          <p className="font-mono font-bold text-[#FAFAFA] mt-0.5 text-xs">
                            {completionPercent}%
                          </p>
                        </div>
                        <div>
                          <p className="font-bold">Est. Available</p>
                          <p className="font-mono font-bold text-[#FAFAFA] mt-0.5 text-xs">
                            {c.estimatedAvailable}
                          </p>
                        </div>
                        <div>
                          <p className="font-bold">Saturation</p>
                          <p className="font-mono font-semibold text-[#F59E0B] mt-0.5">
                            {c.saturationStatus}
                          </p>
                        </div>
                      </div>

                      {c.status === 'RUNNING' && (
                        <div className="pt-2 text-[10px] text-[#2563EB] flex items-center gap-1 font-semibold animate-pulse border-t border-[#1b1b1f]">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>
                            Querying "{c.currentKeyword}" in "{c.currentLocation}"
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Lead Quality Analytics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-[#09090B]/50 border border-[#27272A]/50 rounded text-center">
                        <p className="text-[10px] text-[#A1A1AA] font-semibold uppercase">Reachable Leads</p>
                        <p className="font-mono text-sm font-bold text-[#22C55E] mt-0.5">
                          {c.reachableLeads}
                        </p>
                      </div>
                      <div className="p-3 bg-[#09090B]/50 border border-[#27272A]/50 rounded text-center">
                        <p className="text-[10px] text-[#A1A1AA] font-semibold uppercase">Verified Websites</p>
                        <p className="font-mono text-sm font-bold text-[#FAFAFA] mt-0.5">
                          {c.verifiedWebsites}
                        </p>
                      </div>
                      <div className="p-3 bg-[#09090B]/50 border border-[#27272A]/50 rounded text-center">
                        <p className="text-[10px] text-[#A1A1AA] font-semibold uppercase">Owners Found</p>
                        <p className="font-mono text-sm font-bold text-[#FAFAFA] mt-0.5">
                          {c.ownersFound}
                        </p>
                      </div>
                      <div className="p-3 bg-[#09090B]/50 border border-[#27272A]/50 rounded text-center">
                        <p className="text-[10px] text-[#A1A1AA] font-semibold uppercase">Social profiles</p>
                        <p className="font-mono text-sm font-bold text-[#FAFAFA] mt-0.5">
                          {c.socialProfilesFound}
                        </p>
                      </div>
                      <div className="p-3 bg-[#09090B]/50 border border-[#27272A]/50 rounded text-center">
                        <p className="text-[10px] text-[#A1A1AA] font-semibold uppercase">Avg Lead Score</p>
                        <p className="font-mono text-sm font-bold text-[#2563EB] mt-0.5">
                          {hasIntel ? `${c.avgLeadScore} pts` : '—'}
                        </p>
                      </div>
                      <div className="p-3 bg-[#09090B]/50 border border-[#27272A]/50 rounded text-center">
                        <p className="text-[10px] text-[#A1A1AA] font-semibold uppercase">Avg Sales Readiness</p>
                        <p className="font-mono text-sm font-bold text-[#F59E0B] mt-0.5">
                          {hasIntel ? `${c.avgSalesReadiness}%` : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[#27272A]">
                    <Link
                      href={`/discovery/collection/${c.id}`}
                      className="flex-1 text-center py-2 bg-[#27272A] hover:bg-[#27272A]/80 text-[#FAFAFA] font-semibold rounded text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <BarChart2 className="w-3.5 h-3.5" /> Dashboard
                    </Link>

                    <a
                      href={`/api/discovery/export?collectionId=${c.id}&format=csv`}
                      download
                      className="px-3 py-2 bg-[#2563EB] hover:bg-[#2563EB]/80 text-[#FAFAFA] rounded text-xs transition-colors flex items-center justify-center gap-1"
                      title="Export CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </a>
                    
                    <a
                      href={`/api/discovery/export?collectionId=${c.id}&format=json`}
                      download
                      className="px-3 py-2 bg-[#111113] hover:bg-[#27272A] border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] rounded text-xs transition-colors"
                      title="Export JSON"
                    >
                      JSON
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
