import { defineStore } from 'pinia'
import { loadAll, saveAll } from '../lib/storage.js'
import { findConflicts } from '../lib/conflictResolver.js'

export const STATUSES = [
  { value: 'going', label: '預定參加' },
  { value: 'waitlist', label: '候補中' },
  { value: 'ticketed', label: '已抽到/已購票' },
  { value: 'attended', label: '已參加' },
  { value: 'cancelled', label: '已取消' },
]

function emptyEvent() {
  return {
    id: crypto.randomUUID(),
    idolIds: [],
    title: '',
    startAt: null,
    endAt: null,
    venue: '',
    sourceUrl: null,
    status: 'going',
    ticketPrice: null,
    ticketUrl: '',
    notes: '',
    reminder: null,
    timezone: 'Asia/Tokyo',
  }
}

export const useEventsStore = defineStore('events', {
  state: () => {
    const data = loadAll()
    return { events: data.events }
  },

  getters: {
    byId: (state) => (id) => state.events.find(e => e.id === id),
    byIdolId: (state) => (idolId) =>
      state.events.filter(e => e.idolIds.includes(idolId)),
    conflictMap: (state) => findConflicts(state.events),
    conflictsOf() {
      return (id) => {
        const ids = this.conflictMap.get(id) ?? []
        return ids.map(x => this.byId(x)).filter(Boolean)
      }
    },
  },

  actions: {
    add(payload) {
      const event = { ...emptyEvent(), ...payload, id: crypto.randomUUID() }
      this.events.push(event)
      this._persist()
      return event
    },

    update(id, patch) {
      const ev = this.events.find(e => e.id === id)
      if (!ev) return
      Object.assign(ev, patch)
      this._persist()
    },

    remove(id) {
      const idx = this.events.findIndex(e => e.id === id)
      if (idx === -1) return
      this.events.splice(idx, 1)
      this._persist()
    },

    reload() {
      this.events = loadAll().events
    },

    _persist() {
      const data = loadAll()
      saveAll({ ...data, events: this.events })
    },
  },
})
