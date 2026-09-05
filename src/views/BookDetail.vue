<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  PhBookOpen,
  PhShoppingCartSimple,
  PhLightning,
  PhStar,
  PhCheckCircle,
  PhBookBookmark,
  PhFilePdf,
  PhHeadphones,
  PhArrowLeft,
  PhChatCircleText,
  PhSealCheck,
  PhShieldCheck,
  PhSparkle,
  PhPlus,
  PhMinus
} from '@phosphor-icons/vue'
import { addCartItem, getBookBySlug, getFileUrl, getReviewsByBook, submitBookReview } from '../services/api'
import { toast } from 'vue-sonner'
import TopNavbar from '../components/layout/TopNavbar.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import { authUser } from '../stores/auth'
import { fetchCartItemCount } from '../stores/cart'

gsap.registerPlugin(ScrollTrigger)

const route = useRoute()
const router = useRouter()

const book = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')
const selectedEditionIndex = ref(0)
const quantity = ref(1)
const activeTab = ref('description') // 'description', 'chapters', 'reviews'
const showStickyBar = ref(false)

const coverRef = ref(null)
const heroRef = ref(null)
const actionsRef = ref(null)

const isSignedIn = computed(() => Boolean(authUser.value))

const selectedEdition = computed(() => {
  if (!book.value?.editions || book.value.editions.length === 0) return null
  return book.value.editions[selectedEditionIndex.value] || book.value.editions[0]
})

const coverUrl = computed(() => {
  if (selectedEdition.value?.coverObjectName) {
    return selectedEdition.value.coverUrl || getFileUrl(selectedEdition.value.coverObjectName)
  }
  if (book.value?.imageUrls && book.value.imageUrls.length > 0) {
    return getFileUrl(book.value.imageUrls[0])
  }
  return ''
})

const discountPercent = computed(() => {
  if (!selectedEdition.value?.originalPrice || !selectedEdition.value?.salePrice) return 0
  const orig = Number(selectedEdition.value.originalPrice)
  const sale = Number(selectedEdition.value.salePrice)
  if (orig <= sale || orig <= 0) return 0
  return Math.round(((orig - sale) / orig) * 100)
})

const getInitials = (title) => {
  if (!title) return 'BA'
  return title.trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase()
}

function formatPrice(price) {
  if (price == null) return 'Nhiều định dạng'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(price))
}

function selectEdition(index) {
  selectedEditionIndex.value = index
  quantity.value = 1
  nextTick(() => {
    if (coverRef.value) {
      gsap.fromTo(coverRef.value, 
        { scale: 0.96, opacity: 0.8 }, 
        { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }
      )
    }
  })
}

function decreaseQuantity() {
  if (quantity.value > 1) {
    quantity.value -= 1
  }
}

function increaseQuantity() {
  const maxStock = selectedEdition.value?.stock != null ? Number(selectedEdition.value.stock) : 99
  if (selectedEdition.value?.stock != null && selectedEdition.value.stock <= 0) return
  if (quantity.value < maxStock) {
    quantity.value += 1
  } else {
    toast.warning(`Chỉ còn tối đa ${maxStock} bản in trong kho.`)
  }
}

function validateQuantity() {
  const maxStock = selectedEdition.value?.stock != null ? Number(selectedEdition.value.stock) : 99
  const parsed = parseInt(quantity.value, 10)
  if (isNaN(parsed) || parsed < 1) {
    quantity.value = 1
  } else if (parsed > maxStock) {
    quantity.value = Math.max(1, maxStock)
    toast.warning(`Đã điều chỉnh về số lượng tối đa hiện có (${maxStock}).`)
  } else {
    quantity.value = parsed
  }
}

function formatFormatName(format) {
  switch (format) {
    case 'PHYSICAL': return 'Sách in giấy'
    case 'EBOOK_PDF': return 'PDF E-book'
    case 'EBOOK_EPUB': return 'EPUB E-book'
    case 'AUDIOBOOK': return 'Sách nói (Audio)'
    default: return format
  }
}

function getFormatIconComponent(format) {
  switch (format) {
    case 'PHYSICAL': return PhBookBookmark
    case 'EBOOK_PDF': return PhFilePdf
    case 'EBOOK_EPUB': return PhBookOpen
    case 'AUDIOBOOK': return PhHeadphones
    default: return PhBookOpen
  }
}

function getStockLabel(edition) {
  if (!edition) return 'Đang cập nhật'
  if (edition.format !== 'PHYSICAL') return 'Đọc & Tải ngay tức thì'
  if (edition.stock == null || edition.stock <= 0) return 'Tạm hết hàng'
  return `Còn hàng trong kho (${edition.stock} bản)`
}

function readSample() {
  if (book.value) {
    router.push(`/read/${book.value.slug}`)
  }
}

