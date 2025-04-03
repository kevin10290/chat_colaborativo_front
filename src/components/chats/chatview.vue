<script setup>
import { ref, onMounted } from "vue";
import { useChatStore } from "../../store/useChatStore";
import { useUserStore } from "../../store/userStore";
import { obtenerGrupos, obtenerUsuarios } from "../../services/chatService";
import { joinRoom, sendMessage } from "../../services/websocket";
import socket from "../../services/websocket";
import CrearGrupoModal from '../usuarios/CrearGrupoModal.vue';

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
    fecha_creacion: new Date().toISOString() // Añadir timestamp para la verificación de duplicados
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
</script>

<template>
  <div class="flex h-screen bg-gray-50" @click="isMenuOpen = false">
    <!-- Sidebar - Lista de Chats -->
    <div class="w-1/4 bg-white border-r border-gray-200 shadow-sm overflow-auto">
      <div class="sticky top-0 bg-blue-600 text-white p-4 shadow-md z-10">
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
            <div v-if="isMenuOpen" 
                @click.stop
                class="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white overflow-hidden z-50">
              <div class="py-1">
                <button
                  @click="abrirCrearGrupo"
                  class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-all duration-200">
                  <span class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Perfíl
                  </span>
                </button>
                <button
                  @click="abrirCrearGrupo"
                  class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-all duration-200">
                  <span class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Crear nuevo grupo
                  </span>
                </button>
                <!-- <button
                  @click="abrirCrearGrupo"
                  class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-all duration-200">
                  <span class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Crear nuevo usuario
                  </span>
                </button> -->
              </div>
            </div>
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
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-blue-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p class="text-lg">Selecciona un chat para comenzar a conversar</p>
      </div>

      <!-- Interfaz de chat cuando hay uno seleccionado -->
      <div v-else class="flex flex-col h-full">
        <!-- Encabezado del chat -->
        <div class="bg-white border-b border-gray-200 p-2 flex items-center shadow-sm">
          <div v-if="chatStore.chatSeleccionado?.tipo === 'grupo'" class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
            {{ chatStore.chatSeleccionado?.nombre?.charAt(0).toUpperCase() }}
          </div>
          <img 
            v-else
            :src="usuarios.find(u => u.id_usuario === chatStore.chatSeleccionado?.id)?.foto_perfil" 
            alt="Perfil" 
            class="w-10 h-10 rounded-full mr-3 object-cover border border-gray-200" 
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

        <!-- Área de mensajes -->
        <div class="flex-1 overflow-auto p-6 space-y-4">
          <div 
            v-for="(msg, index) in chatStore.mensajesActuales" 
            :key="index" 
            :class="[
              'max-w-md rounded-lg p-3 mb-2',
              msg.usuarioIdUsuario === userStore.usuario.id_usuario 
                ? 'ml-auto bg-blue-500 text-white' 
                : 'mr-auto bg-white border border-gray-200 shadow-sm'
            ]"
          >
            <div class="font-semibold text-sm mb-1">
              {{ msg.usuarioIdUsuario === userStore.usuario.id_usuario ? 'Tú' : (msg.remitente?.nombre || 'Desconocido') }}
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
            <input
              v-model="mensaje"
              @keyup.enter="enviarMensaje(mensaje, chatStore.chatSeleccionado)"
              type="text"
              placeholder="Escribe tu mensaje..."
              class="flex-1 p-4 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-150"
            />
            <button
              @click="enviarMensaje(mensaje, chatStore.chatSeleccionado)"
              class="p-4 bg-orange-500 text-white rounded-full shadow-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 transition duration-150">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
</style>