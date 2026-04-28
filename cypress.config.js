const { defineConfig } = require("cypress");

module.exports = defineConfig({
  chromeWebSecurity: false,

  allowCypressEnv: false, // ✅ убирает warning

  e2e: {
    baseUrl: 'https://dev.metatrip.uz',
    watchForFileChanges: false,
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    video: false,
    screenshotOnRunFailure: true,

    setupNodeEvents(on, config) {
      return config;
    },
  },
});