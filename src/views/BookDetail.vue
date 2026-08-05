<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhBookOpen,
  PhShoppingCartSimple,
  PhLightning,
  PhStar,
  PhCheckCircle,
  PhBookBookmark,
  PhFilePdf,
  PhHeadphones,
  PhShareNetwork,
  PhArrowLeft,
  PhChatCircleText
} from '@phosphor-icons/vue'
import { addCartItem, getBookBySlug, getFileUrl } from '../services/api'
import { toast } from 'vue-sonner'
import TopNavbar from '../components/layout/TopNavbar.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import { authUser } from '../stores/auth'
import { fetchCartItemCount } from '../stores/cart'

const route = useRoute()
const router = useRouter()

const book = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')
const selectedEditionIndex = ref(0)
const activeTab = ref('description') // 'description', 'chapters', 'reviews'

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

function copyShareLink() {
  navigator.clipboard.writeText(window.location.href)
  toast.success('Đã sao chép liên kết tác phẩm!')
}

async function addToCart() {
  if (!isSignedIn.value) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  try {
    await addCartItem(selectedEdition.value.id, 1)
    await fetchCartItemCount()
    toast.success('Đã thêm sách vào giỏ hàng thành công!')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Không thể thêm sách vào giỏ hàng.')
  }
}

async function buyNow() {
  if (!isSignedIn.value) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  try {
    await addCartItem(selectedEdition.value.id, 1)
    router.push({ name: 'cart' })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Không thể bắt đầu thanh toán.')
  }
}

const reviews = ref([
  {
    id: 1,
    userName: 'Nguyễn Văn Hải',
    rating: 5,
    createdAt: '2026-06-20',
    comment: 'Tác phẩm dịch rất mượt mà, bìa sách tối giản sang trọng. Trải nghiệm đọc trực tuyến cực kỳ dễ chịu cho mắt.'
  },
  {
    id: 2,
    userName: 'Trần Thị Mai',
    rating: 4,
    createdAt: '2026-06-25',
    comment: 'Nội dung rất hay, ý nghĩa sâu sắc. Sách nói giọng đọc truyền cảm, âm thanh chất lượng tốt. Sẽ tiếp tục mua thêm.'
  }
])

const newRating = ref(5)
const newComment = ref('')

function submitReview() {
  if (!newComment.value.trim()) {
    toast.error('Vui lòng nhập nội dung đánh giá.')
    return
  }
  
  reviews.value.unshift({
    id: Date.now(),
    userName: authUser.value?.fullName || 'Khách viếng thăm',
    rating: newRating.value,
    createdAt: new Date().toISOString().split('T')[0],
    comment: newComment.value.trim()
  })
  
  newComment.value = ''
  newRating.value = 5
  toast.success('Cảm ơn bạn đã gửi đánh giá thành công!')
}

async function fetchBookDetail() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const slug = route.params.slug
    const data = await getBookBySlug(slug)
    book.value = data
    if (data.editions && data.editions.length > 0) {
      const bestIndex = data.editions.findIndex(e => e.format !== 'PHYSICAL')
      selectedEditionIndex.value = bestIndex !== -1 ? bestIndex : 0
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Không thể tải chi tiết sách.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchBookDetail()
})
</script>

