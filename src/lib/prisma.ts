import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let prisma: PrismaClient;

if (typeof window === 'undefined') {
  const prismaClientSingleton = () => {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/scrapeworld';
    if (!process.env.DATABASE_URL) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('DATABASE_URL is not defined in environment variables');
      }
    }
    const pool = new Pool({ 
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  };

  const globalForPrisma = globalThis as unknown as {
    prismaGlobal: PrismaClient | undefined;
  };

  prisma = globalForPrisma.prismaGlobal ?? prismaClientSingleton();

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaGlobal = prisma;
  }
} else {
  // Client-side dummy fallback to prevent client-side imports from throwing bundler errors
  prisma = {} as PrismaClient;
}

export default prisma;
