/**
 * Bug Condition Exploration Test: Print Border Rendering
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * This test is designed to confirm the bug exists by verifying that borders
 * with fractional pixel widths (1.5px, 2.5px) fail to render properly in print mode.
 * 
 * EXPECTED BEHAVIOR: This test should FAIL on unfixed code, confirming the bug.
 * After the fix is implemented, this test should PASS.
 */

const { chromium } = require('playwright');
const path = require('path');

describe('Employee Card Print Border Rendering - Bug Exploration', () => {
  let browser;
  let context;
  let page;

  beforeAll(async () => {
    // Launch browser
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    // Create a new browser context for each test
    context = await browser.newContext();
    page = await context.newPage();
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
    if (context) {
      await context.close();
    }
  });

  /**
   * Test 1: Verify outer card container border renders in print mode
   * Expected: FAIL on unfixed code (border-width should be 2.5px but may render as less or missing)
   */
  test('Card container 2.5px border should render completely in print mode', async () => {
    // Navigate to employee card page (using test employee ID)
    // Note: This assumes the dev server is running
    await page.goto('http://localhost:3000/employee-card/1');

    // Wait for the card to load
    await page.waitForSelector('.card-container', { timeout: 5000 });

    // Emulate print media
    await page.emulateMedia({ media: 'print' });

    // Get computed border style of card container in print mode
    const cardContainerBorder = await page.evaluate(() => {
      const element = document.querySelector('.card-container');
      if (!element) return null;
      const styles = window.getComputedStyle(element);
      return {
        borderTopWidth: styles.borderTopWidth,
        borderRightWidth: styles.borderRightWidth,
        borderBottomWidth: styles.borderBottomWidth,
        borderLeftWidth: styles.borderLeftWidth,
        borderTopStyle: styles.borderTopStyle,
        borderTopColor: styles.borderTopColor,
      };
    });

    // Take screenshot for documentation
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'print-card-container-border.png'),
      fullPage: true 
    });

    // Verify border is rendered properly
    // Bug condition: borders may be missing or have incorrect width
    expect(cardContainerBorder).not.toBeNull();
    
    // Parse the width values (they come as strings like "2.5px" or "2px")
    const topWidth = parseFloat(cardContainerBorder.borderTopWidth);
    const rightWidth = parseFloat(cardContainerBorder.borderRightWidth);
    const bottomWidth = parseFloat(cardContainerBorder.borderBottomWidth);
    const leftWidth = parseFloat(cardContainerBorder.borderLeftWidth);

    // Expected: All borders should be at least 2px (or the intended 2.5px/3px after fix)
    // This assertion will FAIL on unfixed code where borders disappear or round down
    expect(topWidth).toBeGreaterThanOrEqual(2);
    expect(rightWidth).toBeGreaterThanOrEqual(2);
    expect(bottomWidth).toBeGreaterThanOrEqual(2);
    expect(leftWidth).toBeGreaterThanOrEqual(2);

    // Verify border style is solid
    expect(cardContainerBorder.borderTopStyle).toBe('solid');

    // Verify border color is black
    const isBlackBorder = cardContainerBorder.borderTopColor === 'rgb(0, 0, 0)';
    expect(isBlackBorder).toBe(true);
  });

  /**
   * Test 2: Verify grid cell borders (1.5px) render in print mode
   * Expected: FAIL on unfixed code (1.5px borders often disappear in print)
   */
  test('Grid cell 1.5px borders should render completely in print mode', async () => {
    await page.goto('http://localhost:3000/employee-card/1');
    await page.waitForSelector('.cell-label', { timeout: 5000 });

    // Emulate print media
    await page.emulateMedia({ media: 'print' });

    // Get computed border styles of grid cells
    const cellBorders = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.cell-label'));
      return labels.slice(0, 3).map(element => {
        const styles = window.getComputedStyle(element);
        return {
          borderRightWidth: styles.borderRightWidth,
          borderRightStyle: styles.borderRightStyle,
          borderBottomWidth: styles.borderBottomWidth,
          borderBottomStyle: styles.borderBottomStyle,
        };
      });
    });

    // Take screenshot
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'print-grid-borders.png'),
      fullPage: true 
    });

    // Verify that cell borders are present
    expect(cellBorders.length).toBeGreaterThan(0);

    cellBorders.forEach((border, index) => {
      const rightWidth = parseFloat(border.borderRightWidth);
      
      // Expected: border-right should be at least 1px visible
      // This assertion will FAIL on unfixed code where 1.5px borders disappear
      expect(rightWidth).toBeGreaterThanOrEqual(1);
      expect(border.borderRightStyle).toBe('solid');
    });
  });

  /**
   * Test 3: Verify transfer table borders (1.5px) render in print mode
   * Expected: FAIL on unfixed code (table borders often missing in print)
   */
  test('Transfer table borders should render completely in print mode', async () => {
    await page.goto('http://localhost:3000/employee-card/1');
    await page.waitForSelector('.transfer-table', { timeout: 5000 });

    // Emulate print media
    await page.emulateMedia({ media: 'print' });

    // Get computed border styles of table cells
    const tableBorders = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('.th'));
      const cells = Array.from(document.querySelectorAll('.td'));
      
      return {
        headerBorders: headers.slice(0, 3).map(element => {
          const styles = window.getComputedStyle(element);
          return {
            borderRightWidth: styles.borderRightWidth,
            borderBottomWidth: styles.borderBottomWidth,
            borderRightStyle: styles.borderRightStyle,
          };
        }),
        cellBorders: cells.slice(0, 3).map(element => {
          const styles = window.getComputedStyle(element);
          return {
            borderRightWidth: styles.borderRightWidth,
            borderRightStyle: styles.borderRightStyle,
          };
        }),
      };
    });

    // Take screenshot
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'print-table-borders.png'),
      fullPage: true 
    });

    // Verify table header borders
    tableBorders.headerBorders.forEach((border, index) => {
      const rightWidth = parseFloat(border.borderRightWidth);
      const bottomWidth = parseFloat(border.borderBottomWidth);
      
      // Expected: borders should be at least 1px visible
      // This assertion will FAIL on unfixed code
      expect(rightWidth).toBeGreaterThanOrEqual(1);
      expect(bottomWidth).toBeGreaterThanOrEqual(1);
      expect(border.borderRightStyle).toBe('solid');
    });

    // Verify table cell borders
    tableBorders.cellBorders.forEach((border, index) => {
      const rightWidth = parseFloat(border.borderRightWidth);
      
      // This assertion will FAIL on unfixed code
      expect(rightWidth).toBeGreaterThanOrEqual(1);
      expect(border.borderRightStyle).toBe('solid');
    });
  });

  /**
   * Test 4: Verify divider lines render in print mode
   * Expected: FAIL on unfixed code (background-based dividers may disappear)
   */
  test('Divider lines should render completely in print mode', async () => {
    await page.goto('http://localhost:3000/employee-card/1');
    await page.waitForSelector('.divider', { timeout: 5000 });

    // Emulate print media
    await page.emulateMedia({ media: 'print' });

    // Get computed styles of dividers
    const dividerStyles = await page.evaluate(() => {
      const dividers = Array.from(document.querySelectorAll('.divider'));
      return dividers.map(element => {
        const styles = window.getComputedStyle(element);
        return {
          height: styles.height,
          backgroundColor: styles.backgroundColor,
          borderTopWidth: styles.borderTopWidth,
          borderTopStyle: styles.borderTopStyle,
          borderTopColor: styles.borderTopColor,
        };
      });
    });

    // Take screenshot
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'print-dividers.png'),
      fullPage: true 
    });

    expect(dividerStyles.length).toBeGreaterThan(0);

    dividerStyles.forEach((divider, index) => {
      // Check if divider uses background or border
      const hasBackground = divider.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const hasBorder = parseFloat(divider.borderTopWidth) >= 2;

      // Expected: dividers should be visible via background OR border
      // This assertion may FAIL on unfixed code if backgrounds are stripped in print
      const isDividerVisible = hasBackground || hasBorder;
      expect(isDividerVisible).toBe(true);
    });
  });

  /**
   * Test 5: Visual regression - capture full print output
   * This test creates a baseline screenshot for comparison
   */
  test('Capture full print preview for visual comparison', async () => {
    await page.goto('http://localhost:3000/employee-card/1');
    await page.waitForSelector('.card-container', { timeout: 5000 });

    // Emulate print media
    await page.emulateMedia({ media: 'print' });

    // Generate PDF output (simulates print)
    const pdfPath = path.join(__dirname, 'screenshots', 'employee-card-print-output.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true, // Ensure backgrounds are printed
    });

    // Also capture as PNG
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'employee-card-print-full.png'),
      fullPage: true 
    });

    // Verify file was created
    const fs = require('fs');
    expect(fs.existsSync(pdfPath)).toBe(true);
  });
});
