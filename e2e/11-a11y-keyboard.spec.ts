import { expect, test } from './fixtures'

// Brief §9.11 and §8 — keyboard navigation, focus in dialogs, form validation.

test('skip link moves focus to the content', async ({ page, mobile }) => {
  test.skip(mobile, 'keyboard-first check runs on desktop')
  await page.goto('/')
  await expect(page.locator('#catalogo h3 a').first()).toBeVisible()
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.locator('#conteudo')).toBeFocused()
})

test('search dialog: focus moves in, Escape closes and returns focus', async ({ page, mobile }) => {
  test.skip(mobile, 'the header search is the desktop entry point')
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Buscar NFTs' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Buscar NFTs' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('searchbox')).toBeFocused()
  // Focus stays inside the dialog.
  for (let i = 0; i < 5; i++) await page.keyboard.press('Tab')
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('filters work from the keyboard (desktop checkboxes, mobile sheet)', async ({ page, mobile }) => {
  await page.goto('/')
  await expect(page.locator('#catalogo h3 a').first()).toBeVisible()
  if (mobile) {
    const open = page.getByRole('button', { name: /^Filtros/ })
    await open.focus()
    await page.keyboard.press('Enter')
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await expect(sheet).toBeVisible()
    expect(await sheet.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    await sheet.getByLabel('Fotografia').focus()
    await page.keyboard.press('Space')
    await expect(page).toHaveURL(/categories=fotografia/)
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(open).toBeFocused()
  } else {
    const box = page.locator('#catalogo').getByLabel('Fotografia')
    await box.focus()
    await page.keyboard.press('Space')
    await expect(page).toHaveURL(/categories=fotografia/)
    await expect(box).toBeFocused()
  }
})

test('form errors are tied to their fields and announced', async ({ page }) => {
  await page.goto('/login')
  await page.locator('form button[type=submit]').click()
  const email = page.getByLabel('E-mail')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  const describedBy = await email.getAttribute('aria-describedby')
  expect(describedBy).toBeTruthy()
  await expect(page.locator(`[id="${describedBy!.split(' ')[0]}"]`)).toHaveText('Informe um e-mail válido.')
  await expect(email).toBeFocused() // the first invalid field gets the focus
})

test('the login dialog traps focus and closes with Escape', async ({ page, mobile }) => {
  test.skip(mobile, 'mobile login is a full screen, not a dialog')
  await page.goto('/login')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab')
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL('/')
})

test('state is not shown by color alone: favorite and filters use text/ARIA', async ({ page }) => {
  await page.goto('/nfts/emerald-ape-042')
  await expect(page.getByRole('button', { name: /Favoritar/ }).locator('visible=true').first()).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('img').first()).toHaveAttribute('alt', /.+/)
})
