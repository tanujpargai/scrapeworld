import prisma from '@/lib/prisma';
import { AIReport, ReportType, Prisma } from '@prisma/client';

export class AIReportRepository {
  /**
   * Save a newly generated AI report.
   */
  async create(
    businessId: string,
    data: Omit<Prisma.AIReportCreateInput, 'business'>
  ): Promise<AIReport> {
    return prisma.aIReport.create({
      data: {
        ...data,
        business: {
          connect: { id: businessId },
        },
      },
    });
  }

  /**
   * Find all AI reports associated with a specific business.
   */
  async findByBusinessId(businessId: string): Promise<AIReport[]> {
    return prisma.aIReport.findMany({
      where: { businessId },
      orderBy: { generatedAt: 'desc' },
    });
  }

  /**
   * Get an AI report by its ID.
   */
  async findById(id: string): Promise<AIReport | null> {
    return prisma.aIReport.findUnique({
      where: { id },
    });
  }

  /**
   * Delete an AI report.
   */
  async delete(id: string): Promise<AIReport> {
    return prisma.aIReport.delete({
      where: { id },
    });
  }
}
