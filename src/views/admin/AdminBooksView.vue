<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  PhMagnifyingGlass,
  PhPlus,
  PhPencilSimple,
  PhTrash,
  PhX,
  PhEye,
  PhEyeSlash,
  PhBooks,
  PhUploadSimple,
  PhCaretLeft,
  PhCaretRight,
  PhFileText,
  PhImage,
} from '@phosphor-icons/vue'
import {
  createAdminBook,
  deleteAdminBook,
  getAdminBook,
  getAdminBookFormOptions,
  getAdminBooks,
  getAdminBookStats,
  getFileUrl,
  updateAdminBook,
  updateAdminBookStatus,
} from '../../services/api'
import notify, { confirmDialog } from '../../services/toast'

const books = ref([])
const totalBooks = ref(0)
const currentPage = ref(0)
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isModalOpen = ref(false)
const editingBookId = ref(null)
const coverFile = ref(null)
const coverPreview = ref('')
const failedCoverIds = ref(new Set())
const formOptions = ref({ publishers: [], authors: [], categories: [] })
const pdfFile = ref(null)
const pdfFileName = ref('')
let searchTimer = null

const pageSize = 10
const totalPages = computed(() => Math.max(1, Math.ceil(totalBooks.value / pageSize)))
const modalTitle = computed(() => editingBookId.value ? 'Chỉnh sửa sách' : 'Thêm sách mới')

const bookStats = ref({ total: 0, active: 0, inactive: 0 })
const visiblePageNumbers = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages = []
  const start = Math.max(0, current - 2)
  const end = Math.min(total - 1, current + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

const form = reactive({
  title: '',
  slug: '',
  description: '',
  publisherId: '',
  authorIds: [],
  categoryIds: [],
  isActive: true,
  ebookOriginalPrice: '',
  ebookSalePrice: '',
})

function formatNumberWithDots(val) {
  if (val === null || val === undefined || val === '') return ''
  const cleanStr = String(val).replace(/\D/g, '')
  if (!cleanStr) return ''
  return Number(cleanStr).toLocaleString('vi-VN')
}

function parseNumberFromDots(val) {
  if (val === null || val === undefined) return ''
  return String(val).replace(/\D/g, '')
}

function formatVndDisplay(val) {
  if (val === null || val === undefined || val === '') return ''
  const num = Number(val)
  if (isNaN(num)) return ''
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
}

const displayEbookSalePrice = computed({
  get() {
    return formatNumberWithDots(form.ebookSalePrice)
  },
  set(val) {
    form.ebookSalePrice = parseNumberFromDots(val)
  },
})

const displayEbookOriginalPrice = computed({
  get() {
    return formatNumberWithDots(form.ebookOriginalPrice)
  },
  set(val) {
    form.ebookOriginalPrice = parseNumberFromDots(val)
  },
})

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

function toStatusFilter() {
  if (selectedStatus.value === 'active') return true
  if (selectedStatus.value === 'inactive') return false
  return undefined
}

function getCoverUrl(book) {
  if (!book || failedCoverIds.value.has(book.id)) return ''

  let rawPath = ''
  if (Array.isArray(book.imageUrls) && book.imageUrls.length > 0 && book.imageUrls[0]) {
    rawPath = book.imageUrls[0]
  } else if (book.coverUrl) {
    rawPath = book.coverUrl
  } else if (book.coverImage) {
    rawPath = book.coverImage
  } else if (book.coverObjectName) {
    rawPath = book.coverObjectName
  } else if (Array.isArray(book.editions) && book.editions.length > 0) {
    const coverEd = book.editions.find(e => e.coverUrl || e.coverObjectName)
    if (coverEd) rawPath = coverEd.coverUrl || coverEd.coverObjectName
  }

  return rawPath ? getFileUrl(rawPath) : ''
}

function getCoverInitials(title) {
  return String(title ?? 'S').trim().slice(0, 1).toUpperCase()
}

function markCoverAsUnavailable(bookId) {
  failedCoverIds.value = new Set([...failedCoverIds.value, bookId])
}

function resetForm() {
  Object.assign(form, {
    title: '',
    slug: '',
    description: '',
    publisherId: '',
    authorIds: [],
    categoryIds: [],
    isActive: true,
    ebookOriginalPrice: '',
    ebookSalePrice: '',
  })
  editingBookId.value = null
  coverFile.value = null
  coverPreview.value = ''
  pdfFile.value = null
  pdfFileName.value = ''
}

async function loadBookStats() {
  try {
    const stats = await getAdminBookStats()
    bookStats.value = {
      total: Number(stats?.total ?? 0),
      active: Number(stats?.active ?? 0),
      inactive: Number(stats?.inactive ?? 0),
    }
  } catch (_) {
    // silently fail – stats are non-critical
  }
}

async function loadBooks() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const payload = await getAdminBooks({
      page: currentPage.value,
      size: pageSize,
      q: searchQuery.value,
      category: selectedCategory.value,
      isActive: toStatusFilter(),
    })
    books.value = Array.isArray(payload?.content) ? payload.content : []
    failedCoverIds.value = new Set()
    totalBooks.value = Number(payload?.totalElements ?? books.value.length)
  } catch (error) {
    books.value = []
    totalBooks.value = 0
    errorMessage.value = error instanceof Error ? error.message : 'Không thể tải danh sách sách.'
  } finally {
    isLoading.value = false
  }
}

