import { CronJob } from "cron"
import puppeteer from "puppeteer"
import ytdl from "ytdl-core"
import { load } from "cheerio"
import _ from "underscore"
import { patchNotesChannel, self, videoChannel } from "./lib/util/discord-utils"
import { Fields } from "./config/firestore-schema"
import { getYoutubeChannelId, getMostRecentPath, setMostRecentPath, getLatestVideoId, setLatestVideoId } from "./lib/firestore/job_data"

const VALORANT_BASE_URL = "https://playvalorant.com"
const GAME_UPDATES_URL = VALORANT_BASE_URL + "/en-us/news/game-updates/"
const PATCH_NOTES_ENTRY_FILTER = "a[class^=\"ContentListingCard-module--contentListingCard--\"][href*=\"valorant-patch-notes\"]"
const INDEX_ATTRIBUTE = "data-transition-index"
const VERSION_CAPTURE_REGEX = /^[a-z-\/]+valorant-patch-notes-([0-9-]+)\/$/

const YOUTUBE_BASE_URL = "https://www.youtube.com"
const YOUTUBE_CHANNEL_URL_BUILDER = (channelId: string) => `${YOUTUBE_BASE_URL}/channel/${channelId}/videos`
const YOUTUBE_VIDEO_LINK_BUILDER = (videoId: string) => `https://youtu.be/${videoId}`
const VIDEO_TITLE_LINK_FILTER = "a[id=\"video-title\"][href*=\"watch\"]"
const VALORANT_TITLE_REGEX = /((?:map|agent|skin).+(?:reveal|trailer))|(episode.+cinematic)/i

// Helper methods

async function getPageContent(url: string, waitCondition: (page: puppeteer.Page) => any) {
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

async function checkForNewYoutubeVideo(channelIdField: string, getLastVideo: () => any, setLastVideo: (newValue: string) => any, filter?: (vidInfo: ytdl.videoInfo) => any) {
    const channelId = await getYoutubeChannelId(channelIdField)
    getPageContent(YOUTUBE_CHANNEL_URL_BUILDER(channelId), page => page.waitForNetworkIdle()).then(async content => {
        // Find latest youtube video
        const $ = load(content)
        const entries = $(VIDEO_TITLE_LINK_FILTER).toArray()
        const basicInfoPromises = entries.map(entry => ytdl.getBasicInfo(YOUTUBE_BASE_URL + entry.attribs["href"]))
        let basicInfoArray = await Promise.all(basicInfoPromises)

        // If a filter function was provided, run it
        if (filter) {
            basicInfoArray = basicInfoArray.filter(filter)
        }

        const latestVideo = _.max(basicInfoArray, info => Date.parse(info.videoDetails.publishDate))
        if (_.isNumber(latestVideo)) {
            return console.error(`Unable to get latest video by publish date (${channelId})!`)
        } else {
            const channelName = latestVideo.videoDetails.author.name
            const latestVideoId = latestVideo.videoDetails.videoId
            if (latestVideoId !== await getLastVideo()) {
                const newLink = YOUTUBE_VIDEO_LINK_BUILDER(latestVideoId)

                console.log(`Detected new video by ${channelName} (${latestVideo.videoDetails.title}), sending link ${newLink}`)

                setLastVideo(latestVideoId)
                const channel = await videoChannel(await self())
                channel.send(`From ${channelName}: ${newLink}`)
            } else {
                console.debug(`No new video from ${channelName}.`)
            }
        }
    }).catch(error => console.error(`Failed to fetch Youtube video page content (${channelId})! Cause: ${error.stack}`))
}

// Define jobs

// Check for new patch notes every hour
const patchNotesUpdater = new CronJob("0 * * * *", () => {
    // Load game updates page
    getPageContent(GAME_UPDATES_URL, page => page.waitForSelector(`a[${INDEX_ATTRIBUTE}="5"]`)).then(async content => {
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
            console.info(`New patch notes detected! Broadcasting link to ${VALORANT_BASE_URL}${latestPath}.`)

            // Update path in database
            setMostRecentPath(latestPath)

            // Send link to the patch notes channel
            const channel = await patchNotesChannel(await self())
            channel.send(`VALORANT ${version} Patch Notes: ${VALORANT_BASE_URL}${latestPath}`)
        }
    }).catch(error => console.error(`Patch notes job failed to fetch page content! Cause: ${error.stack}`))
})

// Check for new Youtube videos from gaming channel
const gamingYoutubeUpdater = new CronJob("8-59/10 * * * *", () => checkForNewYoutubeVideo(
    Fields.GAMING_CHANNEL_ID,
    () => getLatestVideoId(Fields.LAST_GAMING_ID),
    newValue => setLatestVideoId(Fields.LAST_GAMING_ID, newValue)
))

// Check for new agent/map reveals or cinematics from the official VALORANT channel
const valorantYoutubeUpdater = new CronJob("3-59/10 * * * *", () => checkForNewYoutubeVideo(
    Fields.VALORANT_CHANNEL_ID,
    () => getLatestVideoId(Fields.LAST_VALORANT_ID),
    newValue => setLatestVideoId(Fields.LAST_VALORANT_ID, newValue),
    videoInfo => !_.isNull(videoInfo.videoDetails.title.match(VALORANT_TITLE_REGEX))
))

// Job trigger function
export default function startJobs() {
    patchNotesUpdater.start()
    gamingYoutubeUpdater.start()
    valorantYoutubeUpdater.start()
}
