<template>
  <div class="otp-container" :class="{ 'is-loading': loading, 'has-error': error }">
    <!-- Main OTP Input Group -->
    <div 
      class="otp-inputs-wrapper" 
      role="group" 
      aria-label="Mã xác thực OTP 6 chữ số"
    >
      <div 
        v-for="(digit, index) in length" 
        :key="index" 
        class="otp-slot-container"
      >
        <input
          :ref="el => inputRefs[index] = el"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="1"
          autocomplete="one-time-code"
          :aria-label="`Chữ số thứ ${index + 1}`"
          :aria-invalid="error ? 'true' : 'false'"
          :aria-describedby="error ? 'otp-error-message' : undefined"
          :disabled="loading"
          :value="digits[index]"
          class="otp-input"
          :class="{
            'is-filled': digits[index] !== '',
            'is-active': activeIndex === index,
            'is-error': error
          }"
          @input="onInput($event, index)"
          @keydown="onKeydown($event, index)"
          @paste="onPaste($event, index)"
          @focus="onFocus(index)"
          @blur="onBlur"
        />
        
        <!-- Separator dash between 3rd and 4th digit for better visual readability -->
        <div v-if="index === 2 && length === 6" class="otp-separator" aria-hidden="true">
          <span class="otp-dot"></span>
        </div>
      </div>
    </div>

    <!-- Error Message Badge with Icon -->
    <Transition name="otp-fade">
      <div v-if="error && errorMessage" id="otp-error-message" class="otp-status-badge is-error-badge" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>{{ errorMessage }}</span>
      </div>
    </Transition>

    <!-- Loading State Indicator -->
    <Transition name="otp-fade">
      <div v-if="loading" class="otp-status-badge is-loading-badge" role="status">
        <div class="spinner-ring"></div>
        <span>Đang kiểm tra mã xác thực...</span>
      </div>
    </Transition>

    <!-- Resend Code Action Bar -->
    <div class="otp-actions">
      <span class="resend-label">Bạn chưa nhận được mã?</span>
      
      <button
        type="button"
        class="resend-btn"
        :disabled="!canResend || loading"
        @click="handleResend"
      >
        <svg 
          v-if="canResend" 
          xmlns="http://www.w3.org/2000/svg" 
          class="btn-icon" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
        </svg>
        
        <span v-if="canResend">Gửi lại mã mới</span>
        <span v-else class="timer-text">
          Gửi lại mã sau <strong>{{ formattedTimer }}</strong>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  length: {
    type: Number,
    default: 6
  },
  modelValue: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: 'Mã xác thực không chính xác. Vui lòng kiểm tra lại.'
  },
  resendCooldown: {
    type: Number,
    default: 60
  },
  autoFocus: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'complete', 'resend'])

// Internal State
const digits = ref(Array(props.length).fill(''))
const inputRefs = ref([])
const activeIndex = ref(-1)
const timer = ref(props.resendCooldown)
let timerInterval = null

// Computed Properties
const canResend = computed(() => timer.value <= 0)

const formattedTimer = computed(() => {
  const m = Math.floor(timer.value / 60)
  const s = timer.value % 60
  return `${m > 0 ? m + ':' : ''}${s < 10 ? '0' : ''}${s}s`
})

const fullCode = computed(() => digits.value.join(''))

// Watchers
watch(() => props.modelValue, (newVal) => {
  if (newVal !== fullCode.value) {
    parseValue(newVal)
  }
}, { immediate: true })

watch(fullCode, (newVal) => {
  emit('update:modelValue', newVal)
  if (newVal.length === props.length && !digits.value.includes('')) {
    emit('complete', newVal)
  }
})

watch(() => props.error, (isErr) => {
  if (isErr) {
    // Focus first input and select content on error
    nextTick(() => {
      if (inputRefs.value[0]) {
        inputRefs.value[0].focus()
        inputRefs.value[0].select()
      }
    })
  }
})

// Methods
function parseValue(val) {
  const cleaned = String(val || '').replace(/\D/g, '').slice(0, props.length)
  const arr = Array(props.length).fill('')
  for (let i = 0; i < cleaned.length; i++) {
    arr[i] = cleaned[i]
  }
  digits.value = arr
}

function onInput(event, index) {
  const input = event.target
  const rawValue = input.value
  
  // Filter out any non-digits
  const digit = rawValue.replace(/\D/g, '').slice(-1)
  
  digits.value[index] = digit
  input.value = digit

  if (digit && index < props.length - 1) {
    focusInput(index + 1)
  }
}

function onKeydown(event, index) {
  const key = event.key

  if (key === 'Backspace') {
    event.preventDefault()
    if (digits.value[index] !== '') {
      // Clear current box
      digits.value[index] = ''
    } else if (index > 0) {
      // Move to previous box and clear it
      digits.value[index - 1] = ''
      focusInput(index - 1)
    }
  } else if (key === 'Delete') {
    event.preventDefault()
    digits.value[index] = ''
  } else if (key === 'ArrowLeft') {
    event.preventDefault()
    if (index > 0) focusInput(index - 1)
  } else if (key === 'ArrowRight') {
    event.preventDefault()
    if (index < props.length - 1) focusInput(index + 1)
  } else if (key === 'Home') {
    event.preventDefault()
    focusInput(0)
  } else if (key === 'End') {
    event.preventDefault()
    focusInput(props.length - 1)
  }
}

