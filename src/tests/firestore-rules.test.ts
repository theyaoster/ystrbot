import fs from "fs"
import { sep } from "path"
import rootPath from "app-root-path"
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestContext } from "@firebase/rules-unit-testing"
import { doc, getDoc, setDoc, updateDoc, deleteDoc, setLogLevel } from "firebase/firestore"
import config from "../config/config"
import { Collections, Documents, Fields } from "../config/firestore-schema"
import { stringMap } from "../lib/util/data-structure-utils"
import { MOCK_DATA } from "./firestore-test-data"

// Workaround to avoid warnings in test output...
setLogLevel("error")

const NEW_DATA_PAYLOAD = { "bob": { "status": "test" } }
const READ_ONLY_PATHS = [
    `/${Collections.CONFIG}/${Documents.ADMIN}`,
    `/${Collections.CONFIG}/${Documents.DISCORD_ELEMENTS}`,
    `/${Collections.CONFIG}/${Documents.TICKET_OVERRIDES}`,
    `/${Collections.KEYWORD_TO_EMOJI}/${Documents.EMOJI_IDS}`,
    `/${Collections.KEYWORD_TO_EMOJI}/${Documents.SUBSTITUTIONS}`,
]
const READ_AND_UPDATE_ONLY_PATHS = [
    `/${Collections.GAME_DATA}/${Documents.PLAYERS}`,
    `/${Collections.TICKETS}/${Documents.AUTHORS}`,
    `/${Collections.MEMBERS}/${Documents.COMMAND_BANS}`,
    `/${Collections.MEMBERS}/${Documents.SILENCES}`,
    `/${Collections.JOB_DATA}/${Documents.PATCH_NOTES_SCRAPER}`,
]
const KEYS_IDENTICAL_PATHS = [
    `/${Collections.JOB_DATA}/${Documents.YOUTUBE_SCRAPER}`,
    `/${Collections.TRACKING}/${Documents.AUDIO}`,
    `/${Collections.TRACKING}/${Documents.PINGS}`,
]

// Helper for initializing emulator data
function insertMockData(context: RulesTestContext) {
    const db = context.firestore()

    // Populate emulator with data
    return Promise.all(Object.keys(MOCK_DATA).flatMap(collection => Object.keys(MOCK_DATA[collection]).map(document => db.doc(`/${collection}/${document}`).set(MOCK_DATA[collection][document]))))
}

// Test authenticated queries
async function performTestsForAuthenticatedUser(context: RulesTestContext) {
    const db = context.firestore()

    const readOnlyDocs = READ_ONLY_PATHS.map(path => doc(db, path))
    const readUpdateOnlyDocs = READ_AND_UPDATE_ONLY_PATHS.map(path => doc(db, path))
    const keysIdenticalFields = stringMap(KEYS_IDENTICAL_PATHS, [Fields.LAST_GAMING_ID, Fields.CURRENT_MESSAGE_ID, Fields.LATEST])

    for (const roDoc of readOnlyDocs) {
        await assertFails(setDoc(roDoc, NEW_DATA_PAYLOAD))
        await assertFails(setDoc(roDoc, NEW_DATA_PAYLOAD, { merge: true }))
        await assertFails(updateDoc(roDoc, NEW_DATA_PAYLOAD))
        await assertFails(deleteDoc(roDoc))
        await assertSucceeds(getDoc(roDoc))

        console.log(`Test for authenticated queries on read-only doc ${roDoc.id} passed.`)
    }

    for (const ruoDoc of readUpdateOnlyDocs) {
        await assertFails(setDoc(ruoDoc, NEW_DATA_PAYLOAD, { merge: false }))
        await assertSucceeds(setDoc(ruoDoc, NEW_DATA_PAYLOAD, { merge: true }))
        await assertSucceeds(updateDoc(ruoDoc, NEW_DATA_PAYLOAD))
        await assertFails(deleteDoc(ruoDoc))
        await assertSucceeds(getDoc(ruoDoc))

        console.log(`Test for authenticated queries on read-update-only doc ${ruoDoc.id} passed.`)
    }

    for (const kiPath of KEYS_IDENTICAL_PATHS) {
        const kiDoc = doc(db, kiPath)

        await assertFails(setDoc(kiDoc, NEW_DATA_PAYLOAD, { merge: false }))
        await assertFails(setDoc(kiDoc, NEW_DATA_PAYLOAD, { merge: true }))
        await assertFails(updateDoc(kiDoc, NEW_DATA_PAYLOAD))
        await assertSucceeds(updateDoc(kiDoc, stringMap([keysIdenticalFields[kiPath]], ["abcdefg"])))
        await assertFails(deleteDoc(kiDoc))
        await assertSucceeds(getDoc(kiDoc))

        console.log(`Test for authenticated queries on read-update-only (identical keys) doc ${kiDoc.id} passed.`)
    }
}

// Test unauthenticated queries
async function performTestsForUnauthenticatedUser(context: RulesTestContext) {
    const db = context.firestore()

    const allDocs = [...READ_ONLY_PATHS, ...READ_AND_UPDATE_ONLY_PATHS, ...KEYS_IDENTICAL_PATHS].map(path => doc(db, path))

    for (const doc of allDocs) {
        await assertFails(setDoc(doc, NEW_DATA_PAYLOAD))
        await assertFails(updateDoc(doc, NEW_DATA_PAYLOAD))
        await assertFails(deleteDoc(doc))
        await assertFails(getDoc(doc))

        console.log(`Test for unauthenticated queries on doc ${doc.id} passed.`)
    }
}

// Create test environment and perform authenticated tests
initializeTestEnvironment({
    projectId: config.FIRESTORE_PROJECT_ID,
    firestore: {
        rules: fs.readFileSync(`${rootPath}${sep}firestore.rules`, "utf8"),
    },
}).then(async testEnv => {
    testEnv.withSecurityRulesDisabled(async adminContext => {
        await insertMockData(adminContext)
        await performTestsForAuthenticatedUser(testEnv.authenticatedContext("user"))
        await performTestsForUnauthenticatedUser(testEnv.unauthenticatedContext())

        testEnv.cleanup()
    })
}).catch(console.error)