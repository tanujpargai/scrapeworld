import 'dotenv/config';
import prisma from './src/lib/prisma';

async function main() {
  try {
    console.log("Connecting to Database...");
    const count = await prisma.business.count();
    console.log(`Success! Business count: ${count}`);
  } catch (err) {
    console.error("Database connection failed:");
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
