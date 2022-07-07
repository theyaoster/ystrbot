import { doc, getDoc, getFirestore, updateDoc, deleteField, DocumentReference } from "firebase/firestore"
import { initializeApp } from "firebase/app"
import { getAuth, signInWithEmailAndPassword } from "@firebase/auth"
import { createHash } from "crypto"
import { GuildMember } from "discord.js"
import _ from "underscore"
import config from "../config/config"
import { stringMap } from "./util/data-structure-utils"
import { Collections, Documents, Fields } from "../config/firestore-schema"

const DEFAULT_ROOT_KEY = "data"
const OFFLINE_STATUS = "Offline"
const STATIC_PLAYER_DATA_KEYS = [Fields.DISCORD_ID]
const PASSWORD_GENERATOR = require("xkcd-password")()

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
let substitutions : { [alternative: string] : string }
let keywordToEmojiIDs : { [agent: string] : string[] }
const playerStaticData : { [name: string]: any } = {}

// Helper functions //

// Sign in using configured email
export async function signIn() {
    const signInResult = await signInWithEmailAndPassword(getAuth(), config.FIREBASE_EMAIL, config.FIREBASE_SECRET)
    console.log(`Authenticated as ${signInResult.user.email}`)
}

// Wrapper that handles errors to avoid unhandled promise rejection errors
async function _withHandling(methodDict: { [methodId: string]: (...args: any[]) => Promise<any> }, ...args: any[]) {
    const methodName = Object.keys(methodDict)[0]
    const method = methodDict[methodName]

    try {
        const output = args.length > 0 ? await method(...args) : await method()
        return output
    } catch (error: any) {
        console.error(`Error occurred while calling ${methodName}: ${error.stack}`)
        throw new Error(`${error}`)
    }
}

// Helper for retrieving a field's value from a doc
async function _getField(docRef: DocumentReference, field = DEFAULT_ROOT_KEY, defaultValue?: any) {
    const document = await getDoc(docRef)

    if (!document.get(field)) {
        if (!_.isUndefined(defaultValue)) {
            // This allows falsey values other than undefined to be default values
            return defaultValue
        }

        throw new Error(`No such field ${docRef.path}/${field}`)
    }

    return document.get(field)
}

// Helper for setting a single field in a doc - returns whether the field was updated
async function _setField(docRef: DocumentReference, field: string, value: any, replace: boolean = true) {
    if (!replace && (await getDoc(docRef)).get(field)) {
        return false
    }

    updateDoc(docRef, stringMap([field], [value]))
    return true
}

// Helper function for retrieving a single player string field
async function _getPlayerField(name: string, field: string, token?: string) {
    const playerData = token ? await _authenticate(name, token) : await _getField(doc(db, Collections.GAME_DATA, Documents.PLAYERS), name)

    if (!(field in playerData)) {
        throw new Error(`${field} is not a field in ${name}`)
    }

    return playerData[field]
}

// Helper function for setting player string field(s)
async function _setPlayerFields(name: string, fieldMap: { [field: string] : string }, token?: string) {
    const oldPlayerData = token ? await _authenticate(name, token) : await _getField(doc(db, Collections.GAME_DATA, Documents.PLAYERS), name)
    for (const key of Object.keys(fieldMap)) {
        if (!(key in oldPlayerData)) {
            console.log(`Setting previously undefined field ${key} for ${name}.`)
        }

        oldPlayerData[key] = fieldMap[key]
    }
    const newData = stringMap([name], [oldPlayerData])

    return updateDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS), newData)
}

// Helper for pushing values to an array field - returns whether the values were successfully pushed
async function _arrayFieldPush(docRef: DocumentReference, fieldName: string, checkForDuplicates: boolean, ...values: any[]) {
    const currentData = await _getField(docRef, fieldName, [])
    const currentArray = currentData ? currentData : []

    if (checkForDuplicates) {
        const duplicates = values.filter(value => currentArray.includes(value))
        if (!_.isEmpty(duplicates)) {
            console.error(`Could not push values - duplicates found: ${duplicates}`)

            return false
        }
    }

    currentArray.push(...values)
    updateDoc(docRef, stringMap([fieldName], [currentArray]))
    return true
}

// Helper for removing values to an array field - returns whether the values were successfully removed
async function _arrayFieldRemove(docRef: DocumentReference, fieldName: string, ...values: any[]) {
    const currentData = await _getField(docRef, fieldName, null)
    if (!currentData) {
        throw new Error(`${docRef.path}/${fieldName} does not exist.`)
    }

    const currentArray = currentData as any[]

    for (const value of values) {
        const index = currentArray.indexOf(value)
        if (index < 0) {
            console.error(`Value '${value}' does not exist in the array at ${docRef.path}/${fieldName}!`)
            return false
        } else {
            currentArray.splice(index, 1)
        }
    }

    updateDoc(docRef, stringMap([fieldName], [currentArray]))
    return true
}

