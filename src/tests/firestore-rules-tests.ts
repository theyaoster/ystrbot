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

// Helper for initializing emulator data
function insertMockData(context: RulesTestContext) {
    const db = context.firestore()

    // Populate emulator with data
    return Promise.all(Object.keys(MOCK_DATA).flatMap(collection => Object.keys(MOCK_DATA[collection]).map(document => db.doc(`/${collection}/${document}`).set(MOCK_DATA[collection][document]))))
}

// Test authenticated queries
async function performTestsForAuthenticatedUser(context: RulesTestContext) {
    const db = context.firestore()

    const readOnlyDocs = [
        doc(db, `/${Collections.CONFIG}/${Documents.ADMIN}`),
        doc(db, `/${Collections.CONFIG}/${Documents.DISCORD_ELEMENTS}`),
        doc(db, `/${Collections.CONFIG}/${Documents.TICKET_OVERRIDES}`),
        doc(db, `/${Collections.KEYWORD_TO_EMOJI}/${Documents.EMOJI_IDS}`),
        doc(db, `/${Collections.KEYWORD_TO_EMOJI}/${Documents.SUBSTITUTIONS}`),
    ]

    const readUpdateOnlyDocs = [
        doc(db, `/${Collections.GAME_DATA}/${Documents.PLAYERS}`),
        doc(db, `/${Collections.TICKETS}/${Documents.AUTHORS}`),
        doc(db, `/${Collections.MEMBERS}/${Documents.COMMAND_BANS}`),
    ]

    for (const roDoc of readOnlyDocs) {
        console.log(`Testing authenticated queries on read-only doc ${roDoc.id}`)

        await assertFails(setDoc(roDoc, NEW_DATA_PAYLOAD))
        await assertFails(setDoc(roDoc, NEW_DATA_PAYLOAD, { merge: true }))
        await assertFails(updateDoc(roDoc, NEW_DATA_PAYLOAD))
        await assertFails(deleteDoc(roDoc))
        await assertSucceeds(getDoc(roDoc))
    }

    for (const ruoDoc of readUpdateOnlyDocs) {
        console.log(`Testing authenticated queries on read-and-update-only doc ${ruoDoc.id}`)

        await assertFails(setDoc(ruoDoc, NEW_DATA_PAYLOAD, { merge: false }))
        await assertSucceeds(setDoc(ruoDoc, NEW_DATA_PAYLOAD, { merge: true }))
        await assertSucceeds(updateDoc(ruoDoc, NEW_DATA_PAYLOAD))
        await assertFails(deleteDoc(ruoDoc))
        await assertSucceeds(getDoc(ruoDoc))
    }

    // Allow toggling debug
    const adminDoc = doc(db, `/${Collections.CONFIG}/${Documents.ADMIN}`)
    await assertSucceeds(updateDoc(adminDoc, stringMap([Fields.DEBUG], [true])))
    await assertFails(updateDoc(adminDoc, stringMap([Fields.DEBUG, "test"], [false, "data"])))
}

// Test unauthenticated queries
async function performTestsForUnauthenticatedUser(context: RulesTestContext) {
    const db = context.firestore()

    const allDocs = [
        doc(db, `/${Collections.CONFIG}/${Documents.ADMIN}`),
        doc(db, `/${Collections.CONFIG}/${Documents.DISCORD_ELEMENTS}`),
        doc(db, `/${Collections.CONFIG}/${Documents.TICKET_OVERRIDES}`),
        doc(db, `/${Collections.KEYWORD_TO_EMOJI}/${Documents.EMOJI_IDS}`),
        doc(db, `/${Collections.KEYWORD_TO_EMOJI}/${Documents.SUBSTITUTIONS}`),
        doc(db, `/${Collections.GAME_DATA}/${Documents.PLAYERS}`),
        doc(db, `/${Collections.TICKETS}/${Documents.AUTHORS}`),
        doc(db, `/${Collections.MEMBERS}/${Documents.COMMAND_BANS}`),
    ]

    for (const doc of allDocs) {
        console.log(`Testing unauthenticated queries on doc ${doc.id}`)

        await assertFails(setDoc(doc, NEW_DATA_PAYLOAD))
        await assertFails(updateDoc(doc, NEW_DATA_PAYLOAD))
        await assertFails(deleteDoc(doc))
        await assertFails(getDoc(doc))
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