async function loadFormOptions() {
  try {
    formOptions.value = await getAdminBookFormOptions()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Không thể tải dữ liệu cho biểu mẫu.'
  }
}

async function openCreateModal() {
  clearMessages()
  resetForm()
  if (formOptions.value.publishers.length === 0) await loadFormOptions()
  if (formOptions.value.publishers.length > 0) isModalOpen.value = true
}

async function openEditModal(bookId) {
  clearMessages()
  if (formOptions.value.publishers.length === 0) await loadFormOptions()
  if (formOptions.value.publishers.length === 0) return

  try {
    const book = await getAdminBook(bookId)
    editingBookId.value = book.id
    Object.assign(form, {
      title: book.title ?? '',
      slug: book.slug ?? '',
      description: book.description ?? '',
      publisherId: String(book.publisherId ?? ''),
      authorIds: (book.authorIds ?? []).map(String),
      categoryIds: (book.categoryIds ?? []).map(String),
      isActive: Boolean(book.isActive),
      ebookOriginalPrice: book.ebookOriginalPrice != null ? String(book.ebookOriginalPrice) : '',
      ebookSalePrice: book.ebookSalePrice != null ? String(book.ebookSalePrice) : '',
    })
    coverFile.value = null
    coverPreview.value = book.imageUrls?.[0] ? getFileUrl(book.imageUrls[0]) : ''
    pdfFile.value = null
    pdfFileName.value = book.pdfFileName || ''
    isModalOpen.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Không thể tải thông tin sách.'
  }
}

function closeModal() {
  if (isSaving.value) return
  isModalOpen.value = false
  resetForm()
}

function handleCoverChange(event) {
  const [file] = event.target.files ?? []
  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    errorMessage.value = 'Ảnh bìa phải có định dạng JPG, PNG hoặc WebP.'
    event.target.value = ''
    return
  }

  coverFile.value = file
  coverPreview.value = URL.createObjectURL(file)
}

function handlePdfChange(event) {
  const [file] = event.target.files ?? []
  if (!file) return

  if (file.type !== 'application/pdf') {
    errorMessage.value = 'File tài liệu phải có định dạng PDF.'
    event.target.value = ''
    return
  }

  pdfFile.value = file
  pdfFileName.value = file.name
}

function buildPayload() {
  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    description: form.description.trim(),
    publisherId: Number(form.publisherId),
    authorIds: form.authorIds.map(Number),
    categoryIds: form.categoryIds.map(Number),
    isActive: form.isActive,
    ebookOriginalPrice: form.ebookOriginalPrice ? Number(form.ebookOriginalPrice) : null,
    ebookSalePrice: form.ebookSalePrice ? Number(form.ebookSalePrice) : null,
  }
}

async function saveBook() {
  clearMessages()
  isSaving.value = true

  try {
    const payload = buildPayload()
    if (editingBookId.value) {
      await updateAdminBook(editingBookId.value, payload, coverFile.value, pdfFile.value)
      const msg = 'Cập nhật sách thành công.'
      successMessage.value = msg
      notify.success(msg)
    } else {
      await createAdminBook(payload, coverFile.value, pdfFile.value)
      const msg = 'Tạo sách thành công.'
      successMessage.value = msg
      notify.success(msg)
    }
    isModalOpen.value = false
    resetForm()
    await loadBooks()
    loadBookStats()
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Không thể lưu sách.'
    errorMessage.value = msg
    notify.error(msg)
  } finally {
    isSaving.value = false
  }
}

