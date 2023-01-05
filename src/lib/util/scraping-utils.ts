import puppeteer from "puppeteer"

// Fetch content of a page
export async function getPageContent(url: string, waitCondition: (page: puppeteer.Page) => any) {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setCacheEnabled(false) // Just in case, disable caching
    await page.goto(url)

    // Wait for some condition - to avoid reading the page content before certain elements have loaded
    await waitCondition(page)

    const content = await page.content()
    browser.close()

    return content
}

// Wait for page to complete loading. Credit: https://stackoverflow.com/a/72537739
export async function waitForDOMStable(page: puppeteer.Page, timeout = 30000, idleTime = 2000) {
    page.evaluate(() => {
        new Promise<void>((resolve, reject) => {
            setTimeout(() => { observer.disconnect(); reject(Error(`Timeout of ${timeout} ms exceeded waiting for DOM to stabilize.`)) }, timeout)
            const observer = new MutationObserver(() => { clearTimeout(timeoutId); timeoutId = setTimeout(finish, idleTime) })
            observer.observe(document.body, { attributes: true, childList: true, subtree: true })
            const finish = () => { observer.disconnect(); resolve() }
            var timeoutId = setTimeout(finish, idleTime)
        })
    })
}
