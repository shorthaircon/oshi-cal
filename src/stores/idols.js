import { defineStore } from 'pinia'
import { loadAll, saveAll } from '../lib/storage.js'
import { uuid } from '../lib/uuid.js'

export const useIdolsStore = defineStore('idols', {
  state: () => {
    const data = loadAll()
    return { idols: data.idols }
  },

  getters: {
    usedColors: (state) => state.idols.map(i => i.color),
    byId: (state) => (id) => state.idols.find(i => i.id === id),
  },

  actions: {
    add({ name, color }) {
      const idol = {
        id: uuid(),
        name: name.trim(),
        color,
        avatar: null,
      }
      this.idols.push(idol)
      this._persist()
      return idol
    },

    update(id, patch) {
      const idol = this.idols.find(i => i.id === id)
      if (!idol) return
      if (patch.name !== undefined) idol.name = patch.name.trim()
      if (patch.color !== undefined) idol.color = patch.color
      this._persist()
    },

    remove(id) {
      const idx = this.idols.findIndex(i => i.id === id)
      if (idx === -1) return
      this.idols.splice(idx, 1)
      this._persist()
    },

    reload() {
      this.idols = loadAll().idols
    },

    _persist() {
      const data = loadAll()
      saveAll({ ...data, idols: this.idols })
    },
  },
})
