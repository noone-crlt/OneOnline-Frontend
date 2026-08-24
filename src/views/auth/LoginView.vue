<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  ArrowLeft, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Zap
} from 'lucide-vue-next'

import { login, loginWithGoogle } from '../../stores/auth'

const GOOGLE_SCRIPT_ID = 'google-identity-services'
let googleScriptPromise

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google)
  if (googleScriptPromise) return googleScriptPromise

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID)
    const handleLoad = () => resolve(window.google)
    const handleError = () => reject(new Error('Không thể tải dịch vụ đăng nhập Google.'))

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_SCRIPT_ID
    script.src = 'https://accounts.google.com/gsi/client?hl=vi'
    script.async = true
    script.defer = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
  }).catch((error) => {
    googleScriptPromise = undefined
    throw error
  })

  return googleScriptPromise
}

const route = useRoute()
const router = useRouter()

const form = reactive({
  email: '',
  password: '',
})

const showPassword = ref(false)
const errorMessage = ref('')
const isSubmitting = ref(false)
const isGoogleSubmitting = ref(false)
const googleButton = ref(null)
const googleUnavailable = ref(false)
const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
let isUnmounted = false

const isBusy = computed(() => isSubmitting.value || isGoogleSubmitting.value)

const successMessage = computed(() =>
  route.query.registered === '1' ? 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.' : '',
)

const redirectTarget = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.length > 0 ? redirect : ''
})

function resolveTarget(user) {
  const redirect = redirectTarget.value
  const isAdmin = user?.roles?.includes('ADMIN') ?? false

  if (isAdmin) {
    if (redirect && redirect.startsWith('/admin')) {
      return redirect
    }
    return '/admin'
  }

  if (redirect && redirect.startsWith('/') && !redirect.startsWith('/admin')) {
    return redirect
  }

  return '/'
}

async function handleSubmit() {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    const session = await login({
      email: form.email.trim(),
      password: form.password,
    })

    await router.replace(resolveTarget(session.user))
  } catch (error) {
    errorMessage.value =
      error instanceof TypeError
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
        : error instanceof Error
          ? error.message
          : 'Đăng nhập thất bại. Vui lòng thử lại.'
  } finally {
    isSubmitting.value = false
  }
}

async function handleGoogleCredential(response) {
  if (!response?.credential || isGoogleSubmitting.value) return

  errorMessage.value = ''
  isGoogleSubmitting.value = true

  try {
    const session = await loginWithGoogle(response.credential)
    if (!isUnmounted) await router.replace(resolveTarget(session.user))
  } catch (error) {
    if (!isUnmounted) {
      errorMessage.value =
        error instanceof TypeError
          ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
          : error instanceof Error
            ? error.message
            : 'Đăng nhập Google thất bại. Vui lòng thử lại.'
    }
  } finally {
    if (!isUnmounted) isGoogleSubmitting.value = false
  }
}

onMounted(async () => {
  if (!googleClientId) {
    googleUnavailable.value = true
    return
  }

  try {
    const google = await loadGoogleIdentityScript()
    if (isUnmounted || !googleButton.value) return

    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    })
    google.accounts.id.renderButton(googleButton.value, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      locale: 'vi',
      width: Math.floor(Math.min(googleButton.value.clientWidth || 320, 380)),
    })
  } catch (error) {
    if (!isUnmounted) {
      googleUnavailable.value = true
      errorMessage.value = error instanceof Error ? error.message : 'Không thể tải dịch vụ Google.'
    }
  }
})

onBeforeUnmount(() => {
  isUnmounted = true
  if (googleButton.value) googleButton.value.replaceChildren()
})
</script>

