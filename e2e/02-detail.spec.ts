import { expect, test } from './fixtures'

// Brief §9.2 — direct access to the detail and unknown resources.

test('direct access renders the NFT, editions and quantity limit', async ({ page }) => {
  await page.goto('/nfts/emerald-ape-042?edicao=1-10')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page).toHaveTitle(/Emerald Ape #042/)
  await expect(page.getByRole('radio', { name: /1\/10/ })).toBeChecked()

  // 1/10 edition: maxPerOrder 5 → the stepper stops at 5.
  const stepper = page.getByRole('group', { name: 'Quantidade de Emerald Ape #042' }).locator('visible=true').first()
  const plus = stepper.getByRole('button', { name: 'Aumentar quantidade' })
  for (let i = 0; i < 6; i++) if (await plus.isEnabled()) await plus.click()
  await expect(plus).toBeDisabled()
  await expect(page).toHaveURL(/qtd=5/)
})

test('a quantity above the limit in the URL is clamped', async ({ page }) => {
  await page.goto('/nfts/emerald-ape-042?edicao=1-10&qtd=99')
  await expect(page.getByText(/limite|máximo/i).first()).toBeVisible()
})

test('a sold-out edition cannot be chosen or bought', async ({ page, mocks }) => {
  await page.goto('/nfts/sage-nomad-009')
  await mocks.emit({ kind: 'nft-stock', nftId: 'sage-nomad-009', editionId: 'sage-nomad-009--1-10', available: 0 })
  await expect(page.getByRole('radio', { name: /1\/10\s*, esgotada/ })).toBeDisabled()
  await page.goto('/nfts/sage-nomad-009?edicao=1-10')
  await expect(page.getByText('Esta edição está esgotada. Escolha outra edição.')).toBeVisible()
})

test('an unknown NFT shows "NFT não encontrado"', async ({ page }) => {
  await page.goto('/nfts/nao-existe-999')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  await expect(page).toHaveTitle('NFT não encontrado — Kurio')
})

test('an unknown route shows the 404 page', async ({ page }) => {
  await page.goto('/rota-que-nao-existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
})
