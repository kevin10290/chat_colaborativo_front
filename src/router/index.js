import { createRouter, createWebHistory } from "vue-router";
import Registro from "../pages/Registro.vue";
import Login from "../pages/Login.vue";
import chatview from "../components/chats/chatview.vue";

const routes = [
{path: "/registro", component: Registro},
{path: "/login", component: Login},
{path: "/chat", component: chatview},
]

const router = createRouter({
  history: createWebHistory(),
  routes,
});




export default router;