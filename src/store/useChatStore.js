import { defineStore } from "pinia";
import axios from "axios";

export const useChatStore = defineStore("chat", {
  state: () => ({
    chatsGrupales: {}, // { grupoId: [mensajes] }
    chatsDirectos: {}, // { usuarioId: [mensajes] }
    usuario: null, // Información del usuario autenticado
    chatSeleccionado: null, // Chat actualmente seleccionado
    mensajesPaginacion: {}, // Manejo de paginación
  }),

  actions: {
    setUsuario(user) {
      this.usuario = user;
    },

    seleccionarChat(chat) {
      if (!chat || !chat.id || !chat.tipo) {
        console.error("❌ Error: Chat inválido", chat);
        return;
      }

      // Evita recargar si el chat ya está seleccionado
      if (this.chatSeleccionado?.id === chat.id && this.chatSeleccionado?.tipo === chat.tipo) {
        console.log("🔄 Chat ya seleccionado, no es necesario recargar.");
        return;
      }

      this.chatSeleccionado = { ...chat };
      console.log("✅ Chat seleccionado:", this.chatSeleccionado);
      this.cargarMensajes(chat); // Cargar mensajes al seleccionar un chat
    },

    async cargarMensajes(chat, pagina = 1, limite = 50, noLeidos = false) {
      if (!chat || !chat.id || !chat.tipo) {
        console.error("❌ No se puede cargar mensajes: chat inválido", chat);
        return;
      }
    
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("❌ No hay token disponible.");
          return;
        }
    
        // Configurar parámetros según la API del backend
        const params = { 
          pagina, 
          limite,
          tipoChat: chat.tipo // 'grupo' o 'directo'
        };
        
        if (noLeidos) params.noLeidos = true;
    
        if (chat.tipo === "grupo") {
          params.grupoId = chat.id;
        } else if (chat.tipo === "directo") {
          // Para chats directos, enviar el ID del otro usuario
          params.usuarioId = chat.id;
          
          params.miId = this.usuario?.id_usuario; // ID del usuario actual - CRÍTICO

          if (!params.miId) {
            console.error("❌ Error: No se puede identificar usuario actual para filtrar mensajes directos");
            return;
          }
        }
    
        console.log("🔍 Solicitando mensajes con parámetros:", params);
    
        const response = await axios.get("http://localhost:3000/api/mensajes/obtenerMensajes", {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
    
        if (response.data.status) {
          let mensajes = response.data.data.mensajes;
    
          console.log(`📥 Mensajes recibidos para ${chat.tipo} ${chat.id}:`, mensajes);
    
          // Verifica y asigna el remitente correctamente
          mensajes = mensajes.map(msg => {
            if (!msg.remitente || !msg.remitente.nombre) {
              console.warn("⚠️ Mensaje sin remitente válido. Asignando nombre predeterminado.");
              msg.remitente = { nombre: "Desconocido" }; // Valor por defecto
            }
            return msg;
          });

          // Ordenar mensajes por fecha de creación (asumiendo que hay un campo timestamp)
          mensajes = mensajes.sort((a, b) => 
            new Date(a.createdAt || a.fecha_creacion) - new Date(b.createdAt || b.fecha_creacion)
          );

          // Eliminar duplicados considerando el contenido y el remitente
          mensajes = mensajes.filter((msg, index, self) => 
            index === self.findIndex((m) => (
              m.id_mensaje === msg.id_mensaje || 
              (m.contenido === msg.contenido && 
               m.usuarioIdUsuario === msg.usuarioIdUsuario &&
               m.fecha_creacion === msg.fecha_creacion)
            ))
          );
    
          // Guarda los mensajes en el almacén correspondiente
          if (chat.tipo === "grupo") {
            this.chatsGrupales[chat.id] = mensajes;
          } else {
            this.chatsDirectos[chat.id] = mensajes;
          }
    
          this.mensajesPaginacion[chat.id] = {
            total: response.data.data.total,
            pagina: response.data.data.pagina,
            totalPaginas: response.data.data.totalPaginas,
          };
    
        } else {
          console.error("⚠️ Error al recuperar mensajes:", response.data.error);
        }
      } catch (error) {
        console.error("❌ Error en la solicitud de mensajes:", error);
      }
    },

    addMessage(chat, message) {
      if (!chat || !chat.id || !chat.tipo || !message) {
        console.error("❌ Datos inválidos para agregar mensaje:", { chat, message });
        return;
      }
    
      // Asegurarse de que el mensaje tenga un remitente válido
      if (!message.remitente || !message.remitente.nombre) {
        message.remitente = {
          id_usuario: message.usuarioIdUsuario,
          nombre: this.usuario?.nombre || "Desconocido"
        };
      }
    
      const targetChat = chat.tipo === "grupo" ? this.chatsGrupales : this.chatsDirectos;
      if (!targetChat[chat.id]) {
        targetChat[chat.id] = [];
      }

      // Verificación más estricta de duplicados ANTES de agregar el mensaje
      const existe = targetChat[chat.id].some(m => 
        m.id_mensaje === message.id_mensaje || 
        (m.contenido === message.contenido && 
         m.usuarioIdUsuario === message.usuarioIdUsuario &&
         (m.fecha_creacion === message.fecha_creacion || 
          Math.abs(new Date(m.fecha_creacion) - new Date(message.fecha_creacion)) < 5000))
      );

      if (existe) {
        console.log("📝 Mensaje ya existe, no se agrega duplicado", message);
        return;
      }

      // Agregar el mensaje solo UNA vez si no existe
      targetChat[chat.id].push(message);
      console.log(`📨 Mensaje agregado en ${chat.tipo} ${chat.id}:`, message);
    },

    clearChat(chat) {
      if (!chat || !chat.id || !chat.tipo) {
        console.error("❌ No se puede limpiar el chat: datos inválidos", chat);
        return;
      }

      if (chat.tipo === "grupo") {
        this.chatsGrupales[chat.id] = [];
      } else {
        this.chatsDirectos[chat.id] = [];
      }
    },
  },

  getters: {
    mensajesActuales: (state) => {
      if (!state.chatSeleccionado) return [];
      const { id, tipo } = state.chatSeleccionado;
      
      if (tipo === "grupo") {
        return state.chatsGrupales[id] || [];
      } else {
        return state.chatsDirectos[id] || [];
      }
    },
  },
});