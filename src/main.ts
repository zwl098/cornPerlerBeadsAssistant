import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { hydrateApp } from './persist/hydrate'
import 'virtual:uno.css'
import './styles/tokens.css'

async function boot() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  try {
    await hydrateApp()
  } catch {
    // IndexedDB 不可用时仍可在内存里用
  }
  app.use(router)
  app.mount('#app')
}

void boot()
