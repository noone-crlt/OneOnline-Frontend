<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  searchOutline,
  bookOutline,
  headsetOutline,
  documentTextOutline,
  optionsOutline,
  chevronBackOutline,
  chevronForwardOutline,
  arrowForwardOutline,
  cartOutline
} from 'ionicons/icons'
import IonIcon from '../components/common/IonIcon.vue'
import TopNavbar from '../components/layout/TopNavbar.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import { getBookCatalog, getCategories, getFileUrl } from '../services/api'

const router = useRouter()
const route = useRoute()

const books = ref([])
const categories = ref([])
const totalBooks = ref(0)
const currentPage = ref(0)
const pageSize = ref(16)
const isLoading = ref(true)
const errorMessage = ref('')

const categoryChipsRef = ref(null)

const searchQuery = ref('')
const selectedCategory = ref('')
const selectedFormat = ref('')
const selectedSort = ref('newest')
let searchTimer = null

function scrollCategories(direction) {
  if (categoryChipsRef.value) {
    categoryChipsRef.value.scrollBy({
      left: direction * 280,
      behavior: 'smooth',
    })
  }
}

const formatFilters = [
  { label: 'Tất cả định dạng', value: '' },
  { label: 'Sách điện tử', value: 'EBOOK' },
  { label: 'Sách nói', value: 'AUDIOBOOK' },
  { label: 'Sách giấy', value: 'PHYSICAL' },
]

const totalPages = computed(() => Math.max(1, Math.ceil(totalBooks.value / pageSize.value)))

// Map & format books for grid display
const processedBooks = computed(() => {
  return books.value.map((book) => {
    // Resolve cover image
    let cover = ''
    if (Array.isArray(book.imageUrls) && book.imageUrls.length > 0 && book.imageUrls[0]) {
      cover = getFileUrl(book.imageUrls[0])
    } else if (Array.isArray(book.editions) && book.editions.length > 0) {
      const coverEd = book.editions.find((e) => e.coverUrl || e.coverObjectName)
      if (coverEd) cover = coverEd.coverUrl || getFileUrl(coverEd.coverObjectName)
    }

    // Resolve price range
    let prices = Array.isArray(book.editions)
      ? book.editions.map((e) => Number(e.salePrice)).filter((p) => !isNaN(p) && p >= 0)
      : []
    let minPrice = prices.length > 0 ? Math.min(...prices) : 0

    // Formats available
    const availableFormats = Array.isArray(book.editions)
      ? [...new Set(book.editions.map((e) => e.format))]
      : []

    return {
      ...book,
      coverUrl: cover,
      minPrice,
      formattedPrice: minPrice > 0 ? new Intl.NumberFormat('vi-VN').format(minPrice) + 'đ' : 'Miễn phí',
      authorText: Array.isArray(book.authorNames) && book.authorNames.length > 0
        ? book.authorNames.join(', ')
        : 'One Online',
      categoryText: Array.isArray(book.categoryNames) && book.categoryNames.length > 0
        ? book.categoryNames[0]
        : '',
      availableFormats,
      initials: getInitials(book.title),
    }
  })
})

function getInitials(title) {
  if (!title) return 'BA'
  return String(title).trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase()
}

function getFormatBadgeLabel(format) {
  if (format === 'AUDIOBOOK') return 'SÁCH NÓI'
  if (format === 'PHYSICAL') return 'SÁCH GIẤY'
  return 'E-BOOK'
}

function getFormatBadgeClass(format) {
  if (format === 'AUDIOBOOK') return 'badge-audio'
  if (format === 'PHYSICAL') return 'badge-physical'
  return 'badge-ebook'
}

