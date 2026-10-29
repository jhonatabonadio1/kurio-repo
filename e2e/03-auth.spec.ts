import { addToCart, checkoutReady, expect, login, register, test, USERS, type Page } from './fixtures'

// Brief §9.3 — sign-up, login, session expiry, logout and user switch.

async function logout(page: Page) {
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Sair' }).locator('visible=true').click()
  await expect(page.getByText('Você saiu da sua conta.').first()).toBeAttached()
  await expect(page).toHaveURL('/')
}

test('sign-up validates, rejects a used e-mail and creates the account', async ({ page }) => {
  await page.goto('/register')
  await page.locator('form button[type=submit]').click()
  await expect(page.getByText(/obrigatóri|Informe|Mínimo/).first()).toBeVisible()

  await register(page, 'alice') // username and e-mail of the seed user
  await expect(page.getByText(/já está (cadastrado|em uso)/).first()).toBeVisible()
  await expect(page).toHaveURL(/\/register/)

  const name = `colecionador${test.info().workerIndex}${Date.now() % 10000}`
  await register(page, name)
  await expect(page.getByText(/Conta criada/).first()).toBeAttached()
  await expect(page).not.toHaveURL(/\/register/)

  // The session survives a refresh.
  await page.goto('/profile')
  await expect(page.getByLabel('Nome de usuário')).toHaveValue(name)
  await page.reload()
  await expect(page.getByLabel('Nome de usuário')).toHaveValue(name)
})

test.describe('register conflict scenario', () => {
  test.use({ scenario: 'register-conflict' })
  test('the API conflict shows on the field', async ({ page }) => {
    await register(page, `novo${Date.now() % 10000}`)
    await expect(page.getByText('Este e-mail já está cadastrado.').first()).toBeVisible()
  })
})

test('login shows wrong credentials and returns to the page that asked for it', async ({ page }) => {
  await page.goto('/favorites')
  await expect(page).toHaveURL(/\/login\?redirect=%2Ffavorites/)
  await page.getByLabel('E-mail').fill(USERS.alice.email)
  await page.getByLabel('Senha', { exact: true }).fill('errada123')
  await page.locator('form button[type=submit]').click()
  await expect(page.getByText('E-mail ou senha incorretos.').first()).toBeVisible()

  await login(page, 'alice', { from: '' })
  await expect(page).toHaveURL(/\/favorites$/)
})

test('session expiry while browsing: login again and continue on the same page', async ({ page, mocks }) => {
  await login(page)
  await mocks.setScenario('session-expired')
  await page.goto('/profile/wallets')
  await expect(page).toHaveURL(/\/login\?.*expired/)
  await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.')).toBeVisible()

  await mocks.setScenario('default')
  await login(page, 'alice', { from: '' })
  await expect(page).toHaveURL(/\/profile\/wallets$/)
})

test('session expiry during checkout keeps the cart and returns to checkout', async ({ page, mocks, mobile }) => {
  await login(page)
  await addToCart(page, mobile, 'emerald-ape-042')
  await checkoutReady(page)

  await mocks.setScenario('session-expired')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const approve = page.getByRole('button', { name: 'Aprovar conexão' })
  if (await approve.isVisible().catch(() => false)) await approve.click()
  await expect(page).toHaveURL(/\/login\?.*expired/, { timeout: 10_000 })

  await mocks.setScenario('default')
  await login(page, 'alice', { from: '' })
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  await page.goto('/cart')
  await expect(page.getByRole('list', { name: 'Itens do carrinho' }).getByText('Emerald Ape #042').locator('visible=true').first()).toBeVisible()
  expect(Object.keys((await mocks.db()).orders)).toHaveLength(0)
})

test('logout clears private data; another user never sees the first one', async ({ page, mocks, mobile }) => {
  await login(page, 'alice')
  await addToCart(page, mobile, 'emerald-ape-042')
  await page.goto('/nfts/sage-nomad-009')
  await page.getByRole('button', { name: /Favoritar/ }).locator('visible=true').first().click()
  await expect.poll(async () => (await mocks.db()).favorites.usr_alice).toContain('sage-nomad-009')

  await logout(page)
  await page.goto('/favorites')
  await expect(page).toHaveURL(/\/login/)

  await login(page, 'bruno', { from: '' })
  await expect(page).toHaveURL(/\/favorites$/)
  await expect(page.getByText('Sage Nomad #009')).toHaveCount(0)
  await page.goto('/cart')
  await expect(page.getByText('Emerald Ape #042')).toHaveCount(0)
  await page.goto('/profile')
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(USERS.bruno.displayName)
})
