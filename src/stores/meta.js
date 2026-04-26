import { defineStore } from 'pinia'
import { loadAll } from '../lib/storage.js'

export const useMetaStore = defineStore('meta', {
  state: () => {
    const data = loadAll()
    return {
      lastBackupAt: data.lastBackupAt,
      lastBackupCount: data.lastBackupCount,
    }
  },
  actions: {
    refresh() {
      const data = loadAll()
      this.lastBackupAt = data.lastBackupAt
      this.lastBackupCount = data.lastBackupCount
    },
  },
})
