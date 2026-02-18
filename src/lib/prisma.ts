import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma-client";
import { env } from "@/env";

const adapter = new PrismaPg(
  { connectionString: env.DATABASE_URL },
  { schema: env.DATABASE_SCHEMA }
);
const prisma = new PrismaClient({ adapter });

export { prisma };
