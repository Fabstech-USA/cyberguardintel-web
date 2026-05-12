import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env.local, Vercel env, or CI secrets."
    );
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

function getGeneratedSchemaHash(): string {
  try {
    const schema = readFileSync(
      resolve(process.cwd(), "src/generated/prisma/schema.prisma"),
      "utf8"
    );
    return createHash("sha256").update(schema).digest("hex");
  } catch {
    return "unknown-generated-schema";
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaHash: string | undefined;
};

const schemaHash = getGeneratedSchemaHash();

const shouldReuseCachedClient =
  globalForPrisma.prisma !== undefined &&
  globalForPrisma.prismaSchemaHash === schemaHash;

export const prisma: PrismaClient =
  shouldReuseCachedClient && globalForPrisma.prisma
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaHash = schemaHash;
}

