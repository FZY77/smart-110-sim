import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Login from './views/Login.vue'
import Report from './views/Report.vue'
import Officer from './views/Officer.vue'
import Track from './views/Track.vue'
import Archive from './views/Archive.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/login', component: Login },
    { path: '/report', component: Report },
    { path: '/track', component: Track },
    { path: '/officer', component: Officer },
    { path: '/archive', component: Archive },
  ]
})