// Retrieve all static player data
async function _getPlayerStaticDataH() {
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
async function _authenticate(name: string, token: string) {
    const document = await getDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS))
    const hash = createHash("sha512").update(token).digest("hex")

    // Fail if registration does not exist or token hash doesn't match
    if (!document.get(name) || document.get(name)[Fields.SECRET] !== hash) {
        console.error(`Bad auth attempt: ${name}, ${token}`)

        throw new Error(`Authentication failed!`)
    }

    return document.get(name)
}

// Helper functions that initialize caches of db data and fetch the data
const getConfigsFromFirestoreH = async () => firestoreConfigs ??= await _getField(doc(db, Collections.CONFIG, Documents.DISCORD_ELEMENTS))
const getDebugDataH = async () => await _getField(doc(db, Collections.CONFIG, Documents.ADMIN), Fields.DEBUG_DATA)
const getEndpointH = async () => await _getField(doc(db, Collections.CONFIG, Documents.ADMIN), Fields.ENDPOINT)

const getMostRecentPathH = async () => await _getField(doc(db, Collections.JOB_DATA, Documents.PATCH_NOTES_SCRAPER), Fields.MOST_RECENT_PATH)
const setMostRecentPathH = async (newPath: string) => await _setField(doc(db, Collections.JOB_DATA, Documents.PATCH_NOTES_SCRAPER), Fields.MOST_RECENT_PATH, newPath)
const getYoutubeChannelIdH = async (fieldName: string) => await _getField(doc(db, Collections.JOB_DATA, Documents.YOUTUBE_SCRAPER), fieldName)
const getLatestVideoIdH = async (idName: string) => await _getField(doc(db, Collections.JOB_DATA, Documents.YOUTUBE_SCRAPER), idName)
const setLatestVideoIdH = async (idName: string, newId: string) => await _setField(doc(db, Collections.JOB_DATA, Documents.YOUTUBE_SCRAPER), idName, newId)

const unregisterPlayerH = async (name: string) => await updateDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS), stringMap([name], [deleteField()]))
const getPlayerContractInternalH = async (name: string) => await _getPlayerField(name, Fields.CONTRACT_AGENT)
const getPlayerContractH = async (name: string, token: string) => await _getPlayerField(name, Fields.CONTRACT_AGENT, token)
const setPlayerContractInternalH = async (name: string, contract_agent: string) => await _setPlayerFields(name, stringMap([Fields.CONTRACT_AGENT], [contract_agent]))
const setPlayerContractH = async (name: string, token: string, contract_agent: string) => await _setPlayerFields(name, stringMap([Fields.CONTRACT_AGENT], [contract_agent]), token)
const getPlayerIgnH = async (name: string) => await _getPlayerField(name, Fields.IGN)
const setPlayerGameDataH = async (name: string, token: string, ign: string) => await _setPlayerFields(name, stringMap([Fields.IGN], [ign]), token)
const setPlayerStatusH = async (name: string, token: string, status: string, status_code: string) => await _setPlayerFields(name, stringMap([Fields.STATUS, Fields.STATUS_CODE], [status, status_code]), token)

const trackTicketH = async (author: GuildMember, ticketThreadId: string) => await _setField(doc(db, Collections.TICKETS, Documents.AUTHORS), ticketThreadId, author.id)
const isTicketAuthorH = async (caller: GuildMember, ticketThreadId: string) => await _getField(doc(db, Collections.TICKETS, Documents.AUTHORS), ticketThreadId) === caller.id
const removeTicketH = async (ticketThreadId: string) => await updateDoc(doc(db, Collections.TICKETS, Documents.AUTHORS), stringMap([ticketThreadId], [deleteField()]))
const getTicketOverridesH = async () => await _getField(doc(db, Collections.CONFIG, Documents.TICKET_OVERRIDES))
const getKeywordSubstitutionsH = async () => substitutions ??= await _getField(doc(db, Collections.KEYWORD_TO_EMOJI, Documents.SUBSTITUTIONS))
const getKeywordEmojiListsH = async () => keywordToEmojiIDs ??= await _getField(doc(db, Collections.KEYWORD_TO_EMOJI, Documents.EMOJI_IDS))
const commandBanH = async (username: string, commandName: string) => await _arrayFieldPush(doc(db, Collections.MEMBERS, Documents.COMMAND_BANS), username, true, commandName)
const commandUnbanH = async (username: string, commandName: string) => await _arrayFieldRemove(doc(db, Collections.MEMBERS, Documents.COMMAND_BANS), username, commandName)
const isCommandBannedH = async (username: string, commandName: string) => (await _getField(doc(db, Collections.MEMBERS, Documents.COMMAND_BANS), username, []) as string[]).includes(commandName)
const silenceH = async (username: string, endDate: number) => await _setField(doc(db, Collections.MEMBERS, Documents.SILENCES), username, endDate, false)

// Helper functions continued... //

