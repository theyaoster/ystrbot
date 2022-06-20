import { CronJob } from "cron"
import puppeteer from "puppeteer"
import { load } from "cheerio"
import { getMostRecentPath, setMostRecentPath } from "./lib/firestore"
import { patchNotesChannel } from "./lib/util/discord-utils"
import _ from "underscore"

const BASE_URL = "https://playvalorant.com"
const GAME_UPDATES_URL = BASE_URL + "/en-us/news/game-updates/"
const PATCH_NOTES_ENTRY_FILTER = "a[class^=\"ContentListingCard-module--contentListingCard--\"][href*=\"valorant-patch-notes\"]"
const INDEX_ATTRIBUTE = "data-transition-index"
const VERSION_CAPTURE_REGEX = /^[a-z-\/]+valorant-patch-notes-([0-9-]+)\/$/

// Helper methods

async function getPageContent(url: string) {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.goto(url)
    await page.waitForSelector(`a[${INDEX_ATTRIBUTE}="5"]`) // Wait for the first six posts to load
    const content = await page.content()
    browser.close()

    return content
}

// Define jobs

// Check for new patch notes every hour
const patchNotesUpdater = new CronJob("0 * * * *", () => {
    // Load game updates page
    getPageContent(GAME_UPDATES_URL).then(async content => {
        // Find latest patch notes update
        const $ = load(content)
        const entries = $(PATCH_NOTES_ENTRY_FILTER).toArray()
        const latestEntry = _.min(entries, entry => parseInt(entry.attribs[INDEX_ATTRIBUTE]))

        // Number return value means the array is empty
        if (_.isNumber(latestEntry)) {
            return console.error(`No patch notes entry found! Entries: ${entries}`)
        }

        const latestPath = latestEntry.attribs["href"]
        const versionMatch = latestPath.match(VERSION_CAPTURE_REGEX)
        if (_.isNull(versionMatch)) {
            return console.error(`Unable to parse version from path ${latestPath}`)
        }

        const version = versionMatch[1].replace("-", ".")

        // Compare the latest path with the one in the db
        if (latestPath === await getMostRecentPath()) {
            console.info(`No new patch notes. (v${version})`)
        } else {
            console.info(`New patch notes detected! Broadcasting link to ${BASE_URL}${latestPath}.`)

            // Update path in database
            setMostRecentPath(latestPath)

            // Send link to the patch notes channel
            const channel = await patchNotesChannel()
            channel.send(`VALORANT ${version} Patch Notes: ${BASE_URL}${latestPath}`)
        }
    }).catch(error => console.error(`Patch notes job failed to fetch page content! Cause: ${error.stack}`))
})

// Job trigger function
export default function startJobs() {
    patchNotesUpdater.start()
}
