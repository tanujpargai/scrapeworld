import prisma from '@/lib/prisma';
import { Website, WebsiteIssue, Prisma } from '@prisma/client';

export class WebsiteRepository {
  /**
   * Get website audit details for a specific business.
   */
  async findByBusinessId(businessId: string): Promise<(Website & { issues: WebsiteIssue[] }) | null> {
    return prisma.website.findUnique({
      where: { businessId },
      include: {
        issues: true,
      },
    });
  }

  /**
   * Upsert website audit data.
   */
  async upsert(
    businessId: string,
    url: string,
    domain: string,
    data: Omit<Prisma.WebsiteCreateInput, 'business' | 'url' | 'domain'>
  ): Promise<Website> {
    return prisma.website.upsert({
      where: { businessId },
      create: {
        ...data,
        url,
        domain,
        business: {
          connect: { id: businessId },
        },
      },
      update: {
        ...data,
        url,
        domain,
      },
    });
  }

  /**
   * Log an issue detected on the audited website.
   */
  async addIssue(websiteId: string, issue: Omit<Prisma.WebsiteIssueCreateInput, 'website'>): Promise<WebsiteIssue> {
    return prisma.websiteIssue.create({
      data: {
        ...issue,
        website: {
          connect: { id: websiteId },
        },
      },
    });
  }

  /**
   * Bulk save issues for a website.
   */
  async saveIssues(websiteId: string, issues: Omit<Prisma.WebsiteIssueCreateManyInput, 'websiteId'>[]): Promise<Prisma.BatchPayload> {
    // Delete old issues before saving new ones to keep data clean
    await prisma.websiteIssue.deleteMany({
      where: { websiteId },
    });

    const dataWithWebsiteId = issues.map((issue) => ({
      ...issue,
      websiteId,
    }));

    return prisma.websiteIssue.createMany({
      data: dataWithWebsiteId,
    });
  }

  /**
   * Clear issues for a website.
   */
  async clearIssues(websiteId: string): Promise<Prisma.BatchPayload> {
    return prisma.websiteIssue.deleteMany({
      where: { websiteId },
    });
  }
}
