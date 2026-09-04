<template>
  <div class="forgot-page">
    <div class="forgot-container">
      <!-- Back Link -->
      <div class="top-nav">
        <router-link to="/login" class="back-link" aria-label="Quay lại đăng nhập">
          <svg xmlns="http://www.w3.org/2000/svg" class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Quay lại Đăng nhập</span>
        </router-link>
      </div>

      <!-- Main Card Shell -->
      <main class="forgot-card">
        <!-- Progress Stepper (Steps 1, 2, 3) -->
        <div v-if="currentStep <= 3" class="stepper-bar" role="progressbar" :aria-valuenow="currentStep" aria-valuemin="1" aria-valuemax="3">
          <div 
            v-for="s in 3" 
            :key="s" 
            class="stepper-item"
            :class="{ 
              'is-active': currentStep === s, 
              'is-complete': currentStep > s 
            }"
          >
            <div class="step-circle">
              <svg v-if="currentStep > s" xmlns="http://www.w3.org/2000/svg" class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span v-else>{{ s }}</span>
            </div>
            <span class="step-label">{{ stepLabels[s - 1] }}</span>
          </div>
          <div class="stepper-track">
            <div class="stepper-progress" :style="{ width: ((currentStep - 1) / 2 * 100) + '%' }"></div>
          </div>
        </div>

        <!-- Animated Steps Transition -->
        <Transition name="step-fade" mode="out-in">
          
          <!-- STEP 1: NHẬP EMAIL -->
          <div v-if="currentStep === 1" key="step1" class="step-content">
            <div class="step-header">
              <div class="icon-bubble">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <h1 class="card-title">Quên mật khẩu?</h1>
              <p class="card-subtitle">
                Đừng lo lắng! Nhập địa chỉ email đăng ký tài khoản của bạn để nhận mã xác thực OTP.
              </p>
            </div>

            <form @submit.prevent="handleSendOtp" class="auth-form" novalidate>
              <div class="form-group" :class="{ 'has-error': emailError }">
                <label for="email-input" class="form-label">Địa chỉ Email</label>
                <div class="input-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-5.5 8.28"></path>
                  </svg>
                  <input
                    id="email-input"
                    v-model="email"
                    type="email"
                    placeholder="example@domain.com"
                    autocomplete="email"
                    required
                    :disabled="isLoading"
                    class="form-input"
                    aria-required="true"
                    :aria-invalid="emailError ? 'true' : 'false'"
                    @input="emailError = ''"
                  />
                </div>
                <span v-if="emailError" class="field-error-msg" role="alert">{{ emailError }}</span>
              </div>

              <button type="submit" class="submit-btn" :disabled="isLoading">
                <span v-if="!isLoading">Gửi mã xác thực OTP</span>
                <span v-else class="btn-spinner-box">
                  <span class="btn-spinner"></span>
                  Đang gửi mã...
                </span>
              </button>
            </form>
          </div>

          <!-- STEP 2: XÁC THỰC MÃ OTP -->
          <div v-else-if="currentStep === 2" key="step2" class="step-content">
            <div class="step-header">
              <div class="icon-bubble is-blue">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h1 class="card-title">Xác thực OTP</h1>
              <p class="card-subtitle">
                Chúng tôi đã gửi mã 6 chữ số tới <strong>{{ email }}</strong>. 
                <button type="button" class="change-email-btn" @click="currentStep = 1">Đổi email</button>
              </p>
            </div>

            <!-- OTP Input Component Reused -->
            <OtpInput
              v-model="otpCode"
              :length="6"
              :loading="isLoading"
              :error="otpError"
              :error-message="otpErrorMessage"
              :resend-cooldown="60"
              :auto-focus="true"
              @complete="handleOtpComplete"
              @resend="handleResendOtp"
            />

            <button 
              type="button" 
              class="submit-btn margin-top-lg"
              :disabled="otpCode.length < 6 || isLoading"
              @click="handleOtpComplete(otpCode)"
            >
              <span v-if="!isLoading">Xác nhận mã OTP</span>
              <span v-else class="btn-spinner-box">
                <span class="btn-spinner"></span>
                Đang xác thực...
              </span>
            </button>
          </div>

          <!-- STEP 3: NHẬP MẬT KHẨU MỚI -->
          <div v-else-if="currentStep === 3" key="step3" class="step-content">
            <div class="step-header">
              <div class="icon-bubble is-amber">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                </svg>
              </div>
              <h1 class="card-title">Đặt mật khẩu mới</h1>
              <p class="card-subtitle">
                Vui lòng tạo mật khẩu mới an toàn gồm ít nhất 8 ký tự.
              </p>
            </div>

            <form @submit.prevent="handleResetPassword" class="auth-form" novalidate>
              <!-- Mật khẩu mới -->
              <div class="form-group" :class="{ 'has-error': passwordError }">
                <label for="new-pass-input" class="form-label">Mật khẩu mới</label>
                <div class="input-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    id="new-pass-input"
                    v-model="newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    placeholder="Tối thiểu 8 ký tự"
                    autocomplete="new-password"
                    required
                    :disabled="isLoading"
                    class="form-input"
                    @input="passwordError = ''"
                  />
                  <button
                    type="button"
                    class="toggle-eye-btn"
                    :aria-label="showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                    @click="showNewPassword = !showNewPassword"
                  >
                    <svg v-if="!showNewPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  </button>
                </div>

                <!-- Password Strength Meter -->
                <div v-if="newPassword" class="strength-meter">
                  <div class="strength-bars">
                    <div 
                      v-for="n in 4" 
                      :key="n" 
                      class="strength-segment"
                      :class="{ 'is-filled': passwordStrength >= n, [strengthColorClass]: passwordStrength >= n }"
                    ></div>
                  </div>
                  <span class="strength-text" :class="strengthColorClass">Độ mạnh: {{ strengthLabel }}</span>
                </div>
              </div>

              <!-- Xác nhận mật khẩu mới -->
              <div class="form-group" :class="{ 'has-error': passwordError }">
                <label for="confirm-pass-input" class="form-label">Xác nhận mật khẩu mới</label>
                <div class="input-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <input
                    id="confirm-pass-input"
                    v-model="confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    placeholder="Nhập lại mật khẩu mới"
                    autocomplete="new-password"
                    required
                    :disabled="isLoading"
                    class="form-input"
                    @input="passwordError = ''"
                  />
                  <button
                    type="button"
                    class="toggle-eye-btn"
                    :aria-label="showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                    @click="showConfirmPassword = !showConfirmPassword"
                  >
                    <svg v-if="!showConfirmPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  </button>
                </div>
                <span v-if="passwordError" class="field-error-msg" role="alert">{{ passwordError }}</span>
              </div>

              <button type="submit" class="submit-btn" :disabled="isLoading">
                <span v-if="!isLoading">Tạo mật khẩu mới</span>
                <span v-else class="btn-spinner-box">
                  <span class="btn-spinner"></span>
                  Đang thiết lập...
                </span>
              </button>
            </form>
          </div>

          <!-- STEP 4: THÀNH CÔNG -->
          <div v-else-if="currentStep === 4" key="step4" class="step-content text-center">
            <div class="success-glow-wrapper">
              <div class="success-glow"></div>
              <div class="success-icon-badge">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>

            <h1 class="card-title">Đổi mật khẩu thành công!</h1>
            <p class="card-subtitle">
              Mật khẩu tài khoản của bạn đã được cập nhật an toàn. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.
            </p>

            <router-link to="/login" class="submit-btn as-link">
              Đăng nhập ngay
            </router-link>
          </div>

        </Transition>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import OtpInput from '../../components/auth/OtpInput.vue'