async function addToCart() {
  if (!isSignedIn.value) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  const qty = selectedEdition.value?.format === 'PHYSICAL' ? Math.max(1, Number(quantity.value) || 1) : 1
  try {
    await addCartItem(selectedEdition.value.id, qty)
    await fetchCartItemCount()
    toast.success(qty > 1 ? `Đã thêm ${qty} cuốn sách vào giỏ hàng!` : 'Đã thêm sách vào giỏ hàng thành công!')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Không thể thêm sách vào giỏ hàng.')
  }
}

async function buyNow() {
  if (!isSignedIn.value) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  const qty = selectedEdition.value?.format === 'PHYSICAL' ? Math.max(1, Number(quantity.value) || 1) : 1
  try {
    await addCartItem(selectedEdition.value.id, qty)
    await fetchCartItemCount()
    router.push({ name: 'cart' })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Không thể bắt đầu thanh toán.')
  }
}

const reviews = ref([])
const isSubmittingReview = ref(false)

const newRating = ref(5)
const newComment = ref('')

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('vi-VN')
  } catch {
    return dateStr
  }
}

async function fetchBookReviews(bookId) {
  if (!bookId) return
  try {
    const data = await getReviewsByBook(bookId)
    if (data && Array.isArray(data.content)) {
      reviews.value = data.content
    } else if (Array.isArray(data)) {
      reviews.value = data
    } else {
      reviews.value = []
    }
  } catch (err) {
    console.error('Không thể tải bình luận:', err)
  }
}

async function submitReview() {
  if (!isSignedIn.value) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  if (!newComment.value.trim()) {
    toast.error('Vui lòng nhập nội dung đánh giá.')
    return
  }
  if (!book.value?.id) {
    toast.error('Không tìm thấy thông tin tác phẩm.')
    return
  }
  
  isSubmittingReview.value = true
  try {
    await submitBookReview({
      bookId: book.value.id,
      rating: newRating.value,
      comment: newComment.value.trim()
    })
    
    newComment.value = ''
    newRating.value = 5
    toast.success('Cảm ơn bạn đã gửi đánh giá thành công!')
    await fetchBookReviews(book.value.id)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Không thể gửi đánh giá.')
  } finally {
    isSubmittingReview.value = false
  }
}

/* GSAP Physics & Interactive Handlers */
function handleCoverMouseMove(e) {
  if (!coverRef.value) return
  const rect = coverRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left - rect.width / 2
  const y = e.clientY - rect.top - rect.height / 2
  gsap.to(coverRef.value, {
    rotateY: x / 14,
    rotateX: -y / 14,
    duration: 0.4,
    ease: 'power2.out',
    transformPerspective: 1000
  })
}

function handleCoverMouseLeave() {
  if (!coverRef.value) return
  gsap.to(coverRef.value, {
    rotateY: 0,
    rotateX: 0,
    duration: 0.7,
    ease: 'elastic.out(1, 0.4)'
  })
}

function handleScroll() {
  if (!actionsRef.value) return
  const rect = actionsRef.value.getBoundingClientRect()
  showStickyBar.value = rect.bottom < 0
}

async function fetchBookDetail() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const slug = route.params.slug
    const data = await getBookBySlug(slug)
    book.value = data
    if (data?.id) {
      fetchBookReviews(data.id)
    }
    if (data.editions && data.editions.length > 0) {
      const bestIndex = data.editions.findIndex(e => e.format !== 'PHYSICAL')
      selectedEditionIndex.value = bestIndex !== -1 ? bestIndex : 0
      quantity.value = 1
    }
    
    nextTick(() => {
      initGsapAnimations()
    })
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Không thể tải chi tiết sách.'
  } finally {
    isLoading.value = false
  }
}

function initGsapAnimations() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

  tl.fromTo('.cover-column', 
    { opacity: 0, y: 30, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.8 }
  )
  .fromTo('.book-title-heading', 
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.6 },
    '-=0.5'
  )
  .fromTo(['.publisher-row', '.authors-list', '.formats-section', '.commerce-panel'], 
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 },
    '-=0.4'
  )
}

