import prisma from '@/lib/prisma';
import { Deal, Task, Pipeline, TaskPriority, TaskStatus, ActivityType } from '@prisma/client';

export class CRMService {
  /**
   * Seed default pipeline stages if not present.
   */
  async seedDefaultStages(): Promise<Pipeline[]> {
    const defaultStages = [
      { name: 'NEW', position: 0 },
      { name: 'QUALIFIED', position: 1 },
      { name: 'CONTACTED', position: 2 },
      { name: 'MEETING', position: 3 },
      { name: 'PROPOSAL', position: 4 },
      { name: 'NEGOTIATION', position: 5 },
      { name: 'WON', position: 6 },
      { name: 'LOST', position: 7 },
    ];

    const stages: Pipeline[] = [];
    for (const stage of defaultStages) {
      let existing = await prisma.pipeline.findFirst({
        where: { name: stage.name },
      });
      if (!existing) {
        existing = await prisma.pipeline.create({
          data: stage,
        });
      }
      stages.push(existing);
    }
    return stages;
  }

  /**
   * Get default probability based on stage name
   */
  getStageProbability(stageName: string): number {
    switch (stageName.toUpperCase()) {
      case 'NEW': return 10;
      case 'QUALIFIED': return 25;
      case 'CONTACTED': return 40;
      case 'MEETING': return 55;
      case 'PROPOSAL': return 70;
      case 'NEGOTIATION': return 85;
      case 'WON': return 100;
      case 'LOST': return 0;
      default: return 30;
    }
  }

  /**
   * Calculate adjusted win confidence: based on Stage Probability
   */
  calculateWinConfidence(stageProbability: number): number {
    return stageProbability;
  }

  /**
   * Create a new sales deal for a business.
   */
  async createDeal(
    businessId: string,
    pipelineId: string,
    title: string,
    value?: number
  ): Promise<Deal> {
    const pipeline = await prisma.pipeline.findUnique({ where: { id: pipelineId } });
    if (!pipeline) throw new Error('Pipeline stage not found');

    const stageProb = this.getStageProbability(pipeline.name);
    const winConfidence = this.calculateWinConfidence(stageProb);

    const deal = await prisma.deal.create({
      data: {
        title,
        value: value ?? null,
        probability: winConfidence,
        status: pipeline.name === 'WON' ? 'WON' : pipeline.name === 'LOST' ? 'LOST' : 'OPEN',
        business: { connect: { id: businessId } },
        pipeline: { connect: { id: pipelineId } },
      },
    });

    // Log Activity
    await prisma.activity.create({
      data: {
        businessId,
        type: 'DEAL_CREATED',
        metadata: {
          dealId: deal.id,
          title: deal.title,
          value: deal.value,
          probability: deal.probability,
          stage: pipeline.name,
        },
      },
    });

    return deal;
  }

  /**
   * Move deal between pipeline stages or update deal details.
   */
  async updateDeal(dealId: string, data: any): Promise<Deal> {
    const existingDeal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { pipeline: true },
    });
    if (!existingDeal) throw new Error('Deal not found');

    let updatedProbability = existingDeal.probability;
    let newStatus = existingDeal.status;
    let oldStageName = existingDeal.pipeline.name;
    let newStageName = oldStageName;

    if (data.pipelineId && data.pipelineId !== existingDeal.pipelineId) {
      const newPipeline = await prisma.pipeline.findUnique({ where: { id: data.pipelineId } });
      if (!newPipeline) throw new Error('New pipeline stage not found');

      newStageName = newPipeline.name;
      const stageProb = this.getStageProbability(newPipeline.name);
      
      updatedProbability = this.calculateWinConfidence(stageProb);
      newStatus = newPipeline.name === 'WON' ? 'WON' : newPipeline.name === 'LOST' ? 'LOST' : 'OPEN';
    }

    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        ...data,
        probability: updatedProbability,
        status: newStatus,
      },
      include: { pipeline: true },
    });

    // Log Activity for updates
    await prisma.activity.create({
      data: {
        businessId: updatedDeal.businessId,
        type: 'DEAL_UPDATED',
        metadata: {
          dealId: updatedDeal.id,
          title: updatedDeal.title,
          value: updatedDeal.value,
          oldStage: oldStageName,
          newStage: newStageName,
          probability: updatedDeal.probability,
          status: updatedDeal.status,
        },
      },
    });

    return updatedDeal;
  }

  /**
   * Automatically generate a deal from high-priority leads.
   */
  async createFromLead(businessId: string): Promise<Deal> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { leadIntelligence: true },
    });
    if (!business) throw new Error('Business not found');

    // Ensure pipeline stages are seeded
    const stages = await this.seedDefaultStages();
    const newStage = stages.find(s => s.name === 'NEW') || stages[0];

    const leadIntel = business.leadIntelligence;
    const dealTitle = `${business.name} - Sales Opportunity`;
    const dealValue = null;

    // 1. Create the Deal
    const deal = await this.createDeal(businessId, newStage.id, dealTitle, dealValue ?? undefined);

    // 2. Create high priority follow-up task
    const taskDueDate = new Date();
    taskDueDate.setDate(taskDueDate.getDate() + 3); // Due in 3 days

    await this.createTask(
      businessId,
      `Schedule discovery call with ${business.name}`,
      `Lead has score of ${leadIntel?.leadScore ?? 'N/A'} (Tier ${leadIntel?.leadTier ?? 'N/A'}) with a buying intent of ${leadIntel?.buyingIntent ?? 'N/A'}. Suggested outreach angle: ${leadIntel?.leadSummary || ''}`,
      TaskPriority.HIGH,
      taskDueDate
    );

    return deal;
  }

  /**
   * Create a new follow-up task.
   */
  async createTask(
    businessId: string,
    title: string,
    description?: string,
    priority: TaskPriority = TaskPriority.MEDIUM,
    dueDate?: Date
  ): Promise<Task> {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        status: TaskStatus.TODO,
        dueDate,
        business: { connect: { id: businessId } },
      },
    });

    // Log Activity
    await prisma.activity.create({
      data: {
        businessId,
        type: 'TASK_CREATED',
        metadata: {
          taskId: task.id,
          title: task.title,
          priority: task.priority,
          dueDate: task.dueDate,
        },
      },
    });

    return task;
  }

  /**
   * Complete a task.
   */
  async completeTask(taskId: string): Promise<Task> {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.DONE,
        completedAt: new Date(),
      },
    });

    // Log Activity
    await prisma.activity.create({
      data: {
        businessId: task.businessId,
        type: 'TASK_COMPLETED',
        metadata: {
          taskId: task.id,
          title: task.title,
          completedAt: task.completedAt,
        },
      },
    });

    return task;
  }
}
