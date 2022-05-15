import { doc, getDoc, getFirestore, Firestore, updateDoc, deleteField } from "firebase/firestore"
import { initializeApp } from "firebase/app"
import { createHash } from "crypto"
import { GuildMember } from "discord.js"
import _ from "underscore"
const xkcd = require("xkcd-password")

import config from "../config/config"
import { stringMap } from "./data-structure-utils"
import { Collections, Documents, Fields } from "./firestore-schema"
import { getAuth, signInWithEmailAndPassword } from "@firebase/auth"

const PASSWORD_GENERATOR = new xkcd()

const DEFAULT_ROOT_KEY = "data"
const OFFLINE_STATUS = "Offline"
const STATIC_PLAYER_DATA_KEYS = [Fields.DISCORD_ID]

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
const app = initializeApp(FIREBASE_CONFIG)
const db = getFirestore(app)

// In-memory caches
let firestoreConfigs : { [key: string] : string }
let debugData : { [key: string] : string }
let endpoint : string
let ticketOverrides : { [key: string] : string }
let substitutions : { [alternative: string] : string }
let keywordToEmojiIDs : { [agent: string] : string[] }
const playerStaticData : { [name: string]: any } = {}

// Sign in using configured email
export async function signIn() {
    const signInResult = await signInWithEmailAndPassword(getAuth(), config.FIREBASE_EMAIL, config.FIREBASE_SECRET)
    console.log(`Authenticated as ${signInResult.user.email}`)
}

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
        console.error(`Error occurred while calling ${methodName}: ${error}`)
        throw new Error(`${error}`)
    }
}

// Helper functions that initialize caches of db data and fetch the data
const getConfigsFromFirestoreH = async () => firestoreConfigs ??= await retrieveField(db, Collections.CONFIG, Documents.DISCORD_ELEMENTS)
const getDebugH = async () => (await getDoc(doc(db, Collections.CONFIG, Documents.ADMIN))).get(Fields.DEBUG)
const setDebugH = async (newValue: boolean) => updateDoc(doc(db, Collections.CONFIG, Documents.ADMIN), stringMap([Fields.DEBUG], [newValue]))
const getDebugDataH = async () => debugData ??= await retrieveField(db, Collections.CONFIG, Documents.ADMIN, Fields.DEBUG_DATA)
const getEndpointH = async () => endpoint ??= (await getDoc(doc(db, Collections.CONFIG, Documents.ADMIN))).get(Fields.ENDPOINT)
const getPlayerContractInternalH = async (name: string) => (await getDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS))).get(name)[Fields.CONTRACT_AGENT]
const getTicketOverridesH = async () => ticketOverrides ??= await retrieveField(db, Collections.CONFIG, Documents.TICKET_OVERRIDES)
const getKeywordSubstitutionsH = async () => substitutions ??= await retrieveField(db, Collections.KEYWORD_TO_EMOJI, Documents.SUBSTITUTIONS)
const getKeywordEmojiListsH = async () => keywordToEmojiIDs ??= await retrieveField(db, Collections.KEYWORD_TO_EMOJI, Documents.EMOJI_IDS)

// More helper functions that read or update data...

// Retrieve all static player data
async function getPlayerStaticDataH() {
    if (_.isEmpty(playerStaticData)) {
        const document = await getDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS))
        const data = document.data() // pojo
        if (!data) {
            throw new Error("Failed to retrieve player data!")
        } else {
            Object.keys(data).forEach(name => {
                playerStaticData[name] = stringMap(STATIC_PLAYER_DATA_KEYS, STATIC_PLAYER_DATA_KEYS.map(key => data[name][key]))
            })
        }
    }

    return playerStaticData
}

// Authenticate registered player against secret
async function authenticate(name: string, token: string) {
    const document = await getDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS))
    const hash = createHash("sha512").update(token).digest("hex")

    // Fail if registration does not exist or token hash doesn't match
    if (!document.get(name) || document.get(name)[Fields.SECRET] !== hash) {
        console.error(`Bad auth attempt: ${name}, ${token}`)
        throw new Error(`Authentication failed!`)
    }

    return document.get(name)
}

// Get a player's contract
async function getPlayerContractH(name: string, token: string) {
    const oldPlayerData = await authenticate(name, token)
    return oldPlayerData[Fields.CONTRACT_AGENT] as string
}

