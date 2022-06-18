import { URL } from "url"
import converter from "number-to-words"
import _ from "underscore"
import * as dismoji from "discord-emoji"
import * as commandModules from "../../commands/index"

const EMOJI_NAMES = Object.assign({}, ...Object.values(dismoji))
const CAPTURE_EMOJIS_REGEX = /(:[^:\s]+:|<:[^:\s]+:[0-9]+>|<a:[^:\s]+:[0-9]+>)/gi

// Idle wait in ms
export async function sleep(milliseconds: number) {
    await new Promise(f => setTimeout(f, milliseconds))
}

// Idle wait in seconds
export async function sleepSeconds(seconds: number) {
    await sleep(seconds * 1000)
}

// Idle wait in minutes
export async function sleepMinutes(minutes: number) {
    await sleep(minutes * 60 * 1000)
}

// Idle wait in hours
export async function sleepHours(hours: number) {
    await sleep(hours * 60 * 60 * 1000)
}

// Filters custom emojis out of a string
export function withoutEmojis(message: string) {
    return message.replaceAll(CAPTURE_EMOJIS_REGEX, "")
 }

// Convert number into the appropriate unicode emoji(s)
export function numToEmoji(number: number): string[] {
    if (number < 0) {
        throw new Error("Input out of range: must be nonnegative.")
    } else if (number <= 10) {
        return [EMOJI_NAMES[(number === 10 ? "keycap_" : "") + converter.toWords(number)]]
    } else {
        return [EMOJI_NAMES["arrow_forward"], EMOJI_NAMES["keycap_ten"]]
    }
}

// Just get emoji by name
export function nameToEmoji(name: string) {
    return EMOJI_NAMES[name] as string
}

// Convert an array of strings into a comma separated list, with "and" inserted as needed
export function readableArray(array: string[]) {
    return _.isEmpty(array) ? "" : array.reduce((a, b, i, array) => a + (i < array.length - 1 ? ', ' : ' and ') + b)
}

// Create an object from the string keys and values
export function stringMap(keys: string[], values: any[]) {
    if (keys.length !== values.length) {
        throw new Error("Keys and values must have the same length.")
    }

    const obj : { [key: string]: any } = {}
    for (const i of Array(keys.length).keys()) {
        obj[keys[i]] = values[i]
    }

    return obj
}

// Generate a timecode hh:mm:ss from a total number of seconds
export function timeCode(seconds: number) {
    const hours = String(Math.floor(seconds / 3600)).padStart(2, "0")
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")
    const remainder = String(seconds % 60).padStart(2, "0")
    return `${hours}:${minutes}:${remainder}`
}

// Convert a total number of minutes to a readable form
export function readableTimeMinutes(minutes: number) {
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60
    return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`
}

// Convert a total number of seconds to a readable form
export function readableTimeSeconds(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const remainder = seconds % 60
    return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`
}

// Whether a string corresponds to a command defined in src/commands
export function isCommand(commandName: string) {
    return commandName in Object(commandModules)
}

// Attempt to get the name of a file from a direct URL
export function nameFromDirectUrl(url: string) {
    const components = new URL(url)
    const fileName = components.pathname.split("/").find(piece => piece.includes("."))
    if (!fileName) {
        throw new Error(`Not a direct URL: ${url}`)
    }

    return fileName
}
