<script setup>
import { ref, onMounted } from "vue";
import { useChatStore } from "../../store/useChatStore";
import { useUserStore } from "../../store/userStore";
import { obtenerGrupos, obtenerUsuarios } from "../../services/chatService";
import { joinRoom, sendMessage } from "../../services/websocket";
import socket from "../../services/websocket";
import CrearGrupoModal from '../usuarios/CrearGrupoModal.vue';
import { useRouter } from 'vue-router';

const isMenuOpen = ref(false);
const showCrearGrupoModal = ref(false);
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};
const abrirCrearGrupo = () => {
  showCrearGrupoModal.value = true;
  isMenuOpen.value = false;
};
const chatStore = useChatStore();
const userStore = useUserStore();
const mensaje = ref("");
const grupos = ref([]);
const usuarios = ref([]);
const token = ref(localStorage.getItem("token"));
const router = useRouter();
const usuario = ref(JSON.parse(localStorage.getItem('usuario')));

onMounted(async () => {
  userStore.cargarUsuario();
  if (!userStore.usuario) {
    console.error("❌ No hay usuario autenticado.");
    return;
  }
  // Asigna el usuario a chatStore
  chatStore.setUsuario(userStore.usuario);
  if (token.value) {
    console.log("🔍 Recuperando grupos y usuarios...");
    try {
      grupos.value = await obtenerGrupos(token.value);
      console.log("✅ Grupos obtenidos:", grupos.value);
      usuarios.value = await obtenerUsuarios(token.value);
      console.log("✅ Usuarios obtenidos:", usuarios.value);
    } catch (error) {
      console.error("❌ Error al obtener grupos o usuarios:", error);
    }
  } else {
    console.error("⚠️ No hay token disponible. Redirigir a login.");
  }
  // CORREGIDO: Escuchar mensajes del socket solo una vez, fuera del componente
  socket.on("message", (msg) => {
    console.log("📩 Mensaje recibido:", msg);
    if (!msg || (!msg.GrupoIdGrupo && !msg.destinatarioIdUsuario)) {
      console.warn("⚠️ Mensaje inválido, ignorando...");
      return;
    }
    // Determinar el tipo de chat y el ID correcto
    const esGrupo = !!msg.GrupoIdGrupo;
    const miId = userStore.usuario?.id_usuario;
    
    if (esGrupo) {
      const chatId = msg.GrupoIdGrupo;
      // Solo agregar el mensaje si es del chat seleccionado
      if (chatStore.chatSeleccionado?.id === chatId && 
          chatStore.chatSeleccionado?.tipo === "grupo") {
        chatStore.addMessage({ id: chatId, tipo: "grupo" }, msg);
      }
    } else {
      let otroUsuarioId;
      
      // Determinar el ID del otro usuario correctamente
      if (msg.usuarioIdUsuario === miId) {
        otroUsuarioId = msg.destinatarioIdUsuario;
      } else {
        otroUsuarioId = msg.usuarioIdUsuario;
      }
      
      // Solo agregar el mensaje si es del chat seleccionado
      if (chatStore.chatSeleccionado?.id === otroUsuarioId && 
          chatStore.chatSeleccionado?.tipo === "directo") {
        chatStore.addMessage({ id: otroUsuarioId, tipo: "directo" }, msg);
      }
    }
  });
  if (chatStore.chatSeleccionado) {
    obtenerMensajes(chatStore.chatSeleccionado);
  }
});

const seleccionarChat = (idChat, esGrupo = true, nombre) => {
  if (!idChat) {
    console.error("❌ Error: ID de chat inválido.");
    return;
  }
  console.log("👤 Usuario actual:", userStore.usuario);
  console.log("🔍 ID del chat:", idChat);
  chatStore.seleccionarChat({ id: idChat, tipo: esGrupo ? "grupo" : "directo", nombre });
  if (userStore.usuario?.nombre) {
    joinRoom(idChat, userStore.usuario.nombre);
  } else {
    console.error("❌ No se pudo unir a la sala: usuario no autenticado.");
  }
};

const obtenerMensajes = async (chat) => {
  try {
    console.log("🔍 Obteniendo mensajes para el chat:", chat);
    await chatStore.cargarMensajes(chat);
  } catch (error) {
    console.error("❌ Error al obtener los mensajes:", error);
  }
};