onMounted(() => {
  fetchBookDetail()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="book-detail-shell">
    <TopNavbar />

    <main class="detail-container">
      <div v-if="isLoading" class="detail-loading">
        <div class="spinner-ring"></div>
        <p class="loading-label">Đang chuẩn bị không gian tác phẩm...</p>
      </div>

      <div v-else-if="errorMessage" class="detail-error">
        <p class="error-msg">{{ errorMessage }}</p>
        <button class="btn btn-secondary" @click="router.push('/library')">Quay lại thư viện</button>
      </div>

      <div v-else class="detail-wrapper" ref="heroRef">
        <!-- Breadcrumb navigation -->
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <button type="button" class="back-btn" @click="router.back()" title="Quay lại">
            <PhArrowLeft :size="16" />
          </button>
          <RouterLink to="/">Trang chủ</RouterLink>
          <span class="sep">/</span>
          <RouterLink to="/library">Thư viện</RouterLink>
          <span class="sep">/</span>
          <span class="current">{{ book.title }}</span>
        </nav>

        <!-- Product Grid -->
        <div class="product-grid">
          <!-- Left Column: Elegant Book Cover & Meta Badges -->
          <div class="cover-column">
            <div class="ambient-glow"></div>
            <div 
              ref="coverRef"
              class="book-cover-stage shadow-editorial"
              @mousemove="handleCoverMouseMove"
              @mouseleave="handleCoverMouseLeave"
            >
              <div class="book-cover-frame">
                <img v-if="coverUrl" :src="coverUrl" :alt="`Bìa sách ${book.title}`" class="cover-img" />
                <span v-else class="cover-initials">{{ getInitials(book.title) }}</span>
              </div>
              <div class="cover-lighting-overlay"></div>
              
              <!-- Format Badge Pill Over Cover -->
              <div class="cover-badge" v-if="selectedEdition">
                <component :is="getFormatIconComponent(selectedEdition.format)" :size="14" />
                <span>{{ formatFormatName(selectedEdition.format) }}</span>
              </div>
            </div>
            
            <!-- Category Tag Pills -->
            <div class="categories-tags" v-if="book.categoryNames && book.categoryNames.length > 0">
              <span v-for="cat in book.categoryNames" :key="cat" class="cat-pill">
                {{ cat }}
              </span>
            </div>

            <!-- Guarantee Badges -->
            <div class="trust-guarantees">
              <div class="trust-item">
                <PhShieldCheck :size="16" class="trust-icon" />
                <span>Bản quyền 100% chính hãng</span>
              </div>
              <div class="trust-item">
                <PhSealCheck :size="16" class="trust-icon" />
                <span>Bảo mật & Tải ngay tức thì</span>
              </div>
            </div>


          </div>

          <!-- Right Column: Book Details & Actions -->
          <div class="info-column">
            <div class="book-header-section">
              <div class="publisher-row">
                <div class="kicker-group">
                  <span class="publisher-kicker">{{ book.publisherName || 'NXB Tri Thức Online' }}</span>
                  <span class="verified-pill">
                    <PhSparkle :size="12" weight="fill" />
                    Đã xác minh
                  </span>
                </div>
                <span class="rating-badge">
                  <PhStar :size="14" weight="fill" class="star-icon" />
                  <strong>4.9</strong> ({{ reviews.length }} đánh giá)
                </span>
              </div>
              
              <!-- Wide Editorial Title -->
              <h1 class="book-title-heading">{{ book.title }}</h1>
              
              <div class="authors-list" v-if="book.authorNames && book.authorNames.length > 0">
                <span class="label">Tác giả:</span>
                <span class="author-name">{{ book.authorNames.join(', ') }}</span>
              </div>
            </div>

            <!-- Format Selector (Tactile Bento Grid) -->
            <div class="formats-section" v-if="book.editions && book.editions.length > 0">
              <div class="section-label">
                <span>Chọn định dạng tác phẩm</span>
                <small>Phát hành bản quyền</small>
              </div>
              <div class="format-options grid-dense">
                <button
                  v-for="(ed, idx) in book.editions"
                  :key="ed.id"
                  :class="['format-card-btn', { active: selectedEditionIndex === idx }]"
                  @click="selectEdition(idx)"
                >
                  <div class="format-card-header">
                    <component :is="getFormatIconComponent(ed.format)" :size="22" class="format-icon" />
                    
                    <!-- Waveform Animation for Audiobooks -->
                    <div class="audio-equalizer" v-if="ed.format === 'AUDIOBOOK' && selectedEditionIndex === idx">
                      <span class="bar bar1"></span>
                      <span class="bar bar2"></span>
                      <span class="bar bar3"></span>
                    </div>
                  </div>
                  
                  <div class="format-text-wrap">
                    <span class="format-name">{{ formatFormatName(ed.format) }}</span>
                    <span class="format-price-tag">{{ formatPrice(ed.salePrice) }}</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Unified Bento Commerce Panel (Redesigned for Premium UI/UX) -->
            <div class="commerce-panel" ref="actionsRef" v-if="selectedEdition">
              <!-- Top Row: Price & Clean Stock Status (No Duplication) -->
              <div class="commerce-header">
                <div class="price-stack">
                  <div class="price-main-row">
                    <span class="price-current">{{ formatPrice(selectedEdition.salePrice) }}</span>
                    <span 
                      class="price-struck" 
                      v-if="selectedEdition.originalPrice && selectedEdition.originalPrice > selectedEdition.salePrice"
                    >
                      {{ formatPrice(selectedEdition.originalPrice) }}
                    </span>
                    <span class="discount-tag" v-if="discountPercent > 0">
                      -{{ discountPercent }}%
                    </span>
                  </div>
                </div>

                <!-- Status Indicator with Live Pulse Dot -->
                <div 
                  class="stock-status-pill" 
                  :class="{
                    'is-physical-available': selectedEdition.format === 'PHYSICAL' && selectedEdition.stock > 0,
                    'is-physical-out': selectedEdition.format === 'PHYSICAL' && (!selectedEdition.stock || selectedEdition.stock <= 0),
                    'is-digital': selectedEdition.format !== 'PHYSICAL'
                  }"
                >
                  <span class="status-dot"></span>
                  <span class="status-label">
                    <template v-if="selectedEdition.format === 'PHYSICAL'">
                      <template v-if="selectedEdition.stock > 0">Còn {{ selectedEdition.stock }} cuốn có sẵn</template>
                      <template v-else>Tạm hết hàng</template>
                    </template>
                    <template v-else>
                      Đọc & tải ngay tức thì
                    </template>
                  </span>
                </div>
              </div>

              <div class="commerce-divider"></div>

              <!-- Bottom Row: Stepper + Ergonomic CTA Buttons in a Unified Row -->
              <div class="commerce-action-row">
                <!-- Inline Tactile Stepper (Only for PHYSICAL Books) -->
                <div v-if="selectedEdition.format === 'PHYSICAL'" class="compact-stepper-container">
                  <span class="stepper-caption">Số lượng</span>
                  <div class="compact-stepper">
                    <button 
                      type="button" 
                      class="stepper-btn-mini" 
                      :disabled="quantity <= 1 || selectedEdition.stock <= 0"
                      @click="decreaseQuantity"
                      title="Giảm số lượng"
                      aria-label="Giảm số lượng"
                    >
                      <PhMinus :size="14" weight="bold" />
                    </button>
                    <input 
                      type="number" 
                      v-model.number="quantity" 
                      class="stepper-input-mini" 
                      min="1" 
                      :max="selectedEdition.stock || 99"
                      :disabled="selectedEdition.stock <= 0"
                      @change="validateQuantity"
                      aria-label="Số lượng sách"
                    />
                    <button 
                      type="button" 
                      class="stepper-btn-mini" 
                      :disabled="(selectedEdition.stock > 0 && quantity >= selectedEdition.stock) || selectedEdition.stock <= 0"
                      @click="increaseQuantity"
                      title="Tăng số lượng"
                      aria-label="Tăng số lượng"
                    >
                      <PhPlus :size="14" weight="bold" />
                    </button>
                  </div>
                </div>

                <!-- Primary & Secondary CTA Buttons -->
                <div class="commerce-buttons-cluster">
                  <button 
                    class="btn-cta btn-buy-now shimmer-effect" 
                    @click="buyNow" 
                    :disabled="selectedEdition?.format === 'PHYSICAL' && selectedEdition?.stock <= 0"
                  >
                    <PhLightning :size="18" weight="fill" />
                    <span>Mua ngay{{ selectedEdition.format === 'PHYSICAL' && quantity > 1 ? ` (${quantity})` : '' }}</span>
                  </button>
                  
                  <button 
                    class="btn-cta btn-add-cart" 
                    @click="addToCart" 
                    :disabled="selectedEdition?.format === 'PHYSICAL' && selectedEdition?.stock <= 0"
                  >
                    <PhShoppingCartSimple :size="18" />
                    <span>Thêm vào giỏ</span>
                  </button>

                  <button 
                    v-if="selectedEdition?.format !== 'PHYSICAL'"
                    class="btn-cta btn-read-sample" 
                    @click="readSample"
                  >
                    <PhBookOpen :size="18" />
                    <span>Đọc thử</span>
                  </button>
                </div>
              </div>

              <!-- Dynamic Subtotal Hint (Only for PHYSICAL with quantity > 1) -->
              <div 
                v-if="selectedEdition.format === 'PHYSICAL' && quantity > 1" 
                class="commerce-subtotal-bar"
              >
                <span class="subtotal-calc-hint">{{ quantity }} cuốn × {{ formatPrice(selectedEdition.salePrice) }}</span>
                <div class="subtotal-sum">
                  <span>Tạm tính:</span>
                  <strong class="subtotal-price">{{ formatPrice(selectedEdition.salePrice * quantity) }}</strong>
                </div>
              </div>
            </div>

            <!-- Tabs Section -->
            <div class="tabs-section">
              <div class="tabs-header">
                <button 
                  :class="['tab-title', { active: activeTab === 'description' }]" 
                  @click="activeTab = 'description'"
                >
                  <PhBookOpen :size="16" />
                  <span>Tóm tắt & Giới thiệu</span>
                </button>
                <button 
                  v-if="selectedEdition?.format === 'AUDIOBOOK' && selectedEdition?.audioChapters?.length > 0"
                  :class="['tab-title', { active: activeTab === 'chapters' }]" 
                  @click="activeTab = 'chapters'"
                >
                  <PhHeadphones :size="16" />
                  <span>Mục lục audio ({{ selectedEdition.audioChapters.length }})</span>
                </button>
                <button 
                  :class="['tab-title', { active: activeTab === 'reviews' }]" 
                  @click="activeTab = 'reviews'"
                >
                  <PhChatCircleText :size="16" />
                  <span>Đánh giá độc giả ({{ reviews.length }})</span>
                </button>
              </div>

              <div class="tab-content">
                <div v-if="activeTab === 'description'" class="tab-description">
                  <p class="description-text">{{ book.description || 'Chưa có tóm tắt chi tiết cho tác phẩm này.' }}</p>
                </div>

                <div v-else-if="activeTab === 'chapters'" class="tab-chapters">
                  <ul class="chapters-grid">
                    <li v-for="ch in selectedEdition.audioChapters" :key="ch.id" class="chapter-item">
                      <span class="ch-num">Chương {{ ch.chapterNumber }}</span>
                      <span class="ch-name">{{ ch.title }}</span>
                      <span class="ch-dur">{{ ch.duration }} phút</span>
                    </li>
                  </ul>
                </div>

                <div v-else-if="activeTab === 'reviews'" class="tab-reviews">
                  <!-- Review Form -->
                  <form class="review-form" @submit.prevent="submitReview">
                    <h4>Gửi cảm nhận của bạn</h4>
                    <div class="rating-select-group">
                      <span class="label">Đánh giá:</span>
                      <div class="star-rating-options">
                        <button 
                          v-for="star in 5" 
                          :key="star" 
                          type="button"
                          :class="['star-option-btn', { active: newRating >= star }]"
                          @click="newRating = star"
                          aria-label="Chọn sao"
                        >
                          <PhStar :size="18" :weight="newRating >= star ? 'fill' : 'regular'" />
                        </button>
                      </div>
                    </div>

                    <div class="comment-input-group">
                      <textarea 
                        v-model="newComment" 
                        placeholder="Chia sẻ suy ngẫm hoặc góc nhìn của bạn về tác phẩm này..."
                        rows="3"
                        required
                      ></textarea>
                    </div>

                    <button class="btn-submit-review" type="submit">
                      Gửi đánh giá
                    </button>
                  </form>

                  <!-- Reviews List -->
                  <div class="reviews-list-container">
                    <div v-if="reviews.length === 0" class="no-reviews">
                      Chưa có đánh giá nào cho tác phẩm này. Hãy là người đầu tiên chia sẻ cảm nhận!
                    </div>
                    <div v-else class="reviews-list">
                      <div v-for="rev in reviews" :key="rev.id" class="review-card">
                        <div class="review-card-header">
                          <div class="user-info">
                            <div class="user-avatar">{{ (rev.reviewerName || rev.userName || 'U').slice(0, 1) }}</div>
                            <span class="user-name">{{ rev.reviewerName || rev.userName || 'Độc giả' }}</span>
                          </div>
                          <span class="review-date">{{ formatDate(rev.createdAt) }}</span>
                        </div>
                        <div class="review-stars">
                          <PhStar v-for="star in 5" :key="star" :size="14" :weight="rev.rating >= star ? 'fill' : 'regular'" class="star-icon" />
                        </div>
                        <p class="review-comment-text">{{ rev.comment }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Floating Sticky Action Bar on Scroll -->
    <Transition name="fade-slide-up">
      <div v-if="showStickyBar && selectedEdition" class="sticky-action-bar">
        <div class="sticky-bar-inner">
          <div class="sticky-book-info">
            <img v-if="coverUrl" :src="coverUrl" class="sticky-cover-thumb" alt="Bìa thu nhỏ" />
            <div class="sticky-text">
              <span class="sticky-title">{{ book?.title }}</span>
              <span class="sticky-price">{{ formatPrice(selectedEdition.salePrice) }}</span>
            </div>
          </div>

          <div class="sticky-buttons">
            <button class="btn-sticky btn-sticky-buy" @click="buyNow">
              <PhLightning :size="16" weight="fill" />
              <span>Mua ngay{{ selectedEdition?.format === 'PHYSICAL' && quantity > 1 ? ` (${quantity})` : '' }}</span>
            </button>
            <button 
              class="btn-sticky btn-sticky-cart" 
              @click="addToCart" 
              :title="selectedEdition?.format === 'PHYSICAL' && quantity > 1 ? `Thêm ${quantity} cuốn vào giỏ` : 'Thêm vào giỏ'"
            >
              <PhShoppingCartSimple :size="16" />
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <AppFooter />
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,600;0,700;0,800;0,900;1,600&family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

.book-detail-shell {
  min-height: 100vh;
  background-color: #FAF8F5;
  display: flex;
  flex-direction: column;
  font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0F172A;
  overflow-x: hidden;
}

/* Main content layout */
.detail-container {
  flex: 1;
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 6rem;
}

.detail-loading, .detail-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 450px;
}

.spinner-ring {
  width: 48px;
  height: 48px;
  border: 3.5px solid rgba(15, 23, 42, 0.08);
  border-radius: 50%;
  border-top-color: #0f172a;
  animation: spin 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
  margin-bottom: 1.25rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-label {
  font-size: 0.95rem;
  font-weight: 500;
  color: #64748b;
}

.error-msg {
  color: #ef4444;
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #e2e8f0;
  border-radius: 50%;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  margin-right: 0.25rem;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.back-btn:hover {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
  transform: translateX(-3px);
}

.breadcrumb a {
  color: #64748b;
  text-decoration: none;
  transition: color 0.18s ease;
}

.breadcrumb a:hover {
  color: #0f172a;
}

.breadcrumb .sep {
  color: #cbd5e1;
}

.breadcrumb .current {
  color: #0f172a;
  font-weight: 600;
}

/* Product Grid Layout */
.product-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 4rem;
  align-items: start;
}

/* Left Cover Stage */
.cover-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  position: sticky;
  top: 90px;
}

.ambient-glow {
  position: absolute;
  top: 20px;
  width: 80%;
  height: 80%;
  background: radial-gradient(circle, rgba(217, 119, 6, 0.18) 0%, rgba(15, 23, 42, 0.05) 70%);
  filter: blur(40px);
  z-index: 0;
  pointer-events: none;
}

.book-cover-stage {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 320px;
  aspect-ratio: 2/3;
  border-radius: 1.25rem;
  background: #ffffff;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  will-change: transform;
}

.shadow-editorial {
  box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.16), 0 8px 24px -8px rgba(0, 0, 0, 0.06);
}