const stepLabels = ['Email', 'Mã OTP', 'Mật khẩu']
const currentStep = ref(1)

// Form States
const email = ref('')
const emailError = ref('')

const otpCode = ref('')
const otpError = ref(false)
const otpErrorMessage = ref('')

const newPassword = ref('')
const confirmPassword = ref('')
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const passwordError = ref('')

const isLoading = ref(false)

// Password Strength Computation
const passwordStrength = computed(() => {
  const p = newPassword.value
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const strengthLabel = computed(() => {
  switch (passwordStrength.value) {
    case 1: return 'Yếu'
    case 2: return 'Trung bình'
    case 3: return 'Mạnh'
    case 4: return 'Rất mạnh'
    default: return ''
  }
})

const strengthColorClass = computed(() => {
  switch (passwordStrength.value) {
    case 1: return 'is-weak'
    case 2: return 'is-medium'
    case 3: return 'is-strong'
    case 4: return 'is-very-strong'
    default: return ''
  }
})

// Step 1: Send OTP to Email
function handleSendOtp() {
  emailError.value = ''
  
  if (!email.value || !email.value.includes('@') || !email.value.includes('.')) {
    emailError.value = 'Vui lòng nhập địa chỉ email hợp lệ.'
    return
  }

  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
    currentStep.value = 2
  }, 1000)
}

// Step 2: Verify OTP
function handleOtpComplete(code) {
  otpError.value = false
  otpErrorMessage.value = ''
  isLoading.value = true

  setTimeout(() => {
    isLoading.value = false
    // Demo rule: code "123456" or any non-empty code advances for testing
    if (code === '123456' || code.length === 6) {
      currentStep.value = 3
    } else {
      otpError.value = true
      otpErrorMessage.value = 'Mã OTP không đúng. Thử dùng mã demo: 123456'
    }
  }, 1200)
}

