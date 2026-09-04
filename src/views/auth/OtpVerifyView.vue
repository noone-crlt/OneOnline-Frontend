<template>
  <div class="otp-view-page">
    <div class="otp-view-container">
      <!-- Back Navigation & Header -->
      <div class="otp-header">
        <router-link to="/login" class="back-link" aria-label="Quay lại trang đăng nhập">
          <svg xmlns="http://www.w3.org/2000/svg" class="link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Quay lại</span>
        </router-link>
      </div>

      <!-- Auth Card Component -->
      <main class="otp-card">
        <!-- Security Shield Badge Icon -->
        <div class="shield-badge">
          <div class="shield-glow"></div>
          <svg xmlns="http://www.w3.org/2000/svg" class="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <polyline points="9 12 11 14 15 10"></polyline>
          </svg>
        </div>

        <div class="card-titles">
          <h1 class="otp-title">Xác thực mã OTP</h1>
          <p class="otp-description">
            Vui lòng nhập mã xác thực 6 chữ số đã được gửi tới 
            <strong class="user-target">user@example.com</strong>
          </p>
        </div>

        <!-- The OTP Component -->
        <OtpInput
          v-model="otpCode"
          :length="6"
          :loading="isLoading"
          :error="isError"
          :error-message="errorMessage"
          :resend-cooldown="60"
          :auto-focus="true"
          @complete="handleOtpComplete"
          @resend="handleResendCode"
        />

        <!-- Manual Verify Action Button -->
        <button
          type="button"
          class="submit-otp-btn"
          :disabled="otpCode.length < 6 || isLoading"
          @click="submitVerification"
        >
          <span v-if="!isLoading">Xác nhận mã OTP</span>
          <span v-else class="btn-spinner-wrapper">
            <span class="btn-spinner"></span>
            Đang xử lý...
          </span>
        </button>

        <!-- Test Sandbox / Interactive Controls for Demo -->
        <div class="demo-controls-panel">
          <div class="panel-label">Bảng thử nghiệm trạng thái:</div>
          <div class="panel-buttons">
            <button class="demo-btn is-err" @click="triggerSimulatedError">
              Thử mã sai
            </button>
            <button class="demo-btn is-ok" @click="triggerSimulatedSuccess">
              Thử mã đúng (123456)
            </button>
            <button class="demo-btn is-reset" @click="resetForm">
              Xóa nhập lại
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- Success Modal Overlay -->
    <Transition name="modal-fade">
      <div v-if="showSuccessModal" class="modal-backdrop" @click="showSuccessModal = false">
        <div class="modal-content" @click.stop>
          <div class="success-icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2>Xác thực thành công!</h2>
          <p>Mã OTP của bạn hoàn toàn chính xác. Hệ thống đang chuyển hướng...</p>
          <button class="modal-btn" @click="showSuccessModal = false">Hoàn tất</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import OtpInput from '../../components/auth/OtpInput.vue'

const otpCode = ref('')
const isLoading = ref(false)
const isError = ref(false)
const errorMessage = ref('')
const showSuccessModal = ref(false)

// Reset error when user edits code
watch(otpCode, () => {
  if (isError.value) {
    isError.value = false
    errorMessage.value = ''
  }
})

function handleOtpComplete(code) {
  // Auto submit when all 6 digits are typed or pasted
  console.log('Mã OTP hoàn tất:', code)
  verifyCode(code)
}

function submitVerification() {
  if (otpCode.value.length === 6) {
    verifyCode(otpCode.value)
  }
}

function verifyCode(code) {
  isLoading.value = true
  isError.value = false

  // Simulate API delay
  setTimeout(() => {
    isLoading.value = false
    
    // For demo: "123456" is valid, any other code is invalid
    if (code === '123456') {
      showSuccessModal.value = true
    } else {
      isError.value = true
      errorMessage.value = 'Mã xác thực không chính xác hoặc đã hết hạn (Thử lại: 123456)'
    }
  }, 1200)
}

function handleResendCode() {
  isError.value = false
  otpCode.value = ''
  alert('Một mã OTP mới đã được gửi tới hòm thư của bạn!')
}

// Sandbox Helpers
function triggerSimulatedError() {
  otpCode.value = '999999'
  verifyCode('999999')
}

function triggerSimulatedSuccess() {
  otpCode.value = '123456'
  verifyCode('123456')
}

function resetForm() {
  otpCode.value = ''
  isError.value = false
  errorMessage.value = ''
  isLoading.value = false
}
</script>

<style scoped>
.otp-view-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 50%, #e2e8f0 100%);
  padding: 1.5rem 1rem;
}

.otp-view-container {
  width: 100%;
  max-width: 480px;
}

.otp-header {
  margin-bottom: 1.25rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #64748b;
  text-decoration: none;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: #0f172a;
}

.link-icon {
  width: 18px;
  height: 18px;
}

/* Card Shell */
.otp-card {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 24px;
  padding: 2.25rem 1.75rem;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.03),
    0 10px 25px -5px rgba(0, 0, 0, 0.05),
    0 20px 48px -12px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* Badge Icon */
.shield-badge {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  margin-bottom: 1.25rem;
}

.shield-glow {
  position: absolute;
  inset: -4px;
  border-radius: 24px;
  background: rgba(37, 99, 235, 0.15);
  filter: blur(8px);
  z-index: 0;
}

.shield-icon {
  width: 32px;
  height: 32px;
  position: relative;
  z-index: 1;
}

/* Typography */
.card-titles {
  margin-bottom: 1.75rem;
}

.otp-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

.otp-description {
  font-size: 0.925rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.user-target {
  color: #1e293b;
  font-weight: 600;
}

/* Primary Button */
.submit-otp-btn {
  width: 100%;
  height: 50px;
  margin-top: 1.5rem;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-otp-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
  transform: translateY(-1px);
}

.submit-otp-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-otp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-spinner-wrapper {
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

/* Demo Control Panel */
.demo-controls-panel {
  width: 100%;
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px dashed #e2e8f0;
}

.panel-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 0.65rem;
}

.panel-buttons {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: center;
}

.demo-btn {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.demo-btn.is-err:hover {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #dc2626;
}

.demo-btn.is-ok:hover {
  background: #f0fdf4;
  border-color: #86efac;
  color: #16a34a;
}

.demo-btn.is-reset:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

/* Success Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal-content {
  background: #ffffff;
  border-radius: 20px;
  padding: 2rem;
  max-width: 380px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.success-icon-circle {
  width: 56px;
  height: 56px;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.success-icon-circle svg {
  width: 28px;
  height: 28px;
}

.modal-content h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.5rem;
}

.modal-content p {
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 1.5rem;
}

.modal-btn {
  width: 100%;
  padding: 0.75rem;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

@keyframes spinner-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