.book-cover-frame {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-initials {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 3.5rem;
  font-weight: 900;
  color: #94a3b8;
}

.cover-lighting-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
              linear-gradient(to right, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.02) 20%, transparent 100%);
  pointer-events: none;
}

.cover-badge {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.categories-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  justify-content: center;
  z-index: 1;
}

.cat-pill {
  font-size: 0.78rem;
  background: #ffffff;
  color: #334155;
  padding: 0.3rem 0.85rem;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  font-weight: 600;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
}

.trust-guarantees {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
  padding: 0.85rem 1rem;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #e2e8f0;
  border-radius: 0.875rem;
  z-index: 1;
}

.trust-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
}

.trust-icon {
  color: #059669;
}



/* Right Info Column */
.info-column {
  display: flex;
  flex-direction: column;
  gap: 2.25rem;
}

.publisher-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.6rem;
}

.kicker-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.publisher-kicker {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #d97706;
  font-weight: 800;
}

.verified-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  background: #ecfdf5;
  color: #059669;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid #a7f3d0;
}

.rating-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.825rem;
  color: #334155;
  background: #fef3c7;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid #fde68a;
}

.star-icon {
  color: #d97706;
}

.book-title-heading {
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  font-size: clamp(2.2rem, 3.8vw, 3.4rem);
  font-weight: 900;
  color: #0f172a;
  line-height: 1.12;
  letter-spacing: -0.035em;
  margin: 0 0 1rem 0;
  max-width: 900px;
}

