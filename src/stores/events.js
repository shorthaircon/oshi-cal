import { defineStore } from 'pinia'
import { loadAll, saveAll } from '../lib/storage.js'
import { findConflicts } from '../lib/conflictResolver.js'
import { uuid } from '../lib/uuid.js'
import { deleteImage } from '../lib/imageStore.js'

export const STATUSES = [
  { value: 'going', label: '預定參加' },
  { value: 'waitlist', label: '候補中' },
  { value: 'ticketed', label: '已購票' },
  { value: 'attended', label: '已參加' },
  { value: 'cancelled', label: '已取消' },
]

function emptyEvent() {
  return {
    id: uuid(),
    idolIds: [],
    title: '',
    startAt: null,
    endAt: null,
    venue: '',
    sourceUrl: null,
    status: 'going',
    timeUnknown: false,
    ticketPrice: null,
    ticketUrl: '',
    notes: '',
    reminder: null,
    timezone: 'Asia/Tokyo',
    coverId: null,
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
      const event = { ...emptyEvent(), ...payload, id: uuid() }
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
      const coverId = this.events[idx].coverId
      this.events.splice(idx, 1)
      this._persist()
      if (coverId) deleteImage(coverId).catch(() => {})
    },

    setCover(id, newCoverId) {
      const ev = this.events.find(e => e.id === id)
      if (!ev) return
      const oldCoverId = ev.coverId
      ev.coverId = newCoverId
      this._persist()
      if (oldCoverId && oldCoverId !== newCoverId) {
        deleteImage(oldCoverId).catch(() => {})
      }
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