<template>
  <div class="book-detail-shell">
    <TopNavbar />

    <main class="detail-container">
      <div v-if="isLoading" class="detail-loading">
        <div class="spinner"></div>
        <p>Đang chuẩn bị trang tác phẩm...</p>
      </div>

      <div v-else-if="errorMessage" class="detail-error">
        <p class="error-msg">{{ errorMessage }}</p>
        <button class="btn btn-secondary" @click="router.push('/library')">Quay lại thư viện</button>
      </div>

      <div v-else class="detail-wrapper">
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
            <div class="book-cover-stage shadow-editorial">
              <div class="book-cover-frame">
                <img v-if="coverUrl" :src="coverUrl" :alt="`Bìa sách ${book.title}`" class="cover-img" />
                <span v-else class="cover-initials">{{ getInitials(book.title) }}</span>
              </div>
              <div class="cover-lighting-overlay"></div>
            </div>
            
            <!-- Category Tag Pills -->
            <div class="categories-tags" v-if="book.categoryNames && book.categoryNames.length > 0">
              <span v-for="cat in book.categoryNames" :key="cat" class="cat-pill">
                {{ cat }}
              </span>
            </div>

            <button type="button" class="share-btn" @click="copyShareLink" title="Chia sẻ tác phẩm">
              <PhShareNetwork :size="16" />
              <span>Chia sẻ tác phẩm này</span>
            </button>
          </div>

          <!-- Right Column: Book Details & Actions -->
          <div class="info-column">
            <div class="book-header-section">
              <div class="publisher-row">
                <span class="publisher-kicker">{{ book.publisherName || 'NXB Tri Thức Online' }}</span>
                <span class="rating-badge">
                  <PhStar :size="14" weight="fill" class="star-icon" />
                  <strong>4.9</strong> ({{ reviews.length }} đánh giá)
                </span>
              </div>
              <h1 class="book-title-heading">{{ book.title }}</h1>
              
              <div class="authors-list" v-if="book.authorNames && book.authorNames.length > 0">
                <span class="label">Tác giả:</span>
                <span class="author-name">{{ book.authorNames.join(', ') }}</span>
              </div>
            </div>

            <!-- Format Selector (Tactile Bento Pills) -->
            <div class="formats-section" v-if="book.editions && book.editions.length > 0">
              <div class="section-label">
                <span>Chọn định dạng</span>
                <small>Bản quyền chính thức</small>
              </div>
              <div class="format-options">
                <button
                  v-for="(ed, idx) in book.editions"
                  :key="ed.id"
                  :class="['format-card-btn', { active: selectedEditionIndex === idx }]"
                  @click="selectEdition(idx)"
                >
                  <component :is="getFormatIconComponent(ed.format)" :size="20" class="format-icon" />
                  <div class="format-text-wrap">
                    <span class="format-name">{{ formatFormatName(ed.format) }}</span>
                    <span class="format-price-tag">{{ formatPrice(ed.salePrice) }}</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Pricing & Availability Card -->
            <div class="pricing-card" v-if="selectedEdition">
              <div class="price-box">
                <span class="sale-price">{{ formatPrice(selectedEdition.salePrice) }}</span>
                <span class="original-price" v-if="selectedEdition.originalPrice && selectedEdition.originalPrice > selectedEdition.salePrice">
                  {{ formatPrice(selectedEdition.originalPrice) }}
                </span>
                <span class="discount-badge" v-if="discountPercent > 0">
                  -{{ discountPercent }}%
                </span>
              </div>
              <div class="availability-status">
                <PhCheckCircle :size="16" class="check-icon" />
                <span>{{ getStockLabel(selectedEdition) }}</span>
              </div>
            </div>

            <!-- Action Buttons Grid -->
            <div class="actions-section">
              <button 
                class="btn-cta btn-buy-now" 
                @click="buyNow" 
                :disabled="selectedEdition?.format === 'PHYSICAL' && selectedEdition?.stock <= 0"
              >
                <PhLightning :size="18" weight="fill" />
                <span>Mua ngay</span>
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
                  <span>Đánh giá ({{ reviews.length }})</span>
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
                            <div class="user-avatar">{{ rev.userName.slice(0, 1) }}</div>
                            <span class="user-name">{{ rev.userName }}</span>
                          </div>
                          <span class="review-date">{{ rev.createdAt }}</span>
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
    <AppFooter />
  </div>
</template>

<style scoped>
.book-detail-shell {
  min-height: 100vh;
  background-color: #FCFAF7;
  display: flex;
  flex-direction: column;
}

/* Main content layout */
.detail-container {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 6rem;
}

.detail-loading, .detail-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 450px;
}

.spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(15, 23, 42, 0.1);
  border-radius: 50%;
  border-top-color: #0f172a;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1.25rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 50%;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  margin-right: 0.25rem;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
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
  grid-template-columns: 340px 1fr;
  gap: 3.5rem;
  align-items: start;
}

/* Left Cover Stage */
.cover-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  position: sticky;
  top: 90px;
}

.book-cover-stage {
  position: relative;
  width: 100%;
  max-width: 300px;
  aspect-ratio: 2/3;
  border-radius: 1.25rem;
  background: #ffffff;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
}

.shadow-editorial {
  box-shadow: 0 20px 50px -15px rgba(15, 23, 42, 0.12), 0 6px 16px -6px rgba(0, 0, 0, 0.04);
}

.book-cover-stage:hover {
  transform: translateY(-4px);
  box-shadow: 0 30px 70px -20px rgba(15, 23, 42, 0.18);
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
  font-size: 3rem;
  font-weight: 800;
  color: #94a3b8;
}

.cover-lighting-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 60%),
              linear-gradient(to right, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0.02) 25%, transparent 100%);
  pointer-events: none;
}

.categories-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: center;
}

.cat-pill {
  font-size: 0.78rem;
  background: #f1f5f9;
  color: #334155;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid #cbd5e1;
  font-weight: 500;
}

.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 0.825rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.18s ease;
}

.share-btn:hover {
  color: #0f172a;
}

/* Right Info Column */
.info-column {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.publisher-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.publisher-kicker {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #d97706;
  font-weight: 700;
}

.rating-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.825rem;
  color: #334155;
  background: #fef3c7;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  border: 1px solid #fde68a;
}

.star-icon {
  color: #d97706;
}

.book-title-heading {
  font-size: clamp(2.1rem, 3.2vw, 3rem);
  font-weight: 800;
  color: #0f172a;
  line-height: 1.15;
  letter-spacing: -0.03em;
  margin: 0 0 0.8rem 0;
}

