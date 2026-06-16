// Jest mock for @op-engineering/op-sqlite.
// op-sqlite is a native module shipped as untranspiled ESM, so it cannot be
// loaded in the Jest (node) environment. This stub lets modules that import
// op-sqlite (e.g. schema.ts) be imported without crashing, so the pure
// row-mapping functions in repository.ts can be unit-tested. The DB-backed
// CRUD functions are covered by the device smoke test in Phase 7.
const stubResult = { rowsAffected: 0, rows: [] }

function makeDb() {
  const db = {
    execute: () => stubResult,
    executeSync: () => stubResult,
    close: () => {},
    delete: () => {},
    transaction: async () => {}
  }
  return db
}

const open = () => makeDb()
const openSync = () => makeDb()

module.exports = { open, openSync }
