/**
 * ICPRepository - Data Access Layer for ICP Profiles
 * 
 * Provides robust CRUD, duplication, toggling, and file-backed persistence.
 * Defaults to storing in `data/icp-profiles.json` with thread-safe file operations,
 * ensuring out-of-the-box functionality without external database dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ICPProfile } from '../types/icp';
import { 
  WebDevRedesignICP, 
  MarketingAgencyICP, 
  WebDevConversionICP, 
  MarketingAnalyticsOpportunityICP 
} from '../services/icp/sampleProfiles';

export class ICPRepository {
  private dataDir: string;
  private filePath: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.filePath = path.join(this.dataDir, 'icp-profiles.json');
    this.ensureInitialized();
  }

  /**
   * Ensures the data folder and storage file exist, seeding initial profiles if empty.
   */
  private ensureInitialized(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (!fs.existsSync(this.filePath)) {
        // Initialize with default agency profiles so users have starting examples
        const initialProfiles: ICPProfile[] = [
          WebDevRedesignICP, 
          MarketingAgencyICP,
          WebDevConversionICP,
          MarketingAnalyticsOpportunityICP
        ];
        fs.writeFileSync(this.filePath, JSON.stringify(initialProfiles, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('Failed to initialize ICP storage file:', err);
    }
  }

  /**
   * Reads all profiles from persistent storage.
   */
  private readAll(): ICPProfile[] {
    try {
      this.ensureInitialized();
      if (!fs.existsSync(this.filePath)) {
        return [];
      }
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      if (!raw.trim()) {
        return [];
      }
      return JSON.parse(raw) as ICPProfile[];
    } catch (err) {
      console.error('Error reading ICP profiles from disk:', err);
      return [];
    }
  }

  /**
   * Writes all profiles to persistent storage.
   */
  private writeAll(profiles: ICPProfile[]): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(profiles, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing ICP profiles to disk:', err);
      throw new Error('Failed to save ICP profiles to disk storage');
    }
  }

  /**
   * Lists all ICP profiles, optionally filtered by active status.
   */
  async list(onlyActive: boolean = false): Promise<ICPProfile[]> {
    const profiles = this.readAll();
    if (onlyActive) {
      return profiles.filter((p) => p.isActive !== false);
    }
    return profiles;
  }

  /**
   * Retrieves a single ICP profile by its unique ID.
   */
  async findById(id: string): Promise<ICPProfile | null> {
    const profiles = this.readAll();
    const found = profiles.find((p) => p.id === id);
    return found || null;
  }

  /**
   * Creates and persists a new ICP profile.
   */
  async create(data: Omit<ICPProfile, 'id'> & { id?: string }): Promise<ICPProfile> {
    const profiles = this.readAll();
    const id = data.id || `icp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newProfile: ICPProfile = {
      ...data,
      id,
      isActive: data.isActive !== undefined ? data.isActive : true,
      rules: data.rules || [],
    };

    profiles.push(newProfile);
    this.writeAll(profiles);
    return newProfile;
  }

  /**
   * Updates an existing ICP profile.
   */
  async update(id: string, updates: Partial<ICPProfile>): Promise<ICPProfile | null> {
    const profiles = this.readAll();
    const index = profiles.findIndex((p) => p.id === id);

    if (index === -1) {
      return null;
    }

    const updatedProfile: ICPProfile = {
      ...profiles[index],
      ...updates,
      id, // Preserve ID
    };

    profiles[index] = updatedProfile;
    this.writeAll(profiles);
    return updatedProfile;
  }

  /**
   * Deletes an ICP profile by ID.
   */
  async delete(id: string): Promise<boolean> {
    const profiles = this.readAll();
    const filtered = profiles.filter((p) => p.id !== id);

    if (filtered.length === profiles.length) {
      return false; // Not found
    }

    this.writeAll(filtered);
    return true;
  }

  /**
   * Duplicates an existing ICP profile.
   */
  async duplicate(id: string): Promise<ICPProfile | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const newId = `icp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const duplicated: ICPProfile = {
      ...existing,
      id: newId,
      name: `${existing.name} (Copy)`,
      rules: existing.rules.map((rule) => ({
        ...rule,
        id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      })),
    };

    const profiles = this.readAll();
    profiles.push(duplicated);
    this.writeAll(profiles);
    return duplicated;
  }

  /**
   * Toggles the active status of an ICP profile.
   */
  async toggleActive(id: string, isActive?: boolean): Promise<ICPProfile | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const nextState = isActive !== undefined ? isActive : !existing.isActive;
    return this.update(id, { isActive: nextState });
  }

  /**
   * Seeds demo default profiles if needed.
   */
  async seedDefaults(): Promise<ICPProfile[]> {
    const defaults = [WebDevRedesignICP, MarketingAgencyICP];
    this.writeAll(defaults);
    return defaults;
  }
}

export const icpRepository = new ICPRepository();

