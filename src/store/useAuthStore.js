import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    usuario: null,
    token: null,
    grupoId: null, // Guardamos el grupo
  }),
  actions: {
    setUsuario(datosUsuario) {
      this.usuario = datosUsuario;
      this.token = datosUsuario.token;
      this.grupoId = datosUsuario.grupos.length > 0 ? datosUsuario.grupos[0].id_grupo : null;
    },
  },
});