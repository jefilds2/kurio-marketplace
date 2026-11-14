import { expect, test } from '@playwright/test'

test('referências visuais de início, detalhe, carrinho e pagamento', async ({ page }, info) => {
  await page.goto('/')
  await expect(page.getByRole('status').filter({ hasText: '20 NFTs' })).toBeVisible()
  await expect(page).toHaveScreenshot('inicio.png')
  await page.goto('/nfts/nft-01')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page).toHaveScreenshot('detalhe.png')
  const mobile = info.project.name === 'mobile'
  const aviso = page.getByText('NFT adicionado ao carrinho.')
  await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click()
  await expect(aviso).toBeVisible()
  if (mobile) {
    await page.getByRole('button', { name: 'Comprar NFT', exact: true }).click()
    await expect(page).toHaveURL('/carrinho')
  } else await page.goto('/carrinho')
  await expect(page.getByText('1.206 ETH', { exact: true }).first()).toBeVisible()
  await expect(aviso).toBeHidden({ timeout: 8_000 })
  await expect(page).toHaveScreenshot('carrinho.png')
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await page.locator('#login-email').fill('ana@kurio.test')
  await page.locator('#login-senha').fill('Kurio123!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.locator('#pagina-pagamentos')).toBeVisible()
  await expect(page.locator('#pagamentos-confirmar')).toBeEnabled()
  await expect(page).toHaveScreenshot('pagamento.png')
})
