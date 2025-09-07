// Karma configuration for running tests with Chromium in containers
// Provides full Jasmine setup since Angular's application builder only uses
// built-in defaults when no custom karmaConfig is provided.

const fs = require('fs');
const path = require('path');

function resolveChromiumBin() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ];
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  return null;
}

module.exports = function (config) {
  const chromiumBin = resolveChromiumBin();
  if (chromiumBin) process.env.CHROME_BIN = chromiumBin;

  // Mirror Angular builder defaults and add container-friendly Chromium launcher
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage')
    ],
    client: {
      jasmine: {},
      clearContext: true // builder will override in watch mode
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      dir: path.join(__dirname, 'coverage', 'numbers'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }]
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [
          '--headless=new',
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--remote-allow-origins=*'
        ]
      }
    },
    restartOnFileChange: true
  });
};
