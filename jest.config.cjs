module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/jest-tests"],
  collectCoverageFrom: ["src/**/*.js"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  clearMocks: true,
  verbose: true,
};
