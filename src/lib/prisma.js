// lib/prisma.js
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

const isTransientDatabaseError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === 'P1001'
    || error?.code === 'P1002'
    || message.includes('can\'t reach database server')
    || message.includes('connection reset')
    || message.includes('connection terminated')
    || message.includes('econnreset')
    || message.includes('etimedout');
};

const prisma = globalForPrisma.prismaClient ?? basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        let lastError;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            return await query(args);
          } catch (error) {
            lastError = error;
            if (!isTransientDatabaseError(error) || attempt === 2) throw error;
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          }
        }
        throw lastError;
      }
    }
  }
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
  globalForPrisma.prismaClient = prisma;
}

// Export both default and named for compatibility
export { prisma };
export default prisma;
