// lib/prisma.js
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

function getDatasourceOptions() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return {};

  const url = new URL(databaseUrl);
  const connectionLimit = Number(process.env.PRISMA_CONNECTION_LIMIT || 2);
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1) {
    throw new Error("PRISMA_CONNECTION_LIMIT must be a positive integer.");
  }
  const configuredLimit = Number(url.searchParams.get("connection_limit") || connectionLimit);
  if (!Number.isInteger(configuredLimit) || configuredLimit < 1) {
    throw new Error("DATABASE_URL connection_limit must be a positive integer.");
  }
  url.searchParams.set("connection_limit", String(Math.min(configuredLimit, connectionLimit)));

  return { datasources: { db: { url: url.toString() } } };
}

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...getDatasourceOptions(),
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

globalForPrisma.prisma = basePrisma;
globalForPrisma.prismaClient = prisma;

// Export both default and named for compatibility
export { prisma };
export default prisma;
