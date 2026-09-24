import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 375, height: 667 };
const MIN_BODY_TEXT_SIZE = 16;
const MIN_TAP_TARGET_SIZE = 44;
const WCAG_AA_CONTRAST_RATIO = 4.5;

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(rgb1, rgb2) {
  const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRGB(rgbString) {
  const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

async function takeFailureScreenshot(page, step, issue) {
  const timestamp = Date.now();
  const filename = `failure-${step.replace(/\s+/g, '-')}-${timestamp}.png`;
  await page.screenshot({ path: `test-results/${filename}`, fullPage: true });
  console.error(`FAILURE at "${step}": ${issue}`);
  console.error(`Screenshot: ${filename}`);
  return filename;
}

test.describe('Aunt Pilot Mobile Onboarding', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  let testEmail;
  let failures = [];

  test.beforeAll(async () => {
    testEmail = `test-pilot-${Date.now()}@example.com`;
  });

  test.afterAll(async () => {
    if (failures.length > 0) {
      console.error('\nTEST FAILURES SUMMARY:');
      failures.forEach((f, i) => {
        console.error(`${i + 1}. ${f.step}: ${f.issue}`);
        console.error(`   Screenshot: ${f.screenshot}`);
      });
    }
  });

  test('should complete pilot onboarding with accessibility compliance', async ({ page, baseURL }) => {
    const logFailure = async (step, issue) => {
      const screenshot = await takeFailureScreenshot(page, step, issue);
      failures.push({ step, issue, screenshot });
    };

    await test.step('Open pilot link', async () => {
      await page.goto(`${baseURL}/pilot/business-service-open`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Validate minimum body text size 16px', async () => {
      const bodyTexts = await page.locator('p, span, div, label, input, textarea, button').all();
      for (const el of bodyTexts) {
        const isVisible = await el.isVisible().catch(() => false);
        if (!isVisible) continue;
        const fontSize = await el.evaluate(node => parseFloat(window.getComputedStyle(node).fontSize));
        if (fontSize > 0 && fontSize < MIN_BODY_TEXT_SIZE) {
          const text = await el.textContent();
          await logFailure('Body text size', `Text has ${fontSize}px (min: ${MIN_BODY_TEXT_SIZE}px): ${text?.slice(0, 50)}`);
        }
      }
    });

    await test.step('Validate WCAG AA contrast 4.5:1', async () => {
      const textElements = await page.locator('p, span, div, label, h1, h2, h3, h4, h5, h6, a, button').all();
      for (const el of textElements) {
        const isVisible = await el.isVisible().catch(() => false);
        if (!isVisible) continue;
        const text = await el.textContent();
        if (!text || text.trim().length === 0) continue;
        const colors = await el.evaluate(node => {
          const computed = window.getComputedStyle(node);
          return { color: computed.color, backgroundColor: computed.backgroundColor };
        });
        const textRGB = parseRGB(colors.color);
        const bgRGB = parseRGB(colors.backgroundColor);
        if (colors.backgroundColor.includes('rgba') && colors.backgroundColor.includes('0)')) continue;
        const contrast = getContrastRatio(textRGB, bgRGB);
        if (contrast < WCAG_AA_CONTRAST_RATIO) {
          await logFailure('WCAG contrast', `Contrast ${contrast.toFixed(2)}:1 (min: ${WCAG_AA_CONTRAST_RATIO}:1): ${text.slice(0, 50)}`);
        }
      }
    });

    await test.step('Validate no pale text on white cards', async () => {
      const cards = await page.locator('[class*="card"], .bg-white, .bg-gray-50').all();
      for (const card of cards) {
        const isVisible = await card.isVisible().catch(() => false);
        if (!isVisible) continue;
        const cardBg = await card.evaluate(node => window.getComputedStyle(node).backgroundColor);
        const cardBgRGB = parseRGB(cardBg);
        const isWhiteCard = cardBgRGB.every(c => c > 240);
        if (isWhiteCard) {
          const textInCard = await card.locator('p, span, div, label').all();
          for (const text of textInCard) {
            const textColor = await text.evaluate(node => window.getComputedStyle(node).color);
            const textRGB = parseRGB(textColor);
            const contrast = getContrastRatio(textRGB, cardBgRGB);
            if (contrast < WCAG_AA_CONTRAST_RATIO) {
              const content = await text.textContent();
              await logFailure('Pale text on white', `Contrast ${contrast.toFixed(2)}:1 on white card: ${content?.slice(0, 50)}`);
            }
          }
        }
      }
    });

    await test.step('Create account or sign in', async () => {
      const signUpButton = page.locator('button:has-text("Sign Up"), button:has-text("Get Started")').first();
      const hasSignUp = await signUpButton.isVisible().catch(() => false);
      if (hasSignUp) {
        await signUpButton.click();
        await page.waitForTimeout(1000);
        const emailInput = page.locator('input[type="email"]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        if (await emailInput.isVisible()) {
          await emailInput.fill(testEmail);
          await passwordInput.fill('TestPassword123!');
          const submitButton = page.locator('button[type="submit"]').first();
          await submitButton.click();
          await page.waitForLoadState('networkidle');
        } else {
          await logFailure('Sign up', 'Email input not found');
        }
      } else {
        await logFailure('Auth', 'No sign up button found');
      }
    });

    await test.step('Validate tap targets 44px minimum', async () => {
      const interactiveElements = await page.locator('button, a, input, select, textarea, [role="button"]').all();
      for (const el of interactiveElements) {
        const isVisible = await el.isVisible().catch(() => false);
        if (!isVisible) continue;
        const box = await el.boundingBox();
        if (!box) continue;
        if (box.width < MIN_TAP_TARGET_SIZE || box.height < MIN_TAP_TARGET_SIZE) {
          const text = await el.textContent();
          const tagName = await el.evaluate(node => node.tagName);
          await logFailure('Tap target', `${tagName} ${Math.round(box.width)}x${Math.round(box.height)}px (min: ${MIN_TAP_TARGET_SIZE}px): ${text?.slice(0, 30)}`);
        }
      }
    });

    await test.step('Complete intake form', async () => {
      const companyField = page.locator('input[name*="company"], input[placeholder*="Company"]').first();
      if (await companyField.isVisible().catch(() => false)) {
        await companyField.fill('Test Vendor LLC');
      } else {
        await logFailure('Intake', 'Company field not found');
      }
      const requiredInputs = await page.locator('input[required], textarea[required], select[required]').all();
      for (const input of requiredInputs) {
        const isVisible = await input.isVisible().catch(() => false);
        if (!isVisible) {
          const name = await input.getAttribute('name');
          await logFailure('Hidden required field', `Required field not visible: ${name}`);
          continue;
        }
        const value = await input.inputValue();
        if (!value) {
          const type = await input.getAttribute('type');
          if (type === 'text' || type === 'email') {
            await input.fill('test@example.com');
          } else if (type === 'tel') {
            await input.fill('555-123-4567');
          }
        }
      }
    });

    await test.step('Test save and resume', async () => {
      const saveButton = page.locator('button:has-text("Save")').first();
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Submit intake', async () => {
      const submitButton = page.locator('button:has-text("Submit"), button[type="submit"]').first();
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await page.waitForLoadState('networkidle');
      } else {
        await logFailure('Submit', 'Submit button not found');
      }
    });

    await test.step('Verify post-intake', async () => {
      const successMessage = page.locator('text=/success|submitted|thank you/i').first();
      const hasSuccess = await successMessage.isVisible({ timeout: 5000 }).catch(() => false);
      if (!hasSuccess) {
        await logFailure('Post-intake', 'No success confirmation found');
      }
    });

    if (failures.length > 0) {
      throw new Error(`Test completed with ${failures.length} accessibility/UX failures`);
    }
  });
});
