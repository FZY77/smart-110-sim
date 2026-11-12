import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Login from './views/Login.vue'
import Report from './views/Report.vue'
import Officer from './views/Officer.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/login', component: Login },
    { path: '/report', component: Report },
    { path: '/officer', component: Officer }
  ]
})
