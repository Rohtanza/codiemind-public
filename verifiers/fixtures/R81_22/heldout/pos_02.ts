import { createRouter, createWebHistory } from 'vue-router';
import { defineAsyncComponent } from 'vue';

const Home = defineAsyncComponent(() => import('./views/Home.vue'));
const Settings = defineAsyncComponent(() => import('./views/Settings.vue'));

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/settings', component: Settings },
  ],
});
