<template>
    <div class="flex min-h-screen justify-center items-center">
      <!-- Contenedor de la imagen y formulario -->
      <div class="flex bg-white shadow-lg rounded-lg overflow-hidden w-full max-w-4xl">
        
        <!-- Imagen (izquierda) -->
        <div class="w-1/2 bg-cover bg-center" :style="imageStyle">
            <img src="" alt="">
        </div>
        
        <!-- Formulario (derecha) -->
        <div class="w-1/2 p-8 space-y-6">
          <h2 class="text-2xl font-semibold text-gray-800">Registro</h2>
          
          <form @submit.prevent="registrarUsuario" enctype="multipart/form-data">
            <div class="space-y-4">
              <input type="text" v-model="form.nombre" placeholder="Nombre" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              <input type="text" v-model="form.usuario_red" placeholder="Usuario de Red" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              <input type="email" v-model="form.dominio" placeholder="Correo/Dominio" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              <input type="password" v-model="form.password" placeholder="Contraseña" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              
              <!-- Selección de Rol -->
              <select v-model="form.id_rol" required class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option v-for="rol in roles" :key="rol.id_rol" :value="rol.id_rol">{{ rol.descripcion }}</option>
              </select>
              
              <!-- Subir Foto -->
              <label class="block text-sm font-medium text-gray-700">Foto de Perfil:</label>
              <input type="file" @change="subirFoto" accept="image/png, image/jpeg" class="w-full text-sm text-gray-700 py-2 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
  
            <button type="submit" class="w-full mt-4 bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">Registrarse</button>
          </form>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import userService from '../../services/userService.js';
  
  export default {
    data() {
      return {
        form: {
          nombre: '',
          usuario_red: '',
          dominio: '',
          password: '',
          id_rol: null,
          foto: null,
        },
        roles: []
      };
    },
    async created() {
      this.roles = await userService.obtenerRoles();
    },
    computed: {
      // Estilo dinámico para la imagen
      imageStyle() {
        return {
          backgroundImage: this.form.foto ? `url(${URL.createObjectURL(this.form.foto)})` : 'url(https://via.placeholder.com/600x800)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };
      }
    },
    methods: {
      subirFoto(event) {
        this.form.foto = event.target.files[0];
      },
      async registrarUsuario() {
        const resultado = await userService.registrarUsuario(this.form);
        if (resultado.status) {
          alert('Usuario registrado con éxito');
          this.$router.push('/login'); // Redirigir después del registro
        } else {
          alert('Error: ' + resultado.descripcion);
        }
      }
    }
  };
  </script>
  
  <style scoped>
  /* Agregar aquí cualquier estilo adicional si es necesario */
  </style>
  