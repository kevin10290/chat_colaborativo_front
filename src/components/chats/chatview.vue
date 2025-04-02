<script setup>
import { ref, onMounted } from "vue";
import { useChatStore } from "../../store/useChatStore";
import { useUserStore } from "../../store/userStore";
import { obtenerGrupos, obtenerUsuarios } from "../../services/chatService";
import { joinRoom, sendMessage } from "../../services/websocket";
import socket from "../../services/websocket";

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
  <div class="flex h-screen">
    <!-- Lista de Chats -->
    <div class="w-1/4 bg-gray-200 p-4 overflow-auto">
      <h2 class="text-lg font-bold">Grupos</h2>
      <ul>
        <li
          v-for="grupo in grupos"
          :key="grupo.id_grupo"
          @click="seleccionarChat(grupo?.id_grupo, true, grupo?.nombre)"
          class="p-2 cursor-pointer hover:bg-gray-300 rounded">
          {{ grupo.nombre }}
        </li>
      </ul>

      <h2 class="text-lg font-bold mt-4">Mensajes Directos</h2>
      <ul>
          <li
          v-for="usuario in usuarios"
          :key="usuario.id_usuario"
         @click="seleccionarChat(usuario?.id_usuario, false, usuario?.nombre)"
          class="p-2 cursor-pointer hover:bg-gray-300 rounded flex items-center">
          <img :src="usuario.foto_perfil" alt="Perfil" class="w-8 h-8 rounded-full mr-2" />
          {{ usuario.nombre }}
      </li>
      </ul>
    </div>

    <!-- Chat Principal -->
    <div class="w-3/4 flex flex-col h-screen p-4 bg-gray-100">
      <div v-if="!chatStore.chatSeleccionado" class="flex items-center justify-center h-full text-gray-500">
        🔍 Selecciona un chat para empezar a conversar.
      </div>

      <div v-else class="flex flex-col h-full">
        <h2 class="text-lg font-semibold mb-2">
          {{ chatStore.chatSeleccionado?.tipo === 'grupo' ? 'Grupo' : 'Chat con' }} 
          {{ chatStore.chatSeleccionado?.nombre || 'Desconocido' }}
        </h2>


        <div class="flex-1 overflow-auto p-4 bg-white rounded-lg shadow-lg space-y-4">
            <div 
              v-for="(msg, index) in chatStore.mensajesActuales" 
              :key="index" 
              :class="[
                'p-2 rounded-lg mb-2',
                msg.usuarioIdUsuario === userStore.usuario.id_usuario 
                  ? 'bg-blue-100 ml-auto max-w-md text-right' 
                  : 'bg-gray-100 mr-auto max-w-md'
              ]"
            >
          <div class="font-semibold text-gray-800">
          {{ msg.usuarioIdUsuario === userStore.usuario.id_usuario ? 'Tú' : (msg.remitente?.nombre || 'Desconocido') }}
            </div>
              <div class="text-gray-600">{{ msg.contenido }}</div>
            </div>
          </div>


        <div class="mt-4 flex items-center space-x-2">
            <input
            v-model="mensaje"
            @keyup.enter="enviarMensaje(mensaje, chatStore.chatSeleccionado)"
            type="text"
            placeholder="Escribe tu mensaje..."
            class="flex-1 p-3 bg-gray-200 rounded-lg"/>

          <button
            @click="enviarMensaje(mensaje, chatStore.chatSeleccionado)"
            class="p-3 bg-indigo-500 text-white rounded-lg shadow hover:bg-indigo-600">
            Enviar
          </button>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
