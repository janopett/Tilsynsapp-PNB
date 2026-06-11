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
  // api-auth.ts (Next.js server middleware — requires live NextRequest/Supabase),
  // sif/types.ts (pure type declarations, zero executable code).
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "!lib/pdf/**",
    "!lib/supabase/**",
    "!lib/i18n/**",
    "!lib/stamp-gps.ts",
    "!lib/auth-fetch.ts",
    "!lib/api-auth.ts",
    "!lib/sif/types.ts",
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

