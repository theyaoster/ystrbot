import { doc, getDoc, getFirestore, Firestore, updateDoc, deleteField } from "firebase/firestore"
import { initializeApp } from "firebase/app"
import { createHash } from "crypto"
import config from "../config/config"
import { GuildMember } from "discord.js"
const xkcd = require("xkcd-password")

const PASSWORD_GENERATOR = new xkcd()

const CONFIG_COLLECTION = "configuration"
const DISCORD_ELEMENTS_DOC = "discord_elements"
const TICKET_OVERRIDES_DOC = "ticket_overrides"
const ADMIN_DOC = "admin"
const DEBUG_FIELD = "debug"
const DEBUG_DATA_FIELD = "debug_data"

const KEYWORD_TO_EMOJI_COLLECTION = "keyword_to_emoji_ids"
const SUBSTITUTIONS_DOC = "substitutions"
const EMOJI_IDS_DOC = "emoji_ids"

const DEFAULT_ROOT_KEY = "data"

const GAME_DATA_COLLECTION = "game_data"
const PLAYERS_DOC = "players"
const OFFLINE_STATUS = "Offline"
const STATUS_FIELD = "status"
const SECRET_FIELD = "secret"

const TICKETS_COLLECTION = "tickets"
const AUTHORS_DOC = "authors"

const FIREBASE_CONFIG = {
    apiKey: config.FIRESTORE_API_KEY,
    authDomain: config.FIRESTORE_AUTH_DOMAIN,
    projectId: config.FIRESTORE_PROJECT_ID,
    storageBucket: config.FIRESTORE_STORAGE_BUCKET,
    messagingSenderId: config.FIRESTORE_MESSAGING_SENDER_ID,
    appId: config.FIRESTORE_APP_ID,
    measurementId: config.FIRESTORE_MEASUREMENT_ID
};

const app = initializeApp(FIREBASE_CONFIG)
const db = getFirestore(app)

// In-memory caches
let fsConfigs : { [key: string] : string }
let debugData : { [key: string] : string }
let ticketOverrides : { [key: string] : string }
let substitutions : { [alternative: string] : string }
let keywordToEmojiIDs : { [agent: string] : string[] }

// Helper for retrieving a field's value from a doc
async function retrieveField(db: Firestore, collection: string, docId: string, field = DEFAULT_ROOT_KEY) {
    const document = await getDoc(doc(db, collection, docId))
    return document.get(field)
}

// Load config
export async function getConfigsFromFirestore() {
    if (!fsConfigs) {
        fsConfigs = await retrieveField(db, CONFIG_COLLECTION, DISCORD_ELEMENTS_DOC)
    }
    return fsConfigs
}

// Load debug data
export async function getDebugData() {
    if (!debugData) {
        debugData = await retrieveField(db, CONFIG_COLLECTION, ADMIN_DOC, DEBUG_DATA_FIELD)
    }
    return debugData
}

// Load ticket overrides (when tickets go to different channels)
export async function getTicketOverrides() {
    if (!ticketOverrides) {
        ticketOverrides = await retrieveField(db, CONFIG_COLLECTION, TICKET_OVERRIDES_DOC)
    }
    return ticketOverrides
}

// Load map of substitutions
export async function getKeywordSubstitutions() {
    if (!substitutions) {
        substitutions = await retrieveField(db, KEYWORD_TO_EMOJI_COLLECTION, SUBSTITUTIONS_DOC)
    }
    return substitutions
}

// Load map of keyword to emoji lists
export async function getKeywordEmojiLists() {
    if (!keywordToEmojiIDs) {
        keywordToEmojiIDs = await retrieveField(db, KEYWORD_TO_EMOJI_COLLECTION, EMOJI_IDS_DOC)
    }
    return keywordToEmojiIDs
}

