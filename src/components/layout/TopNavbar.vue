<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { cartOutline, bookOutline } from 'ionicons/icons'
import IonIcon from '../common/IonIcon.vue'
import { authUser, authIsAuthenticated } from '@/stores/auth'
import { cartItemCount, fetchCartItemCount } from '@/stores/cart'
import UserDropdown from '../UserDropdown.vue'

const router = useRouter()
const route = useRoute()

const navItems = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Thư viện', to: '/library' },
  { label: 'Mới nhất', to: '/#latest-books' }
]

const isSignedIn = computed(() => Boolean(authUser.value))

function handleNavClick(item) {
  if (item.to.startsWith('/#')) {
    if (route.path === '/') {
      const id = item.to.replace('/#', '')
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      router.push(item.to)
    }
  } else {
    router.push(item.to)
  }
}

function isActive(item) {
  if (item.to === '/') {
    return route.path === '/' && !route.hash
  }
  if (item.to.startsWith('/#')) {
    return route.path === '/' && route.hash === item.to.replace('/', '')
  }
  return route.path.startsWith(item.to)
}

onMounted(() => {
  fetchCartItemCount()
})

watch(authIsAuthenticated, () => {
  fetchCartItemCount()
})
</script>

<template>
  <header class="topbar">
    <div class="topbar__inner">
      <div class="topbar-side topbar-side-left">
        <RouterLink class="brand" to="/" aria-label="Về trang chủ One Online">
          <img src="@/assets/logo/vectorized.svg" alt="One Online Logo" class="brand-logo-img" />
        </RouterLink>
      </div>

      <nav class="topbar-nav" aria-label="Điều hướng chính">
        <button
          v-for="item in navItems"
          :key="item.label"
          type="button"
          :class="{ active: isActive(item) }"
          @click="handleNavClick(item)"
        >
          {{ item.label }}
        </button>
      </nav>

      <div class="topbar-side topbar-side-right">
        <!-- E-commerce Shopping Cart -->
        <button class="nav-cart-btn" aria-label="Xem giỏ hàng" @click="router.push('/cart')">
          <IonIcon :icon="cartOutline" :size="20" />
          <span class="cart-badge-count" v-if="cartItemCount > 0">{{ cartItemCount }}</span>
        </button>

        <template v-if="!isSignedIn">
          <RouterLink class="topbar-utility" to="/login">Đăng nhập</RouterLink>
        </template>
        <template v-else>
          <RouterLink class="my-library-btn" to="/my-library" :class="{ active: route.path === '/my-library' }">
            <IonIcon :icon="bookOutline" :size="18" />
            <span>Thư viện của tôi</span>
          </RouterLink>
          <UserDropdown />
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.my-library-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.9rem;
  border-radius: 99px;
  background-color: #f4f4f5;
  color: #18181b;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid #e4e4e7;
  white-space: nowrap;
}

.my-library-btn:hover {
  background-color: #09090b;
  color: #ffffff;
  border-color: #09090b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.my-library-btn.active {
  background-color: #09090b;
  color: #ffffff;
  border-color: #09090b;
}

@media (max-width: 640px) {
  .my-library-btn span {
    display: none;
  }
  .my-library-btn {
    padding: 0.45rem;
    border-radius: 50%;
  }
}
</style>
