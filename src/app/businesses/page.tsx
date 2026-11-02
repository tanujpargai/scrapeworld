'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  MapPin,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface Business {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  websiteData?: {
    overallScore: number | null;
  } | null;
  leadIntelligence?: {
    leadScore: number;
    leadTier: string;
  } | null;
}

export default function BusinessesDirectoryPage() {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [industry, setIndustry] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        city,
        industry,
        limit: '50',
        offset: '0',
      });
      const res = await fetch(`/api/businesses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (e) {
      console.error('Error fetching businesses directory:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [city, industry]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBusinesses();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="w-8 h-8 text-[#2563EB]" />
          <span>Businesses Directory</span>
        </h1>
        <p className="text-[#A1A1AA] mt-1 text-sm">
          A flat list of all {totalCount} discovered businesses scraped across Google Maps.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="p-5 bg-[#111113] border border-[#27272A] rounded-lg space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-[#A1A1AA]" />
            <input
              type="text"
              placeholder="Search business by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#09090B] border border-[#27272A] rounded-md py-2 pl-10 pr-4 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#2563EB]/80 text-[#FAFAFA] font-bold rounded-md text-xs transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex gap-4">
          {/* Industry Filter */}
          <div className="w-48">
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

          {/* City Filter */}
          <div className="w-48">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-[#09090B] border border-[#27272A] text-xs text-[#FAFAFA] rounded p-2 focus:outline-none focus:border-[#2563EB]"
            >
              <option value="">All Cities</option>
              <option value="Delhi">Delhi</option>
              <option value="New Delhi">New Delhi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
          </div>
        ) : businesses.length === 0 ? (
          <p className="text-sm text-[#A1A1AA] py-12 text-center">No businesses found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#27272A] text-[#A1A1AA] font-bold">
                  <th className="pb-3">Business Name</th>
                  <th className="pb-3">Industry</th>
                  <th className="pb-3">City</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Website</th>
                  <th className="pb-3 text-center">Audit Score</th>
                  <th className="pb-3 text-center">Lead Score</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1b1e]">
                {businesses.map((biz) => (
                  <tr key={biz.id} className="hover:bg-[#1b1b1f]/50">
                    <td className="py-3.5 font-bold text-[#FAFAFA]">{biz.name}</td>
                    <td className="py-3.5 text-[#A1A1AA]">{biz.industry || '—'}</td>
                    <td className="py-3.5 text-[#A1A1AA] flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{biz.city || '—'}</span>
                    </td>
                    <td className="py-3.5 font-mono text-[#A1A1AA]">{biz.phone || '—'}</td>
                    <td className="py-3.5 text-[#A1A1AA]">
                      {biz.website ? (
                        <a
                          href={biz.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline hover:text-[#2563EB] flex items-center gap-1.5"
                        >
                          Visit <ExternalLink className="w-3 h-3 inline shrink-0" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 text-center font-mono font-semibold text-[#FAFAFA]">
                      {biz.websiteData?.overallScore !== null && biz.websiteData?.overallScore !== undefined
                        ? `${biz.websiteData.overallScore}/100`
                        : 'No scan'}
                    </td>
                    <td className="py-3.5 text-center font-mono">
                      {biz.leadIntelligence ? (
                        <div className="inline-flex items-center gap-1.5 font-semibold text-[#FAFAFA]">
                          <span>{biz.leadIntelligence.leadScore}</span>
                          <span className="text-[10px] text-[#2563EB] font-bold">({biz.leadIntelligence.leadTier})</span>
                        </div>
                      ) : (
                        'Unranked'
                      )}
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/business/${biz.id}`}
                        className="px-3 py-1 bg-[#2563EB] hover:bg-[#2563EB]/80 text-[#FAFAFA] font-medium rounded text-[11px] transition-colors"
                      >
                        Open Dossier
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