// Retrieve all player statuses
export async function getPlayerStatuses() {
    const document = await getDoc(doc(db, GAME_DATA_COLLECTION, PLAYERS_DOC))
    const data = document.data() // pojo
    const filteredData : { [_: string]: string } = {}
    if (!data) {
        throw new Error("Failed to retrieve player statuses!")
    } else {
        Object.keys(data).forEach(name => {
            if (data[name] && data[name][STATUS_FIELD] && data[name][STATUS_FIELD] !== OFFLINE_STATUS) {
                filteredData[name] = data[name][STATUS_FIELD]
            }
        })

        return filteredData
    }
}

// Update the status of a single player
export async function setPlayerStatus(name: string, status: string, token: string) {
    const docRef = doc(db, GAME_DATA_COLLECTION, PLAYERS_DOC)
    const document = await getDoc(docRef)
    const hash = createHash("sha512").update(token).digest("hex")

    // Fail if registration does not exist or token hash doesn't match
    if (!document.get(name) || document.get(name)[SECRET_FIELD] !== hash) {
        throw new Error(`Authentication failed! Could not update player status.`)
    }

    const oldData = document.get(name)
    oldData[STATUS_FIELD] = status
    const newData : { [_: string]: any } = {}
    newData[name] = oldData
    return updateDoc(docRef, newData)
}

// Register a user with a token (if they don't already exist)
export async function registerPlayer(name: string) {
    const docRef = doc(db, GAME_DATA_COLLECTION, PLAYERS_DOC)
    const document = await getDoc(docRef)
    if (document.get(name) && document.get(name)[SECRET_FIELD]) {
        throw new Error(`${name} is already registered.`)
    }

    const playerData : { [_: string]: any } = {}
    const tokenPieces = await PASSWORD_GENERATOR.generate({ numWords: 3, minLength: 4, maxLength: 5 })
    const token = Buffer.from(tokenPieces.join("_"))
    playerData[SECRET_FIELD] = createHash("sha512").update(token).digest("hex")
    const newData : { [_: string]: any } = {}
    newData[name] = playerData
    updateDoc(docRef, newData)
    return token
}

// Unregister a user, removing their token and status data (if they exist)
export async function unregisterPlayer(name: string) {
    const docRef = doc(db, GAME_DATA_COLLECTION, PLAYERS_DOC)
    const document = await getDoc(docRef)
    if (!document.get(name)) {
        throw new Error(`${name} is not registered.`)
    }

    const updateJson : { [_: string]: any } = {}
    updateJson[name] = deleteField()
    updateDoc(docRef, updateJson)
}

// Track the author of a newly created ticket
export async function trackTicket(author: GuildMember, ticketThreadId: string) {
    const newData : { [_: string]: any } = {}
    newData[ticketThreadId] = author.id
    updateDoc(doc(db, TICKETS_COLLECTION, AUTHORS_DOC), newData)
}

// Check if the given member is the author of the given ticket
export async function isTicketAuthor(caller: GuildMember, ticketThreadId: string) {
    const docRef = doc(db, TICKETS_COLLECTION, AUTHORS_DOC)
    const document = await getDoc(docRef)
    const authorId = document.get(ticketThreadId)
    return authorId === caller.id
}

// Delete the specified ticket from the db
export async function removeTicket(ticketThreadId: string) {
    const updateJson : { [_: string]: any } = {}
    updateJson[ticketThreadId] = deleteField()
    updateDoc(doc(db, TICKETS_COLLECTION, AUTHORS_DOC), updateJson)
    return true
}

// Check whether debug mode is on
export async function getDebug() {
    const document = await getDoc(doc(db, CONFIG_COLLECTION, ADMIN_DOC))
    return document.get(DEBUG_FIELD)
}

// Toggles debug mode
export async function toggleDebug() {
    const currentDebug = await getDebug() as boolean
    const newData : { [_: string]: any } = {}
    newData[DEBUG_FIELD] = !currentDebug
    updateDoc(doc(db, CONFIG_COLLECTION, ADMIN_DOC), newData)
    return !currentDebug
}