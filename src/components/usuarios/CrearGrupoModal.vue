<script setup>
import { ref, computed } from "vue";

const emit = defineEmits(["close"]);
const activeTab = ref(0);
const formData = ref({
  nombre: "",
  descripcion: "",
  imagen: null,
});
const previewImage = ref(null);
const imageInputRef = ref(null);
const formErrors = ref({
  nombre: "",
  descripcion: "",
  imagen: "",
});

// Validación del formulario
const isFormValid = computed(() => {
  return (
    formData.value.nombre.trim() !== "" &&
    formData.value.descripcion.trim() !== "" &&
    formData.value.imagen !== null
  );
});

const validateForm = () => {
  formErrors.value.nombre =
    formData.value.nombre.trim() === "" ? "El nombre es obligatorio" : "";
  formErrors.value.descripcion =
    formData.value.descripcion.trim() === ""
      ? "La descripción es obligatoria"
      : "";
  formErrors.value.imagen = !formData.value.imagen
    ? "La imagen es obligatoria"
    : "";

  return isFormValid.value;
};

const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    if (file.size > 5000000) {
      // 5MB limit
      formErrors.value.imagen = "La imagen no debe superar los 5MB";
      return;
    }
    formData.value.imagen = file;
    previewImage.value = URL.createObjectURL(file);
    formErrors.value.imagen = "";
  }
};

const removeImage = () => {
  formData.value.imagen = null;
  previewImage.value = null;
  formErrors.value.imagen = "La imagen es obligatoria";

  // Reset the file input
  if (imageInputRef.value) {
    imageInputRef.value.value = "";
  }
};

const nextStep = () => {
  if (validateForm()) {
    activeTab.value = 1;
  }
};

const closeModal = () => {
  emit("close");
};

// Computed properties for tab indicator positioning
const tabIndicatorStyle = computed(() => {
  const tab1Width = 120; // Approximate width of "Crear grupo" text + padding
  const tab2Width = 173; // Approximate width of "Añadir participantes" text + padding

  if (activeTab.value === 0) {
    return {
      left: "0px",
      width: `${tab1Width}px`,
    };
  } else {
    return {
      left: `${tab1Width + 16}px`, // 16px is the space-x-4
      width: `${tab2Width}px`,
    };
  }
});
</script>