.authors-list {
  font-size: 1.05rem;
  color: #475569;
}

.authors-list .label {
  color: #64748b;
  margin-right: 0.4rem;
}

.authors-list .author-name {
  color: #0f172a;
  font-weight: 700;
}

/* Formats Bento Section */
.formats-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.825rem;
  font-weight: 800;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.section-label small {
  text-transform: none;
  font-weight: 500;
  color: #64748b;
  letter-spacing: 0;
}

.format-options.grid-dense {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  grid-auto-flow: dense;
  gap: 0.9rem;
}

.format-card-btn {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.85rem;
  padding: 1rem 1.15rem;
  border: 1px solid #cbd5e1;
  border-radius: 1rem;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: left;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  position: relative;
  overflow: hidden;
}

.format-card-btn:hover {
  border-color: #0f172a;
  background: #ffffff;
  transform: translateY(-3px);
  box-shadow: 0 10px 25px -8px rgba(15, 23, 42, 0.12);
}

.format-card-btn.active {
  border-color: #0f172a;
  background: #0f172a;
  color: #ffffff;
  box-shadow: 0 12px 30px -8px rgba(15, 23, 42, 0.3);
}

.format-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.format-icon {
  flex-shrink: 0;
  transition: transform 0.25s ease;
}

.format-card-btn:hover .format-icon {
  transform: scale(1.1);
}

