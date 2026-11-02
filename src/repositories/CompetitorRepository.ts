import prisma from '@/lib/prisma';
import { Competitor, CompetitorAnalysis, Prisma } from '@prisma/client';

export class CompetitorRepository {
  /**
   * Associate a competitor business with a target business.
   */
  async addCompetitor(
    businessId: string,
    competitorBusinessId: string,
    relationshipScore?: number
  ): Promise<Competitor> {
    return prisma.competitor.create({
      data: {
        businessId,
        competitorBusinessId,
        relationshipScore,
      },
    });
  }

  /**
   * Get all competitor relationships for a business.
   */
  async getCompetitors(businessId: string): Promise<Competitor[]> {
    return prisma.competitor.findMany({
      where: { businessId },
      include: {
        competitorBusiness: true,
      },
    });
  }

  /**
   * Remove a competitor relationship.
   */
  async removeCompetitor(id: string): Promise<Competitor> {
    return prisma.competitor.delete({
      where: { id },
    });
  }

  /**
   * Save a competitor comparative analysis report.
   */
  async saveAnalysis(
    businessId: string,
    competitorId: string,
    data: Omit<Prisma.CompetitorAnalysisCreateInput, 'business' | 'competitor'>
  ): Promise<CompetitorAnalysis> {
    return prisma.competitorAnalysis.create({
      data: {
        ...data,
        business: {
          connect: { id: businessId },
        },
        competitor: {
          connect: { id: competitorId },
        },
      },
    });
  }

  /**
   * Fetch all gap analyses for a business.
   */
  async getAnalyses(businessId: string): Promise<CompetitorAnalysis[]> {
    return prisma.competitorAnalysis.findMany({
      where: { businessId },
      include: {
        competitor: {
          include: {
            competitorBusiness: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
