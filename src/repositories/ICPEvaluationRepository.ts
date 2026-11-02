/**
 * ICPEvaluationRepository
 * 
 * Persistent data layer for ICP qualification results.
 * Saves full evaluation outputs (qualified leads, rejected prospects, score breakdowns,
 * and rule evaluations) in `data/icp-evaluations.json` for reliable persistence without DB bottlenecks.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ICPBatchQualificationResult, ICPLeadResult } from '@/types/icp';

export class ICPEvaluationRepository {
  private dataDir: string;
  private filePath: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.filePath = path.join(this.dataDir, 'icp-evaluations.json');
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, JSON.stringify({}, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('Failed to initialize ICP evaluations storage file:', err);
    }
  }

  private readAll(): Record<string, ICPBatchQualificationResult> {
    try {
      this.ensureInitialized();
      if (!fs.existsSync(this.filePath)) return {};
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      if (!raw.trim()) return {};
      return JSON.parse(raw);
    } catch (err) {
      console.error('Error reading ICP evaluations from disk:', err);
      return {};
    }
  }

  private writeAll(evaluations: Record<string, ICPBatchQualificationResult>): void {
    try {
      this.ensureInitialized();
      fs.writeFileSync(this.filePath, JSON.stringify(evaluations, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing ICP evaluations to disk:', err);
    }
  }

  /**
   * Save evaluation result for a collection.
   */
  async saveCollectionEvaluation(
    collectionId: string,
    result: ICPBatchQualificationResult
  ): Promise<void> {
    const all = this.readAll();
    all[collectionId] = {
      ...result,
      collectionId,
    };
    this.writeAll(all);
  }

  /**
   * Save a single business evaluation into a collection.
   */
  async saveEvaluation(collectionId: string, lead: ICPLeadResult): Promise<void> {
    const all = this.readAll();
    if (!all[collectionId]) {
      all[collectionId] = {
        collectionId,
        icpId: lead.icpId,
        icpName: lead.icpName,
        totalEvaluated: 0,
        qualifiedCount: 0,
        rejectedCount: 0,
        matchRate: 0,
        qualified: [],
        rejected: [],
        evaluatedAt: new Date().toISOString(),
      };
    }

    const batch = all[collectionId];
    batch.qualified = batch.qualified.filter((q) => q.businessId !== lead.businessId);
    batch.rejected = batch.rejected.filter((r) => r.businessId !== lead.businessId);

    if (lead.matched) {
      batch.qualified.push(lead);
    } else {
      batch.rejected.push(lead);
    }

    batch.totalEvaluated = batch.qualified.length + batch.rejected.length;
    batch.qualifiedCount = batch.qualified.length;
    batch.rejectedCount = batch.rejected.length;
    batch.matchRate = batch.totalEvaluated > 0 ? Math.round((batch.qualifiedCount / batch.totalEvaluated) * 100) : 0;

    this.writeAll(all);
  }

  /**
   * Retrieve evaluation for a specific business ID within a collection.
   */
  async getEvaluation(collectionId: string, businessId: string): Promise<ICPLeadResult | null> {
    const batch = await this.getCollectionEvaluation(collectionId);
    if (!batch) return null;
    return batch.qualified.find((q) => q.businessId === businessId) ||
           batch.rejected.find((r) => r.businessId === businessId) || null;
  }

  /**
   * Retrieve evaluation result for a collection.
   */
  async getCollectionEvaluation(
    collectionId: string
  ): Promise<ICPBatchQualificationResult | null> {
    const all = this.readAll();
    return all[collectionId] || null;
  }

  /**
   * Retrieve evaluation for a specific business ID by searching across collection results.
   */
  async getBusinessEvaluation(businessId: string): Promise<ICPLeadResult | null> {
    const all = this.readAll();
    for (const batch of Object.values(all)) {
      const foundQualified = batch.qualified.find((q) => q.businessId === businessId || q.business?.id === businessId);
      if (foundQualified) return foundQualified;

      const foundRejected = batch.rejected.find((r) => r.businessId === businessId || r.business?.id === businessId);
      if (foundRejected) return foundRejected;
    }
    return null;
  }

  /**
   * List all stored evaluations.
   */
  async listAll(): Promise<Record<string, ICPBatchQualificationResult>> {
    return this.readAll();
  }

  /**
   * Delete an evaluation record.
   */
  async deleteEvaluation(collectionId: string): Promise<boolean> {
    const all = this.readAll();
    if (!all[collectionId]) return false;
    delete all[collectionId];
    this.writeAll(all);
    return true;
  }
}

export const icpEvaluationRepository = new ICPEvaluationRepository();
