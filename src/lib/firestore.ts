import { doc, getDoc, getFirestore, Firestore } from "firebase/firestore"
import { initializeApp } from "firebase/app"
import config from "../config/config"

const CONFIG_COLLECTION = "configuration"
const DISCORD_ELEMENTS_DOC = "discord_elements"

const KEYWORD_TO_EMOJI_COLLECTION = "keyword_to_emoji_ids"
const SUBSTITUTIONS_DOC = "substitutions"
const EMOJI_IDS_DOC = "emoji_ids"

const DEFAULT_ROOT_KEY = "data"

const FIREBASE_CONFIG = {
    apiKey: config.FIRESTORE_API_KEY,
    authDomain: "***REMOVED***",
    projectId: "***REMOVED***",
    storageBucket: "***REMOVED***.***REMOVED***",
    messagingSenderId: "***REMOVED***",
    appId: "1:***REMOVED***:web:***REMOVED***",
    measurementId: "***REMOVED***"
};

const app = initializeApp(FIREBASE_CONFIG)
const db = getFirestore(app)

// In-memory caches
let fsConfigs : { [key: string] : string }
let substitutions : { [alternative: string] : string }
let keyword_to_emoji_ids : { [agent: string] : string[] }

// Helper for retrieving a Map-type value from a doc
async function retrieveMapData(db: Firestore, collection: string, docId: string, rootKey = DEFAULT_ROOT_KEY) {
    const document = await getDoc(doc(db, collection, docId))
    return document.get(rootKey)
}

// Load config
export async function getConfigsFromFirestore() {
    if (!fsConfigs) {
        fsConfigs = await retrieveMapData(db, CONFIG_COLLECTION, DISCORD_ELEMENTS_DOC)
    }
    return fsConfigs
}

// Load map of substitutions
export async function getKeywordSubstitutions() {
    if (!substitutions) {
        substitutions = await retrieveMapData(db, KEYWORD_TO_EMOJI_COLLECTION, SUBSTITUTIONS_DOC)
    }
    return substitutions
}

// Load map of keyword to emoji lists
export async function getKeywordEmojiLists() {
    if (!keyword_to_emoji_ids) {
        keyword_to_emoji_ids = await retrieveMapData(db, KEYWORD_TO_EMOJI_COLLECTION, EMOJI_IDS_DOC)
    }
    return keyword_to_emoji_ids
}