<template>
  <main class="vanguard-auth-page">
    <!-- Ambient Background Mesh Orbs -->
    <div class="mesh-orb mesh-orb-1"></div>
    <div class="mesh-orb mesh-orb-2"></div>
    <div class="mesh-orb mesh-orb-3"></div>
    <div class="noise-overlay"></div>

    <!-- Outer Double-Bezel Hardware Shell -->
    <div class="doppelrand-shell">
      <div class="doppelrand-core">
        
        <!-- Left Side: Cinematic Branding & Visual World -->
        <div class="brand-visual-panel">
          <div class="visual-header">
            <RouterLink class="back-pill-btn" to="/">
              <ArrowLeft :size="15" />
              <span>Trang chủ</span>
            </RouterLink>

            <div class="brand-identity-badge">
              <div class="brand-logo-icon">
                <BookOpen :size="16" />
              </div>
              <span class="brand-name">ONE ONLINE</span>
            </div>
          </div>

          <div class="visual-body">
            <div class="eyebrow-pill">
              <Sparkles :size="12" class="eyebrow-sparkle" />
              <span>Nâng tầm tri thức số</span>
            </div>

            <h1 class="visual-headline">
              Khám phá thế giới <br />
              <span class="gradient-text">sách không giới hạn.</span>
            </h1>

            <p class="visual-subtext">
              Thư viện Kỹ thuật số hàng đầu. Trải nghiệm đọc sách điện tử mượt mà, nghe audiobook chất lượng cao và sở hữu bản in cao cấp.
            </p>

            <!-- Feature Pills -->
            <div class="feature-pills-row">
              <div class="feature-tag">
                <Zap :size="14" class="feature-icon" />
                <span>Đọc tức thì</span>
              </div>
              <div class="feature-tag">
                <ShieldCheck :size="14" class="feature-icon" />
                <span>Bảo mật 100%</span>
              </div>
            </div>
          </div>

          <div class="visual-footer">
            <div class="glass-quote-card">
              <div class="quote-header">
                <span class="quote-badge">Cảm hứng đọc sách</span>
              </div>
              <p class="quote-content">
                "Sách là nguồn tri thức không bao giờ vơi cạn, mở ra những đường chấn phương trời mới."
              </p>
            </div>
          </div>
        </div>

        <!-- Right Side: Form Shell & Interactive Area -->
        <div class="form-interaction-panel">
          <div class="form-panel-inner">
            <header class="auth-header">
              <h2 class="auth-title">Chào mừng trở lại</h2>
              <p class="auth-subtitle">Vui lòng nhập thông tin đăng nhập để tiếp tục</p>
            </header>

            <form class="vanguard-form" @submit.prevent="handleSubmit">
              <!-- Success Alert -->
              <transition name="fade">
                <div v-if="successMessage" class="vanguard-alert alert-success" role="status">
                  <CheckCircle2 :size="18" class="alert-icon" />
                  <span>{{ successMessage }}</span>
                </div>
              </transition>

              <!-- Form Group: Email -->
              <div class="vanguard-field">
                <label for="email" class="field-label">Địa chỉ Email</label>
                <div class="input-bezel">
                  <Mail :size="18" class="field-icon" />
                  <input
                    id="email"
                    v-model="form.email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    :disabled="isBusy"
                    autocomplete="email"
                  />
                </div>
              </div>

              <!-- Form Group: Password -->
              <div class="vanguard-field">
                <div class="label-with-action">
                  <label for="password" class="field-label">Mật khẩu</label>
                  <a href="#" class="forgot-link">Quên mật khẩu?</a>
                </div>
                <div class="input-bezel">
                  <Lock :size="18" class="field-icon" />
                  <input
                    id="password"
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    required
                    :disabled="isBusy"
                    autocomplete="current-password"
                  />
                  <button 
                    type="button" 
                    class="toggle-eye-btn" 
                    @click="showPassword = !showPassword"
                    tabindex="-1"
                    aria-label="Hiện/Ẩn mật khẩu"
                  >
                    <EyeOff v-if="showPassword" :size="17" />
                    <Eye v-else :size="17" />
                  </button>
                </div>
              </div>

              <!-- Options -->
              <div class="form-row-options">
                <label class="custom-checkbox-wrapper">
                  <input type="checkbox" class="real-checkbox" />
                  <span class="custom-check"></span>
                  <span class="remember-label">Ghi nhớ đăng nhập</span>
                </label>
              </div>

              <!-- Error Alert -->
              <transition name="fade">
                <div v-if="errorMessage" class="vanguard-alert alert-error">
                  <AlertCircle :size="18" class="alert-icon" />
                  <span>{{ errorMessage }}</span>
                </div>
              </transition>

              <!-- High-End CTA Button with Nested Island Icon -->
              <button class="vanguard-cta-btn group" type="submit" :disabled="isBusy">
                <span v-if="isSubmitting" class="glow-spinner"></span>
                <template v-else>
                  <span class="btn-text">Đăng nhập</span>
                  <div class="island-icon-badge">
                    <LogIn :size="16" class="icon-slide" />
                  </div>
                </template>
              </button>

              <!-- Divider -->
              <div class="auth-separator">
                <span class="separator-text">Hoặc đăng nhập với</span>
              </div>

              <!-- Google OAuth Area -->
              <div class="google-auth-container" :class="{ 'is-loading': isGoogleSubmitting }">
                <div ref="googleButton" class="google-rendered-btn"></div>
                <span v-if="isGoogleSubmitting" class="google-status-text">Đang xác thực Google…</span>
                <span v-else-if="googleUnavailable" class="google-status-text">
                  Đăng nhập Google chưa được cấu hình.
                </span>
              </div>
            </form>

            <footer class="auth-footer-prompt">
              <span>Chưa có tài khoản?</span>
              <RouterLink to="/register" class="register-pill-link">
                <span>Đăng ký ngay</span>
                <ArrowUpRight :size="14" />
              </RouterLink>
            </footer>
          </div>
        </div>

      </div>
    </div>
  </main>
