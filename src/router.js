import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import IdolsView from './views/IdolsView.vue'
import EventsView from './views/EventsView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/events', name: 'events', component: EventsView },
    { path: '/idols', name: 'idols', component: IdolsView },
  ],
})
