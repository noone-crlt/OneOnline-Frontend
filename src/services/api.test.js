import { afterEach, describe, expect, it, vi } from 'vitest'

describe('API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('gọi API cùng origin khi không cấu hình URL backend riêng', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { getBooks } = await import('./api')
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ content: [] }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    ))
    vi.stubGlobal('fetch', fetchMock)

    await getBooks()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/books?page=0&size=100',
      expect.objectContaining({
        headers: expect.any(Headers),
        body: undefined,
      }),
    )
  })
})
