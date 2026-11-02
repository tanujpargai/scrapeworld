import prisma from '@/lib/prisma';
import { Collection, ScrapeResult, Prisma } from '@prisma/client';

export class CollectionRepository {
  /**
   * Register a new collection search run.
   */
  async create(data: Prisma.CollectionCreateInput): Promise<Collection> {
    return prisma.collection.create({
      data,
    });
  }

  /**
   * Find a collection by its ID.
   */
  async findById(id: string): Promise<(Collection & { scrapeResults: ScrapeResult[] }) | null> {
    return prisma.collection.findUnique({
      where: { id },
      include: {
        scrapeResults: true,
      },
    });
  }

  /**
   * Update the status, item counts, or timelines of a running job.
   */
  async update(id: string, data: Prisma.CollectionUpdateInput): Promise<Collection> {
    return prisma.collection.update({
      where: { id },
      data,
    });
  }

  /**
   * Add a raw scraped data record to the collection.
   */
  async addScrapeResult(
    collectionId: string,
    rawData: Prisma.InputJsonValue
  ): Promise<ScrapeResult> {
    return prisma.scrapeResult.create({
      data: {
        rawData,
        collection: {
          connect: { id: collectionId },
        },
      },
    });
  }

  /**
   * Fetch all raw results of a collection.
   */
  async getResults(collectionId: string): Promise<ScrapeResult[]> {
    return prisma.scrapeResult.findMany({
      where: { collectionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Mark a scrape result as processed.
   */
  async markResultProcessed(id: string): Promise<ScrapeResult> {
    return prisma.scrapeResult.update({
      where: { id },
      data: { processed: true },
    });
  }

  /**
   * List recent collections.
   */
  async list(limit = 20, offset = 0): Promise<Collection[]> {
    return prisma.collection.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
