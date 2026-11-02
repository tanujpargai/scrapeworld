'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Star,
  Coins,
  ShieldCheck,
  Columns,
  CheckSquare,
  Users,
  Copy,
  Check,
  Loader2,
  Play,
  Briefcase,
  Plus,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Target,
  MessageCircle,
  Zap,
  TrendingUp,
  BadgeDollarSign,
  Send,
} from 'lucide-react';

interface BusinessDossierClientProps {
  business: any;
}

export default function BusinessDossierClient({ business }: BusinessDossierClientProps) {
  const intel = business.leadIntelligence || {};
  const web = business.websiteData || {};
  const issues = web.issues || [];
  const socials = business.socialProfiles || [];
  const analyses = business.analyses || [];
  const opportunities = business.opportunities || [];
  const tasks = business.tasks || [];
  const aiReports = business.aiReports || [];

  // Copy helpers
  const [copiedAngleIdx, setCopiedAngleIdx] = useState<number | null>(null);
  const [copiedPitch, setCopiedPitch] = useState<'whatsapp' | 'email' | 'firsttouch' | null>(null);

  const copyPitch = (type: 'whatsapp' | 'email' | 'firsttouch', text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch(type);
    setTimeout(() => setCopiedPitch(null), 3000);
  };

  // Task creation state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskSuccess, setTaskSuccess] = useState('');

  // General Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Handle Copy text
  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedAngleIdx(idx);
    setTimeout(() => setCopiedAngleIdx(null), 3000);
  };

  // Trigger Audit run
  const triggerAudit = async (mode: 'FAST' | 'FULL') => {
    setActionLoading(true);
    setActionMessage('');
    try {
      const res = await fetch(`/api/audit/${business.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(`Website audit (${mode}) successfully triggered in background! Refresh page in 30s.`);
      } else {
        setActionMessage(data.error || 'Failed to trigger audit.');
      }
    } catch (e: any) {
      setActionMessage('Error: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger AI Report run
  const triggerAIReport = async () => {
    setActionLoading(true);
    setActionMessage('');
    try {
      const res = await fetch(`/api/ai/${business.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage('AI Dossier compilation queued in background! Refresh in 15s.');
      } else {
        setActionMessage(data.error || 'Failed to trigger AI compilation.');
      }
    } catch (e: any) {
      setActionMessage('Error: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger Deal Creation
  const triggerCreateDeal = async () => {
    setActionLoading(true);
    setActionMessage('');
    try {
      const res = await fetch('/api/crm/deals/create-from-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(`CRM Deal generated! follow-up tasks created in the Kanban pipeline.`);
      } else {
        setActionMessage(data.error || 'Failed to convert to deal.');
      }
    } catch (e: any) {
      setActionMessage('Error: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Task Submit
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setCreatingTask(true);
    setTaskSuccess('');

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          title: taskTitle,
          description: taskDesc,
          priority: taskPriority,
          dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTaskSuccess('Action Task added successfully!');
        setTaskTitle('');
        setTaskDesc('');
        setTaskDueDate('');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err: any) {
      setTaskSuccess('Failed to save task: ' + err.message);
    } finally {
      setCreatingTask(false);
    }
  };

  // Format Social Platform usernames/urls
  const getSocialUrl = (platform: string) => {
    const s = socials.find((p: any) => p.platform === platform);
    return s ? s.url : null;
  };

  // Parse Sales Angles from AI Reports
  const latestAiReport = aiReports[0] || {};
  let salesAnglesList: string[] = [];
  if (latestAiReport.salesAngles) {
    try {
      salesAnglesList = Array.isArray(latestAiReport.salesAngles) 
        ? latestAiReport.salesAngles 
        : typeof latestAiReport.salesAngles === 'string'
          ? JSON.parse(latestAiReport.salesAngles)
          : Object.values(latestAiReport.salesAngles);
    } catch (e) {
      salesAnglesList = [String(latestAiReport.salesAngles)];
    }
  }

  // Fallback angles
  if (salesAnglesList.length === 0) {
    salesAnglesList = [
      `Pitch the missing SSL Certificate to rebuild security confidence: "Local competitors have HTTPS enabled, while your site flags secure warnings to your ${business.reviewCount || 0} reviewers."`,
      `Pitch website mobile load speeds: Modern SEO optimizations will prevent prospects from bouncing directly to nearby search alternatives.`,
    ];
  }

  const bestContactMethod = business.phone ? `Phone / WhatsApp (${business.phone})` : business.email ? `Email (${business.email})` : 'LinkedIn Profile';

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link href="/leads" className="text-xs text-[#2563EB] hover:underline font-medium">
          ← Back to Top Leads
        </Link>
      </div>

      {/* Title block */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-[#27272A]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">{business.name}</h1>
            {business.enterpriseFlag && (
              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold">
                ENTERPRISE
              </span>
            )}
            {business.franchiseFlag && (
              <span className="px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 text-[10px] font-bold">
                FRANCHISE
              </span>
            )}
          </div>
          <p className="text-[#A1A1AA] text-sm mt-1">{business.industry || 'Local Business'} • {business.city || 'Delhi, India'}</p>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={triggerCreateDeal}
            disabled={actionLoading}
            className="px-4 py-2 bg-[#22C55E] hover:bg-[#22C55E]/80 text-black text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors"
          >
            <Briefcase className="w-4 h-4" /> Convert to Deal
          </button>
          <button
            onClick={() => triggerAudit('FAST')}
            disabled={actionLoading || !business.website}
            className="px-4 py-2 bg-[#27272A] hover:bg-[#27272A]/80 text-[#FAFAFA] text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> FAST Scan
          </button>
          <button
            onClick={() => triggerAudit('FULL')}
            disabled={actionLoading || !business.website}
            className="px-4 py-2 bg-[#27272A] hover:bg-[#27272A]/80 text-[#FAFAFA] text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> FULL Scan
          </button>
          <button
            onClick={triggerAIReport}
            disabled={actionLoading}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#2563EB]/80 text-[#FAFAFA] text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> AI Dossier
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-[#2563EB]/15 border border-[#2563EB]/35 text-[#FAFAFA] rounded text-xs">
          {actionMessage}
        </div>
      )}

      {/* Outreach Workspace */}
      <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
        <h2 className="text-sm font-bold text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Send className="w-4 h-4 text-[#2563EB]" /> Outreach Workspace
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* WhatsApp Pitch */}
          <div className="p-4 bg-[#09090B] border border-[#27272A] rounded">
            <p className="text-[10px] font-bold text-[#22C55E] uppercase mb-2">WhatsApp Pitch</p>
            <p className="text-xs text-[#FAFAFA] leading-relaxed min-h-[80px]">
              {business.phone ? (
                intel.firstTouchStrategy ||
                `Hi, I noticed ${business.name} and wanted to share a quick observation about your online presence that could bring in more customers. Is this the right number to connect with the owner?`
              ) : (
                <span className="text-[#EF4444]">No phone number available for WhatsApp outreach.</span>
              )}
            </p>
            <button
              onClick={() => copyPitch('whatsapp',
                intel.firstTouchStrategy ||
                `Hi, I noticed ${business.name} and wanted to share a quick observation about your online presence that could bring in more customers. Is this the right number to connect with the owner?`
              )}
              disabled={!business.phone}
              className="mt-3 w-full py-1.5 bg-[#22C55E]/10 hover:bg-[#22C55E]/20 disabled:opacity-40 border border-[#22C55E]/30 text-[#22C55E] text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedPitch === 'whatsapp' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedPitch === 'whatsapp' ? 'Copied!' : 'Copy WhatsApp Pitch'}
            </button>
          </div>

          {/* Email Pitch */}
          <div className="p-4 bg-[#09090B] border border-[#27272A] rounded">
            <p className="text-[10px] font-bold text-[#2563EB] uppercase mb-2">Email Pitch</p>
            <p className="text-xs text-[#FAFAFA] leading-relaxed min-h-[80px]">
              {business.email ? (
                `Subject: Quick observation about ${business.name}'s online presence\n\nHi${business.ownerName ? ` ${business.ownerName.split(' ')[0]}` : ''},\n\nI came across ${business.name} while researching ${business.industry || 'businesses'} in ${business.city || 'Delhi'}. I noticed ${intel.primaryOffer ? `an opportunity to help with ${intel.primaryOffer}` : 'a few improvements that could drive more leads your way'}.\n\nWorth a 10-minute call to explore?\n\n— [Your Name]`
              ) : (
                <span className="text-[#EF4444]">No email address available.</span>
              )}
            </p>
            <button
              onClick={() => copyPitch('email',
                `Subject: Quick observation about ${business.name}'s online presence\n\nHi${business.ownerName ? ` ${business.ownerName.split(' ')[0]}` : ''},\n\nI came across ${business.name} while researching ${business.industry || 'businesses'} in ${business.city || 'Delhi'}. I noticed ${intel.primaryOffer ? `an opportunity to help with ${intel.primaryOffer}` : 'a few improvements that could drive more leads your way'}.\n\nWorth a 10-minute call to explore?\n\n— [Your Name]`
              )}
              disabled={!business.email}
              className="mt-3 w-full py-1.5 bg-[#2563EB]/10 hover:bg-[#2563EB]/20 disabled:opacity-40 border border-[#2563EB]/30 text-[#2563EB] text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedPitch === 'email' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedPitch === 'email' ? 'Copied!' : 'Copy Email Pitch'}
            </button>
          </div>

          {/* CRM Action */}
          <div className="p-4 bg-[#09090B] border border-[#27272A] rounded flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#F59E0B] uppercase mb-2">CRM Action</p>
              <p className="text-xs text-[#FAFAFA] leading-relaxed">
                Move this lead into your active CRM pipeline. A follow-up task and deal record will be created automatically.
              </p>
            </div>
            <div className="space-y-2 mt-4">
              <button
                onClick={triggerCreateDeal}
                disabled={actionLoading}
                className="w-full py-2 bg-[#22C55E] hover:bg-[#22C55E]/80 disabled:opacity-50 text-black text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5" /> Move to CRM / Create Deal
              </button>
              {actionMessage && (
                <p className="text-[11px] text-[#22C55E] font-semibold">{actionMessage}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 360 Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lead Intelligence Card */}
        <div className="lg:col-span-1 p-6 bg-[#111113] border border-[#27272A] rounded-lg">
          <h2 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-[#2563EB]" /> Lead Scoring V3
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-[#1b1b1f] pb-2">
              <span className="text-xs text-[#A1A1AA]">Lead Score:</span>
              <span className="text-2xl font-bold font-mono text-[#FAFAFA]">{intel.leadScore || 0}/100</span>
            </div>
            <div className="flex justify-between items-end border-b border-[#1b1b1f] pb-2">
              <span className="text-xs text-[#A1A1AA]">Priority Tier:</span>
              <span className="px-2 py-0.5 rounded bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs">
                {intel.leadTier || 'D'}
              </span>
            </div>
            <div className="flex justify-between items-end border-b border-[#1b1b1f] pb-2">
              <span className="text-xs text-[#A1A1AA]">Sales Readiness:</span>
              <span className="font-mono text-sm font-bold text-[#FAFAFA]">{intel.salesReadinessScore || 0}/100</span>
            </div>
            <div className="flex justify-between items-end border-b border-[#1b1b1f] pb-2">
              <span className="text-xs text-[#A1A1AA]">Reachability:</span>
              <span className="font-mono text-sm font-bold text-[#FAFAFA]">{intel.reachabilityScore || 0}/100</span>
            </div>
            <div className="flex justify-between items-end border-b border-[#1b1b1f] pb-2">
              <span className="text-xs text-[#A1A1AA]">Buyer Prob:</span>
              <span className="font-mono text-sm font-bold text-[#FAFAFA]">{intel.buyerProbability || 0}%</span>
            </div>
            <div className="flex justify-between items-end border-b border-[#1b1b1f] pb-2">
              <span className="text-xs text-[#A1A1AA]">Closing Prob:</span>
              <span className="font-mono text-sm font-bold text-[#FAFAFA]">{intel.closingProbability || 0}%</span>
            </div>
            <div className="flex justify-between items-end border-b border-[#1b1b1f] pb-2">
              <span className="text-xs text-[#A1A1AA]">Business Size:</span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#27272A] text-[#FAFAFA]">
                {intel.businessSize || 'Small'}
              </span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-xs text-[#A1A1AA]">Ability to Pay:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                intel.abilityToPay === 'High' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                intel.abilityToPay === 'Medium' ? 'bg-[#F59E0B]/15 text-[#F59E0B]' :
                'bg-[#EF4444]/15 text-[#EF4444]'
              }`}>
                {intel.abilityToPay || 'Low'}
              </span>
            </div>
          </div>
        </div>

        {/* Business Overview & Why This Lead */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overview */}
          <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg space-y-4">
            <h2 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#22C55E]" /> Profile Details
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#A1A1AA] shrink-0 mt-0.5" />
                <span>{business.address || 'No address logged'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                <span className="font-mono">{business.phone || 'No phone number'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                <span>{business.email || 'No business email'}</span>
              </div>
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                {business.website ? (
                  <a href={business.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-[#2563EB] truncate">
                    {business.website}
                  </a>
                ) : (
                  <span>No website associated</span>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-[#1b1b1f]">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-[#FAFAFA]">{business.rating || 0} Rating • {business.reviewCount || 0} reviews</span>
              </div>
            </div>
          </div>

          {/* Why This Lead */}
          <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" /> Intelligence Summary
              </h2>
              <div className="text-xs space-y-2">
                <p className="leading-relaxed text-[#FAFAFA]">{intel.leadSummary || 'Compilation pending...'}</p>
                <div className="pt-2 border-t border-[#1b1b1f]">
                  <p className="text-[10px] text-[#A1A1AA] uppercase font-bold">Best Contact Channel</p>
                  <p className="text-xs font-semibold text-[#FAFAFA] mt-0.5">{bestContactMethod}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#A1A1AA] uppercase font-bold">Recommended Services</p>
                  <p className="text-xs font-semibold text-[#2563EB] mt-0.5">
                    {opportunities.map((o: any) => o.serviceType).join(', ') || 'WEBSITE DEVELOPMENT'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Website Scan & Issues */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
            <span>Website Scan Metrics</span>
          </h2>
          {!web.id ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <AlertTriangle className="w-8 h-8 text-[#F59E0B]" />
              <div>
                <p className="text-sm font-semibold text-[#FAFAFA]">No Audit Data Available</p>
                <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm">
                  This website has not been analyzed yet. Run a scan to discover security, SEO, and speed issues.
                </p>
              </div>
              <button
                onClick={() => triggerAudit('FAST')}
                disabled={actionLoading || !business.website}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#2563EB]/80 disabled:bg-[#2563EB]/30 disabled:text-[#A1A1AA] text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Trigger FAST Scan
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-b border-[#27272A] pb-4 mb-4">
                <div className="p-3 bg-[#09090B] rounded border border-[#27272A]">
                  <p className="text-[10px] text-[#A1A1AA] uppercase">Overall</p>
                  <p className="text-xl font-bold font-mono mt-1">{web.overallScore !== null && web.overallScore !== undefined ? `${web.overallScore}/100` : '—'}</p>
                </div>
                <div className="p-3 bg-[#09090B] rounded border border-[#27272A]">
                  <p className="text-[10px] text-[#A1A1AA] uppercase">SEO</p>
                  <p className="text-xl font-bold font-mono mt-1">{web.seoScore !== null && web.seoScore !== undefined ? `${web.seoScore}/100` : '—'}</p>
                </div>
                <div className="p-3 bg-[#09090B] rounded border border-[#27272A]">
                  <p className="text-[10px] text-[#A1A1AA] uppercase">Performance</p>
                  <p className="text-xl font-bold font-mono mt-1">{web.performanceScore !== null && web.performanceScore !== undefined ? `${web.performanceScore}/100` : '—'}</p>
                </div>
                <div className="p-3 bg-[#09090B] rounded border border-[#27272A]">
                  <p className="text-[10px] text-[#A1A1AA] uppercase">Security</p>
                  <p className="text-xl font-bold font-mono mt-1">{web.securityScore !== null && web.securityScore !== undefined ? `${web.securityScore}/100` : '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Detected Issue Log ({issues.length})</p>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {issues.length === 0 ? (
                    <p className="text-xs text-[#A1A1AA] py-4">No critical issues logged.</p>
                  ) : (
                    issues.map((issue: any) => (
                      <div key={issue.id} className="p-2.5 bg-[#09090B] rounded border border-[#27272A] flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-[#FAFAFA]">{issue.title}</p>
                          <p className="text-[10px] text-[#A1A1AA] mt-0.5">{issue.description}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                          issue.severity === 'CRITICAL' ? 'bg-[#EF4444]/15 text-[#EF4444]' :
                          issue.severity === 'HIGH' ? 'bg-[#F59E0B]/15 text-[#F59E0B]' :
                          'bg-[#2563EB]/15 text-[#2563EB]'
                        }`}>
                          {issue.severity}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Competitor Gap Analysis */}
        <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg flex flex-col">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#22C55E]" />
            <span>Competitor Gaps</span>
          </h2>
          <div className="flex-1 overflow-x-auto">
            {analyses.length === 0 ? (
              <p className="text-xs text-[#A1A1AA] py-8 text-center">No local competitor gap metrics computed.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#27272A] text-[#A1A1AA] font-semibold">
                    <th className="pb-2">Competitor</th>
                    <th className="pb-2 text-center">Web Score</th>
                    <th className="pb-2 text-center">Reviews</th>
                    <th className="pb-2 text-right">Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b1b1e]">
                  {analyses.map((ana: any) => {
                    const compName = ana.competitor?.competitorBusiness?.name || 'Local Competitor';
                    const compScore = ana.competitor?.competitorBusiness?.websiteData?.overallScore ?? '—';
                    const compReviews = ana.competitor?.competitorBusiness?.reviewCount ?? '—';
                    const gap = ana.websiteScoreGap ?? 0;

                    return (
                      <tr key={ana.id}>
                        <td className="py-2.5 font-semibold text-[#FAFAFA] truncate max-w-[150px]">{compName}</td>
                        <td className="py-2.5 text-center font-mono text-[#FAFAFA]">{compScore}</td>
                        <td className="py-2.5 text-center font-mono text-[#FAFAFA]">{compReviews}</td>
                        <td className={`py-2.5 text-right font-mono font-bold ${gap > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                          {gap > 0 ? `+${gap}` : gap}
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

      {/* V4.5 Offer Intelligence + Outreach Strategy */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Offer Recommendation */}
        <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
          <h2 className="text-sm font-bold text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-[#2563EB]" /> Offer Intelligence
          </h2>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#2563EB]/10 border border-[#2563EB]/25 rounded">
              <p className="text-[10px] font-bold text-[#2563EB] uppercase mb-1">Primary Offer</p>
              <p className="font-semibold text-[#FAFAFA]">{intel.primaryOffer || 'Website Redesign & Lead Capture'}</p>
            </div>
            <div className="p-3 bg-[#09090B] border border-[#27272A] rounded">
              <p className="text-[10px] font-bold text-[#A1A1AA] uppercase mb-1">Secondary Offer</p>
              <p className="text-[#FAFAFA]">{intel.secondaryOffer || 'Local SEO & Google Reviews'}</p>
            </div>
            <div className="p-3 bg-[#09090B] border border-[#27272A] rounded">
              <p className="text-[10px] font-bold text-[#A1A1AA] uppercase mb-1">Why They Need It</p>
              <p className="text-[#FAFAFA] leading-relaxed">{intel.offerReason || 'Analysis pending.'}</p>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#A1A1AA]">Offer Confidence:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                (intel.offerConfidence ?? 0) >= 85 ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                (intel.offerConfidence ?? 0) >= 65 ? 'bg-[#F59E0B]/15 text-[#F59E0B]' :
                'bg-[#EF4444]/15 text-[#EF4444]'
              }`}>
                {intel.offerConfidence ?? 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Contact Strategy */}
        <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
          <h2 className="text-sm font-bold text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4 text-[#22C55E]" /> Contact Strategy
          </h2>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#22C55E]/10 border border-[#22C55E]/25 rounded">
              <p className="text-[10px] font-bold text-[#22C55E] uppercase mb-1">Preferred Channel</p>
              <p className="font-semibold text-[#FAFAFA]">{intel.preferredContactMethod || 'WhatsApp / Phone Call'}</p>
            </div>
            <div className="p-3 bg-[#09090B] border border-[#27272A] rounded">
              <p className="text-[10px] font-bold text-[#A1A1AA] uppercase mb-1">Why This Channel</p>
              <p className="text-[#FAFAFA] leading-relaxed">{intel.contactMethodReason || 'Analysis pending.'}</p>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#A1A1AA]">Outreach Difficulty:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                intel.outreachDifficultyLevel === 'Easy' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                intel.outreachDifficultyLevel === 'Medium' ? 'bg-[#2563EB]/15 text-[#2563EB]' :
                intel.outreachDifficultyLevel === 'Hard' ? 'bg-[#F59E0B]/15 text-[#F59E0B]' :
                'bg-[#EF4444]/15 text-[#EF4444]'
              }`}>
                {intel.outreachDifficultyLevel || 'Medium'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#A1A1AA]">Difficulty Score:</span>
              <span className="font-mono text-sm font-bold text-[#FAFAFA]">{intel.outreachDifficultyScore ?? '—'}/100</span>
            </div>
          </div>
        </div>

        {/* First Touch Strategy */}
        <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg flex flex-col">
          <h2 className="text-sm font-bold text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#F59E0B]" /> First Touch Script
          </h2>
          <div className="flex-1 p-3 bg-[#09090B] border border-[#27272A] rounded text-xs text-[#FAFAFA] leading-relaxed">
            {intel.firstTouchStrategy || 'Run lead intelligence to generate a personalized first touch script.'}
          </div>
          {intel.firstTouchReason && (
            <p className="text-[10px] text-[#A1A1AA] mt-2 leading-relaxed">
              <span className="font-bold">Why: </span>{intel.firstTouchReason}
            </p>
          )}
          <button
            onClick={() => copyPitch('firsttouch', intel.firstTouchStrategy || '')}
            className="mt-3 w-full py-2 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors"
          >
            {copiedPitch === 'firsttouch' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedPitch === 'firsttouch' ? 'Copied!' : 'Copy First Touch Script'}
          </button>
        </div>
      </div>

      {/* Social, Owner & Sales Angles */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Social Presence */}
        <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
          <h2 className="text-sm font-bold text-[#A1A1AA] uppercase tracking-wider mb-4">Social Accounts</h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-[#1b1b1f] pb-2">
              <span className="text-[#A1A1AA]">Instagram:</span>
              {getSocialUrl('INSTAGRAM') ? (
                <a href={getSocialUrl('INSTAGRAM')!} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline truncate max-w-[140px]">
                  Verified URL
                </a>
              ) : (
                <span className="text-[#EF4444]">Missing</span>
              )}
            </div>
            <div className="flex justify-between items-center border-b border-[#1b1b1f] pb-2">
              <span className="text-[#A1A1AA]">Facebook:</span>
              {getSocialUrl('FACEBOOK') ? (
                <a href={getSocialUrl('FACEBOOK')!} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline truncate max-w-[140px]">
                  Verified URL
                </a>
              ) : (
                <span className="text-[#EF4444]">Missing</span>
              )}
            </div>
            <div className="flex justify-between items-center border-b border-[#1b1b1f] pb-2">
              <span className="text-[#A1A1AA]">LinkedIn:</span>
              {getSocialUrl('LINKEDIN') ? (
                <a href={getSocialUrl('LINKEDIN')!} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline truncate max-w-[140px]">
                  Verified URL
                </a>
              ) : (
                <span className="text-[#EF4444]">Missing</span>
              )}
            </div>
            <div className="flex justify-between items-center border-b border-[#1b1b1f] pb-2">
              <span className="text-[#A1A1AA]">YouTube:</span>
              {getSocialUrl('YOUTUBE') ? (
                <a href={getSocialUrl('YOUTUBE')!} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline truncate max-w-[140px]">
                  Verified URL
                </a>
              ) : (
                <span className="text-[#EF4444]">Missing</span>
              )}
            </div>
          </div>
        </div>

        {/* Owner Intelligence */}
        <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
          <h2 className="text-sm font-bold text-[#A1A1AA] uppercase tracking-wider mb-4">Owner Profile</h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-[#1b1b1f] pb-2">
              <span className="text-[#A1A1AA]">Decision Maker:</span>
              <span className="font-bold text-[#FAFAFA]">{business.ownerName || 'Unknown'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#1b1b1f] pb-2">
              <span className="text-[#A1A1AA]">Role:</span>
              <span className="text-[#FAFAFA]">{business.ownerRole || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#1b1b1f] pb-2">
              <span className="text-[#A1A1AA]">LinkedIn URL:</span>
              {business.ownerLinkedIn ? (
                <a href={business.ownerLinkedIn} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline truncate max-w-[140px]">
                  View Profile
                </a>
              ) : (
                <span className="text-[#EF4444]">Missing</span>
              )}
            </div>
            <div className="flex justify-between items-center border-b border-[#1b1b1f] pb-2">
              <span className="text-[#A1A1AA]">Confidence:</span>
              <span className="font-semibold">{business.ownerConfidence ? `${business.ownerConfidence}%` : '0%'}</span>
            </div>
          </div>
        </div>

        {/* Sales Angles */}
        <div className="p-6 bg-[#111113] border border-[#27272A] rounded-lg">
          <h2 className="text-sm font-bold text-[#A1A1AA] uppercase tracking-wider mb-3">AI Sales Pitch Angles</h2>
          <div className="space-y-2 max-h-[160px] overflow-y-auto text-xs pr-1">
            {salesAnglesList.map((angle, idx) => (
              <div key={idx} className="p-2.5 bg-[#09090B] text-[#FAFAFA] border border-[#27272A] rounded flex justify-between gap-2 items-start">
                <p className="leading-relaxed">{angle}</p>
                <button
                  onClick={() => copyToClipboard(angle, idx)}
                  className="p-1 bg-[#1b1b1f] border border-[#27272A] hover:bg-[#27272A] rounded text-[#A1A1AA] shrink-0"
                  title="Copy Angle"
                >
                  {copiedAngleIdx === idx ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Task Form */}
        <div className="lg:col-span-1 p-6 bg-[#111113] border border-[#27272A] rounded-lg">
          <h2 className="text-sm font-bold text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#2563EB]" /> Add Action Task
          </h2>
          <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase mb-1">Title</label>
              <input
                type="text"
                placeholder="e.g. Call owner to discuss SSL issue"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
                className="w-full bg-[#09090B] border border-[#27272A] rounded p-2 text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase mb-1">Description</label>
              <textarea
                placeholder="Details of outreach discussion..."
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                rows={2}
                className="w-full bg-[#09090B] border border-[#27272A] rounded p-2 text-[#FAFAFA] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase mb-1">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded p-2 text-[#FAFAFA]"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded p-2 text-[#FAFAFA]"
                />
              </div>
            </div>

            {taskSuccess && <p className="text-[11px] text-[#22C55E] mt-1 font-semibold">{taskSuccess}</p>}

            <button
              type="submit"
              disabled={creatingTask}
              className="w-full py-2 bg-[#2563EB] hover:bg-[#2563EB]/80 disabled:opacity-50 text-white font-bold rounded transition-colors mt-2"
            >
              {creatingTask ? 'Adding...' : 'Save Task'}
            </button>
          </form>
        </div>

        {/* Existing Tasks */}
        <div className="lg:col-span-2 p-6 bg-[#111113] border border-[#27272A] rounded-lg">
          <h2 className="text-sm font-bold text-[#A1A1AA] uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-[#22C55E]" /> Task List ({tasks.length})
          </h2>
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {tasks.length === 0 ? (
              <p className="text-xs text-[#A1A1AA] py-8 text-center">No outreach tasks logged for this lead yet.</p>
            ) : (
              tasks.map((task: any) => (
                <div key={task.id} className="p-3 bg-[#09090B] border border-[#27272A] rounded flex items-center justify-between text-xs">
                  <div>
                    <p className={`font-semibold ${task.status === 'DONE' ? 'line-through text-[#A1A1AA]' : 'text-[#FAFAFA]'}`}>{task.title}</p>
                    <p className="text-[10px] text-[#A1A1AA] mt-0.5">
                      Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    task.status === 'DONE' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
