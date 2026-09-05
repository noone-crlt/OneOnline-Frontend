import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import Homepage from './Homepage.vue'
import { addCartItem, getBookCatalog, getFeaturedCategories } from '../services/api'
import { authUser } from '../stores/auth'
import { cartItemCount, updateCartItemCount } from '../stores/cart'
import { toast } from 'vue-sonner'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ fullPath: '/' }),
}))
vi.mock('../services/api', () => ({
  addCartItem: vi.fn(),
  getBooks: vi.fn(),
  getBookCatalog: vi.fn(),
  getFeaturedCategories: vi.fn(),
  getFileUrl: vi.fn(value => value),
  getCart: vi.fn(),
}))
vi.mock('../stores/auth', () => ({
  authUser: ref(null),
  authIsAuthenticated: ref(true),
}))
vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock('gsap', () => ({ default: { context: vi.fn() } }))

const book = {
  id: 7,
  title: 'Mắt Biếc',
  slug: 'mat-biec',
  editions: [{ id: 42, format: 'PHYSICAL', salePrice: 80000, stock: 5 }],
}
let wrapper

async function renderBook(value = book) {
  getBookCatalog.mockResolvedValue({ content: [value] })
  wrapper = shallowMount(Homepage)
  await flushPromises()
  return wrapper.get('.add-to-cart-btn')
}

describe('Thêm sách vào giỏ từ trang chủ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authUser.value = { id: 1 }
    updateCartItemCount(0)
    getFeaturedCategories.mockResolvedValue([])
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.unstubAllGlobals()
  })

  it('gửi ID phiên bản và cập nhật số lượng giỏ hàng sau khi API thành công', async () => {
    addCartItem.mockResolvedValue({ items: [{ quantity: 2 }, { quantity: 1 }] })
    const button = await renderBook()

    await button.trigger('click')
    await flushPromises()

    expect(addCartItem).toHaveBeenCalledExactlyOnceWith(42, 1)
    expect(cartItemCount.value).toBe(3)
    expect(toast.success).toHaveBeenCalledWith('Đã thêm sách vào giỏ hàng thành công!')
    expect(push).not.toHaveBeenCalled()
    expect(button.element.disabled).toBe(false)
  })

  it('yêu cầu đăng nhập và giữ đường dẫn quay lại', async () => {
    authUser.value = null
    const button = await renderBook()
    await button.trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'login', query: { redirect: '/' } })
    expect(addCartItem).not.toHaveBeenCalled()
  })

  it('mở chi tiết để chọn khi sách có nhiều phiên bản', async () => {
    const button = await renderBook({
      ...book,
      editions: [...book.editions, { id: 43, format: 'EBOOK_PDF', salePrice: 30000 }],
    })
    await button.trigger('click')

    expect(push).toHaveBeenCalledExactlyOnceWith('/book/mat-biec')
    expect(toast.info).toHaveBeenCalled()
    expect(addCartItem).not.toHaveBeenCalled()
  })

  it('thông báo khi sách chưa có phiên bản', async () => {
    const button = await renderBook({ ...book, editions: [] })
    await button.trigger('click')

    expect(toast.error).toHaveBeenCalledWith('Sách hiện chưa có phiên bản để thêm vào giỏ hàng.')
    expect(addCartItem).not.toHaveBeenCalled()
  })

  it('hiển thị lỗi API và không tăng giỏ hàng khi thêm thất bại', async () => {
    updateCartItemCount(2)
    addCartItem.mockRejectedValue(new Error('Số lượng sách trong kho không đủ.'))
    const button = await renderBook()
    await button.trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Số lượng sách trong kho không đủ.')
    expect(toast.success).not.toHaveBeenCalled()
    expect(cartItemCount.value).toBe(2)
    expect(button.element.disabled).toBe(false)
  })

  it('chặn bấm liên tiếp khi request chưa hoàn tất', async () => {
    let finishRequest
    addCartItem.mockReturnValue(new Promise(resolve => { finishRequest = resolve }))
    const button = await renderBook()
    await button.trigger('click')
    expect(button.element.disabled).toBe(true)
    expect(button.text()).toContain('Đang thêm…')
    await button.trigger('click')
    expect(addCartItem).toHaveBeenCalledTimes(1)

    finishRequest({ items: [{ quantity: 1 }] })
    await flushPromises()
    expect(button.element.disabled).toBe(false)
  })
})