async function enviarMensaje(contenido, chat, tipo_contenido = "texto", multimedia = null) {
  console.log("🚀 Iniciando envío de mensaje:", { contenido, chat, tipo_contenido });
  if (!contenido.trim() || !chat) {
    console.error("❌ Validación fallida:", { contenido: contenido?.trim(), chat });
    return;
  }
  if (!chat) {
    console.error("❌ Error: No hay chat seleccionado.");
    return;
  }
  if (typeof contenido !== "string" || !contenido.trim()) {
    console.warn("⚠️ No se puede enviar un mensaje vacío o no válido.");
    return;
  }
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("❌ No hay token disponible.");
    return;
  }
  const mensajeData = {
    contenido: contenido.trim(),
    tipo_contenido: "texto",
    multimedia: null,
    usuarioIdUsuario: userStore.usuario?.id_usuario,
    GrupoIdGrupo: chat.tipo === "grupo" ? chat.id : null,
    destinatarioIdUsuario: chat.tipo === "directo" ? chat.id : null,
    remitente: {
      id_usuario: userStore.usuario?.id_usuario,
      nombre: userStore.usuario?.nombre
    },
    fecha_envio: new Date().toISOString() // Añadir timestamp para la verificación de duplicados
  };
  console.log("📤 Preparando mensaje para enviar:", mensajeData);
  console.log("🔑 Token disponible:", token ? "Sí" : "No");
  // Agregar mensaje localmente primero para actualización inmediata de UI
  chatStore.addMessage(chat, mensajeData);
  
  // Enviar por WebSocket - solo envío por websocket, no HTTP aquí
  console.log("🌐 Enviando mensaje por WebSocket");
  sendMessage(mensajeData);
  // Limpiar input después de enviar mensaje
  mensaje.value = "";
}

const cerrarSesion = () => {
  localStorage.removeItem('token');
  router.push('/login');
  isMenuOpen.value = false;
};
</script>