<template>
  <dialog open class="fixed inset-0 z-50">
    <div
      class="fixed inset-0 bg-black/50 backdrop-blur-sm"
      @click="closeModal"
    ></div>

    <div
      class="fixed inset-x-0 top-[50%] translate-y-[-50%] w-full max-w-2xl mx-auto p-4"
    >
      <div class="bg-white rounded-xl shadow-xl overflow-hidden">
        <!-- Header con fondo gris claro (igual que el footer) -->
        <div class="bg-gray-50 px-6 py-4">
          <div class="flex items-center justify-between">
            <!-- Tabs con animación mejorada - Sin línea divisoria marcada -->
            <div class="relative flex">
              <button
                :class="[
                  'px-4 py-2 font-medium relative transition-colors',
                  activeTab === 0
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700',
                ]"
                @click="activeTab = 0"
              >
                Crear grupo
              </button>
              <button
                :class="[
                  'px-4 py-2 font-medium relative transition-colors ml-4',
                  activeTab === 1
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700',
                ]"
                :disabled="!isFormValid"
                @click="nextStep"
              >
                Añadir participantes
              </button>

              <!-- Línea animada con tamaño ajustado -->
              <div
                class="absolute bottom-0 h-0.5 bg-blue-600 transition-all duration-300 ease-in-out"
                :style="tabIndicatorStyle"
              ></div>
            </div>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <svg
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="px-6 py-6">
          <!-- Tab 1: Crear grupo -->
          <div v-if="activeTab === 0" class="space-y-6">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700"
                >Nombre del grupo <span class="text-blue-600">*</span></label
              >
              <input
                type="text"
                v-model="formData.nombre"
                :class="[
                  'mt-1 block w-full rounded-lg border px-3 py-2 shadow-sm',
                  'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
                  'hover:border-blue-300 transition-all duration-200 ease-in-out',
                  formErrors.nombre ? 'border-red-300' : 'border-gray-300',
                ]"
                placeholder="Escribe el nombre del grupo"
              />
              <p v-if="formErrors.nombre" class="mt-1 text-sm text-red-600">
                {{ formErrors.nombre }}
              </p>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700"
                >Descripción <span class="text-blue-600">*</span></label
              >
              <textarea
                v-model="formData.descripcion"
                rows="3"
                :class="[
                  'mt-1 block w-full rounded-lg border px-3 py-2 shadow-sm',
                  'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
                  'hover:border-blue-300 transition-all duration-200 ease-in-out',
                  formErrors.descripcion ? 'border-red-300' : 'border-gray-300',
                ]"
                placeholder="Describe el propósito del grupo"
              ></textarea>
              <p
                v-if="formErrors.descripcion"
                class="mt-1 text-sm text-red-600"
              >
                {{ formErrors.descripcion }}
              </p>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700"
                >Imagen del grupo <span class="text-blue-600">*</span></label
              >
              <!-- Distribución ajustada con altura controlada -->
              <div class="mt-1 flex items-center space-x-4">
                <!-- Contenedor de imagen con altura fija -->
                <div
                  class="w-1/2 h-40 w-70 rounded-lg border-2 overflow-hidden flex items-center justify-center transition-all"
                  :class="
                    formErrors.imagen
                      ? 'border-red-300 border-dashed'
                      : previewImage
                      ? 'border-blue-500'
                      : 'border-gray-300 border-dashed'
                  "
                >
                  <div v-if="previewImage" class="relative w-full h-full group">
                    <img
                      :src="previewImage"
                      class="w-full h-full object-cover"
                    />
                    <div
                      class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <button
                        @click="removeImage"
                        class="bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600 transition-colors transform hover:scale-110"
                        title="Eliminar imagen"
                      >
                        <svg
                          class="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div v-else class="text-center p-4">
                    <svg
                      class="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>

                <!-- Información y botones ocupan 1/2 (2/4) -->
                <div class="space-y-3 flex-1 flex flex-col justify-center">
                  <input
                    type="file"
                    @change="handleImageUpload"
                    accept="image/*"
                    class="hidden"
                    id="grupo-imagen"
                    ref="imageInputRef"
                  />
                  <label
                    for="grupo-imagen"
                    class="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-all duration-200 ease-in-out"
                  >
                    <svg
                      class="h-5 w-5 mr-2 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    Subir imagen
                  </label>
                  <p class="text-xs text-gray-500">PNG, JPG hasta 5MB</p>
                  <p v-if="formErrors.imagen" class="text-sm text-red-600">
                    {{ formErrors.imagen }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 2: Añadir participantes -->
          <div
            v-if="activeTab === 1"
            class="h-64 flex flex-col items-center justify-center text-gray-500 space-y-3"
          >
            <svg
              class="h-16 w-16 text-blue-100"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M9 13.75c-2.34 0-7 1.17-7 3.5V19h14v-1.75c0-2.33-4.66-3.5-7-3.5zM4.34 17c.84-.58 2.87-1.25 4.66-1.25s3.82.67 4.66 1.25H4.34zM9 12c1.93 0 3.5-1.57 3.5-3.5S10.93 5 9 5 5.5 6.57 5.5 8.5 7.07 12 9 12zm0-5c.83 0 1.5.67 1.5 1.5S9.83 10 9 10s-1.5-.67-1.5-1.5S8.17 7 9 7zm7.04 6.81c1.16.84 1.96 1.96 1.96 3.44V19h4v-1.75c0-2.02-3.5-3.17-5.96-3.44zM15 12c1.93 0 3.5-1.57 3.5-3.5S16.93 5 15 5c-.54 0-1.04.13-1.5.35.63.89 1 1.98 1 3.15s-.37 2.26-1 3.15c.46.22.96.35 1.5.35z"
              ></path>
            </svg>
            <!-- <p class="text-gray-600">
                Contenido para añadir participantes (pendiente)
              </p> -->
            <p class="text-sm text-gray-400">
              Aquí podrás invitar a otros miembros a unirse a tu grupo
            </p>
          </div>
        </div>

        <!-- Footer con indicador de pasos -->
        <div
          class="bg-gray-50 px-6 py-4 flex items-center justify-between rounded-b-xl"
        >
          <!-- Indicador de pasos - Estilo tipo slider/dots -->
          <div class="flex items-center space-x-2">
            <div
              :class="[
                'w-2 h-2 rounded-full transition-all duration-300',
                activeTab === 0 ? 'bg-blue-600' : 'bg-gray-300',
              ]"
            ></div>
            <div
              :class="[
                'w-2 h-2 rounded-full transition-all duration-300',
                activeTab === 1 ? 'bg-blue-600' : 'bg-gray-300',
              ]"
            ></div>
          </div>

          <!-- Botones -->
          <div class="flex space-x-3">
            <button
              @click="closeModal"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 transition-all duration-200 ease-in-out"
            >
              Cancelar
            </button>
            <button
              v-if="activeTab === 0"
              @click="nextStep"
              :disabled="!isFormValid"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
            <button
              v-else
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200 ease-in-out"
            >
              Crear grupo
            </button>
          </div>
        </div>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}

/* Suavizado de interacciones y transiciones */
.text-sm,
.text-xs,
button,
input,
textarea,
label {
  transition: all 0.2s ease-in-out;
}

/* Estilos de scroll para la textarea */
textarea {
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}

textarea::-webkit-scrollbar {
  width: 6px;
}

textarea::-webkit-scrollbar-track {
  background: transparent;
}

textarea::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 6px;
}

textarea:focus::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
}

/* Efectos hover para botones y elementos interactivos */
button,
label[for="grupo-imagen"] {
  transform: translateY(0);
  transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out,
    border-color 0.2s ease-in-out;
}

button:hover:not(:disabled),
label[for="grupo-imagen"]:hover {
  transform: translateY(-1px);
}

button:active:not(:disabled),
label[for="grupo-imagen"]:active {
  transform: translateY(1px);
}

/* Eliminar efecto de borde duplicado en inputs y textareas */
input:focus,
textarea:focus {
  outline: none !important;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.5) !important;
}
</style>
