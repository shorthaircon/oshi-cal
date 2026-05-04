import { createRouter, createWebHashHistory } from 'vue-router'
import MonthView from './views/MonthView.vue'
import TimelineView from './views/TimelineView.vue'
import IdolGroupView from './views/IdolGroupView.vue'
import IdolsView from './views/IdolsView.vue'
import EventsView from './views/EventsView.vue'
import SettingsView from './views/SettingsView.vue'
import EventDetailView from './views/EventDetailView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'month', component: MonthView },
    { path: '/timeline', name: 'timeline', component: TimelineView },
    { path: '/by-oshi', name: 'by-oshi', component: IdolGroupView },
    { path: '/events', name: 'events', component: EventsView },
    { path: '/event/:id', name: 'event-detail', component: EventDetailView },
    { path: '/idols', name: 'idols', component: IdolsView },
    { path: '/settings', name: 'settings', component: SettingsView },
  ],
})
