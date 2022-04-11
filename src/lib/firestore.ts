import { doc, getDoc, getFirestore, Firestore, updateDoc, deleteField } from "firebase/firestore"
import { initializeApp } from "firebase/app"
import { createHash } from "crypto"
import { GuildMember } from "discord.js"
const xkcd = require("xkcd-password")

import config from "../config/config"
import { stringMap } from "./data-structure-utils"
import { Collections, Documents, Fields } from "./firestore-schema"

const PASSWORD_GENERATOR = new xkcd()

const DEFAULT_ROOT_KEY = "data"
const OFFLINE_STATUS = "Offline"

const FIREBASE_CONFIG = {
    apiKey: config.FIRESTORE_API_KEY,
    authDomain: config.FIRESTORE_AUTH_DOMAIN,
    projectId: config.FIRESTORE_PROJECT_ID,
    storageBucket: config.FIRESTORE_STORAGE_BUCKET,
    messagingSenderId: config.FIRESTORE_MESSAGING_SENDER_ID,
    appId: config.FIRESTORE_APP_ID,
    measurementId: config.FIRESTORE_MEASUREMENT_ID
};

// DB connection
const db = getFirestore(initializeApp(FIREBASE_CONFIG))

// In-memory caches
let firestoreConfigs : { [key: string] : string }
let debugData : { [key: string] : string }
let ticketOverrides : { [key: string] : string }
let substitutions : { [alternative: string] : string }
let keywordToEmojiIDs : { [agent: string] : string[] }

// Helper for retrieving a field's value from a doc
async function retrieveField(db: Firestore, collection: string, docId: string, field = DEFAULT_ROOT_KEY) {
    const document = await getDoc(doc(db, collection, docId))
    return document.get(field)
}

// Wrapper that handles errors to avoid unhandled promise rejection errors
export async function withHandling(methodDict: { [methodId: string]: (...args: any[]) => Promise<any> }, ...args: any[]) {
    const methodName = Object.keys(methodDict)[0]
    const method = methodDict[methodName]

    try {
        const output = args.length > 0 ? await method(...args) : await method()
        return output
    } catch (error) {
        console.error(`Error occured while calling ${methodName}: ${error}`)
        throw new Error(`${error}`)
    }
}

// Helper functions that initialize caches of db data and fetch the data
const getConfigsFromFirestoreH = async () => firestoreConfigs ??= await retrieveField(db, Collections.CONFIG, Documents.DISCORD_ELEMENTS)
const getDebugH = async () => (await getDoc(doc(db, Collections.CONFIG, Documents.ADMIN))).get(Fields.DEBUG)
const setDebugH = async (newValue: boolean) => updateDoc(doc(db, Collections.CONFIG, Documents.ADMIN), stringMap([Fields.DEBUG], [newValue]))
const getDebugDataH = async () => debugData ??= await retrieveField(db, Collections.CONFIG, Documents.ADMIN, Fields.DEBUG_DATA)
const getTicketOverridesH = async () => ticketOverrides ??= await retrieveField(db, Collections.CONFIG, Documents.TICKET_OVERRIDES)
const getKeywordSubstitutionsH = async () => substitutions ??= await retrieveField(db, Collections.KEYWORD_TO_EMOJI, Documents.SUBSTITUTIONS)
const getKeywordEmojiListsH = async () => keywordToEmojiIDs ??= await retrieveField(db, Collections.KEYWORD_TO_EMOJI, Documents.EMOJI_IDS)

// More helper functions that read or update data...

// Retrieve all player statuses
async function getPlayerStatusesH() {
    const document = await getDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS))
    const data = document.data() // pojo
    const filteredData : { [_: string]: string } = {}
    if (!data) {
        throw new Error("Failed to retrieve player statuses!")
    } else {
        Object.keys(data).forEach(name => {
            if (data[name] && data[name][Fields.STATUS] && data[name][Fields.STATUS] !== OFFLINE_STATUS) {
                filteredData[name] = data[name][Fields.STATUS]
            }
        })

        return filteredData
    }
}

