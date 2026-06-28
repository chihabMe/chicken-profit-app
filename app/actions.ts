"use server";

import { db } from "../db";
import { simulations } from "../db/schema";
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
