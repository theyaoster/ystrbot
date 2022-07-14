import { URL } from "url"
import converter from "number-to-words"
import _ from "underscore"
import * as dismoji from "discord-emoji"

const EMOJI_NAMES = Object.assign({}, ...Object.values(dismoji))
const CAPTURE_EMOJIS_REGEX = /(:[^:\s]+:|<:[^:\s]+:[0-9]+>|<a:[^:\s]+:[0-9]+>)/gi

// Iterate an array in reverse
export function forEachReverse(array: any[], fn: (element: any) => void) {
    return array.reduceRight((_, element) => fn(element), null)
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

// Attempt to get the name of a file from a direct URL
export function nameFromDirectUrl(url: string) {
    const components = new URL(url)
    const fileName = components.pathname.split("/").find(piece => piece.includes("."))
    if (!fileName) {
        throw new Error(`Not a direct URL: ${url}`)
    }

    return fileName
}

// Evaluate really basic arithmetic with +,-,*,/
export function evalArithmetic(expr: string): number {
    const lastMinus = expr.lastIndexOf("-")
    if (lastMinus >= 0) {
        return evalArithmetic(expr.substring(0, lastMinus)) - evalArithmetic(expr.substring(lastMinus + 1))
    }

    const lastPlus = expr.indexOf("+")
    if (lastPlus >= 0) {
        return evalArithmetic(expr.substring(0, lastPlus)) + evalArithmetic(expr.substring(lastPlus + 1))
    }

    const lastDivide = expr.lastIndexOf("/")
    if (lastDivide >= 0) {
        return evalArithmetic(expr.substring(0, lastDivide)) / evalArithmetic(expr.substring(lastDivide + 1))
    }

    const lastTimes = expr.lastIndexOf("*")
    if (lastDivide >= 0) {
        return evalArithmetic(expr.substring(0, lastTimes)) * evalArithmetic(expr.substring(lastTimes + 1))
    }

    return Number(expr)
}