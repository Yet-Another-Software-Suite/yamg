import type { Config } from "jest"

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1", // match your tsconfig paths
  },
  transform: {
    "^.+\\.tsx?$": "ts-jest", // transform TS files
  },
  clearMocks: true,
}

export default config
