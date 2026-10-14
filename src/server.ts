import "dotenv/config";
import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/database.js";

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL through Prisma 7.");

    const server = app.listen(env.PORT, () => {
      console.log(`API running at http://localhost:${env.PORT}`);
    });

    const shutdown = (signal: string) => {
      console.log(`${signal} received. Closing server...`);
      server.close(() => {
        void prisma.$disconnect().finally(() => process.exit(0));
      });
    };
    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Could not start the API. Check PostgreSQL and DATABASE_URL.");
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  }
}

void startServer();
