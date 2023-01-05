import { GuildMember, Snowflake } from "discord.js"
import { doc } from "firebase/firestore"
import _ from "underscore"
import { Collections, Documents, AudioRequest, Fields } from "../../config/firestore-schema"
import { botChannel, message } from "../util/discord-utils"
import { arrayFieldPop, arrayFieldPush, getField, setField } from "./common"
import { db } from "./store"

const VOTE_FRACTION_NEEDED = 0.5

const audioDocRef = doc(db, Collections.TRACKING, Documents.AUDIO)

export const getQueue = async () => await getField<AudioRequest[]>(audioDocRef, Fields.QUEUE)
export const clearQueue = async () => await setField<AudioRequest[]>(audioDocRef, Fields.QUEUE, [])
export const getCurrentRequest = async () => await getField<AudioRequest>(audioDocRef, Fields.CURRENT_REQUEST)
export const setCurrentMessageId = async (messageId: Snowflake) => await setField<Snowflake>(audioDocRef, Fields.CURRENT_MESSAGE_ID, messageId)
export const getCurrentMessage = async (member?: GuildMember) => await message(await botChannel(member), await getField<Snowflake>(audioDocRef, Fields.CURRENT_MESSAGE_ID))
export const pushSkipVote = async (name: string) => await arrayFieldPush<string>(audioDocRef, `${Fields.CURRENT_REQUEST}.skipVotes`, true, name)
export const skipVotesNeeded = async () => await getField<number>(audioDocRef, Fields.SKIP_VOTES_NEEDED)
export const updateSkipVotesNeeded = async (total: number) => await setField<number>(audioDocRef, Fields.SKIP_VOTES_NEEDED, Math.max(1, Math.floor((total - 1) * VOTE_FRACTION_NEEDED)))
export const pushAudioRequest = async (request: AudioRequest) => await arrayFieldPush<AudioRequest>(audioDocRef, Fields.QUEUE, false, request)

export async function popAudioRequest() {
    const request = await arrayFieldPop<AudioRequest>(audioDocRef, Fields.QUEUE)
    await setField(audioDocRef, Fields.CURRENT_REQUEST, null)
    setField(audioDocRef, Fields.CURRENT_REQUEST, request) // Update current request
    return request
}