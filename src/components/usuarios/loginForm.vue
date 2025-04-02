<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <!-- Contenedor de formulario con logo -->
      <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
        <!-- Logo de la empresa -->
        <div class="mb-6 text-center">
          <img src="../../assets/images.png "alt="Logo de la Empresa" class="mx-auto h-16" />
        </div>
  
        <!-- Título de la página de login -->
        <h2 class="text-2xl font-semibold text-gray-800 text-center mb-6">Iniciar Sesión</h2>
  
        <!-- Formulario de inicio de sesión -->
        <form @submit.prevent="iniciarSesion">
          <div class="space-y-4">
            <!-- Campo de Usuario de Red -->
            <input
              type="text"
              v-model="form.usuario_red"
              placeholder="Usuario de Red"
              class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <!-- Campo de Contraseña -->
            <input
              type="password"
              v-model="form.password"
              placeholder="Contraseña"
              class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
  
          <!-- Botón de Iniciar Sesión -->
          <button
            type="submit"
            class="w-full mt-4 bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Iniciar Sesión
          </button>
        </form>
  
        <!-- Enlace a la página de registro -->
        <p class="mt-4 text-center text-sm text-gray-600">
          ¿No tienes cuenta? <router-link to="/registro" class="text-blue-500 hover:underline">Regístrate</router-link>
        </p>
      </div>
    </div>
  </template>
  
  <script>
  import userService from '../../services/userService';
  import { useUserStore } from '../../store/userStore';
  import { useRouter } from 'vue-router';
  
  export default {
    data() {
      return {
        form: {
          usuario_red: '',
          password: ''
        }
      };
    },
    setup() {
      const userStore = useUserStore();
      const router = useRouter();
  
      return { userStore, router };
    },
    methods: {
  async iniciarSesion() {
    console.log("🔍 Enviando datos de login:", this.form);
    const resultado = await userService.iniciarSesion(this.form);
    console.log("🔍 Respuesta del backend:", resultado);

    if (resultado.status) {
      this.userStore.setUsuario(
  {
    id_usuario: resultado.descripcion.id_usuario,
    nombre: resultado.descripcion.nombre,
    email: resultado.descripcion.dominio,
    usuario_red: resultado.descripcion.usuario_red,
    foto_perfil: resultado.descripcion.foto_perfil,
    grupos: resultado.descripcion.grupos
  },
  resultado.token
);

      console.log("✅ Usuario autenticado y guardado en Pinia.");
      this.router.push('/chat'); // Redirigir a la vista del chat
    } else {
      alert('Error: ' + resultado.descripcion);
    }
  }
}

  };
  </script>
  
  <style scoped>
  /* Estilos personalizados si es necesario */
  </style>
  