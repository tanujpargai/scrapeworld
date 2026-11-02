import prisma from '@/lib/prisma';
import { Deal, Pipeline, Prisma } from '@prisma/client';

export class DealRepository {
  /**
   * Create a new sales deal for a business in a pipeline stage.
   */
  async create(
    businessId: string,
    pipelineId: string,
    data: Omit<Prisma.DealCreateInput, 'business' | 'pipeline'>
  ): Promise<Deal> {
    return prisma.deal.create({
      data: {
        ...data,
        business: {
          connect: { id: businessId },
        },
        pipeline: {
          connect: { id: pipelineId },
        },
      },
    });
  }

  /**
   * Find a deal by its ID.
   */
  async findById(id: string): Promise<Deal | null> {
    return prisma.deal.findUnique({
      where: { id },
      include: {
        business: true,
        pipeline: true,
      },
    });
  }

  /**
   * Update deal fields (title, value, probability, expected close date, status).
   */
  async update(id: string, data: Prisma.DealUpdateInput): Promise<Deal> {
    return prisma.deal.update({
      where: { id },
      data,
    });
  }

  /**
   * Move a deal to a different pipeline stage.
   */
  async updateStage(id: string, pipelineId: string): Promise<Deal> {
    return prisma.deal.update({
      where: { id },
      data: {
        pipeline: {
          connect: { id: pipelineId },
        },
      },
    });
  }

  /**
   * Delete a deal.
   */
  async delete(id: string): Promise<Deal> {
    return prisma.deal.delete({
      where: { id },
    });
  }

  /**
   * Fetch all pipeline stages with their associated deals (optimized for Kanban rendering).
   */
  async getKanbanPipeline(): Promise<(Pipeline & { deals: (Deal & { business: { name: string } })[] })[]> {
    return prisma.pipeline.findMany({
      orderBy: { position: 'asc' },
      include: {
        deals: {
          orderBy: { createdAt: 'desc' },
          include: {
            business: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Initialize default pipeline stages if empty.
   */
  async seedDefaultStages(): Promise<void> {
    const count = await prisma.pipeline.count();
    if (count > 0) return;

    const defaultStages = [
      'NEW',
      'QUALIFIED',
      'CONTACTED',
      'MEETING',
      'PROPOSAL',
      'NEGOTIATION',
      'WON',
      'LOST',
    ];

    const pipelineData = defaultStages.map((name, index) => ({
      name,
      position: index,
    }));

    await prisma.pipeline.createMany({
      data: pipelineData,
    });
  }
}
