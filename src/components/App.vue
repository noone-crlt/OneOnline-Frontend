<script setup>
import { onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { Toaster } from 'vue-sonner'
import { getToken, getCurrentUserProfile } from '../services/api'

const route = useRoute()

async function checkAccountStatus() {
  const token = getToken()
  if (!token) return

  try {
    await getCurrentUserProfile()
  } catch (error) {
    // Nếu tài khoản bị Admin khóa, apiFetch sẽ tự động xóa session và văng về trang #/login
  }
}

onMounted(() => {
  // Kiểm tra trạng thái tài khoản 1 lần khi ứng dụng khởi chạy
  checkAccountStatus()
})
</script>

<template>
  <div class="app-shell">
    <RouterView v-slot="{ Component }">
      <Transition name="route-fade" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </RouterView>
    <Toaster position="top-right" richColors />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.route-fade-enter-active,
.route-fade-leave-active {
  transition:
    opacity 160ms ease-out,
    transform 160ms ease-out;
}

.route-fade-enter-from,
.route-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
