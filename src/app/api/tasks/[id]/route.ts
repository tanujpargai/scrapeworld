import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CRMService } from '@/services/CRMService';
import { z } from 'zod';
import { TaskPriority, TaskStatus } from '@prisma/client';

const crmService = new CRMService();

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error: any) {
    console.error(`API Error in GET /api/tasks/${id}:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const validated = updateTaskSchema.parse(body);

    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // If only completing the task, delegate to CRMService to ensure activity logging is consistent
    if (validated.status === TaskStatus.DONE && existingTask.status !== TaskStatus.DONE) {
      const task = await crmService.completeTask(id);
      
      // Update other fields if provided
      const otherUpdates: any = {};
      if (validated.title !== undefined) otherUpdates.title = validated.title;
      if (validated.description !== undefined) otherUpdates.description = validated.description;
      if (validated.priority !== undefined) otherUpdates.priority = validated.priority;
      if (validated.dueDate !== undefined) {
        otherUpdates.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
      }

      if (Object.keys(otherUpdates).length > 0) {
        const finalTask = await prisma.task.update({
          where: { id },
          data: otherUpdates,
        });
        return NextResponse.json({
          success: true,
          message: 'Task completed and updated successfully',
          task: finalTask,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Task marked as completed',
        task,
      });
    }

    // General updates
    const data: any = {};
    if (validated.title !== undefined) data.title = validated.title;
    if (validated.description !== undefined) data.description = validated.description;
    if (validated.priority !== undefined) data.priority = validated.priority;
    if (validated.status !== undefined) {
      data.status = validated.status;
      if (validated.status === TaskStatus.DONE) {
        data.completedAt = new Date();
      } else {
        data.completedAt = null;
      }
    }
    if (validated.dueDate !== undefined) {
      data.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask,
    });
  } catch (error: any) {
    console.error(`API Error in PATCH /api/tasks/${id}:`, error);
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error: any) {
    console.error(`API Error in DELETE /api/tasks/${id}:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
