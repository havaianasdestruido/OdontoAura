module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        module: 'node16',
        moduleResolution: 'node16',
        esModuleInterop: true,
        allowImportingTsExtensions: false,
        rootDir: './src',
      },
    }],
  },
};
