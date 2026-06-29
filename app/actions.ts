"use server";

import { db } from "../db";
import { simulations, flocks, flockLogs } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { getServerSession } from "next-auth/next";

export async function saveSimulation(name: string, simulationData: any) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    throw new Error("You must be logged in to save a simulation.");
  }

  await db.insert(simulations).values({
    userEmail: session.user.email,
    name,
    data: simulationData,
  });

  return { success: true };
}

export async function getSimulations() {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return [];
  }

  const userSimulations = await db
    .select()
    .from(simulations)
    .where(eq(simulations.userEmail, session.user.email))
    .orderBy(desc(simulations.createdAt));

  return userSimulations;
}

export async function createFlock(name: string, chicksBought: number, startDate: string) {
  const session = await getServerSession();
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  await db.insert(flocks).values({
    userEmail: session.user.email,
    name,
    chicksBought,
    startDate
  });
  return { success: true };
}

export async function getFlocks() {
  const session = await getServerSession();
  if (!session || !session.user?.email) return [];

  return db.select().from(flocks).where(eq(flocks.userEmail, session.user.email)).orderBy(desc(flocks.createdAt));
}

export async function logFlockDaily(flockId: number, dayNumber: number, mortality: number, feedIntakeKg: string, notes: string) {
  const session = await getServerSession();
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  await db.insert(flockLogs).values({
    flockId,
    dayNumber,
    mortality,
    feedIntakeKg,
    notes
  });
  return { success: true };
}

export async function getFlockLogs(flockId: number) {
  const session = await getServerSession();
  if (!session || !session.user?.email) return [];

  return db.select().from(flockLogs).where(eq(flockLogs.flockId, flockId)).orderBy(desc(flockLogs.dayNumber));
}
