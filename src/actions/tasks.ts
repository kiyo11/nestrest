"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOwnerContext, getTaskActor } from "@/lib/context";
import { logActivity } from "@/lib/services/activity";

export async function assignTask(taskId: string, assigneeId: string | null) {
  const { propertyId } = await getOwnerContext();
  await db.cleaningTask.updateMany({ where: { id: taskId, propertyId }, data: { assigneeId } });
  revalidatePath("/tasks");
  return { ok: true };
}

const toggleSchema = z.object({ itemId: z.string(), done: z.boolean() });

// Helper/owner toggles a checklist item. First tick moves task TODO -> IN_PROGRESS.
export async function toggleChecklistItem(input: z.infer<typeof toggleSchema>) {
  const { user, propertyId } = await getTaskActor();
  const { itemId, done } = toggleSchema.parse(input);
  const item = await db.checklistItem.findUnique({ where: { id: itemId }, include: { task: true } });
  if (!item || item.task.propertyId !== propertyId) throw new Error("Checklist item not found.");
  // Helper may only touch tasks assigned to them.
  if (user.role === "HELPER" && item.task.assigneeId !== user.id)
    throw new Error("Not your task.");

  await db.checklistItem.update({ where: { id: itemId }, data: { done } });
  if (done && item.task.status === "TODO") {
    await db.cleaningTask.update({ where: { id: item.taskId }, data: { status: "IN_PROGRESS" } });
  }
  revalidatePath(`/helper/tasks/${item.taskId}`);
  revalidatePath("/tasks");
  return { ok: true };
}

export async function completeTask(taskId: string) {
  const { user, propertyId } = await getTaskActor();
  const task = await db.cleaningTask.findFirst({ where: { id: taskId, propertyId } });
  if (!task) throw new Error("Task not found.");
  if (user.role === "HELPER" && task.assigneeId !== user.id) throw new Error("Not your task.");
  await db.cleaningTask.update({ where: { id: taskId }, data: { status: "DONE" } });
  await logActivity({
    propertyId,
    bookingId: task.bookingId,
    type: "TASK_UPDATED",
    actorId: user.id,
    message: "Turnover marked complete",
  });
  revalidatePath(`/helper/tasks/${taskId}`);
  revalidatePath("/helper");
  revalidatePath("/tasks");
  return { ok: true };
}

export async function setTaskStatus(taskId: string, status: "TODO" | "IN_PROGRESS" | "DONE") {
  const { propertyId } = await getOwnerContext();
  await db.cleaningTask.updateMany({ where: { id: taskId, propertyId }, data: { status } });
  revalidatePath("/tasks");
  return { ok: true };
}