// Update the status of a single player
async function setPlayerStatusH(name: string, status: string, token: string) {
    const docRef = doc(db, Collections.GAME_DATA, Documents.PLAYERS)
    const document = await getDoc(docRef)
    const hash = createHash("sha512").update(token).digest("hex")

    // Fail if registration does not exist or token hash doesn't match
    if (!document.get(name) || document.get(name)[Fields.SECRET] !== hash) {
        throw new Error(`Authentication failed! Could not update player status.`)
    }

    const oldData = document.get(name)
    oldData[Fields.STATUS] = status
    const newData = stringMap([name], [oldData])

    return updateDoc(docRef, newData)
}

// Register a user with a token (if they don't already exist)
export async function registerPlayerH(name: string) {
    const docRef = doc(db, Collections.GAME_DATA, Documents.PLAYERS)
    const document = await getDoc(docRef)
    if (document.get(name) && document.get(name)[Fields.SECRET]) {
        throw new Error(`${name} is already registered.`)
    }

    const tokenPieces = await PASSWORD_GENERATOR.generate({ numWords: 3, minLength: 4, maxLength: 5 })
    const token = Buffer.from(tokenPieces.join("_"))
    const playerData = stringMap([Fields.SECRET], [createHash("sha512").update(token).digest("hex")])
    const newData = stringMap([name], [playerData])
    updateDoc(docRef, newData)
    return token
}

// Unregister a user, removing their token and status data (if they exist)
export async function unregisterPlayerH(name: string) {
    const docRef = doc(db, Collections.GAME_DATA, Documents.PLAYERS)
    const document = await getDoc(docRef)
    if (!document.get(name)) {
        throw new Error(`${name} is not registered.`)
    }

    const updateJson = stringMap([name], [deleteField()])
    updateDoc(docRef, updateJson)
}

// Track the author of a newly created ticket
export async function trackTicketH(author: GuildMember, ticketThreadId: string) {
    const newData = stringMap([ticketThreadId], [author.id])
    updateDoc(doc(db, Collections.TICKETS, Documents.AUTHORS), newData)
}

// Check if the given member is the author of the given ticket
export async function isTicketAuthorH(caller: GuildMember, ticketThreadId: string) {
    const docRef = doc(db, Collections.TICKETS, Documents.AUTHORS)
    const document = await getDoc(docRef)
    const authorId = document.get(ticketThreadId)
    return authorId === caller.id
}

// Delete the specified ticket from the db
export async function removeTicketH(ticketThreadId: string) {
    const updateJson = stringMap([ticketThreadId], [deleteField()])
    updateDoc(doc(db, Collections.TICKETS, Documents.AUTHORS), updateJson)
    return true
}

// Same as functions above, but with error handling
export const getConfigsFromFirestore = () => withHandling({ getConfigsFromFirestoreH }) // Load config in db
export const getDebug = () => withHandling({ getDebugH }) // Whether debug mode is on
export const setDebug = (newValue: boolean) => withHandling({ setDebugH }, newValue) // Toggle debug mode
export const getDebugData = () => withHandling({ getDebugDataH }) // Load debug data
export const getTicketOverrides = () => withHandling({ getTicketOverridesH }) // Load ticket overrides (when tickets go to different channels)
export const getKeywordSubstitutions = () => withHandling({ getKeywordSubstitutionsH }) // Load map of substitutions (when looking in message content)
export const getKeywordEmojiLists = () => withHandling({ getKeywordEmojiListsH }) // Load map of keyword to emoji lists
export const getPlayerStatuses = () => withHandling({ getPlayerStatusesH }) // Retrieve all player statuses
export const setPlayerStatus = (name: string, status: string, token: string) => withHandling({ setPlayerStatusH }, name, status, token) // Update the status of a single player
export const registerPlayer = (name: string) => withHandling({ registerPlayerH }, name) // Register a user with a token (if they don't already exist)
export const unregisterPlayer = (name: string) => withHandling({ unregisterPlayerH }, name) // Unregister a user, removing their token and status data (if they exist)
export const trackTicket = (author: GuildMember, ticketThreadId: string) => withHandling({ unregisterPlayerH }, author, ticketThreadId) // Track the author of a newly created ticket
export const isTicketAuthor = (author: GuildMember, ticketThreadId: string) => withHandling({ isTicketAuthorH }, author, ticketThreadId) // Check if the given member is the author of the given ticket
export const removeTicket = (ticketThreadId: string) => withHandling({ removeTicketH }, ticketThreadId) // Delete the specified ticket from the db