// Jest mock for react-native-cloud-storage — a Nitro/native module that
// cannot load in the Jest (node) environment, same situation as op-sqlite.
// Unit tests never exercise iCloud I/O; sync/icloud.ts is device-verified.
const CloudStorageScope = { AppData: 'app_data', Documents: 'documents' }

const CloudStorage = {
  isCloudAvailable: async () => false,
  exists: async () => false,
  readFile: async () => '',
  writeFile: async () => {},
  unlink: async () => {}
}

const useIsCloudAvailable = () => false

module.exports = { CloudStorage, CloudStorageScope, useIsCloudAvailable }