// Set a player's contract
async function setPlayerContractH(name: string, token: string, contract_agent: string) {
    const oldPlayerData = await authenticate(name, token)
    oldPlayerData[Fields.CONTRACT_AGENT] = contract_agent
    const newData = stringMap([name], [oldPlayerData])

    return updateDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS), newData)
}

// Set a player's contract without auth
async function setPlayerContractInternalH(name: string, contract_agent: string) {
    const oldPlayerData = (await getDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS))).get(name)
    oldPlayerData[Fields.CONTRACT_AGENT] = contract_agent
    const newData = stringMap([name], [oldPlayerData])

    return updateDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS), newData)
}

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
async function setPlayerStatusH(name: string, status: string, status_code: string, token: string) {
    const oldPlayerData = await authenticate(name, token)
    oldPlayerData[Fields.STATUS] = status
    oldPlayerData[Fields.STATUS_CODE] = status_code
    const newData = stringMap([name], [oldPlayerData])

    return updateDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS), newData)
}

// Register a user with a token (if they don't already exist)
export async function registerPlayerH(name: string, id: string) {
    const docRef = doc(db, Collections.GAME_DATA, Documents.PLAYERS)
    const document = await getDoc(docRef)
    if (document.get(name) && document.get(name)[Fields.SECRET]) {
        throw new Error(`${name} is already registered.`)
    }

    const tokenPieces = await PASSWORD_GENERATOR.generate({ numWords: 3, minLength: 4, maxLength: 5 })
    const token = Buffer.from(tokenPieces.join("_"))
    const playerData = stringMap([Fields.SECRET, Fields.DISCORD_ID], [createHash("sha512").update(token).digest("hex"), id])
    const newData = stringMap([name], [playerData])

    // Update cache and database with new player
    playerStaticData[name] = stringMap(STATIC_PLAYER_DATA_KEYS, STATIC_PLAYER_DATA_KEYS.map(key => playerData[key]))
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
export const getPlayerStaticData = () => withHandling({ getPlayerStaticDataH })
export const getDebug = () => withHandling({ getDebugH }) // Whether debug mode is on
export const setDebug = (newValue: boolean) => withHandling({ setDebugH }, newValue) // Toggle debug mode
export const getDebugData = () => withHandling({ getDebugDataH }) // Load debug data
export const getEndpoint = () => withHandling({ getEndpointH }) // Retrieve web endpoint
export const getTicketOverrides = () => withHandling({ getTicketOverridesH }) // Load ticket overrides (when tickets go to different channels)
export const getKeywordSubstitutions = () => withHandling({ getKeywordSubstitutionsH }) // Load map of substitutions (when looking in message content)
export const getKeywordEmojiLists = () => withHandling({ getKeywordEmojiListsH }) // Load map of keyword to emoji lists
export const getPlayerContract = (name: string, token: string) => withHandling({ getPlayerContractH }, name, token) // Get player's contract agent
export const getPlayerContractInternal = (name: string) => withHandling({ getPlayerContractInternalH }, name) // Get player's contract without auth (this is not exposed in an API)
export const setPlayerContract = (name: string, token: string, contract_agent: string) => withHandling({ setPlayerContractH }, name, token, contract_agent) // Set player's contract agent
export const setPlayerContractInternal = (name: string, contract_agent: string) => withHandling({ setPlayerContractInternalH }, name, contract_agent) // Set player's contract agent without auth (this is not exposed in an API)
export const getPlayerStatuses = () => withHandling({ getPlayerStatusesH }) // Retrieve all player statuses
export const setPlayerStatus = (name: string, status: string, status_code: string, token: string) => withHandling({ setPlayerStatusH }, name, status, status_code, token) // Update the status of a single player
export const registerPlayer = (name: string, id: string) => withHandling({ registerPlayerH }, name, id) // Register a user with a token (if they don't already exist)
export const unregisterPlayer = (name: string) => withHandling({ unregisterPlayerH }, name) // Unregister a user, removing their token and status data (if they exist)
export const trackTicket = (author: GuildMember, ticketThreadId: string) => withHandling({ trackTicketH }, author, ticketThreadId) // Track the author of a newly created ticket
export const isTicketAuthor = (author: GuildMember, ticketThreadId: string) => withHandling({ isTicketAuthorH }, author, ticketThreadId) // Check if the given member is the author of the given ticket
export const removeTicket = (ticketThreadId: string) => withHandling({ removeTicketH }, ticketThreadId) // Delete the specified ticket from the db