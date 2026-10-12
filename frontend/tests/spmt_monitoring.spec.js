import { test, expect } from '@playwright/test';

test.describe('SPMT Monitoring System E2E Tests', () => {
  const BASE_URL = 'http://localhost:5173';

  test('Should login successfully as Superadmin', async ({ page }) => {
    // 1. Buka halaman login
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/SPMT Website Monitoring/i);

    // 2. Isi formulir login
    await page.fill('input[placeholder*="Username"]', 'superadmin');
    await page.fill('input[placeholder*="Password"]', 'admin123');

    // 3. Submit login
    await page.click('button[type="submit"]');

    // 4. Verifikasi masuk ke dashboard dengan mengecek elemen spesifik dashboard
    // Misalnya top bar atau user info
    await expect(page.locator('text=NOC Dashboard')).toBeVisible();
    await expect(page.locator('text=superadmin')).toBeVisible();
  });

  test('Should navigate to Websites page and add a new website', async ({ page }) => {
    // Login terlebih dahulu
    await page.goto(BASE_URL);
    await page.fill('input[placeholder*="Username"]', 'superadmin');
    await page.fill('input[placeholder*="Password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=NOC Dashboard')).toBeVisible();

    // Navigasi ke Halaman Websites
    // Cari tombol/tab menu dengan teks 'WEBSITES' atau icon terkait
    const websitesTab = page.locator('button:has-text("WEBSITES"), a:has-text("WEBSITES")');
    if (await websitesTab.isVisible()) {
      await websitesTab.click();
    } else {
      // Alternatif via klik menu di Sidebar/Navbar
      await page.click('text=Websites');
    }

    // Verifikasi berada di halaman manajemen website
    await expect(page.locator('text=Website Management')).toBeVisible();

    // Klik tombol Add Website
    await page.click('button:has-text("Add Website"), button:has-text("Tambah Website")');

    // Isi modal Add Website
    await page.fill('input[name="name"]', 'Google Test');
    await page.fill('input[name="url"]', 'https://www.google.com');
    await page.fill('input[name="interval_seconds"]', '30');
    await page.fill('textarea[name="description"]', 'Pengecekan koneksi Google untuk QA Test');

    // Simpan
    await page.click('button:has-text("Save"), button:has-text("Simpan")');

    // Verifikasi website baru muncul di daftar tabel
    await expect(page.locator('text=Google Test')).toBeVisible();
  });

  test('Should open System Health panel', async ({ page }) => {
    // Login
    await page.goto(BASE_URL);
    await page.fill('input[placeholder*="Username"]', 'superadmin');
    await page.fill('input[placeholder*="Password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Klik tombol System Health di Dashboard
    await page.click('text=System Health');

    // Verifikasi modal System Health terbuka
    await expect(page.locator('text=System Metrics & Resources')).toBeVisible();
    await expect(page.locator('text=CPU Usage')).toBeVisible();
    await expect(page.locator('text=RAM Usage')).toBeVisible();
  });
});
