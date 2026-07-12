module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '@op-engineering/op-sqlite': '<rootDir>/jest/op-sqlite-mock.js',
    'react-native-cloud-storage': '<rootDir>/jest/cloud-storage-mock.js'
  }
}
