import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './presentation/router'
import './style.css'
import App from './App.vue'
import ToastContainer from './presentation/components/common/ToastContainer.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.component('ToastContainer', ToastContainer)

app.mount('#app')