<script setup>
import { ref, computed, onMounted, watch, defineEmits } from "vue";
import { obtenerUsuarios } from "../../services/chatService";

const emit = defineEmits(['update:selectedIntegrantes']);

const integrantes = ref([]);
const loading = ref(false);
const error = ref(null);

const selectedIntegrantes = ref([]);
const sortConfig = ref({ key: "nombre", order: "asc" });
const currentPage = ref(1);
const itemsPerPage = ref(10);
const searchQuery = ref("");
const totalItems = ref(0);

// Función para obtener el token del localStorage
const getToken = () => {
    return localStorage.getItem('token');
};

// Función para cargar usuarios
const loadUsuarios = async () => {
    loading.value = true;
    error.value = null;
    
    try {
        const token = getToken();
        if (!token) {
            throw new Error('No hay token de autenticación');
        }

        const response = await obtenerUsuarios(token, currentPage.value, itemsPerPage.value);
        // Transformar los datos al formato esperado por la tabla
        integrantes.value = response.map(usuario => ({
            nombre: usuario.nombre || 'Sin nombre',
            usuario: usuario.usuario_red || 'N/A',
            dominio: usuario.dominio || 'N/A'
        }));
        
        // Si la API devuelve el total de items, actualizamos totalItems
        totalItems.value = response.total || integrantes.value.length;
    } catch (err) {
        error.value = 'Error al cargar usuarios: ' + err.message;
        integrantes.value = [];
    } finally {
        loading.value = false;
    }
};

// Watch para cambios en la paginación
watch([currentPage, itemsPerPage], () => {
    loadUsuarios();
});

// Computed para filtrar integrantes basado en la búsqueda
const filteredIntegrantes = computed(() => {
    if (!searchQuery.value) return integrantes.value;
    
    const query = searchQuery.value.toLowerCase();
    return integrantes.value.filter(integrante => 
        integrante.nombre.toLowerCase().includes(query) || 
        integrante.usuario.toLowerCase().includes(query) ||
        integrante.dominio.toLowerCase().includes(query)
    );
});

const sortedIntegrantes = computed(() => {
    const sorted = [...filteredIntegrantes.value].sort((a, b) => {
        const key = sortConfig.value.key;
        if (sortConfig.value.order === "asc") {
            return a[key].localeCompare(b[key]);
        } else {
            return b[key].localeCompare(a[key]);
        }
    });
    return sorted;
});

const paginatedIntegrantes = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return sortedIntegrantes.value.slice(start, end);
});

const totalPages = computed(() => {
    return Math.ceil(totalItems.value / itemsPerPage.value);
});

const toggleSort = (key) => {
    if (sortConfig.value.key === key) {
        sortConfig.value.order = sortConfig.value.order === "asc" ? "desc" : "asc";
    } else {
        sortConfig.value.key = key;
        sortConfig.value.order = "asc";
    }
};

const toggleSelection = (usuario) => {
    if (selectedIntegrantes.value.includes(usuario)) {
        selectedIntegrantes.value = selectedIntegrantes.value.filter(
            (u) => u !== usuario
        );
    } else {
        selectedIntegrantes.value.push(usuario);
    }
    emit('update:selectedIntegrantes', selectedIntegrantes.value);
};

const toggleSelectAll = () => {
    if (selectedIntegrantes.value.length === paginatedIntegrantes.value.length) {
        // Deseleccionar todos de la página actual
        const usuariosEnPagina = paginatedIntegrantes.value.map(i => i.usuario);
        selectedIntegrantes.value = selectedIntegrantes.value.filter(u => !usuariosEnPagina.includes(u));
    } else {
        // Seleccionar todos de la página actual
        const usuariosSeleccionados = new Set(selectedIntegrantes.value);
        paginatedIntegrantes.value.forEach(i => {
            usuariosSeleccionados.add(i.usuario);
        });
        selectedIntegrantes.value = Array.from(usuariosSeleccionados);
    }
    emit('update:selectedIntegrantes', selectedIntegrantes.value);
};

// Verificar si todos los elementos de la página actual están seleccionados
const allCurrentSelected = computed(() => {
    return paginatedIntegrantes.value.length > 0 && 
           paginatedIntegrantes.value.every(i => selectedIntegrantes.value.includes(i.usuario));
});

onMounted(() => {
    itemsPerPage.value = 10;
    loadUsuarios();
});
</script>

