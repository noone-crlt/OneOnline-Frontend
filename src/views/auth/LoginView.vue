<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  ArrowLeft, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Smartphone,
  BookmarkCheck
} from 'lucide-vue-next'

import { login, loginWithGoogle } from '../../stores/auth'
import authAmbienceImg from '../../assets/auth-reading-ambience.jpg'

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
  remember: true
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
  route.query.registered === '1' ? 'Đăng ký tài khoản thành công. Vui lòng đăng nhập để bắt đầu đọc.' : '',
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
          : 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.'
  } finally {
    isSubmitting.value = false
  }
}

async function handleGoogleCredential(response) {
  if (!response?.credential || isGoogleSubmitting.value) return
  if (isGoogleSubmitting.value) return

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
  <main class="auth-viewport">
    <!-- Ambient Warm Texture & Quiet Glow -->
    <div class="ambient-glow ambient-glow-top"></div>
    <div class="ambient-glow ambient-glow-bottom"></div>

    <!-- Main Architectural Enclosure (Doppelrand Precision Frame) -->
    <div class="auth-enclosure">
      <div class="auth-grid">
        
        <!-- Left Column: Editorial Brand & Reading Sanctuary -->
        <section class="sanctuary-panel" aria-label="Giới thiệu không gian đọc OneOnline">
          <!-- Real Editorial Photography Background -->
          <div class="sanctuary-media-wrapper">
            <img 
              :src="authAmbienceImg" 
              alt="Không gian đọc sách yên tĩnh với trang sách mở và tách trà ấm" 
              class="sanctuary-media"
            />
            <div class="media-scrim"></div>
          </div>

          <!-- Top Bar Nav -->
          <div class="sanctuary-header">
            <RouterLink class="sanctuary-back-btn" to="/" title="Quay lại trang chủ">
              <ArrowLeft :size="16" />
              <span>Trang chủ</span>
            </RouterLink>

            <div class="sanctuary-brand-mark">
              <div class="brand-glyph">
                <BookOpen :size="16" />
              </div>
              <span class="brand-wordmark">ONE ONLINE</span>
            </div>
          </div>

          <!-- Editorial Headline & Narrative -->
          <div class="sanctuary-narrative">
            <div class="sanctuary-kicker">
              <Sparkles :size="13" class="kicker-sparkle" />
              <span>Thư viện số cao cấp</span>
            </div>

            <h1 class="sanctuary-title">
              Không gian đọc yên tĩnh cho tâm trí của bạn.
            </h1>

            <p class="sanctuary-desc">
              Đăng nhập để tiếp tục hành trình khám phá hàng ngàn tựa sách giá trị, nghe audiobook chất lượng cao và đồng bộ ghi chú mọi lúc.
            </p>

            <div class="sanctuary-attributes">
              <div class="attribute-pill">
                <Smartphone :size="14" class="attribute-icon" />
                <span>Đồng bộ đa thiết bị</span>
              </div>
              <div class="attribute-pill">
                <ShieldCheck :size="14" class="attribute-icon" />
                <span>Bảo mật dữ liệu 100%</span>
              </div>
            </div>
          </div>

          <!-- Tactile Quote & Reader Bookmark Card -->
          <div class="sanctuary-footer">
            <div class="bookmark-card">
              <div class="bookmark-badge">
                <BookmarkCheck :size="14" class="bookmark-icon" />
                <span>Cảm hứng đọc mỗi ngày</span>
              </div>
              <blockquote class="bookmark-quote">
                "Một cuốn sách thực sự tốt là người bạn đồng hành tĩnh lặng, soi sáng những chân trời tri thức mới."
              </blockquote>
            </div>
          </div>
        </section>

        <!-- Right Column: Precision Form & Interactions -->
        <section class="form-panel" aria-label="Khung đăng nhập tài khoản">
          <div class="form-container">
            
            <!-- Mobile Brand Bar (Visible only on mobile) -->
            <div class="mobile-brand-bar">
              <RouterLink class="sanctuary-back-btn mobile-back-btn" to="/" title="Quay lại trang chủ">
                <ArrowLeft :size="15" />
                <span>Trang chủ</span>
              </RouterLink>

              <div class="sanctuary-brand-mark">
                <div class="brand-glyph">
                  <BookOpen :size="15" />
                </div>
                <span class="brand-wordmark">ONE ONLINE</span>
              </div>
            </div>

            <header class="form-header">
              <h2 class="form-heading">Chào mừng trở lại</h2>
              <p class="form-subheading">Nhập thông tin tài khoản để truy cập tủ sách cá nhân</p>
            </header>

            <form class="auth-form" @submit.prevent="handleSubmit">
              
              <!-- Success Notice Banner -->
              <transition name="notice-fade">
                <div v-if="successMessage" class="feedback-banner banner-success" role="status">
                  <CheckCircle2 :size="18" class="banner-icon" />
                  <p class="banner-text">{{ successMessage }}</p>
                </div>
              </transition>

              <!-- Email Field -->
              <div class="form-field">
                <label for="email" class="field-label">Địa chỉ Email</label>
                <div class="field-bezel">
                  <Mail :size="18" class="field-icon" aria-hidden="true" />
                  <input
                    id="email"
                    v-model="form.email"
                    type="email"
                    name="email"
                    placeholder="name@example.com"
                    required
                    :disabled="isBusy"
                    autocomplete="email"
                  />
                </div>
              </div>

              <!-- Password Field -->
              <div class="form-field">
                <div class="field-label-row">
                  <label for="password" class="field-label">Mật khẩu</label>
                  <router-link to="/forgot-password" class="field-action-link">Quên mật khẩu?</router-link>
                </div>
                <div class="field-bezel">
                  <Lock :size="18" class="field-icon" aria-hidden="true" />
                  <input
                    id="password"
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    name="password"
                    placeholder="••••••••"
                    required
                    :disabled="isBusy"
                    autocomplete="current-password"
                  />
                  <button 
                    type="button" 
                    class="field-visibility-btn" 
                    @click="showPassword = !showPassword"
                    tabindex="-1"
                    :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'"
                  >
                    <EyeOff v-if="showPassword" :size="17" />
                    <Eye v-else :size="17" />
                  </button>
                </div>
              </div>

              <!-- Options Row: Custom Checkbox -->
              <div class="form-options-row">
                <label class="remember-checkbox-label">
                  <input 
                    v-model="form.remember" 
                    type="checkbox" 
                    class="sr-only-checkbox" 
                  />
                  <span class="checkbox-box" aria-hidden="true">
                    <svg class="check-icon" viewBox="0 0 12 10" fill="none">
                      <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                  <span class="remember-text">Ghi nhớ đăng nhập</span>
                </label>
              </div>

              <!-- Error Notice Banner -->
              <transition name="notice-fade">
                <div v-if="errorMessage" class="feedback-banner banner-error" role="alert">
                  <AlertCircle :size="18" class="banner-icon" />
                  <p class="banner-text">{{ errorMessage }}</p>
                </div>
              </transition>

              <!-- Primary Submit CTA Button -->
              <button 
                class="primary-submit-btn" 
                type="submit" 
                :disabled="isBusy"
              >
                <span v-if="isSubmitting" class="action-spinner" aria-label="Đang xử lý đăng nhập..."></span>
                <template v-else>
                  <span class="submit-label">Đăng nhập</span>
                  <span class="submit-icon-nest" aria-hidden="true">
                    <ArrowRight :size="16" />
                  </span>
                </template>
              </button>

              <!-- Divider -->
              <div class="or-divider">
                <span class="divider-line"></span>
                <span class="divider-text">hoặc tiếp tục với</span>
                <span class="divider-line"></span>
              </div>

              <!-- Google OAuth Area -->
              <div class="oauth-section" :class="{ 'is-loading': isGoogleSubmitting }">
                <div ref="googleButton" class="google-slot"></div>
                <p v-if="isGoogleSubmitting" class="oauth-status-msg">
                  Đang kết nối tài khoản Google...
                </p>
                <p v-else-if="googleUnavailable" class="oauth-status-muted">
                  Đăng nhập Google hiện chưa được kích hoạt
                </p>
              </div>
            </form>

            <footer class="form-footer">
              <span class="footer-prompt">Chưa có tài khoản?</span>
              <RouterLink to="/register" class="register-link">
                <span>Đăng ký ngay</span>
                <ArrowRight :size="13" class="link-arrow" />
              </RouterLink>
            </footer>

          </div>
        </section>

      </div>
    </div>
  </main>
</template>

<style scoped>
/* ==========================================================================
   ONE ONLINE AUTH THEME SYSTEM: QUIET LUXURY & EDITORIAL READING LOUNGE
   ========================================================================== */

.auth-viewport {
  --auth-bg: #0b0f17;
  --auth-surface-rim: rgba(255, 255, 255, 0.05);
  --auth-surface-panel: #111722;
  --auth-border-rim: rgba(255, 255, 255, 0.09);
  --auth-border-inner: rgba(255, 255, 255, 0.12);
  --auth-ink-heading: #f8fafc;
  --auth-ink-body: #94a3b8;
  --auth-ink-muted: #64748b;
  --auth-accent-amber: #d18a3b;
  --auth-accent-amber-light: #e6a053;
  --auth-accent-amber-glow: rgba(209, 138, 59, 0.25);
  --auth-input-bg: rgba(7, 10, 16, 0.55);
  --auth-input-border: rgba(255, 255, 255, 0.12);
  --auth-input-focus-border: #d18a3b;

  min-height: 100dvh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--auth-bg);
  font-family: 'Plus Jakarta Sans', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--auth-ink-body);
  padding: 1.5rem;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