function onPaste(event, currentIndex) {
  event.preventDefault()
  const clipboardData = event.clipboardData || window.clipboardData
  if (!clipboardData) return
  
  const pastedText = clipboardData.getData('text')
  const numericOnly = pastedText.replace(/\D/g, '').slice(0, props.length)
  
  if (!numericOnly) return

  // Fill digits starting from 0 (standard OTP behavior)
  const newDigits = Array(props.length).fill('')
  for (let i = 0; i < numericOnly.length; i++) {
    newDigits[i] = numericOnly[i]
  }
  digits.value = newDigits

  // Focus the last filled input or the next empty one
  const nextTarget = Math.min(numericOnly.length, props.length - 1)
  nextTick(() => {
    focusInput(nextTarget)
  })
}

function focusInput(index) {
  if (index >= 0 && index < props.length && inputRefs.value[index]) {
    inputRefs.value[index].focus()
    inputRefs.value[index].select()
  }
}

function onFocus(index) {
  activeIndex.value = index
  if (inputRefs.value[index]) {
    inputRefs.value[index].select()
  }
}

function onBlur() {
  activeIndex.value = -1
}

function startTimer() {
  stopTimer()
  timer.value = props.resendCooldown
  timerInterval = setInterval(() => {
    if (timer.value > 0) {
      timer.value--
    } else {
      stopTimer()
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function handleResend() {
  if (!canResend.value || props.loading) return
  digits.value = Array(props.length).fill('')
  emit('resend')
  startTimer()
  nextTick(() => {
    focusInput(0)
  })
}

// Lifecycle Hooks
onMounted(() => {
  startTimer()
  if (props.autoFocus) {
    nextTick(() => {
      focusInput(0)
    })
  }
})

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<style scoped>
/* OTP Container Main Layout */
.otp-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  user-select: none;
}

/* Slot Wrappers & Grid System */
.otp-inputs-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
}

.otp-slot-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.otp-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.15rem;
}

.otp-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--line-strong, #cbd5e1);
  transition: background-color 0.2s ease;
}

/* Input Box Styling */
.otp-input {
  width: 48px;
  height: 58px;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 1.6rem;
  font-weight: 700;
  text-align: center;
  color: var(--text-strong, #0f172a);
  background-color: var(--surface-card, #ffffff);
  border: 2px solid var(--line-soft, #e2e8f0);
  border-radius: 12px;
  outline: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  caret-color: #3b82f6;
  -webkit-appearance: none;
  -moz-appearance: textfield;
}

.otp-input::-webkit-outer-spin-button,
.otp-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Hover & Focus States */
.otp-input:hover:not(:disabled) {
  border-color: #94a3b8;
  background-color: var(--surface-soft, #f8fafc);
}

.otp-input:focus,
.otp-input.is-active {
  border-color: #3b82f6;
  background-color: #ffffff;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15), 0 4px 12px rgba(59, 130, 246, 0.08);
  transform: translateY(-2px);
}

.otp-input.is-filled {
  border-color: #64748b;
  background-color: var(--surface-card, #ffffff);
}

.otp-input.is-filled:focus {
  border-color: #3b82f6;
}

/* Error State with Shake Animation */
.has-error .otp-input {
  border-color: #ef4444 !important;
  background-color: #fef2f2;
  color: #991b1b;
  animation: otp-shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

.has-error .otp-input:focus {
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
}

/* Disabled / Loading State */
.otp-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--surface-soft, #f1f5f9);
  border-color: var(--line-soft, #e2e8f0);
}

/* Status Badges */
.otp-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
}

.is-error-badge {
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.is-loading-badge {
  background-color: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}

.badge-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Spinner Animation */
.spinner-ring {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(37, 99, 235, 0.2);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spinner-rotate 0.8s linear infinite;
}

/* Actions & Resend Timer */
.otp-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.resend-label {
  color: var(--text-soft, #64748b);
  font-size: 0.85rem;
}

.resend-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #2563eb;
  cursor: pointer;
  transition: all 0.2s ease;
}

.resend-btn:hover:not(:disabled) {
  background-color: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  transform: translateY(-1px);
}

.resend-btn:active:not(:disabled) {
  transform: translateY(0);
}

.resend-btn:disabled {
  color: var(--text-soft, #94a3b8);
  cursor: not-allowed;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.timer-text strong {
  font-family: var(--font-mono, monospace);
  color: var(--text-strong, #334155);
}

/* Animations */
@keyframes otp-shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-4px); }
  40%, 60% { transform: translateX(4px); }
}

@keyframes spinner-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.otp-fade-enter-active,
.otp-fade-leave-active {
  transition: all 0.25s ease;
}

.otp-fade-enter-from,
.otp-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Mobile Responsive Adjustments */
@media (max-width: 480px) {
  .otp-inputs-wrapper {
    gap: 0.35rem;
  }
  
  .otp-slot-container {
    gap: 0.35rem;
  }

  .otp-input {
    width: 42px;
    height: 52px;
    font-size: 1.4rem;
    border-radius: 10px;
  }

  .otp-dot {
    width: 4px;
    height: 4px;
  }
}
</style>