.format-card-btn.active .format-icon {
  color: #ffffff;
}

/* Audio Waveform Animation */
.audio-equalizer {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.audio-equalizer .bar {
  width: 3px;
  background: #ffffff;
  border-radius: 99px;
  animation: bounce 0.8s ease-in-out infinite alternate;
}

.audio-equalizer .bar1 { height: 12px; animation-delay: 0.1s; }
.audio-equalizer .bar2 { height: 8px;  animation-delay: 0.3s; }
.audio-equalizer .bar3 { height: 14px; animation-delay: 0.2s; }

@keyframes bounce {
  0% { height: 4px; }
  100% { height: 14px; }
}

.format-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.format-name {
  font-size: 0.875rem;
  font-weight: 700;
}

.format-price-tag {
  font-size: 0.825rem;
  opacity: 0.85;
}

/* Unified Bento Commerce Panel */
.commerce-panel {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 1.25rem;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.05);
  padding: 1.35rem 1.5rem;
  gap: 1.15rem;
  position: relative;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.commerce-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.85rem;
}

.price-stack {
  display: flex;
  align-items: baseline;
}

.price-main-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.price-current {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 2.25rem;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.035em;
  line-height: 1;
}

.price-struck {
  font-size: 1rem;
  font-weight: 500;
  text-decoration: line-through;
  color: #94a3b8;
}