async function loadCatalog() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const payload = await getBookCatalog({
      q: searchQuery.value,
      category: selectedCategory.value,
      format: selectedFormat.value,
      page: currentPage.value,
      size: pageSize.value,
    })

    if (payload && Array.isArray(payload.content)) {
      books.value = payload.content
      totalBooks.value = Number(payload.totalElements ?? payload.content.length)
    } else if (Array.isArray(payload)) {
      books.value = payload
      totalBooks.value = payload.length
    } else {
      books.value = []
      totalBooks.value = 0
    }
  } catch (error) {
    books.value = []
    totalBooks.value = 0
    errorMessage.value = error instanceof Error ? error.message : 'Không thể tải danh sách sách.'
  } finally {
    isLoading.value = false
  }
}

async function loadCategories() {
  try {
    const res = await getCategories()
    categories.value = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
  } catch (_) {
    categories.value = []
  }
}

function handleCategorySelect(catName) {
  if (selectedCategory.value === catName) {
    selectedCategory.value = ''
  } else {
    selectedCategory.value = catName
  }
  currentPage.value = 0
  loadCatalog()
}

function handleFormatSelect(formatVal) {
  selectedFormat.value = formatVal
  currentPage.value = 0
  loadCatalog()
}

function changePage(page) {
  if (page < 0 || page >= totalPages.value || page === currentPage.value) return
  currentPage.value = page
  loadCatalog()
  window.scrollTo({ top: 300, behavior: 'smooth' })
}

function viewBookDetail(slug) {
  router.push(`/book/${slug}`)
}

watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 0
    loadCatalog()
  }, 350)
})

onMounted(async () => {
  // Sync query params from URL if present
  if (route.query.q) searchQuery.value = String(route.query.q)
  if (route.query.category) selectedCategory.value = String(route.query.category)
  if (route.query.format) selectedFormat.value = String(route.query.format)

  await Promise.all([loadCatalog(), loadCategories()])
})
</script>

