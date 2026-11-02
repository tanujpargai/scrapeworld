import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CRMService } from '@/services/CRMService';
import { z } from 'zod';
import { TaskPriority, TaskStatus } from '@prisma/client';

const crmService = new CRMService();

const createTaskSchema = z.object({
  businessId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');
    const status = searchParams.get('status') as TaskStatus | null;
    const priority = searchParams.get('priority') as TaskPriority | null;

    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }

    if (view === 'today') {
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      where.dueDate = {
        lte: todayEnd,
      };
      where.status = {
        not: TaskStatus.DONE,
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { priority: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error: any) {
    console.error('API Error in GET /api/tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = createTaskSchema.parse(body);

    const task = await crmService.createTask(
      validated.businessId,
      validated.title,
      validated.description,
      validated.priority,
      validated.dueDate ? new Date(validated.dueDate) : undefined
    );

    return NextResponse.json({
      success: true,
      message: 'Task created successfully',
      task,
    });
  } catch (error: any) {
    console.error('API Error in POST /api/tasks:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
