import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('all nav links are present and navigate correctly', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav')
    await expect(nav.getByRole('link', { name: 'Overview' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Inventory' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Orders' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Finance' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Demand Forecast' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Reports' })).toBeVisible()
  })

  test('clicking nav links changes the page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Inventory' }).click()
    await expect(page).toHaveURL('/inventory')
    await page.getByRole('link', { name: 'Reports' }).click()
    await expect(page).toHaveURL('/reports')
    await page.getByRole('link', { name: 'Overview' }).click()
    await expect(page).toHaveURL('/')
  })
})

test.describe('Overview dashboard', () => {
  test('loads without staying in loading state', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 5000 })
  })

  test('global filter bar is present with all four filters', async ({ page }) => {
    await page.goto('/')
    const filterGroup = (label: string) =>
      page.locator('.filter-group').filter({ hasText: label }).locator('select')
    await expect(filterGroup('Time Period')).toBeVisible()
    await expect(filterGroup('Location')).toBeVisible()
    await expect(filterGroup('Category')).toBeVisible()
    await expect(filterGroup('Order Status')).toBeVisible()
  })

  test('Reset button is disabled when no filters are active', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /reset all filters/i })).toBeDisabled()
  })

  test('selecting a filter enables the Reset button', async ({ page }) => {
    await page.goto('/')
    const locationSelect = page.locator('.filter-group').filter({ hasText: 'Location' }).locator('select')
    await locationSelect.selectOption('London')
    await expect(page.getByRole('button', { name: /reset all filters/i })).toBeEnabled()
  })

  test('Reset button clears filters and becomes disabled again', async ({ page }) => {
    await page.goto('/')
    const locationSelect = page.locator('.filter-group').filter({ hasText: 'Location' }).locator('select')
    await locationSelect.selectOption('Tokyo')
    const resetBtn = page.getByRole('button', { name: /reset all filters/i })
    await expect(resetBtn).toBeEnabled()
    await resetBtn.click()
    await expect(locationSelect).toHaveValue('all')
    await expect(resetBtn).toBeDisabled()
  })
})

test.describe('Inventory page', () => {
  test('shows stock levels table with items', async ({ page }) => {
    await page.goto('/inventory')
    await expect(page.getByRole('heading', { name: /stock levels/i })).toBeVisible()
    // Table should have at least one data row
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
    await expect(rows).toHaveCount(await rows.count())
    expect(await rows.count()).toBeGreaterThan(0)
  })

  test('search filters inventory items', async ({ page }) => {
    await page.goto('/inventory')
    const searchBox = page.getByPlaceholder('Search by item name...')
    await expect(searchBox).toBeVisible()
    await searchBox.fill('Sensor')
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    // Every visible row should mention Sensor
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('Sensor')
    }
  })

  test('shows item status badges', async ({ page }) => {
    await page.goto('/inventory')
    // At least one status badge should be visible (In Stock / Low Stock / Adequate)
    const badges = page.locator('tbody td').filter({ hasText: /^(In Stock|Low Stock|Adequate)$/ })
    await expect(badges.first()).toBeVisible()
  })
})

test.describe('Reports page (R1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports')
    // Wait for data to load
    await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 5000 })
  })

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Performance Reports' })).toBeVisible()
  })

  test('quarterly performance table shows all four quarters', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Quarterly Performance' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Q1-2025' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Q2-2025' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Q3-2025' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Q4-2025' })).toBeVisible()
  })

  test('quarterly table has correct column headers', async ({ page }) => {
    const thead = page.locator('table').first().locator('thead')
    await expect(thead).toContainText('Total Orders')
    await expect(thead).toContainText('Total Revenue')
    await expect(thead).toContainText('Avg Order Value')
    await expect(thead).toContainText('Fulfillment Rate')
  })

  test('monthly revenue trend section is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Monthly Revenue Trend' })).toBeVisible()
  })

  test('month-over-month analysis table shows all 12 months', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Month-over-Month Analysis' })).toBeVisible()
    const months = ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025',
                    'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025',
                    'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025']
    for (const month of months) {
      await expect(page.getByRole('cell', { name: month })).toBeVisible()
    }
  })

  test('summary stats show YTD revenue and total orders', async ({ page }) => {
    await expect(page.getByText('Total Revenue (YTD)')).toBeVisible()
    await expect(page.getByText('Total Orders (YTD)')).toBeVisible()
    await expect(page.getByText('Avg Monthly Revenue')).toBeVisible()
    await expect(page.getByText('Best Performing Quarter')).toBeVisible()
  })
})
