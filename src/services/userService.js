import axios from 'axios';

const API_URL = '/api/login';

export default {
  async registrarUsuario(datos) {
    const formData = new FormData();
    formData.append('nombre', datos.nombre);
    formData.append('usuario_red', datos.usuario_red);
    formData.append('dominio', datos.dominio);
    formData.append('password', datos.password);
    formData.append('roleIdRol', datos.id_rol);
    if (datos.foto) formData.append('foto', datos.foto);

    try {
      const response = await axios.post(`${API_URL}/registrarUsuario`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      return { status: false, descripcion: error.response?.data?.error || 'Error desconocido' };
    }
  },

  async obtenerRoles() {
    try {
    
      const response = await axios.get('http://localhost:3000/api/roles/obtenerRoles', {
        headers: { 'Content-Type': 'form-data' }
      });
  
      
  
      // Asegurar que estamos extrayendo la lista de roles correctamente
      return response.data.data.roles || [];
    } catch (error) {
        console.error('Error al obtener los roles:', error);
      return [];
    }
  },
  async iniciarSesion(datos) {
    try {
      const response = await axios.post(`${API_URL}/iniciarSesion`, datos);
      return response.data;
    } catch (error) {
      return { status: false, descripcion: error.response?.data?.error || 'Error desconocido' };
    }
  }
};
