import prisma from '@/lib_db/prisma';
import { Task, TaskType } from '@prisma/client';

export async function taskCreate<T>(taskType: TaskType, taskData: T) {
  const newTask = await prisma.task.create({
    data: {
      type: taskType,
      data: taskData as T,
    },
  });
  return newTask;
}

export async function getNextFirst<T>(taskTypes: TaskType[], maxAttempts = 3) {
  const task = (await prisma.task.findFirst({
    where: {
      type: {
        in: taskTypes,
      },
      isActive: false,
      isFail: false,
      completedAt: null,
      attempts: {
        lt: maxAttempts,
      },
    },
    orderBy: {
      id: 'asc',
    },
  })) as Task & {
    data: T;
  };

  if (!task) {
    return null;
  }

  return task;
}
export class TaskWorkWrap<T> {
  type: TaskType[];
  maxAttempts = 3;

  constructor(type: TaskType[], maxAttempts = 3) {
    this.type = type;
    this.maxAttempts = maxAttempts;
  }

  async handleWrapFirst(handle: (ctx: { task: Task & { data: T } }) => Promise<void>) {
    const ctx = {
      task: (await getNextFirst(this.type, this.maxAttempts)) as Task & { data: T },
    };

    if (ctx.task) {
      try {
        await prisma.task.update({
          where: {
            id: ctx.task.id,
          },
          data: {
            isActive: true,
            lastStartAt: new Date(),
          },
        });

        await handle(ctx);

        await prisma.task.delete({
          where: {
            id: ctx.task.id,
          },
        });
      } catch (error) {
        console.error(error);

        const errorEr = error as Error;
        let attemts = ctx.task.attempts;
        attemts += 1;

        if (attemts < this.maxAttempts) {
          await prisma.task.update({
            where: {
              id: ctx.task.id,
            },
            data: {
              isActive: false,
              attempts: attemts,
            },
          });
        } else {
          const errorText = errorEr.stack ? errorEr.stack : String(errorEr);
          await prisma.task.update({
            where: {
              id: ctx.task.id,
            },
            data: {
              attempts: attemts,
              errorText: errorText,
              isActive: false,
              isFail: true,
              failAt: new Date().toISOString(),
            },
          });
        }
      }
    }
  }
}
export class TaskModel<T> {
  model: Task & { data: T };

  constructor(model: Task & { data: T }) {
    this.model = model;
  }

  static wrap(model: Task) {
    return new TaskModel(model);
  }
}
