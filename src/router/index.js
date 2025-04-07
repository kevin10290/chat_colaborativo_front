import { createRouter, createWebHistory } from "vue-router";
import Registro from "../pages/Registro.vue";
import Login from "../pages/Login.vue";
import chatview from "../components/chats/chatview.vue";

const routes = [
  { 
    path: "/", 
    redirect: "/login" 
  },
  {
    path: "/login", 
    component: Login,
    name: "login"
  },
  {
    path: "/registro", 
    component: Registro,
    name: "registro"
  },
  {
    path: "/chat", 
    component: chatview,
    name: "chat",
    meta: { requiresAuth: true }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Guardia de navegación
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('token')  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

export default router;