/* Ambient Radial Warmth */
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(140px);
  pointer-events: none;
  z-index: 1;
  opacity: 0.45;
}

.ambient-glow-top {
  width: 550px;
  height: 550px;
  top: -15%;
  left: 10%;
  background: radial-gradient(circle, rgba(209, 138, 59, 0.16) 0%, transparent 70%);
}

.ambient-glow-bottom {
  width: 650px;
  height: 650px;
  bottom: -20%;
  right: 5%;
  background: radial-gradient(circle, rgba(30, 41, 59, 0.5) 0%, transparent 70%);
}

/* ==========================================================================
   DOPPELRAND ARCHITECTURAL ENCLOSURE (Double-Bezel Precision Shell)
   ========================================================================== */

.auth-enclosure {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 1060px;
  min-height: 660px;
  background: var(--auth-surface-rim);
  border: 1px solid var(--auth-border-rim);
  border-radius: 2rem;
  padding: 0.6rem;
  box-shadow: 
    0 35px 90px -20px rgba(0, 0, 0, 0.75),
    0 10px 30px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.auth-grid {
  display: grid;
  grid-template-columns: 1fr;
  width: 100%;
  min-height: 640px;
  background: var(--auth-surface-panel);
  border: 1px solid var(--auth-border-inner);
  border-radius: calc(2rem - 0.6rem);
  overflow: hidden;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.08);
}