async function toggleBookStatus(book) {
  const nextStatus = !book.isActive
  const action = nextStatus ? 'hiển thị lại' : 'ẩn'
  const confirmed = await confirmDialog('Xác nhận trạng thái', `Bạn có chắc chắn muốn ${action} sách "${book.title}" không?`, 'Đồng ý', 'Hủy')
  if (!confirmed) return

  clearMessages()
  try {
    await updateAdminBookStatus(book.id, nextStatus)
    const msg = nextStatus ? 'Đã hiển thị lại sách.' : 'Đã ẩn sách khỏi thư viện.'
    successMessage.value = msg
    notify.info(msg)
    await loadBooks()
    loadBookStats()
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Không thể thay đổi trạng thái sách.'
    errorMessage.value = msg
    notify.error(msg)
  }
}

async function deleteBookItem(book) {
  const confirmed = await confirmDialog('Xác nhận xóa sách', `Bạn có chắc chắn muốn xóa cuốn sách "${book.title}" không?\nHành động này sẽ xóa dữ liệu sách khỏi hệ thống.`, 'Xóa sách', 'Hủy')
  if (!confirmed) return

  clearMessages()
  try {
    await deleteAdminBook(book.id)
    const msg = `Đã xóa cuốn sách "${book.title}" thành công.`
    successMessage.value = msg
    notify.success(msg)
    await loadBooks()
    loadBookStats()
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Không thể xóa sách.'
    errorMessage.value = msg
    notify.error(msg)
  }
}

function changePage(nextPage) {
  if (nextPage < 0 || nextPage >= totalPages.value || nextPage === currentPage.value) return
  currentPage.value = nextPage
  loadBooks()
}

watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 0
    loadBooks()
  }, 350)
})

watch([selectedCategory, selectedStatus], () => {
  currentPage.value = 0
  loadBooks()
})

onMounted(async () => {
  await Promise.all([loadBooks(), loadFormOptions(), loadBookStats()])
})

onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <div class="admin-page">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <h2>Quản lý Sách</h2>
        <p class="header-subtitle">
          <span class="total-count">{{ totalBooks }}</span> tác phẩm trên hệ thống
        </p>
      </div>
      <button class="primary-btn" @click="openCreateModal">
        <PhPlus :size="18" weight="bold" />
        <span>Thêm sách mới</span>
      </button>
    </header>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon">
          <PhBooks :size="22" weight="duotone" />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ bookStats.total }}</span>
          <span class="stat-label">Tổng sách</span>
        </div>
      </div>
      <div class="stat-card stat-active">
        <div class="stat-icon active">
          <PhEye :size="22" weight="duotone" />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ bookStats.active }}</span>
          <span class="stat-label">Đang hiển thị</span>
        </div>
      </div>
      <div class="stat-card stat-hidden">
        <div class="stat-icon hidden-icon">
          <PhEyeSlash :size="22" weight="duotone" />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ bookStats.inactive }}</span>
          <span class="stat-label">Đã ẩn</span>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <PhMagnifyingGlass :size="18" class="search-icon" />
        <input type="text" v-model="searchQuery" placeholder="Tìm kiếm theo tên sách, tác giả..." />
      </div>
      <div class="filter-actions">
        <select v-model="selectedCategory" class="filter-select">
          <option value="">Tất cả thể loại</option>
          <option v-for="category in formOptions.categories" :key="category.id" :value="category.name">
            {{ category.name }}
          </option>
        </select>
        <select v-model="selectedStatus" class="filter-select">
          <option value="">Trạng thái</option>
          <option value="active">Đang hiển thị</option>
          <option value="inactive">Đã ẩn</option>
        </select>
      </div>
    </div>

    <!-- Feedback Messages -->
    <transition name="msg-fade">
      <div v-if="successMessage" class="feedback-toast success-toast" @click="successMessage = ''">
        <span>✓</span>
        <span>{{ successMessage }}</span>
      </div>
    </transition>
    <transition name="msg-fade">
      <div v-if="errorMessage && books.length > 0" class="feedback-toast error-toast" @click="errorMessage = ''">
        <span>✕</span>
        <span>{{ errorMessage }}</span>
      </div>
    </transition>

    <!-- Book List -->
    <div class="list-container">
      <div class="list-header-row">
        <div class="col-cover">Bìa</div>
        <div class="col-title">Tên sách</div>
        <div class="col-author">Tác giả</div>
        <div class="col-category">Thể loại</div>
        <div class="col-status">Trạng thái</div>
        <div class="col-actions">Thao tác</div>
      </div>

      <div class="list-body">
        <!-- Loading State -->
        <div v-if="isLoading" class="empty-state">
          <div class="loading-spinner"></div>
          <p>Đang tải danh sách sách…</p>
        </div>

        <!-- Book Rows -->
        <transition-group v-else name="list-anim" tag="div">
          <div v-for="book in books" :key="book.id" class="list-row">
            <div class="col-cover">
              <div class="book-cover" :class="{ 'book-cover--missing': !getCoverUrl(book) }">
                <img
                  v-if="getCoverUrl(book)"
                  :src="getCoverUrl(book)"
                  :alt="`Bìa sách ${book.title}`"
                  @error="markCoverAsUnavailable(book.id)"
                />
                <span v-else class="book-cover-fallback" aria-hidden="true">{{ getCoverInitials(book.title) }}</span>
              </div>
            </div>
            <div class="col-title">
              <strong class="book-title" :title="book.title">{{ book.title }}</strong>
              <span class="book-id">#{{ book.id }}</span>
            </div>
            <div class="col-author">
              <span class="author-names" :title="book.authorNames?.join(', ')">
                {{ book.authorNames?.join(', ') || 'Chưa cập nhật' }}
              </span>
            </div>
            <div class="col-category">
              <span class="category-chip" :title="book.categoryNames?.join(', ')">
                {{ book.categoryNames?.[0] || 'Chưa phân loại' }}
              </span>
              <span v-if="book.categoryNames?.length > 1" class="category-more">
                +{{ book.categoryNames.length - 1 }}
              </span>
            </div>
            <div class="col-status">
              <span class="status-indicator" :class="book.isActive ? 'is-active' : 'is-hidden'">
                <span class="status-dot"></span>
                {{ book.isActive ? 'Hiển thị' : 'Đã ẩn' }}
              </span>
            </div>
            <div class="col-actions">
              <button class="action-btn edit-btn" @click="openEditModal(book.id)" title="Chỉnh sửa">
                <PhPencilSimple :size="16" />
              </button>
              <button
                class="action-btn"
                :class="book.isActive ? 'hide-btn' : 'show-btn'"
                @click="toggleBookStatus(book)"
                :title="book.isActive ? 'Ẩn sách' : 'Hiển thị lại'"
              >
                <PhEyeSlash v-if="book.isActive" :size="16" />
                <PhEye v-else :size="16" />
              </button>
              <button
                class="action-btn delete-btn"
                @click="deleteBookItem(book)"
                title="Xóa sách"
              >
                <PhTrash :size="16" />
              </button>
            </div>
          </div>
        </transition-group>

        <!-- Empty State -->
        <div v-if="!isLoading && books.length === 0" class="empty-state">
          <PhBooks :size="48" weight="thin" class="empty-icon" />
          <p class="empty-title">Không tìm thấy sách</p>
          <p class="empty-desc">{{ errorMessage || 'Thử thay đổi bộ lọc hoặc thêm sách mới.' }}</p>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="books.length > 0" class="pagination">
      <span class="page-info">
        Trang <strong>{{ currentPage + 1 }}</strong> / {{ totalPages }}
      </span>
      <div class="page-buttons">
        <button class="page-btn" :disabled="currentPage === 0 || isLoading" @click="changePage(currentPage - 1)">
          <PhCaretLeft :size="16" />
        </button>
        <button
          v-for="page in visiblePageNumbers"
          :key="page"
          class="page-btn"
          :class="{ 'page-btn--active': page === currentPage }"
          :disabled="isLoading"
          @click="changePage(page)"
        >
          {{ page + 1 }}
        </button>
        <button class="page-btn" :disabled="currentPage + 1 >= totalPages || isLoading" @click="changePage(currentPage + 1)">
          <PhCaretRight :size="16" />
        </button>
      </div>
    </div>

    <!-- Modal -->
    <teleport to="body">
      <transition name="modal-fade">
        <div v-if="isModalOpen" class="modal-backdrop" @click.self="closeModal">
          <section class="book-modal" role="dialog" aria-modal="true" :aria-label="modalTitle">
            <header class="modal-header">
              <div class="modal-header-left">
                <div class="modal-icon">
                  <PhPlus v-if="!editingBookId" :size="20" />
                  <PhPencilSimple v-else :size="20" />
                </div>
                <div>
                  <h3>{{ modalTitle }}</h3>
                  <p>Thông tin có dấu * là bắt buộc.</p>
                </div>
              </div>
              <button class="modal-close-btn" type="button" title="Đóng" @click="closeModal">
                <PhX :size="20" />
              </button>
            </header>

            <form class="book-form" @submit.prevent="saveBook">
              <!-- Section 1: Thông tin cơ bản -->
              <div class="form-section">
                <h4 class="form-section-title">1. Thông tin cơ bản</h4>
                <div class="form-grid">
                  <label class="form-field">
                    <span class="field-label">Tên sách <span class="required">*</span></span>
                    <input v-model="form.title" required maxlength="255" placeholder="Nhập tên sách..." />
                  </label>

                  <label class="form-field">
                    <span class="field-label">Đường dẫn SEO (Slug) <span class="required">*</span></span>
                    <input v-model="form.slug" required maxlength="255" placeholder="ten-sach-khong-dau" />
                  </label>

                  <label class="form-field full-span">
                    <span class="field-label">Mô tả sách</span>
                    <textarea v-model="form.description" rows="3" placeholder="Tóm tắt nội dung sách, điểm nổi bật..."></textarea>
                  </label>

                  <label class="form-field">
                    <span class="field-label">Nhà xuất bản <span class="required">*</span></span>
                    <select v-model="form.publisherId" required>
                      <option disabled value="">Chọn nhà xuất bản</option>
                      <option v-for="publisher in formOptions.publishers" :key="publisher.id" :value="String(publisher.id)">{{ publisher.name }}</option>
                    </select>
                  </label>

                  <label class="form-field">
                    <span class="field-label">Trạng thái hiển thị</span>
                    <select v-model="form.isActive">
                      <option :value="true">Đang hiển thị</option>
                      <option :value="false">Đã ẩn</option>
                    </select>
                  </label>
                </div>
              </div>

              <!-- Section 2: Tác giả & Thể loại -->
              <div class="form-section">
                <h4 class="form-section-title">2. Phân loại & Tác giả</h4>
                <div class="form-grid">
                  <label class="form-field">
                    <span class="field-label">Tác giả <span class="required">*</span></span>
                    <select v-model="form.authorIds" multiple required class="multi-select">
                      <option v-for="author in formOptions.authors" :key="author.id" :value="String(author.id)">{{ author.name }}</option>
                    </select>
                    <small class="field-hint">💡 Giữ Ctrl (Windows) hoặc Cmd (Mac) để chọn nhiều tác giả.</small>
                  </label>

                  <label class="form-field">
                    <span class="field-label">Thể loại <span class="required">*</span></span>
                    <select v-model="form.categoryIds" multiple required class="multi-select">
                      <option v-for="category in formOptions.categories" :key="category.id" :value="String(category.id)">{{ category.name }}</option>
                    </select>
                    <small class="field-hint">💡 Giữ Ctrl (Windows) hoặc Cmd (Mac) để chọn nhiều thể loại.</small>
                  </label>
                </div>
              </div>

              <!-- Section 3: Giá bán Ebook -->
              <div class="form-section">
                <h4 class="form-section-title">3. Giá bán Ebook</h4>
                <div class="form-grid">
                  <label class="form-field">
                    <span class="field-label">Giá bán khuyến mãi (VNĐ)</span>
                    <input type="text" v-model="displayEbookSalePrice" placeholder="VD: 99.000" />
                    <small v-if="form.ebookSalePrice" class="field-hint price-hint">
                      💰 Hiển thị: <strong>{{ formatVndDisplay(form.ebookSalePrice) }}</strong>
                    </small>
                  </label>

                  <label class="form-field">
                    <span class="field-label">Giá gốc niêm yết (VNĐ)</span>
                    <input type="text" v-model="displayEbookOriginalPrice" placeholder="VD: 129.000" />
                    <small v-if="form.ebookOriginalPrice" class="field-hint price-hint">
                      💰 Hiển thị: <strong>{{ formatVndDisplay(form.ebookOriginalPrice) }}</strong>
                    </small>
                  </label>
                </div>
              </div>

              <!-- Section 4: File & Bìa sách -->
              <div class="form-section">
                <h4 class="form-section-title">4. Tệp tin & Ảnh bìa</h4>
                <div class="form-grid">
                  <!-- PDF Upload -->
                  <label class="form-field full-span upload-field">
                    <span class="field-label">
                      <PhFileText :size="16" />
                      File PDF Ebook {{ editingBookId ? '(tùy chọn)' : '' }}
                    </span>
                    <div class="upload-zone" :class="{ 'has-file': pdfFileName }">
                      <PhUploadSimple :size="22" class="upload-icon" />
                      <span v-if="pdfFileName" class="existing-file-text">
                        📄 <strong>File PDF hiện có:</strong> {{ pdfFileName }}
                        <br /><small class="change-hint">(Nhấn hoặc kéo thả file mới để thay thế)</small>
                      </span>
                      <span v-else>Kéo thả hoặc nhấn để chọn file PDF Ebook</span>
                      <input type="file" accept="application/pdf" @change="handlePdfChange" />
                    </div>
                  </label>

                  <!-- Cover Upload -->
                  <label class="form-field full-span upload-field">
                    <span class="field-label">
                      <PhImage :size="16" />
                      Ảnh bìa {{ editingBookId ? '(tùy chọn)' : '' }}
                    </span>
                    <div class="upload-zone" :class="{ 'has-file': coverPreview }">
                      <PhUploadSimple :size="22" class="upload-icon" />
                      <span v-if="coverPreview" class="existing-file-text">
                        🖼️ <strong>Ảnh bìa đã chọn / có trong hệ thống</strong>
                        <br /><small class="change-hint">(Nhấn hoặc kéo thả ảnh mới để thay thế)</small>
                      </span>
                      <span v-else>Format JPG, PNG hoặc WebP – Kéo thả hoặc nhấn để chọn</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" @change="handleCoverChange" />
                    </div>
                  </label>

                  <div v-if="coverPreview" class="cover-preview-wrap full-span">
                    <div class="preview-badge-box">
                      <img class="cover-preview" :src="coverPreview" alt="Xem trước ảnh bìa" />
                      <span class="preview-label">Xem trước ảnh bìa</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sticky Modal Actions Toolbar -->
              <div class="modal-actions-sticky">
                <button class="cancel-btn" type="button" :disabled="isSaving" @click="closeModal">Hủy</button>
                <button class="submit-btn" type="submit" :disabled="isSaving">
                  <span v-if="isSaving" class="btn-spinner"></span>
                  {{ isSaving ? 'Đang lưu…' : editingBookId ? 'Lưu thay đổi' : 'Tạo sách mới' }}
                </button>
              </div>
            </form>
          </section>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<style scoped>