<template>
  <div class="catalog-page">
    <TopNavbar />

    <main class="catalog-main">
      <!-- Hero Banner -->
      <section class="catalog-hero">
        <div class="hero-ambient-glow" aria-hidden="true"></div>
        <div class="catalog-hero__inner">
          <h1 class="hero-title">Khám phá tri thức không giới hạn</h1>
          <p class="hero-subtitle">
            Hàng ngàn tác phẩm sách điện tử, sách nói và sách giấy chất lượng cao được tuyển chọn dành riêng cho bạn.
          </p>

          <!-- Search Bar -->
          <div class="search-wrapper">
            <IonIcon :icon="searchOutline" :size="20" class="search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Tìm kiếm theo tên sách, tác giả, nội dung..."
              class="search-input"
            />
            <button v-if="searchQuery" type="button" class="clear-btn" aria-label="Xóa tìm kiếm" @click="searchQuery = ''">✕</button>
          </div>

          <!-- Quick Search Tags -->
          <div class="search-suggestions">
            <span class="suggestion-label">Gợi ý:</span>
            <button type="button" class="suggestion-tag" @click="searchQuery = 'Kinh tế'">Kinh tế</button>
            <button type="button" class="suggestion-tag" @click="searchQuery = 'Sapiens'">Sapiens</button>
            <button type="button" class="suggestion-tag" @click="searchQuery = 'Tâm lý'">Tâm lý</button>
            <button type="button" class="suggestion-tag" @click="searchQuery = 'Văn học'">Văn học</button>
          </div>
        </div>
      </section>

      <!-- Filter Controls Bar -->
      <section class="filter-bar">
        <div class="filter-bar__inner">
          <!-- Format Filters Row -->
          <div class="format-pills-row">
            <span class="filter-label">Định dạng:</span>
            <div class="format-pills">
              <button
                v-for="fmt in formatFilters"
                :key="fmt.value"
                type="button"
                class="format-pill-btn"
                :class="{ active: selectedFormat === fmt.value }"
                @click="handleFormatSelect(fmt.value)"
              >
                {{ fmt.label }}
              </button>
            </div>
          </div>

          <!-- Category Chips Slider Row -->
          <div v-if="categories.length > 0" class="category-slider-row">
            <span class="filter-label">Thể loại:</span>
            <div class="category-slider-wrapper">
              <button
                type="button"
                class="slider-nav-btn prev-btn"
                title="Cuộn sang trái"
                aria-label="Cuộn sang trái"
                @click="scrollCategories(-1)"
              >
                <IonIcon :icon="chevronBackOutline" :size="15" />
              </button>

              <div ref="categoryChipsRef" class="category-chips">
                <button
                  type="button"
                  class="chip-btn"
                  :class="{ active: selectedCategory === '' }"
                  @click="handleCategorySelect('')"
                >
                  Tất cả thể loại
                </button>
                <button
                  v-for="cat in categories"
                  :key="cat.id || cat.name"
                  type="button"
                  class="chip-btn"
                  :class="{ active: selectedCategory === cat.name }"
                  @click="handleCategorySelect(cat.name)"
                >
                  {{ cat.name }}
                </button>
              </div>

              <button
                type="button"
                class="slider-nav-btn next-btn"
                title="Cuộn sang phải"
                aria-label="Cuộn sang phải"
                @click="scrollCategories(1)"
              >
                <IonIcon :icon="chevronForwardOutline" :size="15" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Main Content Grid -->
      <section class="catalog-content">
        <!-- Result Stats -->
        <div class="results-header">
          <p class="results-count">
            Hiển thị <strong>{{ processedBooks.length }}</strong> / <strong>{{ totalBooks }}</strong> tác phẩm
            <span v-if="selectedCategory">thuộc thể loại <em>"{{ selectedCategory }}"</em></span>
          </p>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Đang tải kho sách...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="errorMessage" class="empty-state">
          <p class="error-msg">{{ errorMessage }}</p>
          <button type="button" class="retry-btn" @click="loadCatalog">Tải lại</button>
        </div>

        <!-- Empty Results -->
        <div v-else-if="processedBooks.length === 0" class="empty-state">
          <div class="empty-icon"><IonIcon :icon="bookOutline" :size="48" /></div>
          <h3>Không tìm thấy cuốn sách nào</h3>
          <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc hiện tại.</p>
          <button type="button" class="reset-filter-btn" @click="searchQuery = ''; selectedCategory = ''; selectedFormat = ''; loadCatalog()">
            Xóa bộ lọc
          </button>
        </div>

        <!-- Book Grid -->
        <div v-else class="book-grid">
          <article
            v-for="book in processedBooks"
            :key="book.id || book.slug"
            class="book-card"
            @click="viewBookDetail(book.slug)"
          >
            <!-- Cover image container -->
            <div class="book-card__cover-box">
              <img v-if="book.coverUrl" :src="book.coverUrl" :alt="book.title" loading="lazy" class="cover-img" />
              <div v-else class="cover-fallback">
                <span>{{ book.initials }}</span>
              </div>

              <!-- Badges -->
              <div class="format-badges">
                <span
                  v-for="fmt in book.availableFormats"
                  :key="fmt"
                  class="badge-pill"
                  :class="getFormatBadgeClass(fmt)"
                >
                  {{ getFormatBadgeLabel(fmt) }}
                </span>
              </div>
            </div>

            <!-- Content -->
            <div class="book-card__info">
              <span v-if="book.categoryText" class="book-category">{{ book.categoryText }}</span>
              <h3 class="book-title" :title="book.title">{{ book.title }}</h3>
              <p class="book-author">{{ book.authorText }}</p>

              <div class="book-card__footer">
                <span class="book-price">{{ book.formattedPrice }}</span>
                <button type="button" class="detail-btn" @click.stop="viewBookDetail(book.slug)">
                  <span>Xem chi tiết</span>
                  <IonIcon :icon="arrowForwardOutline" :size="14" />
                </button>
              </div>
            </div>
          </article>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination-bar">
          <button
            type="button"
            class="page-btn"
            :disabled="currentPage === 0"
            @click="changePage(currentPage - 1)"
          >
            <IonIcon :icon="chevronBackOutline" :size="16" />
            <span>Trang trước</span>
          </button>

          <div class="page-numbers">
            <button
              v-for="p in totalPages"
              :key="p"
              type="button"
              class="num-btn"
              :class="{ active: currentPage === p - 1 }"
              @click="changePage(p - 1)"
            >
              {{ p }}
            </button>
          </div>

          <button
            type="button"
            class="page-btn"
            :disabled="currentPage >= totalPages - 1"
            @click="changePage(currentPage + 1)"
          >
            <span>Trang sau</span>
            <IonIcon :icon="chevronForwardOutline" :size="16" />
          </button>
        </div>
      </section>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