</template>

<style scoped>
/* ==========================================================================
   VANGUARD HIGH-END VISUAL DESIGN SYSTEM (Awwwards / Apple / Linear Aesthetics)
   ========================================================================== */

.vanguard-auth-page {
  --page-bg: #070a12;
  --surface-outer: rgba(255, 255, 255, 0.04);
  --surface-inner: rgba(15, 23, 42, 0.75);
  --border-outer: rgba(255, 255, 255, 0.08);
  --border-inner: rgba(255, 255, 255, 0.12);
  --text-heading: #f8fafc;
  --text-body: #94a3b8;
  --accent-glow: #6366f1;
  
  min-height: 100dvh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--page-bg);
  font-family: 'Plus Jakarta Sans', 'Geist', system-ui, -apple-system, sans-serif;
  padding: 1.5rem;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  color: var(--text-heading);
}

/* Ambient Radial Mesh Orbs */
.mesh-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  z-index: 1;
  opacity: 0.6;
}

.mesh-orb-1 {
  width: 500px;
  height: 500px;
  top: -10%;
  left: -10%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
}

.mesh-orb-2 {
  width: 600px;
  height: 600px;
  bottom: -15%;
  right: -10%;
  background: radial-gradient(circle, rgba(79, 70, 229, 0.2) 0%, transparent 70%);
}

.mesh-orb-3 {
  width: 400px;
  height: 400px;
  top: 40%;
  left: 30%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%);
}

.noise-overlay {
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 2;
}

/* ==========================================================================
   DOPPELRAND (DOUBLE-BEZEL) HARDWARE ARCHITECTURE
   ========================================================================== */

.doppelrand-shell {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 1020px;
  min-height: 640px;
  background: var(--surface-outer);
  border: 1px solid var(--border-outer);
  border-radius: 2.5rem;
  padding: 0.65rem;
  box-shadow: 
    0 40px 100px -20px rgba(0, 0, 0, 0.6),
    0 10px 30px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.doppelrand-core {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 620px;
  background: var(--surface-inner);
  border: 1px solid var(--border-inner);
  border-radius: calc(2.5rem - 0.65rem);
  overflow: hidden;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.12);
}

/* ==========================================================================
   LEFT SIDE: BRAND VISUAL PANEL
   ========================================================================== */

.brand-visual-panel {
  flex: 1.1;
  position: relative;
  background: 
    radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.18) 0%, transparent 50%),
    radial-gradient(circle at 85% 85%, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
    linear-gradient(145deg, #090e1a 0%, #0f172a 60%, #060911 100%);
  padding: 3rem 2.5rem;
  display: none;
  flex-direction: column;
  justify-content: space-between;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

@media (min-width: 840px) {
  .brand-visual-panel {
    display: flex;
  }
}

.visual-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.back-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: #e2e8f0;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.45rem 1rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.back-pill-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.25);
  color: #ffffff;
  transform: translateX(-3px);
}

.brand-identity-badge {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.brand-logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 0.65rem;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  display: grid;
  place-items: center;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
}

.brand-name {
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #f8fafc;
}

.visual-body {
  margin: 2rem 0;
}

.eyebrow-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(165, 180, 252, 0.25);
  color: #c7d2fe;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 1.25rem;
}

.eyebrow-sparkle {
  color: #a5b4fc;
}

.visual-headline {
  font-size: 2.25rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.03em;
  color: #ffffff;
  margin: 0 0 1rem 0;
}

.gradient-text {
  background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.visual-subtext {
  font-size: 0.95rem;
  color: rgba(226, 232, 240, 0.8);
  line-height: 1.65;
  margin: 0 0 1.75rem 0;
  max-width: 90%;
  font-weight: 400;
}

.feature-pills-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.feature-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.8rem;
  font-weight: 600;
  color: #cbd5e1;
}

