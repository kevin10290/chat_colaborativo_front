import { io } from "socket.io-client";
import { useChatStore } from "../store/useChatStore";
import { useUserStore } from "../store/userStore";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("✅ Conectado a WebSocket");
});

socket.on("disconnect", () => {
  console.log("❌ Desconectado de WebSocket");
});

// NO manejar mensajes aquí, se hace en el componente para evitar duplicados
// socket.on("message") se maneja ahora en el componente ChatView

export const joinRoom = (chatSeleccionado, nombreUsu) => {
  console.log("🔗 Uniéndose a la sala:", chatSeleccionado);
  socket.emit("joinRoom", { chatSeleccionado, nombreUsu });
};

export function sendMessage(mensaje) {
  if (!mensaje || !mensaje.contenido) {
    console.warn("⚠️ Datos del mensaje incompletos");
    return;
  }

  // Emitir el mensaje a través del WebSocket
  socket.emit("message", mensaje);

  // También enviar al backend para persistencia
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("❌ No hay token disponible");
    return;
  }

  // Agregar timestamp consistente para verificación de duplicados
  if (!mensaje.fecha_creacion) {
    mensaje.fecha_creacion = new Date().toISOString();
  }

  fetch("http://localhost:3000/api/mensajes/crearMensaje", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(mensaje),
  })
  .then(response => response.json())
  .then(data => {
    if (data.status) {
      console.log("✅ Mensaje guardado en la base de datos:", data);
    } else {
      console.error("❌ Error al guardar el mensaje:", data);
    }
  })
  .catch(error => console.error("❌ Error en la petición:", error));
}

export default socket;