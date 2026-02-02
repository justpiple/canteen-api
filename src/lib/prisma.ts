import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma-client";
import { env } from "@/env";

const connectionString = `${env.DATABASE_URL}`;

const adapter = new PrismaPg(
  { connectionString },
  { schema: env.DATABASE_SCHEMA }
);
const prisma = new PrismaClient({ adapter });

export { prisma };
