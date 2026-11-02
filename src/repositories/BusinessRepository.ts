import prisma from '@/lib/prisma';
import { Business, BusinessStatus, Prisma } from '@prisma/client';

export class BusinessRepository {
  /**
   * Create a new business profile.
   */
  async create(data: Prisma.BusinessCreateInput): Promise<Business> {
    return prisma.business.create({
      data,
    });
  }

  /**
   * Find a business by its unique ID, fetching all rich intelligence relationships.
   */
  async findById(id: string) {
    return prisma.business.findUnique({
      where: { id },
      include: {
        websiteData: {
          include: {
            issues: true,
          },
        },
        socialProfiles: true,
        contacts: true,
        aiReports: true,
        opportunities: true,
        deals: true,
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
        },
        analyses: {
          include: {
            competitor: {
              include: {
                competitorBusiness: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find a business by its unique slug.
   */
  async findBySlug(slug: string): Promise<Business | null> {
    return prisma.business.findUnique({
      where: { slug },
    });
  }

  /**
   * List businesses with support for dynamic filtering and pagination.
   */
  async list(filters: {
    status?: BusinessStatus;
    city?: string;
    industry?: string;
    hasWebsite?: boolean;
    hasEmail?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Business[]> {
    const { status, city, industry, hasWebsite, hasEmail, limit = 50, offset = 0 } = filters;

    const where: Prisma.BusinessWhereInput = {};

    if (status) where.status = status;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (industry) where.industry = { contains: industry, mode: 'insensitive' };
    
    if (hasWebsite !== undefined) {
      where.website = hasWebsite ? { not: null } : null;
    }
    
    if (hasEmail !== undefined) {
      where.email = hasEmail ? { not: null } : null;
    }

    return prisma.business.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update business data.
   */
  async update(id: string, data: Prisma.BusinessUpdateInput): Promise<Business> {
    return prisma.business.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a business profile.
   */
  async delete(id: string): Promise<Business> {
    return prisma.business.delete({
      where: { id },
    });
  }

  /**
   * Count total businesses satisfying filters.
   */
  async count(filters: {
    status?: BusinessStatus;
    city?: string;
    industry?: string;
  }): Promise<number> {
    const { status, city, industry } = filters;
    const where: Prisma.BusinessWhereInput = {};

    if (status) where.status = status;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (industry) where.industry = { contains: industry, mode: 'insensitive' };

    return prisma.business.count({
      where,
    });
  }
}
