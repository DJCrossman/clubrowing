import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { envVars } from "./env";

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const db =
	globalForPrisma.prisma ??
	new PrismaClient({
		// A dummy instance's database is a plain Postgres container (host `postgres`,
		// see docker-compose.yml), which Neon's WebSocket driver can't reach.
		adapter: envVars.DATABASE_URL?.includes("@postgres:5432/")
			? new PrismaPg({ connectionString: envVars.DATABASE_URL })
			: new PrismaNeon({
					connectionString: envVars.DATABASE_URL,
				}),
	});

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = db;
}
