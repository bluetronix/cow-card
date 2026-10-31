import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuth } from './stores/auth'

const app = createApp(App)
app.use(router)

const { checkSession } = useAuth()
checkSession().finally(() => app.mount('#app'))