.feature-icon {
  color: #818cf8;
}

.glass-quote-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.25rem;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.quote-header {
  margin-bottom: 0.4rem;
}

.quote-badge {
  font-size: 0.72rem;
  font-weight: 700;
  color: #a5b4fc;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.quote-content {
  font-size: 0.88rem;
  color: #f1f5f9;
  line-height: 1.5;
  margin: 0;
  font-style: italic;
}

/* ==========================================================================
   RIGHT SIDE: FORM INTERACTION PANEL
   ========================================================================== */

.form-interaction-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 2.5rem;
  background: rgba(15, 23, 42, 0.95);
}

.form-panel-inner {
  width: 100%;
  max-width: 380px;
}

.auth-header {
  margin-bottom: 2rem;
}

.auth-title {
  font-size: 1.85rem;
  font-weight: 800;
  color: #f8fafc;
  margin: 0 0 0.4rem 0;
  letter-spacing: -0.03em;
}

.auth-subtitle {
  color: #94a3b8;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.vanguard-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.vanguard-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.label-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #cbd5e1;
  letter-spacing: 0.01em;
}

.forgot-link {
  color: #818cf8;
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.forgot-link:hover {
  color: #a5b4fc;
  text-decoration: underline;
}

/* Input Bezel (Doppelrand Micro-Architecture) */
.input-bezel {
  position: relative;
  display: flex;
  align-items: center;
}

.field-icon {
  position: absolute;
  left: 1rem;
  color: #64748b;
  pointer-events: none;
  transition: color 0.2s ease;
}

.input-bezel input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.8rem 1rem 0.8rem 2.8rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  font-size: 0.95rem;
  color: #f8fafc;
  background-color: rgba(0, 0, 0, 0.25);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  outline: none;
  transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  font-family: inherit;
}

.input-bezel input:focus {
  border-color: rgba(99, 102, 241, 0.6);
  background-color: rgba(0, 0, 0, 0.4);
  box-shadow: 
    0 0 0 4px rgba(99, 102, 241, 0.15),
    inset 0 2px 4px rgba(0, 0, 0, 0.4);
}

.input-bezel input:focus ~ .field-icon,
.input-bezel:focus-within .field-icon {
  color: #818cf8;
}

.input-bezel input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-eye-btn {
  position: absolute;
  right: 0.85rem;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  transition: color 0.2s ease;
}

.toggle-eye-btn:hover {
  color: #f8fafc;
}

/* Checkbox */
.form-row-options {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
}

.custom-checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  user-select: none;
}

.real-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.custom-check {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.real-checkbox:checked ~ .custom-check {
  background: #6366f1;
  border-color: #6366f1;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
}

.remember-label {
  color: #cbd5e1;
  font-size: 0.85rem;
  font-weight: 500;
}

/* Alerts */
.vanguard-alert {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.8rem 1.1rem;
  border-radius: 0.95rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.alert-success {
  background-color: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.alert-error {
  background-color: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.alert-icon {
  flex-shrink: 0;
}

/* ==========================================================================
   NESTED CTA & "ISLAND" BUTTON ARCHITECTURE
   ========================================================================== */

.vanguard-cta-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 0.5rem 0.5rem 1.5rem;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 9999px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.32, 0.72, 0, 1);
  box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
  margin-top: 0.25rem;
  overflow: hidden;
}

.vanguard-cta-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 35px -5px rgba(99, 102, 241, 0.6);
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
}

.vanguard-cta-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.vanguard-cta-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.btn-text {
  flex: 1;
  text-align: center;
}

/* Island Icon Badge */
.island-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.vanguard-cta-btn:hover .island-icon-badge {
  transform: scale(1.08) translateX(2px);
  background: rgba(255, 255, 255, 0.25);
}

.auth-separator {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0.5rem 0;
}

.auth-separator::before,
.auth-separator::after {
  content: '';
  height: 1px;
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
}

.google-auth-container {
  min-height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.google-rendered-btn {
  width: 100%;
  display: flex;
  justify-content: center;
}

.google-rendered-btn :deep(iframe) {
  max-width: 100% !important;
}

.google-status-text {
  color: #94a3b8;
  font-size: 0.82rem;
  text-align: center;
}

/* Spinner */
.glow-spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.auth-footer-prompt {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.88rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.register-pill-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #818cf8;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.2s ease;
}

.register-pill-link:hover {
  color: #a5b4fc;
  text-decoration: underline;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
