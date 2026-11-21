import { PrismaClient } from "@prisma/client";

// Uma só instância em desenvolvimento (o hot reload do Next recria módulos).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
