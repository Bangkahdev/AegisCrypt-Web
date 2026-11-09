const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();

  const app = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const appPage = await app.newPage();
  await appPage.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await appPage.waitForTimeout(500);
  await appPage.screenshot({ path: "scripts-tmp/login-mobile.png" });

  const docs = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const docsPage = await docs.newPage();
  await docsPage.goto("http://127.0.0.1:4174", { waitUntil: "networkidle" });
  await docsPage.waitForTimeout(500);
  await docsPage.screenshot({ path: "scripts-tmp/docs-mobile-2.png" });
  await docsPage.getByRole("button", { name: "Buka menu navigasi" }).click();
  await docsPage.waitForTimeout(300);
  await docsPage.screenshot({ path: "scripts-tmp/docs-mobile-menu.png" });

  await browser.close();
  console.log("done");
})();
