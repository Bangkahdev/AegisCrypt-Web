const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();

  const app = await browser.newContext({ viewport: { width: 1440, height: 920 } });
  const page = await app.newPage();
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: "scripts-tmp/login.png" });

  await page.getByPlaceholder("Enter encryption password").fill("BlackboxPassword123!");
  await page.getByRole("button", { name: "Start Session" }).click();
  await page.getByText("Processing Queue").waitFor();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "scripts-tmp/dashboard.png" });

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "scripts-tmp/dashboard-dark.png" });

  const docs = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const docsPage = await docs.newPage();
  await docsPage.goto("http://127.0.0.1:4174", { waitUntil: "networkidle" });
  await docsPage.waitForTimeout(800);
  await docsPage.screenshot({ path: "scripts-tmp/docs.png" });
  await docsPage.screenshot({ path: "scripts-tmp/docs-full.png", fullPage: true });

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto("http://127.0.0.1:4174", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: "scripts-tmp/docs-mobile.png" });

  await browser.close();
  console.log("done");
})();
