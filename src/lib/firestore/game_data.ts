import { updateDoc, doc, getDoc } from "firebase/firestore"
import { createHash } from "crypto"
import { Collections, Documents, Fields } from "../../config/firestore-schema"
import { stringMap } from "../util/data-structure-utils"
import { getPlayerField, removeField, setPlayerFields } from "./common"
import { db } from "./store"
import { clearCaches } from "./configuration"

const OFFLINE_STATUS = "Offline"
const PASSWORD_GENERATOR = require("xkcd-password")()

const playersDocRef = doc(db, Collections.GAME_DATA, Documents.PLAYERS)

export const unregisterPlayer = async (name: string) => await removeField(playersDocRef, name)
export const getPlayerContractInternal = async (name: string) => await getPlayerField(name, Fields.CONTRACT_AGENT)
export const getPlayerContract = async (name: string, token: string) => await getPlayerField(name, Fields.CONTRACT_AGENT, token)
export const setPlayerContractInternal = async (name: string, contract_agent: string) => await setPlayerFields(name, stringMap([Fields.CONTRACT_AGENT], [contract_agent]))
export const setPlayerContract = async (name: string, token: string, contract_agent: string) => await setPlayerFields(name, stringMap([Fields.CONTRACT_AGENT], [contract_agent]), token)
export const getPlayerIgn = async (name: string) => await getPlayerField(name, Fields.IGN)
export const setPlayerGameData = async (name: string, token: string, ign: string) => await setPlayerFields(name, stringMap([Fields.IGN], [ign]), token)
export const setPlayerStatus = async (name: string, token: string, status: string, status_code: string) => await setPlayerFields(name, stringMap([Fields.STATUS, Fields.STATUS_CODE], [status, status_code]), token)

// Register a user with a token (if they don't already exist)
export async function registerPlayer(name: string, id: string) {
    const document = await getDoc(playersDocRef)
    if (document.get(name) && document.get(name)[Fields.SECRET]) {
        throw new Error(`${name} is already registered.`)
    }

    const tokenPieces = await PASSWORD_GENERATOR.generate({ numWords: 3, minLength: 4, maxLength: 5 })
    const token = Buffer.from(tokenPieces.join("_"))
    const playerData = stringMap([Fields.SECRET, Fields.DISCORD_ID], [createHash("sha512").update(token).digest("hex"), id])
    const newData = stringMap([name], [playerData])

    // Update cache and database with new player
    clearCaches()
    updateDoc(playersDocRef, newData)

    return token
}

// Retrieve all player statuses
export async function getPlayerStatuses() {
    const data = (await getDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS))).data() // pojo
    if (!data) return {}

    const onlinePlayers = Object.keys(data).filter(name => data[name][Fields.STATUS] && data[name][Fields.STATUS] !== OFFLINE_STATUS)
    return stringMap(onlinePlayers, onlinePlayers.map(name => data[name][Fields.STATUS]))
}