import { expect, login, test } from './fixtures'

// Brief §9.8 — profile, avatar, password and wallets, with validation errors.

test.beforeEach(async ({ page }) => {
  await login(page)
})

test('profile: validation, save, persisted after refresh', async ({ page }) => {
  await page.goto('/profile')
  const name = page.getByLabel('Nome de exibição')
  await name.fill('A')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Mínimo de 2 caracteres.').first()).toBeVisible()
  await expect(name).toHaveAttribute('aria-invalid', 'true')

  await page.getByLabel('Nome de usuário').fill('Alice Maiúscula')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText(/Use 3 a 24 caracteres/).first()).toBeVisible()

  await page.getByLabel('Nome de usuário').fill('alice')
  await name.fill('Alice M.')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Perfil atualizado.').first()).toBeAttached()
  await page.reload()
  await expect(name).toHaveValue('Alice M.')
})

test.describe('profile edited elsewhere', () => {
  test.use({ scenario: 'profile-conflict' })
  test('the 409 conflict lets the user load the current data', async ({ page }) => {
    await page.goto('/profile')
    await page.getByLabel('Apelido da carteira').fill('Minha coleção')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(/alterado em outra aba/).first()).toBeVisible()
    await page.getByRole('button', { name: 'Carregar dados atuais' }).click()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(/\(outra aba\)/)
  })
})

test('avatar: upload is resized and shown, then removed', async ({ page }) => {
  await page.goto('/profile')
  await page.locator('input[type=file]').setInputFiles('public/nft/emerald-ape-320.webp')
  await expect(page.getByText('Foto do perfil atualizada.').first()).toBeAttached()
  await expect(page.getByRole('img', { name: 'Sua foto de perfil' })).toHaveAttribute('src', /^data:image\//)
  await page.reload()
  await expect(page.getByRole('img', { name: 'Sua foto de perfil' })).toBeVisible()
  await page.getByRole('button', { name: 'Remover', exact: true }).first().click()
  await expect(page.getByText('Foto removida.').first()).toBeAttached()
})

test('password: wrong current password, mismatch, then success', async ({ page }) => {
  await page.goto('/profile')
  await page.getByLabel('Senha atual').fill('errada123')
  await page.getByLabel('Nova senha', { exact: true }).fill('Nova12345')
  await page.getByLabel('Confirmar nova senha').fill('Outra1234')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('As senhas não conferem.').first()).toBeVisible()

  await page.getByLabel('Confirmar nova senha').fill('Nova12345')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Senha atual incorreta.').first()).toBeVisible()

  await page.getByLabel('Senha atual').fill('Test@1234')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText(/Senha alterada/i).first()).toBeAttached()

  // The new password works; the old one no longer does.
  await page.context().clearCookies()
  await page.evaluate(() => localStorage.removeItem('kurio-session'))
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('alice@test.dev')
  await page.getByLabel('Senha', { exact: true }).fill('Test@1234')
  await page.locator('form button[type=submit]').click()
  await expect(page.getByText('E-mail ou senha incorretos.').first()).toBeVisible()
  await page.getByLabel('Senha', { exact: true }).fill('Nova12345')
  await page.locator('form button[type=submit]').click()
  await expect(page).not.toHaveURL(/\/login/)
})

test('wallets: validation, edit, duplicate address and primary switch', async ({ page }) => {
  await page.goto('/profile/wallets')
  const primary = page.locator('section', { has: page.getByRole('heading', { name: 'Carteira principal' }) })
  const secondary = page.locator('section', { has: page.getByRole('heading', { name: 'Carteira secundária' }) })

  await primary.getByLabel('Nome de exibição').fill('')
  await primary.getByLabel('Código de indicação').fill('x')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(primary.getByText('Use 4 a 12 letras maiúsculas ou números.')).toBeVisible()

  await primary.getByLabel('Nome de exibição').fill('Principal 2')
  await primary.getByLabel('Código de indicação').fill('KURIO10')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira "Principal 2" atualizada.').first()).toBeAttached()

  // Same address as the primary one: the API answers 409 on the field.
  const address = await primary.getByLabel('Endereço da carteira').inputValue()
  await secondary.getByLabel('Endereço da carteira').fill(address)
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(secondary.getByText('Este endereço já está cadastrado na sua conta.')).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Tornar principal' }).click()
  await expect(page.getByText('"Reserva" agora é a carteira principal.').first()).toBeAttached()
  await expect(primary.getByLabel('Nome de exibição')).toHaveValue('Reserva')
  await page.reload()
  await expect(primary.getByLabel('Nome de exibição')).toHaveValue('Reserva')
})
