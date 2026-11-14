import { expect, test } from '@playwright/test'

test('rotas públicas preservam conteúdo em tablet de 768 px', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'O viewport de tablet é fixado neste teste.')
  await page.setViewportSize({ width: 768, height: 1024 })
  for (const [url, titulo] of [
    ['/', /SEJA DONO/],
    ['/nfts/nft-01', /Emerald Ape/],
    ['/carrinho', /Carrinho de NFTs/],
    ['/login', /^Entrar$/],
    ['/cadastro', /Criar perfil/],
  ] as const) {
    await page.goto(url)
    await expect(page.locator('h1').filter({ hasText: titulo })).toBeAttached()
    const medidas = await page.evaluate(() => ({ visivel: document.documentElement.clientWidth, conteudo: document.documentElement.scrollWidth }))
    expect(medidas.conteudo).toBeLessThanOrEqual(medidas.visivel)
  }
})
