const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set viewport to match the poster dimensions
  await page.setViewport({ width: 2480, height: 3508, deviceScaleFactor: 1 });

  console.log('Loading poster...');
  await page.goto('http://127.0.0.1:8080/poster.html', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 3000));

  // Remove the CSS scaling for print — render at full size
  await page.addStyleTag({
    content: `
      @media all {
        body {
          padding: 0 !important;
          margin: 0 !important;
          display: block !important;
          background: #0a0a0a !important;
        }
        .poster {
          transform: none !important;
          width: 2480px !important;
          min-height: 3508px !important;
          margin: 0 !important;
        }
      }
    `
  });

  await new Promise(r => setTimeout(r, 1000));

  const outputPath = path.join(__dirname, 'Zariya_Poster_A4.pdf');

  console.log('Generating PDF...');
  await page.pdf({
    path: outputPath,
    width: '2480px',
    height: '3508px',
    printBackground: true,
    preferCSSPageSize: false,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  console.log(`PDF saved to: ${outputPath}`);
  await browser.close();
  console.log('Done!');
})();
