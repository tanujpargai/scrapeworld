import prisma from '@/lib/prisma';
import { Task, TaskStatus, TaskPriority, Prisma } from '@prisma/client';

export class TaskRepository {
  /**
   * Create a new task.
   */
  async create(
    businessId: string,
    data: Omit<Prisma.TaskCreateInput, 'business'>
  ): Promise<Task> {
    return prisma.task.create({
      data: {
        ...data,
        business: {
          connect: { id: businessId },
        },
      },
    });
  }

  /**
   * Find a task by its ID.
   */
  async findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({
      where: { id },
      include: {
        business: true,
      },
    });
  }

  /**
   * Find all tasks related to a business.
   */
  async findByBusinessId(businessId: string): Promise<Task[]> {
    return prisma.task.findMany({
      where: { businessId },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Update task status, due dates, priority, or descriptions.
   */
  async update(id: string, data: Prisma.TaskUpdateInput): Promise<Task> {
    const updatedData = { ...data };
    
    // Auto-update completedAt based on status transition to DONE
    const statusValue = typeof data.status === 'object' && data.status && 'set' in data.status
      ? data.status.set
      : data.status;

    if (statusValue === TaskStatus.DONE) {
      updatedData.completedAt = new Date();
    } else if (statusValue) {
      updatedData.completedAt = null;
    }

    return prisma.task.update({
      where: { id },
      data: updatedData,
    });
  }

  /**
   * List tasks by status or priority.
   */
  async list(filters: {
    status?: TaskStatus;
    priority?: TaskPriority;
    isOverdue?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    const { status, priority, isOverdue, limit = 50, offset = 0 } = filters;
    const where: Prisma.TaskWhereInput = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    
    if (isOverdue) {
      where.status = { not: TaskStatus.DONE };
      where.dueDate = { lt: new Date() };
    }

    return prisma.task.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        business: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Delete a task.
   */
  async delete(id: string): Promise<Task> {
    return prisma.task.delete({
      where: { id },
    });
  }
}