/* ─── Base ─── */
.admin-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem;
}

/* ─── Header ─── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-header h2 {
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
  color: var(--text-main);
}

.header-subtitle {
  color: var(--text-muted);
  margin: 0.25rem 0 0 0;
  font-size: 0.95rem;
  font-weight: 400;
}

.total-count {
  font-weight: 700;
  color: var(--text-main);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--text-main, #09090b);
  color: #fff;
  border: none;
  padding: 0.75rem 1.4rem;
  border-radius: 0.875rem;
  font-weight: 600;
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 14px -3px rgba(0, 0, 0, 0.15);
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.22);
}

.primary-btn:active {
  transform: scale(0.97);
}

/* ─── Stats Row ─── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.15rem 1.4rem;
  background: var(--bento-surface, #fff);
  border: 1px solid var(--bento-border, rgba(226, 232, 240, 0.8));
  border-radius: 1.25rem;
  transition: all 0.25s ease;
}

.stat-card:hover {
  box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 0.875rem;
  display: grid;
  place-items: center;
  background: #f4f4f5;
  color: #52525b;
  flex-shrink: 0;
}

.stat-icon.active {
  background: #ecfdf5;
  color: #059669;
}

.stat-icon.hidden-icon {
  background: #fffbeb;
  color: #d97706;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
  color: var(--text-main, #09090b);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-muted, #71717a);
  font-weight: 500;
  margin-top: 0.15rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

/* ─── Toolbar ─── */
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 240px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.search-box input {
  width: 100%;
  padding: 0.7rem 1rem 0.7rem 2.6rem;
  border: 1px solid var(--bento-border, rgba(226, 232, 240, 0.8));
  border-radius: 0.875rem;
  background: var(--bento-surface, #fff);
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--text-main);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.search-box input:focus {
  border-color: #a1a1aa;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
}

.filter-select {
  padding: 0.7rem 1rem;
  border: 1px solid var(--bento-border, rgba(226, 232, 240, 0.8));
  border-radius: 0.875rem;
  background: var(--bento-surface, #fff);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-main);
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2371717a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.85rem center;
  padding-right: 2.25rem;
}

.filter-select:hover {
  border-color: #d4d4d8;
}

.filter-select:focus {
  border-color: #a1a1aa;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
}

/* ─── Feedback Toasts ─── */
.feedback-toast {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1.25rem;
  border-radius: 0.875rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.success-toast {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.error-toast {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.msg-fade-enter-active,
.msg-fade-leave-active {
  transition: all 0.3s ease;
}
.msg-fade-enter-from,
.msg-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ─── Book List ─── */
.list-container {
  background: var(--bento-surface, #fff);
  border: 1px solid var(--bento-border, rgba(226, 232, 240, 0.8));
  border-radius: 1.25rem;
  overflow: hidden;
}

.list-header-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1.5rem;
  background: #fafafa;
  border-bottom: 1px solid var(--bento-border, rgba(226, 232, 240, 0.8));
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted, #71717a);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.list-body {
  display: flex;
  flex-direction: column;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
  transition: background 0.2s ease;
}

.list-row:last-child {
  border-bottom: none;
}

.list-row:hover {
  background: #fafbfc;
}

/* Column widths */
.col-cover { width: 60px; flex-shrink: 0; }
.col-title { flex: 2.5; min-width: 0; }
.col-author { flex: 2; min-width: 0; }
.col-category { flex: 1.5; min-width: 0; }
.col-status { width: 110px; flex-shrink: 0; }
.col-actions { width: 90px; flex-shrink: 0; display: flex; justify-content: flex-end; gap: 0.35rem; }

/* Book Cover */
.book-cover {
  width: 48px;
  height: 66px;
  min-height: 66px !important;
  max-height: 66px !important;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 0.5rem;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    3px 3px 8px -3px rgba(15, 23, 42, 0.15),
    -1px 0 3px -1px rgba(15, 23, 42, 0.06);
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.list-row:hover .book-cover img {
  transform: scale(1.06);
}

.book-cover--missing {
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
}

.book-cover-fallback {
  position: static !important;
  top: auto !important;
  left: auto !important;
  inset: auto !important;
  padding: 0 !important;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  color: #64748b;
  background: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
  font-weight: 800;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

/* Book Info */
.book-title {
  display: block;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main, #09090b);
  margin-bottom: 0.2rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.book-id {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: var(--text-muted, #71717a);
  font-size: 0.75rem;
  font-weight: 500;
}

.author-names {
  color: var(--text-muted, #71717a);
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

/* Category Chips */
.category-chip {
  display: inline-block;
  background: #f4f4f5;
  color: #52525b;
  padding: 0.2rem 0.6rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.category-more {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  margin-left: 0.3rem;
}

/* Status Indicator */
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
  border-radius: 99px;
}

.status-indicator.is-active {
  color: #059669;
  background: #ecfdf5;
}

.status-indicator.is-hidden {
  color: #d97706;
  background: #fffbeb;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.is-active .status-dot {
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
}

.is-hidden .status-dot {
  background: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);
}

/* Action Buttons */
.action-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 0.625rem;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: transparent;
  color: var(--text-muted, #71717a);
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f4f4f5;
  color: var(--text-main);
}

.edit-btn:hover {
  background: #eff6ff;
  color: #3b82f6;
}

.hide-btn:hover {
  background: #fef2f2;
  color: #ef4444;
}

.show-btn:hover {
  background: #f0fdf4;
  color: #16a34a;
}

.delete-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

.action-btn:active {
  transform: scale(0.9);
}

/* List Animations */
.list-anim-enter-active,
.list-anim-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.list-anim-enter-from,
.list-anim-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3.5rem 2rem;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e4e4e7;
  border-top-color: #18181b;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  color: #d4d4d8;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 0.3rem 0;
}

.empty-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
}

/* ─── Pagination ─── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.page-info {
  font-size: 0.875rem;
  color: var(--text-muted);
  font-weight: 500;
}

.page-info strong {
  color: var(--text-main);
}

.page-buttons {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--bento-border, rgba(226, 232, 240, 0.8));
  border-radius: 0.625rem;
  background: var(--bento-surface, #fff);
  color: var(--text-main);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0 0.5rem;
}

.page-btn:hover:not(:disabled) {
  background: #f4f4f5;
  border-color: #d4d4d8;
}

.page-btn--active {
  background: var(--text-main, #09090b) !important;
  color: #fff !important;
  border-color: var(--text-main, #09090b) !important;
}

.page-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

/* ─── Modal & Form High-Craft Redesign ─── */
.modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: rgba(9, 9, 11, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.book-modal {
  width: min(720px, 100%);
  max-height: calc(100dvh - 3rem);
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 1.25rem;
  background: #ffffff;
  box-shadow: 0 30px 90px -20px rgba(0, 0, 0, 0.25), 0 10px 30px -10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
}

.modal-header-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.modal-icon {
  width: 44px;
  height: 44px;
  border-radius: 0.875rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: grid;
  place-items: center;
  color: #0f172a;
  flex-shrink: 0;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.025em;
}

.modal-header p {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0.2rem 0 0 0;
}

.modal-close-btn {
  width: 34px;
  height: 34px;
  border: 1px solid transparent;
  border-radius: 0.625rem;
  background: transparent;
  color: #64748b;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.18s ease;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #e2e8f0;
}

/* Form Sections */
.book-form {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 1.5rem 1.75rem 0;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px dashed #e2e8f0;
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0.5rem;
}

.form-section-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem 1.25rem;
}

.full-span {
  grid-column: 1 / -1;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: #334155;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.required {
  color: #ef4444;
}

.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 0.625rem;
  background: #ffffff;
  padding: 0.65rem 0.85rem;
  color: #0f172a;
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.multi-select {
  min-height: 7.5rem;
  padding: 0.5rem !important;
}

.multi-select option {
  padding: 0.4rem 0.6rem;
  border-radius: 0.375rem;
  margin-bottom: 2px;
}

.field-hint {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.4;
}

.price-hint {
  color: #059669;
  font-weight: 500;
}

/* Upload Zone */
.upload-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 1.35rem;
  border: 2px dashed #cbd5e1;
  border-radius: 0.875rem;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-zone:hover {
  border-color: #0f172a;
  background: #f1f5f9;
  color: #0f172a;
}

.upload-zone.has-file {
  background: #f0fdf4;
  border-color: #22c55e;
  border-style: solid;
}

.existing-file-text {
  text-align: center;
  color: #15803d;
  font-size: 0.85rem;
}

.change-hint {
  color: #16a34a;
  font-size: 0.78rem;
}

.upload-zone.has-file .upload-icon {
  color: #22c55e;
}

.upload-zone input[type="file"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.upload-icon {
  color: #94a3b8;
  transition: transform 0.2s ease;
}

.upload-zone:hover .upload-icon {
  transform: translateY(-2px);
  color: #0f172a;
}

/* Cover Preview Box */
.cover-preview-wrap {
  display: flex;
  margin-top: 0.25rem;
}

.preview-badge-box {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.cover-preview {
  width: 70px;
  height: 96px;
  border-radius: 0.5rem;
  object-fit: cover;
  border: 1px solid #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.preview-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: #334155;
}

/* Sticky Modal Actions Toolbar */
.modal-actions-sticky {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 0 1.5rem;
  margin-top: 1rem;
  background: #ffffff;
  border-top: 1px solid #f1f5f9;
}

.cancel-btn {
  padding: 0.65rem 1.35rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.625rem;
  background: #ffffff;
  color: #334155;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.cancel-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #94a3b8;
}

.submit-btn {
  padding: 0.65rem 1.6rem;
  border: none;
  border-radius: 0.625rem;
  background: #0f172a;
  color: #ffffff;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.18s ease;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

.submit-btn:hover {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);
}

.submit-btn:active {
  transform: translateY(0) scale(0.98);
}

.submit-btn:disabled,
.cancel-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  transform: none;
}

/* Modal Animation */
.modal-fade-enter-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-active .book-modal {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
}
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-leave-active .book-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-fade-enter-from {
  opacity: 0;
}
.modal-fade-enter-from .book-modal {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
}
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-leave-to .book-modal {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

/* ─── Responsive ─── */
@media (max-width: 900px) {
  .col-category {
    display: none;
  }
  .list-header-row .col-category {
    display: none;
  }
}

@media (max-width: 720px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .primary-btn {
    justify-content: center;
  }

  .stats-row {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
  }

  .search-box {
    min-width: unset;
    width: 100%;
  }

  .filter-actions {
    width: 100%;
  }

  .filter-select {
    flex: 1;
  }

  .list-header-row {
    display: none;
  }

  .list-row {
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
  }

  .col-cover { width: 48px; }
  .col-title { flex: 1; min-width: calc(100% - 64px); }
  .col-author { flex: 1 1 100%; font-size: 0.85rem; }
  .col-status { width: auto; }
  .col-actions {
    width: auto;
    margin-left: auto;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .pagination {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>
