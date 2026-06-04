<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UserDropdown from './UserDropdown.vue'
import { getBooks } from '../services/api'
import { authUser } from '../stores/auth'

const router = useRouter()
const books = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

const navItems = [
  { label: 'Home', sectionId: 'home' },
  { label: 'Library', to: '/library' },
  { label: 'Latest', sectionId: 'latest-books' },
]

const isSignedIn = computed(() => Boolean(authUser.value))

const latestBooks = computed(() =>
  [...books.value]
    .sort((left, right) => getBookTimestamp(right) - getBookTimestamp(left))
    .slice(0, 4)
    .map((book) => ({
      ...book,
      initials: getInitials(book.title),
      publisherName: book.publisherName || 'Book Area',
      summary: summarizeDescription(book.description),
    })),
)

async function loadBooks() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const payload = await getBooks()
    books.value = Array.isArray(payload) ? payload : []
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not load books.'
  } finally {
    isLoading.value = false
  }
}

function getBookTimestamp(book) {
  const timestamp = Date.parse(book?.createdAt ?? '')
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getInitials(title) {
  if (!title) {
    return 'BA'
  }

  return title
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
}

function summarizeDescription(description) {
  if (!description) {
    return 'Newly added books will appear here.'
  }

  const words = description.trim().split(/\s+/)

  if (words.length <= 18) {
    return description.trim()
  }

  return `${words.slice(0, 18).join(' ')}...`
}

function openBook(book) {
  if (book.pdfUrl) {
    window.open(book.pdfUrl, '_blank', 'noopener,noreferrer')
  }
}

function scrollToSection(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function handleNavClick(item) {
  if (item.to) {
    router.push(item.to)
    return
  }

  scrollToSection(item.sectionId)
}

function goToLibrary() {
  router.push('/library')
}

onMounted(loadBooks)
</script>

<template>
  <div class="page-shell">
    <header class="topbar">
      <div class="topbar-side topbar-side-left">
        <button class="brand" type="button" aria-label="BOOK AREA home" @click="scrollToSection('home')">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 96 96" role="presentation">
              <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                <path d="M24 73V36c0-13.25 10.75-24 24-24s24 10.75 24 24v37" stroke-width="1.8" />
                <path d="M24 73c9.4-2.4 16.45-2.73 24 3.75" stroke-width="1.8" />
                <path d="M72 73c-9.4-2.4-16.45-2.73-24 3.75" stroke-width="1.8" />
                <path d="M18 84l6-11h48l6 11c-10.4-2.1-19.15-2.3-30 4-10.85-6.3-19.6-6.1-30-4Z" stroke-width="1.8" />
                <path d="M48 76v11" stroke-width="1.6" />
                <path d="M27 79c9.2-1.65 14.6-1.05 21 3" stroke-width="1.5" />
                <path d="M69 79c-9.2-1.65-14.6-1.05-21 3" stroke-width="1.5" />
                <path d="M36 44v22" stroke-width="1.5" />
                <path d="M40 47v18" stroke-width="1.5" />
                <path d="M44 50v15" stroke-width="1.5" />
                <path d="M60 44v22" stroke-width="1.5" />
                <path d="M56 47v18" stroke-width="1.5" />
                <path d="M52 50v15" stroke-width="1.5" />
                <path d="M34 40l10 8" stroke-width="1.3" />
                <path d="M62 40l-10 8" stroke-width="1.3" />
              </g>
              <circle cx="48" cy="42" r="7" fill="currentColor" opacity="0.92" />
              <path d="M48 49.5l7 10.5H41z" fill="currentColor" opacity="0.22" />
              <g fill="currentColor">
                <path d="M48 25l1.6 2.8 2.8 1.6-2.8 1.6-1.6 2.8-1.6-2.8-2.8-1.6 2.8-1.6z" />
                <path d="M59 31l1 1.7 1.7 1-1.7 1-1 1.7-1-1.7-1.7-1 1.7-1z" />
                <path d="M37 33l1 1.7 1.7 1-1.7 1-1 1.7-1-1.7-1.7-1 1.7-1z" />
              </g>
            </svg>
          </span>
          <span class="brand-wordmark">BOOK AREA</span>
        </button>
      </div>

      <nav class="topbar-nav" aria-label="Primary">
        <button
          v-for="item in navItems"
          :key="item.label"
          type="button"
          @click="handleNavClick(item)"
        >
          {{ item.label }}
        </button>
      </nav>

      <div class="topbar-side topbar-side-right">
        <template v-if="!isSignedIn">
          <RouterLink class="topbar-utility" to="/login">Login</RouterLink>
        </template>

        <template v-else>
          <UserDropdown />
        </template>
      </div>
    </header>

    <main class="homepage">
      <section id="home" class="hero">
        <div class="hero-media" aria-hidden="true"></div>
        <div class="hero-rail" aria-hidden="true">
          <span class="hero-rail-line"></span>
          <p>quiet shelves, lasting stories</p>
          <span class="hero-rail-mark"></span>
        </div>

        <div class="hero-inner">
          <div class="hero-copy">
            <p class="eyebrow">BOOK AREA</p>
            <h1 class="hero-headline">
              <span>READ</span>
              <span>STORIES</span>
              <span>BEYOND</span>
              <span>TIME</span>
            </h1>
            <p class="hero-text">
              A quiet digital library for timeless books, thoughtful reading, and literary discovery.
            </p>

            <div class="hero-actions">
              <button class="button button-primary" type="button" @click="goToLibrary">
                Start Reading
              </button>
              <button class="button button-secondary" type="button" @click="goToLibrary">
                Explore Library
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="latest-books" class="content-section latest-section">
        <div class="section-heading">
          <div class="section-mark">
            <span>02</span>
          </div>
          <div>
            <p class="eyebrow">Newly updated books</p>
            <h2>Fresh books from the live catalog.</h2>
          </div>
        </div>

        <div v-if="isLoading" class="section-empty">Loading the latest books...</div>

        <div v-else-if="errorMessage" class="section-empty section-empty-action">
          <span>Could not load the latest books: {{ errorMessage }}</span>
          <button type="button" @click="loadBooks">Try again</button>
        </div>

        <div v-else-if="latestBooks.length === 0" class="section-empty">
          No books have been added yet.
        </div>

        <div v-else class="latest-grid">
          <article v-for="book in latestBooks" :key="book.id ?? book.title" class="latest-book">
            <div class="latest-cover">
              <img v-if="book.coverUrl" :src="book.coverUrl" :alt="`Cover of ${book.title}`" loading="lazy" />
              <strong v-else>{{ book.initials }}</strong>
            </div>

            <div class="latest-copy">
              <p class="latest-meta">{{ book.publisherName }}</p>
              <h3>{{ book.title }}</h3>
              <p>{{ book.summary }}</p>
            </div>

            <div class="latest-action">
              <button
                class="button button-secondary latest-button"
                type="button"
                :disabled="!book.pdfUrl"
                @click="openBook(book)"
              >
                {{ book.pdfUrl ? 'Đọc sách' : 'Chưa có PDF' }}
              </button>
            </div>
          </article>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="site-footer-main">
        <div class="site-footer-brand">
          <h2>BOOK AREA</h2>
          <p>
            Một góc thư viện số dành cho những cuốn sách yên tĩnh, những lần đọc chậm,
            và những câu chuyện còn ở lại.
          </p>
        </div>

        <nav class="site-footer-nav" aria-label="Khám phá">
          <h3>Khám phá</h3>
          <button type="button" @click="scrollToSection('home')">Home</button>
          <button type="button" @click="goToLibrary">Library</button>
          <button type="button" @click="scrollToSection('latest-books')">Latest</button>
          <RouterLink to="/login">Login</RouterLink>
        </nav>

        <div class="site-footer-project">
          <h3>Dự án</h3>
          <p class="site-footer-stack">Spring Boot &middot; Vue &middot; SQL Server &middot; MinIO</p>
          <p>
            Lưu trữ PDF và ảnh bìa bằng MinIO, quản lý dữ liệu sách bằng SQL Server.
          </p>
        </div>
      </div>

      <p class="site-footer-bottom">&copy; 2026 Book Area. Made for quiet readers.</p>
    </footer>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
}

.hero-inner {
  width: 100%;
  max-width: none;
  margin: 0;
  grid-template-columns: minmax(0, 34rem) 1fr;
  padding-left: clamp(90px, 7vw, 130px);
}

.hero-rail {
  display: grid;
  position: absolute;
  left: clamp(10px, 1vw, 20px);
  top: 50%;
  z-index: 3;
  transform: translateY(-50%);
}

.hero-text {
  margin-top: clamp(18px, 2vw, 28px);
}

.hero-actions {
  margin-top: clamp(22px, 2.5vw, 34px);
}

@media (max-width: 768px) {
  .hero-inner {
    grid-template-columns: 1fr;
    padding-left: 24px;
    padding-right: 24px;
  }

  .hero-rail {
    display: none;
  }
}

.site-footer {
  width: min(100%, var(--content-width));
  margin: clamp(3rem, 6vw, 5.5rem) auto 0;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--line-soft) 78%, white);
  border-radius: 8px;
  background:
    linear-gradient(135deg, oklch(0.97 0.012 78), oklch(0.91 0.026 72));
  color: var(--text);
  box-shadow: 0 22px 70px color-mix(in oklab, var(--accent-deep) 10%, transparent);
}

