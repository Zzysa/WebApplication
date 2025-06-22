module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.js"],
  collectCoverageFrom: [
    "controllers/**/*.js",
    "middleware/**/*.js",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  verbose: true,
  testTimeout: 30000,
  maxWorkers: 1,
};