<template>
    <div class="w-full space-y-4">
        <!-- Mostrar error si existe -->
        <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {{ error }}
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center items-center py-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>

        <!-- Barra de búsqueda con ícono -->
        <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
            </div>
            <input 
                type="text" 
                v-model="searchQuery" 
                placeholder="Buscar integrante..." 
                class="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
        </div>
        
        <!-- Tabla con altura fija y scroll -->
        <div class="border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div class="max-h-96 overflow-y-auto">
                <table class="w-full border-collapse">
                    <thead class="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                <div class="flex items-center">
                                    <input
                                        type="checkbox"
                                        :checked="allCurrentSelected"
                                        @change="toggleSelectAll"
                                        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                </div>
                            </th>
                            <th 
                                class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer group"
                                @click="toggleSort('nombre')"
                            >
                                <div class="flex items-center space-x-1">
                                    <span>Nombre</span>
                                    <div class="flex flex-col">
                                        <svg 
                                            :class="['h-2 w-2 transition-colors', sortConfig.key === 'nombre' && sortConfig.order === 'asc' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600']" 
                                            fill="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                                        </svg>
                                        <svg 
                                            :class="['h-2 w-2 transition-colors', sortConfig.key === 'nombre' && sortConfig.order === 'desc' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600']" 
                                            fill="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 16l-6-6 1.41-1.41L12 13.17l4.59-4.58L18 10z" />
                                        </svg>
                                    </div>
                                </div>
                            </th>
                            <th 
                                class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer group"
                                @click="toggleSort('usuario')"
                            >
                                <div class="flex items-center space-x-1">
                                    <span>Usuario de Red</span>
                                    <div class="flex flex-col">
                                        <svg 
                                            :class="['h-2 w-2 transition-colors', sortConfig.key === 'usuario' && sortConfig.order === 'asc' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600']" 
                                            fill="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                                        </svg>
                                        <svg 
                                            :class="['h-2 w-2 transition-colors', sortConfig.key === 'usuario' && sortConfig.order === 'desc' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600']" 
                                            fill="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 16l-6-6 1.41-1.41L12 13.17l4.59-4.58L18 10z" />
                                        </svg>
                                    </div>
                                </div>
                            </th>
                            <th 
                                class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer group"
                                @click="toggleSort('dominio')"
                            >
                                <div class="flex items-center space-x-1">
                                    <span>Dominio</span>
                                    <div class="flex flex-col">
                                        <svg 
                                            :class="['h-2 w-2 transition-colors', sortConfig.key === 'dominio' && sortConfig.order === 'asc' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600']" 
                                            fill="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                                        </svg>
                                        <svg 
                                            :class="['h-2 w-2 transition-colors', sortConfig.key === 'dominio' && sortConfig.order === 'desc' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600']" 
                                            fill="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 16l-6-6 1.41-1.41L12 13.17l4.59-4.58L18 10z" />
                                        </svg>
                                    </div>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr v-if="paginatedIntegrantes.length === 0" class="hover:bg-gray-50">
                            <td colspan="4" class="px-4 py-4 text-sm text-left text-gray-500">
                                No se encontraron resultados.
                            </td>
                        </tr>
                        <tr 
                            v-for="integrante in paginatedIntegrantes" 
                            :key="integrante.usuario" 
                            class="hover:bg-gray-50 transition-colors"
                        >
                            <td class="px-4 py-3 whitespace-nowrap">
                                <input
                                    type="checkbox"
                                    :checked="selectedIntegrantes.includes(integrante.usuario)"
                                    @change="toggleSelection(integrante.usuario)"
                                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-700 text-left">{{ integrante.nombre }}</td>
                            <td class="px-4 py-3 text-sm text-gray-700 text-left">{{ integrante.usuario }}</td>
                            <td class="px-4 py-3 text-sm text-gray-700 text-left">{{ integrante.dominio }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Información y paginación -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <!-- Información de selección y registros -->
            <div class="text-sm text-gray-600">
                <span v-if="selectedIntegrantes.length > 0">
                    {{ selectedIntegrantes.length }} integrante(s) seleccionado(s)
                </span>
                <span v-else>Selecciona integrantes para añadirlos al grupo</span>
            </div>
            
            <!-- Paginación moderna y compacta -->
            <div class="flex items-center space-x-1">
                <button
                    @click="currentPage = 1"
                    :disabled="currentPage === 1"
                    class="p-1 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Primera página"
                >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                </button>
                <button
                    @click="currentPage = Math.max(1, currentPage - 1)"
                    :disabled="currentPage === 1"
                    class="p-1 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Página anterior"
                >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                
                <div class="text-sm text-gray-700 px-2">
                    <span class="font-medium">{{ currentPage }}</span> de <span>{{ totalPages || 1 }}</span>
                </div>
                
                <button
                    @click="currentPage = Math.min(totalPages, currentPage + 1)"
                    :disabled="currentPage === totalPages || totalPages === 0"
                    class="p-1 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Página siguiente"
                >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
                <button
                    @click="currentPage = totalPages"
                    :disabled="currentPage === totalPages || totalPages === 0"
                    class="p-1 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Última página"
                >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                </button>
                
                <div class="border-l pl-2 ml-1">
                    <select
                        v-model="itemsPerPage"
                        class="text-sm border border-gray-300 rounded-md px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                    </select>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Personalización de scroll */
.max-h-96 {
    max-height: 24rem;
}

::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
}

/* Estilos para checkboxes */
input[type="checkbox"] {
    transition: all 0.2s ease-in-out;
}

/* Animación suave */
.transition-colors {
    transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out, border-color 0.2s ease-in-out;
}

/* Estilizar la tabla */
table {
    border-spacing: 0;
}

thead {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* Mejorar el aspecto de la tabla en pantallas pequeñas */
@media (max-width: 640px) {
    th, td {
        padding-left: 0.5rem;
        padding-right: 0.5rem;
    }
}
</style>