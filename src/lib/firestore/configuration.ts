import { Snowflake } from "discord.js"
import { doc, getDoc } from "firebase/firestore"
import _ from "underscore"
import { Collections, Documents, Fields } from "../../config/firestore-schema"
import { stringMap } from "../util/data-structure-utils"
import { getField } from "./common"
import { db } from "./store"

const STATIC_PLAYER_DATA_KEYS = [Fields.DISCORD_ID]

const discordElementsDocRef = doc(db, Collections.CONFIG, Documents.DISCORD_ELEMENTS)
const adminDocRef = doc(db, Collections.CONFIG, Documents.ADMIN)
const ticketOverridesDocRef = doc(db, Collections.CONFIG, Documents.TICKET_OVERRIDES)
const substitutionsDocRef = doc(db, Collections.KEYWORD_TO_EMOJI, Documents.SUBSTITUTIONS)
const keywordEmojisDocRef = doc(db, Collections.KEYWORD_TO_EMOJI, Documents.EMOJI_IDS)

let playerStaticData : { [name: string]: any } = {}

let firestoreConfigs : { [key: string] : string }
let substitutions : { [alternative: string] : string }
let keywordToEmojiIDs : { [agent: string] : string[] }

export function clearCaches() {
    playerStaticData = {}
}

export const getConfigsFromFirestore = async () => firestoreConfigs ??= await getField<{ [key: string] : string }>(discordElementsDocRef)
export const getDebugData = async () => await getField<{ [key: string] : string }>(adminDocRef, Fields.DEBUG_DATA)
export const getEndpoint = async () => await getField<string>(adminDocRef, Fields.ENDPOINT)
export const getTicketOverrides = async () => await getField<{ [ticket: Snowflake] : Snowflake }>(ticketOverridesDocRef)
export const getKeywordSubstitutions = async () => substitutions ??= await getField<{ [alternative: string] : string }>(substitutionsDocRef)
export const getKeywordEmojiLists = async () => keywordToEmojiIDs ??= await getField<{ [agent: string] : string[] }>(keywordEmojisDocRef)

// Retrieve all static player data
export async function getPlayerStaticData() {
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