.catalog-page {
  min-height: 100vh;
  background-color: var(--page-bg, #fafafa);
  display: flex;
  flex-direction: column;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.catalog-main {
  flex: 1;
}

/* Hero Section - Warm Cream / Ivory Paper Aesthetic */
.catalog-hero {
  position: relative;
  background-color: #fcfaf7;
  background-image: 
    radial-gradient(circle at 50% 0%, rgba(217, 119, 6, 0.07) 0%, rgba(252, 250, 247, 0) 65%),
    radial-gradient(circle at 10% 100%, rgba(180, 83, 9, 0.04) 0%, rgba(252, 250, 247, 0) 50%);
  color: #1c1917;
  padding: 4.25rem 1.5rem 3.75rem;
  text-align: center;
  overflow: hidden;
  border-bottom: 1px solid #e7e5e4;
}

.hero-ambient-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 900px;
  height: 280px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, rgba(252, 250, 247, 0) 70%);
  pointer-events: none;
}

.catalog-hero__inner {
  position: relative;
  z-index: 10;
  max-width: 760px;
  margin: 0 auto;
}

.hero-title {
  font-size: 2.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  margin-bottom: 1rem;
  color: #1c1917 !important;
  -webkit-text-fill-color: initial;
  background: none;
}

.hero-subtitle {
  font-size: 1.05rem;
  color: #57534e;
  margin: 0 auto 2.25rem;
  max-width: 620px;
  line-height: 1.6;
}

.search-wrapper {
  position: relative;
  max-width: 600px;
  margin: 0 auto 0.75rem;
}

.search-icon {
  position: absolute;
  left: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  color: #78716c;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 1rem 3.25rem 1rem 3.5rem;
  border-radius: 9999px;
  border: 1px solid #e7e5e4;
  background: #ffffff;
  color: #1c1917 !important;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.25s ease;
  box-shadow: 0 10px 25px -5px rgba(28, 25, 23, 0.05), 0 2px 6px rgba(28, 25, 23, 0.03);
}

.search-input::placeholder {
  color: #a8a29e;
}

.search-input:focus {
  border-color: #d97706;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.12), 0 12px 28px -5px rgba(28, 25, 23, 0.08);
}

.clear-btn {
  position: absolute;
  right: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  background: #f5f5f4;
  border: 1px solid #e7e5e4;
  color: #78716c;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.15s ease;
}

.clear-btn:hover {
  background: #1c1917;
  color: #ffffff;
  border-color: #1c1917;
}

.search-suggestions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #78716c;
  margin-bottom: 0;
  flex-wrap: wrap;
}

.suggestion-label {
  font-weight: 500;
  color: #78716c;
}

.suggestion-tag {
  background: #ffffff;
  border: 1px solid #e7e5e4;
  color: #57534e;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.775rem;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.suggestion-tag:hover {
  background: #f5f2ea;
  color: #1c1917;
  border-color: #d6d3d1;
}

/* Filter Bar - Warm Cream Ivory Paper Theme */
.filter-bar {
  background: #f5f2ea;
  border-bottom: 1px solid #e7e5e4;
  position: sticky;
  top: 64px;
  z-index: 20;
  backdrop-filter: blur(12px);
  padding: 0.85rem 0;
  box-shadow: 0 4px 12px rgba(28, 25, 23, 0.03);
}