.site-footer-main {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(8rem, 0.55fr) minmax(0, 1fr);
  gap: clamp(1.6rem, 4vw, 4rem);
  padding: clamp(1.5rem, 4vw, 3rem);
}

.site-footer-brand,
.site-footer-project,
.site-footer-nav {
  min-width: 0;
}

.site-footer h2,
.site-footer h3,
.site-footer p {
  margin: 0;
}

.site-footer h2 {
  color: var(--text-strong);
  font-family: 'Raleway', 'Segoe UI', sans-serif;
  font-size: clamp(1.65rem, 3vw, 3rem);
  font-weight: 300;
  line-height: 0.98;
  letter-spacing: 0.18em;
}

.site-footer h3 {
  margin-bottom: 0.85rem;
  color: var(--text-strong);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.site-footer-brand p,
.site-footer-project p {
  max-width: 44rem;
  margin-top: 1rem;
  color: var(--text);
  font-size: 0.98rem;
  line-height: 1.72;
}

.site-footer-nav {
  display: grid;
  align-content: start;
  gap: 0.5rem;
}

.site-footer-nav button,
.site-footer-nav a {
  width: max-content;
  max-width: 100%;
  color: var(--text-soft);
  font-size: 0.95rem;
  line-height: 1.5;
  transition:
    color 180ms ease-out,
    transform 180ms ease-out;
}

.site-footer-nav button:hover,
.site-footer-nav a:hover {
  color: var(--accent-deep);
  transform: translateX(3px);
}

.site-footer-stack {
  color: var(--text-strong);
  font-weight: 700;
}

.site-footer-bottom {
  padding: 1rem clamp(1.5rem, 4vw, 3rem);
  border-top: 1px solid color-mix(in oklab, var(--line-soft) 72%, white);
  background: color-mix(in oklab, var(--surface-soft) 62%, transparent);
  color: var(--text-soft);
  font-size: 0.9rem;
}

@media (max-width: 820px) {
  .site-footer-main {
    grid-template-columns: 1fr;
  }

  .site-footer-brand p,
  .site-footer-project p {
    max-width: 100%;
  }
}

@media (max-width: 520px) {
  .site-footer {
    margin-top: 2.5rem;
  }

  .site-footer h2 {
    font-size: clamp(1.35rem, 9vw, 2rem);
    line-height: 1.08;
  }

  .site-footer-nav {
    gap: 0.65rem;
  }
}

.latest-section {
  width: min(100%, var(--content-width));
  margin: 0 auto;
  display: grid;
  gap: 1.35rem;
}

.latest-grid {
  display: grid;
  gap: 0.9rem;
}

.latest-book {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 0.9rem 1rem;
  border: 1px solid color-mix(in oklab, var(--line-soft) 82%, white);
  border-radius: 8px;
  background: color-mix(in oklab, var(--surface) 90%, transparent);
  box-shadow: var(--shadow-soft);
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 220ms ease-out,
    box-shadow 220ms ease-out;
}

.latest-book:hover {
  transform: translateY(-3px);
  border-color: color-mix(in oklab, var(--line-strong) 72%, white);
  box-shadow: 0 22px 56px color-mix(in oklab, var(--accent-deep) 12%, transparent);
}

.latest-cover {
  position: relative;
  min-height: 9.4rem;
  overflow: hidden;
  border-radius: 6px;
  background: linear-gradient(160deg, oklch(0.92 0.02 88), oklch(0.66 0.05 62) 50%, oklch(0.3 0.03 45));
  box-shadow: inset 0 0 0 1px rgba(255, 245, 225, 0.22);
}

.latest-cover::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(34, 22, 15, 0.18), transparent 18%),
    repeating-linear-gradient(0deg, rgba(255, 248, 229, 0.08) 0 1px, transparent 1px 13px);
}

