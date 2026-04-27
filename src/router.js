import { createRouter, createWebHashHistory } from 'vue-router'
import MonthView from './views/MonthView.vue'
import TimelineView from './views/TimelineView.vue'
import IdolsView from './views/IdolsView.vue'
import EventsView from './views/EventsView.vue'
import SettingsView from './views/SettingsView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'month', component: MonthView },
    { path: '/timeline', name: 'timeline', component: TimelineView },
    { path: '/events', name: 'events', component: EventsView },
    { path: '/idols', name: 'idols', component: IdolsView },
    { path: '/settings', name: 'settings', component: SettingsView },
  ],
})
