import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
  migrations: {
    // Changed this line to use npx instead of node --import
    seed: "npx tsx prisma/seed.ts",
  }
});