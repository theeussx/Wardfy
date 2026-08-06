import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Instantiated only in database-backed mode. This keeps the demo server
 * runnable without PostgreSQL or a generated Prisma client during first setup.
 */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return globalForPrisma.prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.prisma) await globalForPrisma.prisma.$disconnect();
}
