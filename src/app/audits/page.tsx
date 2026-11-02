'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Search,
  ExternalLink,
  Loader2,
  RefreshCw,
  Zap,
  Activity,
  Play,
  FileCheck,
} from 'lucide-react';

interface AuditItem {
  id: string;
  name: string;
  website: string | null;
  websiteData?: {
    id: string;
    overallScore: number | null;
    seoScore: number | null;
    securityScore: number | null;
    performanceScore: number | null;
    lastScanAt: string | null;
  } | null;
}

export default function AuditsPage() {
  const [search, setSearch] = useState('');
  const [businesses, setBusinesses] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Actions state
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [scanType, setScanType] = useState<'FAST' | 'FULL' | null>(null);
  const [scanMessage, setScanMessage] = useState('');

  const fetchBusinesses = async (query = '') => {
    try {
      setLoading(true);
      // Fetch businesses that have raw website URL to scan
      const url = query ? `/api/businesses?search=${encodeURIComponent(query)}&limit=100` : '/api/businesses?limit=100';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Keep only businesses that have a website address
        const list = (data.businesses || []).filter((b: any) => !!b.website);
        setBusinesses(list);
      }
    } catch (e) {
      console.error('Error loading audits list:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const triggerAudit = async (businessId: string, mode: 'FAST' | 'FULL') => {
    setScanningId(businessId);
    setScanType(mode);
    setScanMessage('');
    try {
      const res = await fetch(`/api/audit/${businessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScanMessage(`Scan job successfully queued in background! Scraper is checking site now.`);
        // Reload list in a few seconds
        setTimeout(() => fetchBusinesses(search), 3000);
      } else {
        setScanMessage(data.error || 'Failed to queue audit.');
      }
    } catch (e: any) {
      setScanMessage('Error: ' + e.message);
    } finally {
      setScanningId(null);
      setScanType(null);
      setTimeout(() => setScanMessage(''), 8000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-[#2563EB]" />
          <span>Website Audit Monitoring</span>
        </h1>
        <p className="text-[#A1A1AA] mt-1 text-sm">
          Run and monitor page audits to gather technical parameters (SEO, SSL, Performance, Security stacks).
        </p>
      </div>

      {scanMessage && (
        <div className="p-3 bg-[#2563EB]/15 border border-[#2563EB]/35 text-[#FAFAFA] rounded text-xs">
          {scanMessage}
        </div>
      )}

      {/* Toolbar */}
      <div className="p-5 bg-[#111113] border border-[#27272A] rounded-lg flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Filter businesses with websites..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchBusinesses(e.target.value);
            }}
            className="w-full bg-[#09090B] border border-[#27272A] rounded-md py-2 pl-10 pr-4 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
          />
        </div>
        <button
          onClick={() => fetchBusinesses(search)}
          className="px-4 py-2 bg-[#27272A] hover:bg-[#27272A]/80 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {/* Audits Table */}
      <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
          </div>
        ) : businesses.length === 0 ? (
          <p className="text-sm text-[#A1A1AA] py-12 text-center">No businesses with website URLs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#27272A] text-[#A1A1AA] font-bold">
                  <th className="pb-3">Business</th>
                  <th className="pb-3">Scrape Website</th>
                  <th className="pb-3 text-center">Overall</th>
                  <th className="pb-3 text-center">SEO</th>
                  <th className="pb-3 text-center">Security</th>
                  <th className="pb-3">Last Scanned</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1b1e]">
                {businesses.map((biz) => {
                  const webData = biz.websiteData;
                  const isScanning = scanningId === biz.id;
                  const scannedTime = webData?.lastScanAt 
                    ? new Date(webData.lastScanAt).toLocaleString()
                    : 'Never Scanned';

                  return (
                    <tr key={biz.id} className="hover:bg-[#1b1b1f]/50">
                      <td className="py-4">
                        <span className="font-bold text-[#FAFAFA]">{biz.name}</span>
                      </td>
                      <td className="py-4">
                        {biz.website ? (
                          <a
                            href={biz.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-[#2563EB] flex items-center gap-1"
                          >
                            <span>{biz.website}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-4 text-center font-mono font-bold">
                        {webData?.overallScore !== null && webData?.overallScore !== undefined 
                          ? `${webData.overallScore}/100` 
                          : '—'}
                      </td>
                      <td className="py-4 text-center font-mono text-[#FAFAFA]">
                        {webData?.seoScore !== null && webData?.seoScore !== undefined
                          ? `${webData.seoScore}/100` 
                          : '—'}
                      </td>
                      <td className="py-4 text-center font-mono text-[#FAFAFA]">
                        {webData?.securityScore !== null && webData?.securityScore !== undefined 
                          ? `${webData.securityScore}/100` 
                          : '—'}
                      </td>
                      <td className="py-4 text-[#A1A1AA]">{scannedTime}</td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          webData ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                        }`}>
                          {webData ? 'Audited' : 'Pending Scrape'}
                        </span>
                      </td>
                      <td className="py-4 text-right space-x-2 shrink-0">
                        <button
                          onClick={() => triggerAudit(biz.id, 'FAST')}
                          disabled={isScanning || !biz.website}
                          className="px-2 py-1 bg-[#27272A] hover:bg-[#27272A]/80 text-[#FAFAFA] rounded font-semibold text-[11px] transition-colors inline-flex items-center gap-1"
                        >
                          {isScanning && scanType === 'FAST' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          FAST Scan
                        </button>
                        <button
                          onClick={() => triggerAudit(biz.id, 'FULL')}
                          disabled={isScanning || !biz.website}
                          className="px-2 py-1 bg-[#F59E0B] hover:bg-[#F59E0B]/80 text-black rounded font-semibold text-[11px] transition-colors inline-flex items-center gap-1"
                        >
                          {isScanning && scanType === 'FULL' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                          FULL Scan
                        </button>
                        <Link
                          href={`/business/${biz.id}`}
                          className="px-2 py-1 bg-[#2563EB] hover:bg-[#2563EB]/80 text-[#FAFAFA] rounded font-medium text-[11px] transition-colors inline-flex items-center gap-1"
                        >
                          <FileCheck className="w-3 h-3" /> Report
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
