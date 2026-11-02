import prisma from '@/lib/prisma';
import { Activity, ActivityType, Prisma } from '@prisma/client';

export class ActivityRepository {
  /**
   * Log an activity event.
   */
  async log(
    type: ActivityType,
    businessId?: string | null,
    metadata?: Prisma.InputJsonValue
  ): Promise<Activity> {
    const data: Prisma.ActivityCreateInput = {
      type,
      metadata,
    };

    if (businessId) {
      data.business = {
        connect: { id: businessId },
      };
    }

    return prisma.activity.create({
      data,
    });
  }

  /**
   * Fetch recent activities, optionally filtered by a specific business.
   */
  async list(filters: {
    businessId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Activity[]> {
    const { businessId, limit = 50, offset = 0 } = filters;
    const where: Prisma.ActivityWhereInput = {};

    if (businessId) {
      where.businessId = businessId;
    }

    return prisma.activity.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: {
            name: true,
          },
        },
      },
    });
  }
}
