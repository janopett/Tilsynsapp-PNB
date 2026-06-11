import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
  // Track coverage only for lib/ business logic.
  // Excluded: pdf/ (jsPDF/canvas), supabase/ (client init), i18n/ (React hooks),
  // stamp-gps.ts (Canvas API), auth-fetch.ts (use client + Supabase),
  // api-auth.ts / audit-log.ts (server-only Supabase infra),
  // sif/types.ts (pure type declarations, no executable code),
  // sif/extensions/ (thin RPC wrappers requiring live SIF infra),
  // sif/estate-service.ts / support-service.ts (thin SIF wrappers, same test
  //   infrastructure as the already-covered case-/document-service).
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "!lib/pdf/**",
    "!lib/supabase/**",
    "!lib/i18n/**",
    "!lib/stamp-gps.ts",
    "!lib/auth-fetch.ts",
    "!lib/api-auth.ts",
    "!lib/audit-log.ts",
    "!lib/sif/types.ts",
    "!lib/sif/extensions/**",
    "!lib/sif/estate-service.ts",
    "!lib/sif/support-service.ts",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  coverageThreshold: {
    global: {
      lines: 70,
      functions: 70,
    },
  },
};

export default createJestConfig(config);

