const { join } = require('path')

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer.
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),

    // Manually set browser revision due to issue with version 114.0.5735.133: https://github.com/puppeteer/puppeteer/issues/10388
    browserRevision: '117.0.5897.0',
};