import { createApp } from 'vue';
import App from './app.vue';
import router from './router/index.js';
import { createPinia } from 'pinia';


// Crear la aplicación
const app = createApp(App);
const pinia = createPinia();
// Usar el router
app.use(router);

app.config.errorHandler = (err, instance, info) => {
    console.error("🔥 Vue Global Error:", err, "Info:", info);
  };
  

app.use(pinia);

// Montar la aplicación
app.mount('#app');