.filter-bar__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.format-pills-row,
.category-slider-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #78716c;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  min-width: 72px;
}

.format-pills {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.format-pill-btn {
  padding: 0.45rem 1rem;
  border-radius: 9999px;
  border: 1px solid #e7e5e4;
  background: #ffffff;
  color: #57534e;
  font-size: 0.825rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.format-pill-btn:hover {
  background: #fafaf9;
  color: #1c1917;
  border-color: #d6d3d1;
}

.format-pill-btn.active {
  background: #1c1917;
  color: #ffffff;
  font-weight: 600;
  border-color: #1c1917;
  box-shadow: 0 4px 10px rgba(28, 25, 23, 0.15);
}

.category-slider-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
}

.category-chips {
  flex: 1;
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding: 0.2rem 0;
  scroll-behavior: smooth;
  /* HIDE CLUNKY BROWSER SCROLLBAR */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.category-chips::-webkit-scrollbar {
  display: none;
}

.slider-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid #e7e5e4;
  background: #ffffff;
  color: #44403c;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.slider-nav-btn:hover {
  background: #1c1917;
  color: #ffffff;
  border-color: #1c1917;
  transform: scale(1.05);
}

.chip-btn {
  padding: 0.35rem 0.85rem;
  border-radius: 8px;
  border: 1px solid #e7e5e4;
  background: #ffffff;
  color: #57534e;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.chip-btn:hover {
  background: #fafaf9;
  color: #1c1917;
  border-color: #d6d3d1;
}

.chip-btn.active {
  background: #b45309;
  color: #ffffff;
  font-weight: 600;
  border-color: #b45309;
  box-shadow: 0 2px 8px rgba(180, 83, 9, 0.2);
}

/* Content Area */
.catalog-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 5rem;
}

.results-header {
  margin-bottom: 1.5rem;
}

.results-count {
  font-size: 0.9rem;
  color: #71717a;
}

/* Loading & Empty */
.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e4e4e7;
  border-top-color: #18181b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  color: #a1a1aa;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #18181b;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #71717a;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.reset-filter-btn,
.retry-btn {
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  background: #18181b;
  color: #ffffff;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

/* Book Grid */
.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.75rem;
}

.book-card {
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.book-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.08);
}

.book-card__cover-box {
  position: relative;
  width: 100%;
  padding-top: 140%; /* 1:1.4 aspect ratio for book covers */
  background: #f4f4f5;
  overflow: hidden;
}

.cover-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.book-card:hover .cover-img {
  transform: scale(1.04);
}

.cover-fallback {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e4e4e7;
  color: #52525b;
  font-size: 2rem;
  font-weight: 700;
}

.format-badges {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.badge-pill {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-ebook {
  background: #2563eb;
  color: #ffffff;
}

.badge-audio {
  background: #7c3aed;
  color: #ffffff;
}

.badge-physical {
  background: #059669;
  color: #ffffff;
}

.book-card__info {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.book-category {
  font-size: 0.725rem;
  font-weight: 600;
  color: #2563eb;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
}

.book-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #18181b;
  line-height: 1.35;
  margin-bottom: 0.35rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-author {
  font-size: 0.8rem;
  color: #71717a;
  margin-bottom: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-card__footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid #f4f4f5;
}

.book-price {
  font-size: 0.95rem;
  font-weight: 800;
  color: #18181b;
}

.detail-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: none;
  color: #2563eb;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.detail-btn:hover {
  text-decoration: underline;
}

/* Pagination */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 3rem;
}

.page-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid #e4e4e7;
  background: #ffffff;
  color: #18181b;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 0.35rem;
}

.num-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e4e4e7;
  background: #ffffff;
  color: #18181b;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.num-btn.active {
  background: #18181b;
  color: #ffffff;
  border-color: #18181b;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 1.85rem;
  }
  .book-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
  }
}
</style>
