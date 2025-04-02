import { defineStore } from 'pinia';


export const useUserStore = defineStore('user', {
  state: () => ({
    usuario: null,
    token: null,
  }),
  actions: {
    setUsuario(datosUsuario, token) {
      if (!datosUsuario || !token) {
        console.error("❌ Error en setUsuario: Datos de usuario o token son inválidos", { datosUsuario, token });
        return;
      }

      this.usuario = datosUsuario;
      this.token = token;

      console.log("✅ Usuario guardado en el store:", this.usuario);
      console.log("✅ Token guardado:", this.token);

      localStorage.setItem('usuario', JSON.stringify(datosUsuario));
      localStorage.setItem('token', token);
    },
    
    cargarUsuario() {
      const usuarioGuardado = localStorage.getItem('usuario');
      const tokenGuardado = localStorage.getItem('token');

      console.log("🔍 Cargando usuario del localStorage:", { usuarioGuardado, tokenGuardado });

      if (usuarioGuardado && tokenGuardado) {
        try {
          this.usuario = JSON.parse(usuarioGuardado);
          this.token = tokenGuardado;
          console.log("✅ Usuario cargado correctamente:", this.usuario);
        } catch (error) {
          console.error("❌ Error al parsear usuario desde localStorage:", error);
          this.cerrarSesion();
        }
      }
    },

    cerrarSesion() {
      this.usuario = null;
      this.token = null;
      localStorage.removeItem('usuario');
      localStorage.removeItem('token');
      console.log("🚪 Usuario cerrado sesión correctamente.");
    },
  }
,
 getters: {
  estaAutenticado: (state) => !!state.usuario && !!state.token,
 },
});