@media (min-width: 880px) {
  .auth-grid {
    grid-template-columns: 1.12fr 1fr;
  }
}

/* ==========================================================================
   LEFT COLUMN: SANCTUARY EDITORIAL PANEL
   ========================================================================== */

.sanctuary-panel {
  position: relative;
  display: none;
  flex-direction: column;
  justify-content: space-between;
  padding: 3rem 2.75rem;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

@media (min-width: 880px) {
  .sanctuary-panel {
    display: flex;
  }
}

/* Photography Background with Scrim */
.sanctuary-media-wrapper {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
}

.sanctuary-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: contrast(1.05) brightness(0.72) saturate(0.95);
  transform: scale(1.02);
  transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.sanctuary-panel:hover .sanctuary-media {
  transform: scale(1.04);
}

.media-scrim {
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(180deg, rgba(11, 15, 23, 0.75) 0%, rgba(11, 15, 23, 0.88) 60%, rgba(11, 15, 23, 0.96) 100%),
    radial-gradient(circle at 10% 20%, rgba(209, 138, 59, 0.15) 0%, transparent 60%);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

/* Header Elements */
.sanctuary-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sanctuary-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #f1f5f9;
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.45rem 1rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.sanctuary-back-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.28);
  color: #ffffff;
  transform: translateX(-3px);
}

