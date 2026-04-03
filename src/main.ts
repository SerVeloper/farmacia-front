import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './presentation/router'
import './style.css'
import App from './App.vue'
import ToastContainer from './presentation/components/common/ToastContainer.vue'
import { useAuthStore } from './application/stores/auth.store'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.component('ToastContainer', ToastContainer)

const authStore = useAuthStore(pinia)
if (authStore.token && !authStore.user) {
  authStore.refreshProfile()
}

app.mount('#app')