<template>
  <div class="flex h-screen bg-gray-100" @click="isMenuOpen = false">
    <!-- Sidebar - Lista de Chats -->
    <div class="w-1/4 bg-white border-r border-gray-200 shadow-md overflow-auto">
      <div class="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-md z-10">
        <div class="flex justify-between items-center"> 
          <h1 class="text-xl font-bold">Chats</h1>
          <div class="relative">
            <!-- Botón para abrir el menú, con stopPropagation para evitar que el clic cierre el menú inmediatamente -->
            <button @click.stop="toggleMenu" class="p-2 hover:bg-blue-700 rounded-full transition duration-150">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            
            <!-- Menú desplegable, también con stopPropagation -->
            <Transition name="menu">
              <div v-if="isMenuOpen" 
                  @click.stop
                  class="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white overflow-hidden z-50">
                <div class="py-1">
                  <button
                    @click="abrirCrearGrupo"
                    class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-all duration-200">
                    <span class="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Perfíl
                    </span>
                  </button>
                  <template v-if="usuario?.id_rol === 1"> 
                    <button
                      @click="abrirCrearGrupo"
                      class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-all duration-200">
                      <span class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Crear nuevo grupo
                      </span>
                    </button>
                    <button
                      @click="abrirCrearGrupo"
                      class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-all duration-200">
                      <span class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Administrar usuarios
                      </span>
                    </button>
                  </template>
                  <hr class="my-1 border-gray-200"> 
                  <!-- Botón de cerrar sesión -->
                  <button
                    @click="cerrarSesion"
                    class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-all duration-200">
                    <span class="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar sesión
                    </span>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Sección de Grupos -->
      <div class="p-4">
        <h2 class="text-lg font-bold text-gray-700 mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Grupos
        </h2>
        <ul class="space-y-1">
          <li
            v-for="grupo in grupos"
            :key="grupo.id_grupo"
            @click="seleccionarChat(grupo?.id_grupo, true, grupo?.nombre)"
            :class="[
              'p-3 cursor-pointer rounded-lg transition duration-150 flex items-center',
              chatStore.chatSeleccionado?.id === grupo?.id_grupo && chatStore.chatSeleccionado?.tipo === 'grupo'
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-100'
            ]">
            <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
              {{ grupo.nombre.charAt(0).toUpperCase() }}
            </div>
            <span class="font-medium">{{ grupo.nombre }}</span>
          </li>
        </ul>
      </div>

      <!-- Sección de Mensajes Directos -->
      <div class="p-4 border-t border-gray-200">
        <h2 class="text-lg font-bold text-gray-700 mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Mensajes Directos
        </h2>
        <ul class="space-y-1">
          <li
            v-for="usuario in usuarios"
            :key="usuario.id_usuario"
            @click="seleccionarChat(usuario?.id_usuario, false, usuario?.nombre)"
            :class="[
              'p-3 cursor-pointer rounded-lg transition duration-150 flex items-center',
              chatStore.chatSeleccionado?.id === usuario?.id_usuario && chatStore.chatSeleccionado?.tipo === 'directo'
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-100'
            ]">
            <img 
              :src="usuario.foto_perfil" 
              alt="Perfil" 
              class="w-8 h-8 rounded-full mr-3 object-cover border border-gray-200" 
            />
            <span class="font-medium">{{ usuario.nombre }}</span>
          </li>
        </ul>
      </div>
      
      <CrearGrupoModal 
        v-if="showCrearGrupoModal" 
        @close="showCrearGrupoModal = false"
      />
    </div>

    <!-- Chat Principal -->
    <div class="w-3/4 flex flex-col h-screen bg-gray-50">
      <!-- Estado sin chat seleccionado -->
      <div v-if="!chatStore.chatSeleccionado" class="flex flex-col items-center justify-center h-full text-gray-500">
        <div class="bg-white p-8 rounded-xl shadow-md flex flex-col items-center max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 text-blue-400 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">Bienvenido al chat</h3>
          <p class="text-center text-gray-600 mb-6">Selecciona un grupo o usuario para comenzar a conversar</p>
        </div>
      </div>

      <!-- Interfaz de chat cuando hay uno seleccionado -->
      <div v-else class="flex flex-col h-full">
        <!-- Encabezado del chat -->
        <div class="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
          <div class="flex items-center">
            <div v-if="chatStore.chatSeleccionado?.tipo === 'grupo'" class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold mr-3 shadow-sm">
              {{ chatStore.chatSeleccionado?.nombre?.charAt(0).toUpperCase() }}
            </div>
            <img 
              v-else
              :src="usuarios.find(u => u.id_usuario === chatStore.chatSeleccionado?.id)?.foto_perfil" 
              alt="Perfil" 
              class="w-10 h-10 rounded-full mr-3 object-cover border border-gray-200 shadow-sm" 
            />
            <div>
              <h2 class="text-lg font-semibold text-gray-800">
                {{ chatStore.chatSeleccionado?.nombre || 'Desconocido' }}
              </h2>
              <span class="text-sm text-gray-500">
                {{ chatStore.chatSeleccionado?.tipo === 'grupo' ? 'Grupo' : 'Chat directo' }}
              </span>
            </div>
          </div>
          <div class="flex space-x-2">
            <button class="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition duration-150">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button class="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition duration-150">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Área de mensajes -->
        <div class="flex-1 overflow-auto p-6 space-y-4 bg-gray-50">
          <div v-if="chatStore.mensajesActuales.length === 0" class="flex justify-center my-8">
            <div class="bg-white p-4 rounded-lg shadow-sm text-gray-500 text-center">
              <p>No hay mensajes en esta conversación.</p>
              <p>¡Sé el primero en escribir algo!</p>
            </div>
          </div>
          <div 
            v-for="(msg, index) in chatStore.mensajesActuales" 
            :key="index" 
            :class="[
              'max-w-md rounded-lg p-3 mb-2',
              msg.usuarioIdUsuario === userStore.usuario.id_usuario 
                ? 'ml-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' 
                : 'mr-auto bg-white border border-gray-200 shadow-sm'
            ]"
          >
            <div class="font-semibold text-sm mb-1 flex justify-between items-center">
              <span>{{ msg.usuarioIdUsuario === userStore.usuario.id_usuario ? 'Tú' : (msg.remitente?.nombre || 'Desconocido') }}</span>
              <span class="text-xs opacity-75">{{ new Date(msg.fecha_envio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</span>
            </div>
            <div :class="[
              msg.usuarioIdUsuario === userStore.usuario.id_usuario 
                ? 'text-white' 
                : 'text-gray-700'
            ]">
              {{ msg.contenido }}
            </div>
          </div>
        </div>

        <!-- Barra de entrada de mensaje -->
        <div class="p-4 bg-white border-t border-gray-200">
          <div class="flex items-center space-x-2">
            <button class="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition duration-150">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <button class="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition duration-150">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input
              v-model="mensaje"
              @keyup.enter="enviarMensaje(mensaje, chatStore.chatSeleccionado)"
              type="text"
              placeholder="Escribe tu mensaje..."
              class="flex-1 p-4 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-150"
            />
            <button
              @click="enviarMensaje(mensaje, chatStore.chatSeleccionado)"
              :class="[
                'p-3 text-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300 transition duration-150',
                mensaje.trim() ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-400 cursor-not-allowed opacity-75'
              ]"
              :disabled="!mensaje.trim()">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Animaciones y efectos adicionales */
.cursor-pointer {
  cursor: pointer;
}

/* Personaliza la barra de desplazamiento para Chrome */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #b3b3b3;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #888888;
}

/* Animaciones para el menú desplegable */
.menu-enter-active,
.menu-leave-active {
  transition: all 0.2s ease;
  transform-origin: top right;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.menu-enter-to,
.menu-leave-from {
  opacity: 1;
  transform: scale(1);
}

/* Animación para los mensajes nuevos */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.max-w-md {
  animation: fadeIn 0.3s ease-out;
}
</style>