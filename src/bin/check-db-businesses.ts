import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  const industries = await prisma.business.groupBy({
    by: ['industry'],
    _count: {
      id: true,
    },
  });
  console.log('Industries in DB:', industries);

  const sample = await prisma.business.findMany({
    take: 10,
    select: {
      name: true,
      industry: true,
      city: true,
      website: true,
    },
  });
  console.log('Sample Businesses:', sample);
}

main().finally(() => prisma.$disconnect());