.sanctuary-brand-mark {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.brand-glyph {
  width: 32px;
  height: 32px;
  border-radius: 0.6rem;
  background: linear-gradient(135deg, var(--auth-accent-amber), #9a5f22);
  display: grid;
  place-items: center;
  color: #ffffff;
  box-shadow: 0 4px 16px var(--auth-accent-amber-glow);
}

.brand-wordmark {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  color: #f8fafc;
}

/* Editorial Storytelling */
.sanctuary-narrative {
  position: relative;
  z-index: 10;
  margin: 2.5rem 0 2rem;
}

.sanctuary-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  background: rgba(209, 138, 59, 0.14);
  border: 1px solid rgba(209, 138, 59, 0.28);
  color: var(--auth-accent-amber-light);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 1.25rem;
}

.kicker-sparkle {
  color: var(--auth-accent-amber);
}

.sanctuary-title {
  font-family: 'Newsreader', 'Prata', Georgia, serif;
  font-size: 2.35rem;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #ffffff;
  margin: 0 0 1.15rem 0;
  text-wrap: balance;
}

.sanctuary-desc {
  font-size: 0.94rem;
  color: rgba(226, 232, 240, 0.85);
  line-height: 1.65;
  margin: 0 0 1.75rem 0;
  max-width: 95%;
  font-weight: 400;
}

.sanctuary-attributes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.attribute-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.42rem 0.85rem;
  border-radius: 0.65rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  font-size: 0.78rem;
  font-weight: 600;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.attribute-icon {
  color: var(--auth-accent-amber-light);
}

/* Footer Quote Card */
.sanctuary-footer {
  position: relative;
  z-index: 10;
}

.bookmark-card {
  background: rgba(11, 15, 23, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
  padding: 1.2rem 1.4rem;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}

.bookmark-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--auth-accent-amber-light);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.45rem;
}

.bookmark-icon {
  color: var(--auth-accent-amber);
}

.bookmark-quote {
  font-family: 'Newsreader', Georgia, serif;
  font-size: 0.92rem;
  font-style: italic;
  line-height: 1.5;
  color: #f1f5f9;
  margin: 0;
}

/* ==========================================================================
   RIGHT COLUMN: PRECISION INTERACTION FORM
   ========================================================================== */

.form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 2.25rem;
  background: rgba(17, 23, 34, 0.95);
}

@media (min-width: 640px) {
  .form-panel {
    padding: 3.5rem 3rem;
  }
}

.form-container {
  width: 100%;
  max-width: 390px;
}

.mobile-brand-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

@media (min-width: 880px) {
  .mobile-brand-bar {
    display: none;
  }
}

.form-header {
  margin-bottom: 2rem;
}

.form-heading {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 1.85rem;
  font-weight: 800;
  color: var(--auth-ink-heading);
  margin: 0 0 0.45rem 0;
  letter-spacing: -0.03em;
}

.form-subheading {
  font-size: 0.88rem;
  color: var(--auth-ink-body);
  margin: 0;
  line-height: 1.45;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Form Fields */
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #cbd5e1;
  letter-spacing: 0.01em;
}

.field-action-link {
  color: var(--auth-accent-amber-light);
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.field-action-link:hover {
  color: #ffffff;
  text-decoration: underline;
}

/* Input Bezel Structure */
.field-bezel {
  position: relative;
  display: flex;
  align-items: center;
}

.field-icon {
  position: absolute;
  left: 1rem;
  color: var(--auth-ink-muted);
  pointer-events: none;
  transition: color 0.2s ease;
}

.field-bezel input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.82rem 1rem 0.82rem 2.85rem;
  border: 1px solid var(--auth-input-border);
  border-radius: 0.85rem;
  font-size: 0.94rem;
  color: #ffffff;
  background-color: var(--auth-input-bg);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
  outline: none;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: inherit;
}

.field-bezel input::placeholder {
  color: #475569;
}

.field-bezel input:focus {
  border-color: var(--auth-input-focus-border);
  background-color: rgba(7, 10, 16, 0.85);
  box-shadow: 
    0 0 0 3px rgba(209, 138, 59, 0.18),
    inset 0 2px 4px rgba(0, 0, 0, 0.4);
}

