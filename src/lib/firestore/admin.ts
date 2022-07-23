import { GuildMember, Snowflake } from "discord.js"
import { doc } from "firebase/firestore"
import { Collections, Documents } from "../../config/firestore-schema"
import { setField, getField, arrayFieldPush, arrayFieldRemove, removeField } from "./common"
import { db } from "./store"

const authorsDocRef = doc(db, Collections.TICKETS, Documents.AUTHORS)
const commandBansDocRef = doc(db, Collections.MEMBERS, Documents.COMMAND_BANS)
const silencesDocRef = doc(db, Collections.MEMBERS, Documents.SILENCES)

export const trackTicket = async (author: GuildMember, ticketThreadId: Snowflake) => await setField<Snowflake>(authorsDocRef, ticketThreadId, author.id)
export const isTicketAuthor = async (caller: GuildMember, ticketThreadId: Snowflake) => await getField<Snowflake>(authorsDocRef, ticketThreadId) === caller.id
export const removeTicket = async (ticketThreadId: string) => await removeField(authorsDocRef, ticketThreadId)

export const commandBan = async (username: string, commandName: string) => await arrayFieldPush<string>(commandBansDocRef, username, true, commandName)
export const commandUnban = async (username: string, commandName: string) => await arrayFieldRemove(commandBansDocRef, username, true, commandName)
export const isCommandBanned = async (username: string, commandName: string) => (await getField<string[]>(commandBansDocRef, username, [])).includes(commandName)
export const silence = async (username: string, endDate: number) => await setField<Object>(silencesDocRef, username, endDate, false)

// Check if a member is silenced, and remove entry if it is expired
export async function isSilenced(username: string) {
    const docRef = doc(db, Collections.MEMBERS, Documents.SILENCES)
    const endDate = await getField(docRef, username, null)

    if (!endDate || Date.now() >= endDate) {
        if (endDate) removeField(docRef, username)
        return false
    } else {
        return true
    }
}
