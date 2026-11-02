import prisma from '@/lib/prisma';
import { Opportunity, OpportunityStatus, TaskPriority, ServiceType, Prisma } from '@prisma/client';

export class OpportunityRepository {
  /**
   * Log a new sales opportunity.
   */
  async create(
    businessId: string,
    data: Omit<Prisma.OpportunityCreateInput, 'business'>
  ): Promise<Opportunity> {
    return prisma.opportunity.create({
      data: {
        ...data,
        business: {
          connect: { id: businessId },
        },
      },
    });
  }

  /**
   * Find an opportunity by its ID.
   */
  async findById(id: string): Promise<Opportunity | null> {
    return prisma.opportunity.findUnique({
      where: { id },
      include: {
        business: true,
      },
    });
  }

  /**
   * Find all opportunities mapped to a specific business.
   */
  async findByBusinessId(businessId: string): Promise<Opportunity[]> {
    return prisma.opportunity.findMany({
      where: { businessId },
      orderBy: { opportunityScore: 'desc' },
    });
  }

  /**
   * List opportunities with sorting and status filters.
   */
  async list(filters: {
    status?: OpportunityStatus;
    priority?: TaskPriority;
    serviceType?: ServiceType;
    limit?: number;
    offset?: number;
  }): Promise<Opportunity[]> {
    const { status, priority, serviceType, limit = 50, offset = 0 } = filters;
    const where: Prisma.OpportunityWhereInput = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (serviceType) where.serviceType = serviceType;

    return prisma.opportunity.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        business: true,
      },
      orderBy: [
        { opportunityScore: 'desc' },
        { estimatedValue: 'desc' },
      ],
    });
  }

  /**
   * Update opportunity status, priority, or value.
   */
  async update(id: string, data: Prisma.OpportunityUpdateInput): Promise<Opportunity> {
    return prisma.opportunity.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete an opportunity.
   */
  async delete(id: string): Promise<Opportunity> {
    return prisma.opportunity.delete({
      where: { id },
    });
  }
}