.discount-tag {
  font-size: 0.75rem;
  font-weight: 800;
  color: #dc2626;
  background: #fef2f2;
  padding: 0.2rem 0.55rem;
  border-radius: 0.5rem;
  border: 1px solid #fecaca;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

/* Status Indicator with Live Pulse Dot */
.stock-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.825rem;
  font-weight: 700;
  padding: 0.35rem 0.8rem;
  border-radius: 9999px;
  transition: all 0.2s ease;
}

.stock-status-pill .status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stock-status-pill.is-physical-available {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.stock-status-pill.is-physical-available .status-dot {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.stock-status-pill.is-physical-out {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.stock-status-pill.is-physical-out .status-dot {
  background: #ef4444;
}

.stock-status-pill.is-digital {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.stock-status-pill.is-digital .status-dot {
  background: #22c55e;
}

@keyframes pulse-ring {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.75;
  }
}

.commerce-divider {
  width: 100%;
  height: 1px;
  background: #f1f5f9;
}

/* Action Row */
.commerce-action-row {
  display: flex;
  align-items: flex-end;
  gap: 0.85rem;
  flex-wrap: wrap;
}

/* Stepper inside panel */
.compact-stepper-container {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.stepper-caption {
  font-size: 0.725rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
}

.compact-stepper {
  display: inline-flex;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 0.85rem;
  padding: 3px;
  height: 48px;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.compact-stepper:focus-within {
  border-color: #0f172a;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.06);
}

.stepper-btn-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 40px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0.6rem;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.stepper-btn-mini:hover:not(:disabled) {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
  transform: scale(1.03);
}

.stepper-btn-mini:active:not(:disabled) {
  transform: scale(0.96);
}

.stepper-btn-mini:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}

.stepper-input-mini {
  width: 44px;
  height: 40px;
  text-align: center;
  border: none;
  background: transparent;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
  outline: none;
  -moz-appearance: textfield;
}

.stepper-input-mini::-webkit-outer-spin-button,
.stepper-input-mini::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.stepper-input-mini:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

/* Button Cluster */
.commerce-buttons-cluster {
  display: flex;
  gap: 0.75rem;
  flex: 1;
  min-width: 260px;
}

.btn-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  height: 48px;
  padding: 0 1.5rem;
  border-radius: 0.85rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  white-space: nowrap;
}

.btn-cta:active {
  transform: scale(0.98);
}

.btn-cta:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

.btn-buy-now {
  flex: 1.3;
  min-width: 140px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.22);
}

.shimmer-effect::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    60deg,
    transparent 30%,
    rgba(255, 255, 255, 0.18) 50%,
    transparent 70%
  );
  transform: rotate(30deg);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%) rotate(30deg); }
  100% { transform: translateX(100%) rotate(30deg); }
}

.btn-buy-now:hover:not(:disabled) {
  background: #1e293b;
  transform: translateY(-2px);
  box-shadow: 0 12px 25px -4px rgba(15, 23, 42, 0.3);
}

.btn-buy-now:disabled {
  background: #475569;
  box-shadow: none;
}

.btn-add-cart {
  flex: 1;
  min-width: 130px;
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.btn-add-cart:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #0f172a;
  transform: translateY(-2px);
}

.btn-add-cart:disabled {
  border-color: #e2e8f0;
}

.btn-read-sample {
  flex: 0.8;
  min-width: 110px;
  background: #f8fafc;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.btn-read-sample:hover {
  background: #e2e8f0;
  color: #0f172a;
  transform: translateY(-2px);
}

