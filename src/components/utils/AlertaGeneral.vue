<template>
    <transition 
        enter-active-class="transform ease-out duration-300 transition"
        enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
        enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
    >
        <div
            v-if="visible"
            :class="[
                'fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3',
                'transform transition-all duration-300 hover:scale-102',
                'z-[9999]',
                alertClasses
            ]"
        >
            <div :class="['rounded-full p-2', iconBackgroundClass]">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        :d="alertIcon"
                    />
                </svg>
            </div>
            <div class="flex-1">
                <p class="font-medium">{{ message }}</p>
            </div>
            <div class="flex items-center space-x-2">
                <slot name="actions"></slot>
                <button 
                    v-if="!$slots.actions"
                    @click="visible = false"
                    class="ml-4 flex-shrink-0 rounded-full p-1 transition-colors duration-200 hover:bg-black/10"
                >
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    </transition>
</template>

<script>
export default {
    name: "AlertaGeneral",
    props: {
        message: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            default: "success",
            validator: (value) => ["success", "warning", "error"].includes(value),
        },
        duration: {
            type: Number,
            default: 4000,
        },
    },
    data() {
        return {
            visible: false,
        };
    },
    computed: {
        alertClasses() {
            const baseClasses = 'text-white';
            switch (this.type) {
                case "success":
                    return `${baseClasses} bg-emerald-500`;
                case "warning":
                    return `${baseClasses} bg-amber-500`;
                case "error":
                    return `${baseClasses} bg-rose-500`;
                default:
                    return `${baseClasses} bg-blue-500`;
            }
        },
        iconBackgroundClass() {
            switch (this.type) {
                case "success":
                    return 'bg-emerald-600';
                case "warning":
                    return 'bg-amber-600';
                case "error":
                    return 'bg-rose-600';
                default:
                    return 'bg-blue-600';
            }
        },
        alertIcon() {
            switch (this.type) {
                case "success":
                    return "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z";
                case "warning":
                    return "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";
                case "error":
                    return "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
                default:
                    return "M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z";
            }
        },
    },
    methods: {
        show() {
            // Emitir evento para limpiar otras alertas antes de mostrar esta
            this.$emit('before-show');
            this.visible = true;
            if (this.duration > 0) {
                setTimeout(() => {
                    this.hide();
                }, this.duration);
            }
        },
        hide() {
            this.visible = false;
            // Emitir evento cuando la alerta se oculta
            this.$emit('hidden');
        }
    },
    mounted() {
        this.show();
    },
    beforeUnmount() {
        this.hide();
    }
};
</script>

<style scoped>
.scale-102 {
    transform: scale(1.02);
}
</style>