.authors-list {
  font-size: 1rem;
  color: #475569;
}

.authors-list .label {
  color: #64748b;
  margin-right: 0.35rem;
}

.authors-list .author-name {
  color: #0f172a;
  font-weight: 600;
}

/* Formats Section */
.formats-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-label small {
  text-transform: none;
  font-weight: 500;
  color: #64748b;
  letter-spacing: 0;
}

.format-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.85rem;
}

.format-card-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.875rem;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: left;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.format-card-btn:hover {
  border-color: #0f172a;
  background: #f8fafc;
  transform: translateY(-2px);
}

.format-card-btn.active {
  border-color: #0f172a;
  background: #0f172a;
  color: #ffffff;
  box-shadow: 0 8px 20px -6px rgba(15, 23, 42, 0.25);
}

.format-icon {
  flex-shrink: 0;
}

.format-card-btn.active .format-icon {
  color: #ffffff;
}

.format-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.format-name {
  font-size: 0.85rem;
  font-weight: 600;
}

.format-price-tag {
  font-size: 0.8rem;
  opacity: 0.85;
}

/* Pricing Card */
.pricing-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  background: #ffffff;
  padding: 1.25rem 1.6rem;
  border-radius: 1rem;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.04);
}

.price-box {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.sale-price {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.03em;
}

.original-price {
  font-size: 1rem;
  text-decoration: line-through;
  color: #94a3b8;
}

.discount-badge {
  font-size: 0.78rem;
  font-weight: 700;
  color: #dc2626;
  background: #fef2f2;
  padding: 0.2rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid #fecaca;
}

.availability-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #16a34a;
}

/* Actions Section */
.actions-section {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.btn-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1.75rem;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-buy-now {
  flex: 1.5;
  min-width: 150px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  box-shadow: 0 6px 20px -4px rgba(15, 23, 42, 0.2);
}

.btn-buy-now:hover {
  background: #1e293b;
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -4px rgba(15, 23, 42, 0.3);
}

.btn-add-cart {
  flex: 1.5;
  min-width: 150px;
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.btn-add-cart:hover {
  background: #f8fafc;
  border-color: #0f172a;
  transform: translateY(-2px);
}

.btn-read-sample {
  flex: 1;
  min-width: 120px;
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.btn-read-sample:hover {
  background: #e2e8f0;
  color: #0f172a;
  transform: translateY(-2px);
}

.btn-cta:active {
  transform: scale(0.98);
}

.btn-cta:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Tabs Section */
.tabs-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 2rem;
  margin-top: 1rem;
}

.tabs-header {
  display: flex;
  gap: 1.75rem;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;
}

.tab-title {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #64748b;
  padding-bottom: 0.85rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all 0.18s ease;
}

.tab-title:hover {
  color: #0f172a;
}

.tab-title.active {
  color: #0f172a;
  border-bottom-color: #0f172a;
}

.tab-description {
  max-width: 70ch;
}

.description-text {
  font-size: 1rem;
  line-height: 1.75;
  color: #334155;
  white-space: pre-line;
}

/* Chapters List */
.chapters-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 0.5rem;
  list-style: none;
  margin: 0;
}

.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1rem;
  border-radius: 0.625rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  font-size: 0.9rem;
}

.ch-num {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  width: 90px;
}

.ch-name {
  flex: 1;
  font-weight: 600;
  color: #0f172a;
}

.ch-dur {
  font-size: 0.8rem;
  color: #64748b;
}

/* Reviews Styling */
.review-form {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
}

.review-form h4 {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 1rem 0;
}

.rating-select-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.star-rating-options {
  display: flex;
  gap: 0.25rem;
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
  padding: 0.85rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.625rem;
  background: #f8fafc;
  color: #0f172a;
  font-family: inherit;
  font-size: 0.9rem;
  outline: none;
  resize: vertical;
  transition: border-color 0.18s ease;
  margin-bottom: 1rem;
}

.comment-input-group textarea:focus {
  border-color: #0f172a;
  background: #ffffff;
}

.btn-submit-review {
  padding: 0.65rem 1.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: none;
  border-radius: 0.625rem;
  background: #0f172a;
  color: #ffffff;
  cursor: pointer;
  transition: background 0.18s ease;
}

.btn-submit-review:hover {
  background: #1e293b;
}

.no-reviews {
  padding: 2rem 0;
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.review-card {
  padding: 1.25rem;
  border-radius: 0.875rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.review-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #0f172a;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.review-date {
  font-size: 0.8rem;
  color: #94a3b8;
}

.review-stars {
  display: flex;
  gap: 2px;
  color: #d97706;
  margin-bottom: 0.6rem;
}

.review-comment-text {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #334155;
  margin: 0;
}

/* Responsive */
@media (max-width: 900px) {
  .product-grid {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
  .cover-column {
    position: static;
  }
}
</style>