.field-bezel input:focus ~ .field-icon,
.field-bezel:focus-within .field-icon {
  color: var(--auth-accent-amber-light);
}

.field-bezel input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.field-visibility-btn {
  position: absolute;
  right: 0.85rem;
  background: none;
  border: none;
  color: var(--auth-ink-muted);
  cursor: pointer;
  padding: 0.35rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.4rem;
  transition: color 0.2s ease;
}

.field-visibility-btn:hover {
  color: #f1f5f9;
}

/* Custom Checkbox */
.form-options-row {
  display: flex;
  align-items: center;
  margin-top: -0.2rem;
}

.remember-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  user-select: none;
}

.sr-only-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkbox-box {
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(7, 10, 16, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0b0f17;
  transition: all 0.2s ease;
}

.check-icon {
  width: 9px;
  height: 9px;
  opacity: 0;
  transform: scale(0.6);
  transition: all 0.2s ease;
}

.sr-only-checkbox:checked ~ .checkbox-box {
  background: var(--auth-accent-amber);
  border-color: var(--auth-accent-amber);
  box-shadow: 0 0 10px var(--auth-accent-amber-glow);
}

.sr-only-checkbox:checked ~ .checkbox-box .check-icon {
  opacity: 1;
  transform: scale(1);
}

.remember-text {
  color: #cbd5e1;
  font-size: 0.84rem;
  font-weight: 500;
}

/* Feedback Notice Banners */
.feedback-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 1.1rem;
  border-radius: 0.85rem;
  font-size: 0.85rem;
  line-height: 1.45;
}

.banner-success {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.banner-error {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.banner-icon {
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.banner-text {
  margin: 0;
  flex: 1;
}

/* Submit CTA Button */
.primary-submit-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.45rem 0.5rem 0.45rem 1.5rem;
  background: linear-gradient(135deg, var(--auth-accent-amber) 0%, #b87326 100%);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 9999px;
  font-size: 0.94rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 10px 25px -4px rgba(209, 138, 59, 0.4);
  margin-top: 0.25rem;
  overflow: hidden;
}

.primary-submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px -4px rgba(209, 138, 59, 0.6);
  background: linear-gradient(135deg, #df9745 0%, #c47c2d 100%);
}

.primary-submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.primary-submit-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.submit-label {
  flex: 1;
  text-align: center;
  letter-spacing: 0.02em;
}

.submit-icon-nest {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.primary-submit-btn:hover .submit-icon-nest {
  transform: translateX(3px);
  background: rgba(0, 0, 0, 0.28);
}

/* Action Spinner */
.action-spinner {
  width: 1.3rem;
  height: 1.3rem;
  margin: 0.5rem auto;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin-loop 0.8s linear infinite;
}

/* Or Divider */
.or-divider {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  color: var(--auth-ink-muted);
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0.4rem 0;
}

.divider-line {
  height: 1px;
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
}

.divider-text {
  flex-shrink: 0;
}

/* OAuth Section */
.oauth-section {
  min-height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}

.google-slot {
  width: 100%;
  display: flex;
  justify-content: center;
}

.google-slot :deep(iframe) {
  max-width: 100% !important;
}

.oauth-status-msg {
  color: var(--auth-accent-amber-light);
  font-size: 0.82rem;
  text-align: center;
  margin: 0;
}

.oauth-status-muted {
  color: #475569;
  font-size: 0.8rem;
  text-align: center;
  margin: 0;
}

/* Footer Link */
.form-footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.86rem;
  color: var(--auth-ink-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.register-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--auth-accent-amber-light);
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s ease;
}

.register-link:hover {
  color: #ffffff;
  transform: translateX(2px);
}

.link-arrow {
  transition: transform 0.2s ease;
}

.register-link:hover .link-arrow {
  transform: translateX(2px);
}

/* Notice Transitions */
.notice-fade-enter-active,
.notice-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.notice-fade-enter-from,
.notice-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@keyframes spin-loop {
  to { transform: rotate(360deg); }
}
</style>