/* Subtotal Bar */
.commerce-subtotal-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1rem;
  background: #f8fafc;
  border-radius: 0.75rem;
  border: 1px dashed #cbd5e1;
  font-size: 0.85rem;
  color: #475569;
  animation: slideFadeDown 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.subtotal-calc-hint {
  color: #64748b;
  font-size: 0.825rem;
}

.subtotal-sum {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.subtotal-sum strong {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  color: #0f172a;
  font-size: 0.975rem;
}

@keyframes slideFadeDown {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Tabs Section */
.tabs-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 2.25rem;
  margin-top: 1rem;
}

.tabs-header {
  display: flex;
  gap: 2rem;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1.75rem;
}

.tab-title {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #64748b;
  padding-bottom: 0.95rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-title:hover {
  color: #0f172a;
}

.tab-title.active {
  color: #0f172a;
  border-bottom-color: #0f172a;
}

.tab-description {
  max-width: 75ch;
}

.description-text {
  font-size: 1.05rem;
  line-height: 1.8;
  color: #334155;
  white-space: pre-line;
}

/* Chapters List */
.chapters-grid {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 340px;
  overflow-y: auto;
  padding-right: 0.5rem;
  list-style: none;
  margin: 0;
}

.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.95rem 1.15rem;
  border-radius: 0.75rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  font-size: 0.925rem;
}

.ch-num {
  font-size: 0.825rem;
  font-weight: 800;
  color: #64748b;
  width: 95px;
}

.ch-name {
  flex: 1;
  font-weight: 700;
  color: #0f172a;
}

.ch-dur {
  font-size: 0.825rem;
  color: #64748b;
}

/* Reviews Styling */
.review-form {
  margin-bottom: 2.25rem;
  padding: 1.75rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 1.15rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
}

.review-form h4 {
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 1.15rem 0;
}

.rating-select-group {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1.15rem;
}

.star-rating-options {
  display: flex;
  gap: 0.35rem;
}

.star-option-btn {
  background: none;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  padding: 2px;
  transition: color 0.15s ease;
}

.star-option-btn:hover,
.star-option-btn.active {
  color: #d97706;
}

.comment-input-group textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.95rem 1.15rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.75rem;
  background: #f8fafc;
  color: #0f172a;
  font-family: inherit;
  font-size: 0.925rem;
  outline: none;
  resize: vertical;
  transition: border-color 0.18s ease;
  margin-bottom: 1.15rem;
}

.comment-input-group textarea:focus {
  border-color: #0f172a;
  background: #ffffff;
}

.btn-submit-review {
  padding: 0.75rem 1.75rem;
  font-size: 0.875rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: none;
  border-radius: 0.75rem;
  background: #0f172a;
  color: #ffffff;
  cursor: pointer;
  transition: background 0.18s ease;
}

.btn-submit-review:hover {
  background: #1e293b;
}

.no-reviews {
  padding: 2.5rem 0;
  text-align: center;
  color: #64748b;
  font-size: 0.925rem;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.review-card {
  padding: 1.35rem;
  border-radius: 1rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.review-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #0f172a;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 800;
  display: grid;
  place-items: center;
}

.user-name {
  font-size: 0.925rem;
  font-weight: 700;
  color: #0f172a;
}

.review-date {
  font-size: 0.825rem;
  color: #94a3b8;
}

.review-stars {
  display: flex;
  gap: 3px;
  color: #d97706;
  margin-bottom: 0.65rem;
}

.review-comment-text {
  font-size: 0.925rem;
  line-height: 1.65;
  color: #334155;
  margin: 0;
}

/* Sticky Action Bar */
.sticky-action-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  width: calc(100% - 32px);
  max-width: 640px;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
  padding: 0.6rem 1rem 0.6rem 0.85rem;
  box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.4);
}

.sticky-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.sticky-book-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  overflow: hidden;
}

.sticky-cover-thumb {
  width: 32px;
  height: 44px;
  object-fit: cover;
  border-radius: 0.35rem;
  flex-shrink: 0;
}

.sticky-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sticky-title {
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sticky-price {
  color: #fbbf24;
  font-size: 0.825rem;
  font-weight: 800;
}

.sticky-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-sticky {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-sticky-buy {
  background: #ffffff;
  color: #0f172a;
  padding: 0.5rem 1.15rem;
}

.btn-sticky-buy:hover {
  background: #f1f5f9;
  transform: translateY(-1px);
}

.btn-sticky-cart {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  width: 36px;
  height: 36px;
}

.btn-sticky-cart:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Animations */
.fade-slide-up-enter-active,
.fade-slide-up-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-up-enter-from,
.fade-slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

/* Responsive */
@media (max-width: 900px) {
  .product-grid {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
  .cover-column {
    position: static;
  }
  .book-title-heading {
    font-size: 2.2rem;
  }
}
</style>
