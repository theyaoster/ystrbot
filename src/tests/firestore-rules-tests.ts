import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestContext } from "@firebase/rules-unit-testing"
import { doc, getDoc, setDoc, updateDoc, deleteDoc, setLogLevel } from "firebase/firestore"
import { readFileSync } from "fs"

import config from "../config/config"
import { Collections, Documents, Fields } from "../config/firestore-schema"
import { stringMap } from "../lib/util/data-structure-utils"

// Workaround to avoid warnings in test output...
setLogLevel("error")

// const SLEEP_TIME = 5000 // ms
const TEST_DATA1 = { "something": "random" }
const TEST_DATA2 = { "something": "random", "and": "more" }

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
    ]

    for (const roDoc of readOnlyDocs) {
        console.log(`Testing read-only doc ${roDoc.id}`)
        await assertFails(setDoc(roDoc, TEST_DATA2))
        await assertFails(updateDoc(roDoc, TEST_DATA2))
        await assertFails(deleteDoc(roDoc))
        await assertSucceeds(getDoc(roDoc))
    }

    for (const ruoDoc of readUpdateOnlyDocs) {
        console.log(`Testing read-and-update-only doc ${ruoDoc.id}`)
        await assertFails(setDoc(ruoDoc, TEST_DATA2))
        await assertSucceeds(updateDoc(ruoDoc, TEST_DATA2))
        await assertFails(deleteDoc(ruoDoc))
        await assertSucceeds(getDoc(ruoDoc))
    }

    // Allow toggling debug
    const adminDoc = doc(db, `/${Collections.CONFIG}/${Documents.ADMIN}`)
    await assertSucceeds(updateDoc(adminDoc, stringMap([Fields.DEBUG], [true])))
    await assertFails(updateDoc(adminDoc, stringMap([Fields.DEBUG, "test"], [false, "data"])))
}

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
    ]

    for (const doc of allDocs) {
        await assertFails(setDoc(doc, TEST_DATA1))
        await assertFails(updateDoc(doc, TEST_DATA1))
        await assertFails(deleteDoc(doc))
        await assertFails(getDoc(doc))
    }
}

// Create test environment and perform authenticated tests
initializeTestEnvironment({
    projectId: config.FIRESTORE_PROJECT_ID,
    firestore: {
        rules: readFileSync("firestore.rules", "utf8"),
    },
}).then(async testEnv => {
    const authenticatedContext = testEnv.authenticatedContext("user")
    await performTestsForAuthenticatedUser(authenticatedContext)

    const unauthenticatedContext = testEnv.unauthenticatedContext()
    await performTestsForUnauthenticatedUser(unauthenticatedContext)

    testEnv.cleanup()
}).catch(console.error)