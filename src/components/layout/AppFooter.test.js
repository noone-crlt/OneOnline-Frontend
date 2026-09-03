import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppFooter from './AppFooter.vue'

const mountFooter = () => mount(AppFooter, {
  global: {
    stubs: {
      RouterLink: {
        template: '<a><slot /></a>',
      },
    },
  },
})

describe('AppFooter', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('hiển thị địa chỉ email hỗ trợ', () => {
    const wrapper = mountFooter()

    expect(wrapper.get('a[href="mailto:support@oneonline.vn"]').text())
      .toContain('support@oneonline.vn')
  })

  it('cuộn đến khu vực sách mới nhất khi khu vực này tồn tại', async () => {
    const latestBooks = document.createElement('section')
    latestBooks.id = 'latest-books'
    latestBooks.scrollIntoView = vi.fn()
    document.body.appendChild(latestBooks)

    const wrapper = mountFooter()
    await wrapper.get('a[href="/#/latest-books"]').trigger('click')

    expect(latestBooks.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })
})
