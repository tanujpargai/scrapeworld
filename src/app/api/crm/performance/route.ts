import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SegmentationService, SegmentId } from '@/services/SegmentationService';
import { OutreachChannel, OutreachOutcome, Deal } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const deals = await prisma.deal.findMany({
      include: {
        pipeline: true,
        business: {
          include: {
            websiteData: true,
            leadIntelligence: true,
            analyses: true,
            socialProfiles: true,
            opportunities: true,
          }
        }
      }
    });

    // Required Segments from user instruction
    const requiredSegments: SegmentId[] = [
      'READY_TO_CONTACT',
      'NO_WEBSITE',
      'HIGH_REVIEWS_POOR_WEBSITE',
      'HIGH_SOCIAL_WEAK_WEBSITE',
      'WEBSITE_WITHOUT_SEO',
      'OUTDATED_WEBSITE',
      'OWNER_FOUND',
      'VERIFIED_WEBSITE',
      'HIGH_ABILITY_TO_PAY',
    ];

    // Segment Stats Map
    const segmentStats = new Map<SegmentId, any>();
    requiredSegments.forEach(seg => {
      segmentStats.set(seg, {
        id: seg,
        name: SegmentationService.getSegmentName(seg),
        totalLeads: 0,
        contacted: 0,
        replies: 0,
        meetings: 0,
        proposals: 0,
        clientsWon: 0,
        
        // Sums for averages
        sumOppScore: 0,
        sumReachability: 0,
        sumClosingProb: 0,
        atpCounts: { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 }
      });
    });

    const allSegmentsData = await SegmentationService.getCollectionSegments('');
    
    deals.forEach(deal => {
      const biz = deal.business;
      const segments = SegmentationService.getBusinessSegments(biz);
      
      const isContacted = deal.pipeline.name !== 'NEW' && deal.pipeline.name !== 'QUALIFIED';
      const isReplied = deal.outreachOutcome === 'INTERESTED' || ['MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'].includes(deal.pipeline.name);
      const isMeeting = ['MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON'].includes(deal.pipeline.name);
      const isProposal = ['PROPOSAL', 'NEGOTIATION', 'WON'].includes(deal.pipeline.name);
      const isWon = deal.pipeline.name === 'WON';

      segments.forEach(seg => {
        if (!requiredSegments.includes(seg as SegmentId)) return;
        const stat = segmentStats.get(seg as SegmentId);
        if (!stat) return;

        if (isContacted) stat.contacted++;
        if (isReplied) stat.replies++;
        if (isMeeting) stat.meetings++;
        if (isProposal) stat.proposals++;
        if (isWon) stat.clientsWon++;

        // Add sums
        const intel = biz.leadIntelligence;
        if (intel) {
          stat.sumOppScore += intel.opportunityScore || 0;
          stat.sumReachability += intel.reachabilityScore || 0;
          stat.sumClosingProb += intel.closingProbability || 0;
          
          const atp = intel.abilityToPay?.toUpperCase() || 'UNKNOWN';
          if (stat.atpCounts[atp] !== undefined) stat.atpCounts[atp]++;
        }
      });
    });

    // Finalize Segment Stats
    const segmentResults = Array.from(segmentStats.values()).map(stat => {
      const totalLeads = allSegmentsData.find(a => a.segmentId === stat.id)?.leadCount || 0;
      
      const avgOppScore = stat.contacted > 0 ? Math.round(stat.sumOppScore / stat.contacted) : 0;
      const avgReachability = stat.contacted > 0 ? Math.round(stat.sumReachability / stat.contacted) : 0;
      const avgClosingProb = stat.contacted > 0 ? Math.round(stat.sumClosingProb / stat.contacted) : 0;
      
      let majorityAbility = 'LOW';
      let maxCount = -1;
      for (const [key, val] of Object.entries(stat.atpCounts)) {
        if ((val as number) > maxCount && key !== 'UNKNOWN') {
          maxCount = val as number;
          majorityAbility = key;
        }
      }

      return {
        id: stat.id,
        name: stat.name,
        totalLeads: Math.max(totalLeads, stat.contacted),
        contacted: stat.contacted,
        replies: stat.replies,
        replyRate: stat.contacted > 0 ? Math.round((stat.replies / stat.contacted) * 100) : 0,
        meetings: stat.meetings,
        meetingRate: stat.contacted > 0 ? Math.round((stat.meetings / stat.contacted) * 100) : 0,
        proposals: stat.proposals,
        proposalRate: stat.contacted > 0 ? Math.round((stat.proposals / stat.contacted) * 100) : 0,
        clientsWon: stat.clientsWon,
        closeRate: stat.contacted > 0 ? Math.round((stat.clientsWon / stat.contacted) * 100) : 0,
        avgOpportunityScore: avgOppScore,
        avgReachability: avgReachability,
        avgAbilityToPay: majorityAbility,
        avgClosingProbability: avgClosingProb,
      };
    });

    // Channel Performance
    const channelStats = {
      EMAIL: { attempts: 0, replies: 0, meetings: 0, wins: 0 },
      WHATSAPP: { attempts: 0, replies: 0, meetings: 0, wins: 0 },
      PHONE: { attempts: 0, replies: 0, meetings: 0, wins: 0 },
      LINKEDIN: { attempts: 0, replies: 0, meetings: 0, wins: 0 },
      INSTAGRAM: { attempts: 0, replies: 0, meetings: 0, wins: 0 },
    };

    deals.forEach(deal => {
      if (!deal.outreachChannel) return;
      const ch = channelStats[deal.outreachChannel as keyof typeof channelStats];
      if (!ch) return;

      const isContacted = deal.pipeline.name !== 'NEW' && deal.pipeline.name !== 'QUALIFIED';
      if (!isContacted) return;

      const isReplied = deal.outreachOutcome === 'INTERESTED' || ['MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'].includes(deal.pipeline.name);
      const isMeeting = ['MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON'].includes(deal.pipeline.name);
      const isWon = deal.pipeline.name === 'WON';

      ch.attempts++;
      if (isReplied) ch.replies++;
      if (isMeeting) ch.meetings++;
      if (isWon) ch.wins++;
    });

    const channelResults = Object.entries(channelStats).map(([channel, stats]) => ({
      channel,
      ...stats,
      replyRate: stats.attempts > 0 ? Math.round((stats.replies / stats.attempts) * 100) : 0,
      closeRate: stats.attempts > 0 ? Math.round((stats.wins / stats.attempts) * 100) : 0,
    }));

    const getTop5 = (sortFn: (a: any, b: any) => number) => {
      return [...segmentResults].sort(sortFn).slice(0, 5).filter(s => s.contacted > 0);
    };

    const topSegments = {
      byReplyRate: getTop5((a, b) => b.replyRate - a.replyRate),
      byMeetingRate: getTop5((a, b) => b.meetingRate - a.meetingRate),
      byCloseRate: getTop5((a, b) => b.closeRate - a.closeRate),
    };

    return NextResponse.json({
      success: true,
      segmentPerformance: segmentResults,
      channelPerformance: channelResults,
      topSegments,
    });
  } catch (error: any) {
    console.error('API Error in /api/crm/performance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