// Retrieve all player statuses
async function getPlayerStatusesH() {
    const data = (await getDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS))).data() // pojo
    if (!data) return {}

    const onlinePlayers = Object.keys(data).filter(name => data[name][Fields.STATUS] && data[name][Fields.STATUS] !== OFFLINE_STATUS)
    return stringMap(onlinePlayers, onlinePlayers.map(name => data[name][Fields.STATUS]))
}

// Register a user with a token (if they don't already exist)
async function registerPlayerH(name: string, id: string) {
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

// Check if a member is silenced, and remove entry if it is expired
async function isSilencedH(username: string) {
    const docRef = doc(db, Collections.MEMBERS, Documents.SILENCES)
    const endDate = await _getField(docRef, username, null)

    if (!endDate || Date.now() >= endDate) {
        if (endDate) updateDoc(docRef, stringMap([username], [deleteField()]))
        return false
    } else {
        return true
    }
}

// Same as functions above, but with error handling
export const getConfigsFromFirestore = () => _withHandling({ getConfigsFromFirestoreH }) // Load config in db
export const getPlayerStaticData = () => _withHandling({ _getPlayerStaticDataH }) // Load player data that doesn't change
export const getDebugData = () => _withHandling({ getDebugDataH }) // Load debug data
export const getEndpoint = () => _withHandling({ getEndpointH }) // Retrieve web endpoint
export const getTicketOverrides = () => _withHandling({ getTicketOverridesH }) // Load ticket overrides (when tickets go to different channels)
export const getKeywordSubstitutions = () => _withHandling({ getKeywordSubstitutionsH }) // Load map of substitutions (when looking in message content)
export const getKeywordEmojiLists = () => _withHandling({ getKeywordEmojiListsH }) // Load map of keyword to emoji lists
export const commandBan = (username: string, commandName: string) => _withHandling({ commandBanH }, username, commandName) // Ban a user from using a certain command
export const commandUnban = (username: string, commandName: string) => _withHandling({ commandUnbanH }, username, commandName) // Unban a user from using a certain command
export const isCommandBanned = (username: string, commandName: string) => _withHandling({ isCommandBannedH }, username, commandName) // Whether a user is banned from using a command
export const silence = (username: string, endDate: number) => _withHandling({ silenceH }, username, endDate) // Silence a member until a given date
export const isSilenced = (username: string) => _withHandling({ isSilencedH }, username) // Check if a member is silenced, and remove entry if it is expired

export const getMostRecentPath = () => _withHandling({ getMostRecentPathH }) // Get the most recent patch notes href path
export const setMostRecentPath = (newPath: string) => _withHandling({ setMostRecentPathH }, newPath) // Set the most recent patch notes href path
export const getYoutubeChannelId = (fieldName: string) => _withHandling({ getYoutubeChannelIdH }, fieldName) // Get a stored Youtube channel ID
export const getLatestVideoId = (idName: string) => _withHandling({ getLatestVideoIdH }, idName) // Get a latest video ID
export const setLatestVideoId = (idName: string, newId: string) => _withHandling({ setLatestVideoIdH }, idName, newId) // Set a latest video ID

export const getPlayerContract = (name: string, token: string) => _withHandling({ getPlayerContractH }, name, token) // Get player's contract agent
export const getPlayerContractInternal = (name: string) => _withHandling({ getPlayerContractInternalH }, name) // Get player's contract without auth (this is not exposed in an API)
export const setPlayerContract = (name: string, token: string, contract_agent: string) => _withHandling({ setPlayerContractH }, name, token, contract_agent) // Set player's contract agent
export const setPlayerContractInternal = (name: string, contract_agent: string) => _withHandling({ setPlayerContractInternalH }, name, contract_agent) // Set player's contract agent without auth (this is not exposed in an API)
export const getPlayerIgn = (name: string) => _withHandling({ getPlayerIgnH }, name) // Get a registered player's ign
export const setPlayerGameData = (name: string, token: string, ign: string) => _withHandling({ setPlayerGameDataH }, name, token, ign) // Set player's in-game data
export const getPlayerStatuses = () => _withHandling({ getPlayerStatusesH }) // Retrieve all player statuses
export const setPlayerStatus = (name: string, token: string, status: string, status_code: string) => _withHandling({ setPlayerStatusH }, name, token, status, status_code) // Update the status of a single player

export const registerPlayer = (name: string, id: string) => _withHandling({ registerPlayerH }, name, id) // Register a user with a token (if they don't already exist)
export const unregisterPlayer = (name: string) => _withHandling({ unregisterPlayerH }, name) // Unregister a user, removing their token and status data (if they exist)
export const trackTicket = (author: GuildMember, ticketThreadId: string) => _withHandling({ trackTicketH }, author, ticketThreadId) // Track the author of a newly created ticket
export const isTicketAuthor = (author: GuildMember, ticketThreadId: string) => _withHandling({ isTicketAuthorH }, author, ticketThreadId) // Check if the given member is the author of the given ticket
export const removeTicket = (ticketThreadId: string) => _withHandling({ removeTicketH }, ticketThreadId) // Delete the specified ticket from the db