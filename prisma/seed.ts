import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import * as bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL;
const schema = process.env.DATABASE_SCHEMA;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for seeding");
}

const adapter = new PrismaPg({ connectionString }, schema ? { schema } : {});
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = "admin@test.com";
const ADMIN_PASSWORD = "Admin123!";
const ADMIN_NAME = "Admin";

async function main() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingAdmin) {
    console.log("Admin user already exists, skipping seed.");
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
      role: "ADMIN",
    },
  });

  console.log("Admin user created successfully.");
  console.log("  Email:", ADMIN_EMAIL);
  console.log("  Password:", ADMIN_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