function handleResendOtp() {
  otpError.value = false
  otpCode.value = ''
}

// Step 3: Reset Password
function handleResetPassword() {
  passwordError.value = ''

  if (newPassword.value.length < 8) {
    passwordError.value = 'Mật khẩu mới phải có ít nhất 8 ký tự.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Mật khẩu xác nhận không khớp.'
    return
  }

  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
    currentStep.value = 4
  }, 1500)
}
</script>

<style scoped>
/* Page Outer Shell */
.forgot-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
  padding: 1.5rem 1rem;
}

.forgot-container {
  width: 100%;
  max-width: 460px;
}

.top-nav {
  margin-bottom: 1rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  text-decoration: none;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: #0f172a;
}

.nav-icon {
  width: 18px;
  height: 18px;
}

/* Main Card */
.forgot-card {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 24px;
  padding: 2.25rem 1.75rem;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.03),
    0 10px 25px -5px rgba(0, 0, 0, 0.05),
    0 20px 48px -12px rgba(15, 23, 42, 0.08);
}

/* Stepper Component */
.stepper-bar {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 0 0.5rem;
}

.stepper-track {
  position: absolute;
  top: 16px;
  left: 36px;
  right: 36px;
  height: 3px;
  background-color: #e2e8f0;
  z-index: 0;
}

.stepper-progress {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.stepper-item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.step-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background-color: #ffffff;
  border: 2px solid #cbd5e1;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.step-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  transition: color 0.3s ease;
}

.stepper-item.is-active .step-circle {
  border-color: #2563eb;
  background-color: #eff6ff;
  color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
}

.stepper-item.is-active .step-label {
  color: #2563eb;
}

.stepper-item.is-complete .step-circle {
  border-color: #2563eb;
  background-color: #2563eb;
  color: #ffffff;
}

.stepper-item.is-complete .step-label {
  color: #334155;
}

.check-icon {
  width: 16px;
  height: 16px;
}

/* Step Header */
.step-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 1.5rem;
}

.icon-bubble {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #f1f5f9;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.icon-bubble svg {
  width: 28px;
  height: 28px;
}

.icon-bubble.is-blue {
  background: #eff6ff;
  color: #2563eb;
}

.icon-bubble.is-amber {
  background: #fffbe6;
  color: #d97706;
}

.card-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.4rem;
  letter-spacing: -0.02em;
}

.card-subtitle {
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.change-email-btn {
  background: none;
  border: none;
  color: #2563eb;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  padding: 0 0.2rem;
}

/* Auth Forms */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  text-align: left;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #334155;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.field-icon {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: #94a3b8;
  pointer-events: none;
  transition: color 0.2s ease;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0 14px 0 44px;
  font-size: 0.95rem;
  color: #0f172a;
  background-color: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: 12px;
  outline: none;
  transition: all 0.2s ease;
}

.form-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.form-input:focus + .field-icon,
.input-wrapper:focus-within .field-icon {
  color: #2563eb;
}

.toggle-eye-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-eye-btn hover {
  color: #475569;
}

.toggle-eye-btn svg {
  width: 20px;
  height: 20px;
}

.has-error .form-input {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.field-error-msg {
  font-size: 0.8rem;
  color: #dc2626;
  font-weight: 500;
}

/* Strength Meter */
.strength-meter {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.4rem;
}

.strength-bars {
  display: flex;
  gap: 4px;
  flex: 1;
}

.strength-segment {
  height: 4px;
  flex: 1;
  background-color: #e2e8f0;
  border-radius: 2px;
  transition: background-color 0.25s ease;
}

.strength-segment.is-filled.is-weak { background-color: #ef4444; }
.strength-segment.is-filled.is-medium { background-color: #f59e0b; }
.strength-segment.is-filled.is-strong { background-color: #3b82f6; }
.strength-segment.is-filled.is-very-strong { background-color: #10b981; }

.strength-text {
  font-size: 0.75rem;
  font-weight: 600;
}

.strength-text.is-weak { color: #ef4444; }
.strength-text.is-medium { color: #d97706; }
.strength-text.is-strong { color: #2563eb; }
.strength-text.is-very-strong { color: #059669; }

/* Buttons */
.submit-btn {
  width: 100%;
  height: 50px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.submit-btn.margin-top-lg {
  margin-top: 1.5rem;
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-spinner-box {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spinner-rotate 0.8s linear infinite;
}

/* Success Celebration */
.success-glow-wrapper {
  position: relative;
  width: 72px;
  height: 72px;
  margin: 0 auto 1.25rem;
}

.success-glow {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.2);
  filter: blur(10px);
}

.success-icon-badge {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #dcfce7;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-icon-badge svg {
  width: 36px;
  height: 36px;
}

/* Transitions */
.step-fade-enter-active,
.step-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.step-fade-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.step-fade-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

@keyframes spinner-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
