module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '@op-engineering/op-sqlite': '<rootDir>/jest/op-sqlite-mock.js',
  },
};
