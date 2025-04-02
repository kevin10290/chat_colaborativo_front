import axios from "axios";

const API_URL = "http://localhost:3000/api"; // Cambia esto a la URL de tu API

// Obtener grupos con autenticación y filtros opcionales
export const obtenerGrupos = async (token) => {
    try {
      const response = await fetch(`${API_URL}/grupos/obtenerGrupos/?pagina=1&limite=10`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
  
      const data = await response.json();
      console.log("📌 Respuesta cruda del backend:", data); // <--- Verifica si llegan los grupos
  
      return data.data.grupos; // Asegúrate de devolver SOLO el array de grupos
    } catch (error) {
      console.error("❌ Error obteniendo grupos:", error);
      return [];
    }
  };
  

// Obtener usuarios con autenticación
export const obtenerUsuarios = async (token, pagina = 1, limite = 10) => {
    try {
      const response = await axios.get(`${API_URL}/login/obtenerUsuarios`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { pagina, limite },
      });
      
      return response.data.data.usuarios || [];
    } catch (error) {
      console.error("Error al obtener usuarios:", error.response?.data || error);
      return [];
    }
  };