.latest-cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.latest-cover strong {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(255, 246, 225, 0.9);
  font-family: 'Prata', Georgia, serif;
  font-size: clamp(1.8rem, 3.8vw, 3rem);
  font-weight: 400;
}

.latest-copy {
  display: grid;
  gap: 0.65rem;
}

.latest-meta {
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.latest-copy h3 {
  color: var(--text-strong);
  font-size: clamp(1.25rem, 1.9vw, 1.85rem);
  line-height: 1.08;
}

.latest-copy p:last-child {
  max-width: 58ch;
}

.latest-action {
  display: flex;
  align-items: flex-end;
}

.latest-button {
  min-width: 9rem;
}

.latest-button:disabled {
  opacity: 0.58;
}

.section-empty {
  padding: 1.25rem;
  border: 1px solid color-mix(in oklab, var(--line-soft) 82%, white);
  border-radius: 8px;
  background: color-mix(in oklab, var(--surface) 82%, transparent);
  color: var(--text-soft);
}

.section-empty-action {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  align-items: center;
  justify-content: space-between;
}

.section-empty-action button {
  min-height: 2.4rem;
  padding: 0 0.9rem;
  border: 1px solid color-mix(in oklab, var(--accent-deep) 34%, white);
  border-radius: 8px;
  background: color-mix(in oklab, var(--accent-glow) 54%, white);
  color: var(--text-strong);
  font-weight: 700;
}

@media (max-width: 980px) {
  .latest-book {
    grid-template-columns: 7rem minmax(0, 1fr);
    align-items: start;
  }

  .latest-action {
    grid-column: 1 / -1;
    display: block;
  }
}

@media (max-width: 720px) {
  .latest-book {
    grid-template-columns: 5.8rem minmax(0, 1fr);
    padding: 0.8rem;
  }

  .latest-cover {
    min-height: 8.2rem;
  }

  .latest-button {
    width: 100%;
  }
}
</style>
