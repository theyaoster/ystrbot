
import converter from "number-to-words"
const toEmoji = require("emoji-name-map")

const CAPTURE_EMOJIS_REGEX = /(:[^:\s]+:|<:[^:\s]+:[0-9]+>|<a:[^:\s]+:[0-9]+>)/gi

// Idle wait
export async function sleep(milliseconds: number) {
    await new Promise(f => setTimeout(f, milliseconds))
}

// The current time with just hours and minutes
export async function currentTime(addMinutes?: number) {
    const options: { [key: string] : string } = {
        timeZone: "PDT",
        timeZoneName: "short",
        hour: "numeric",
        minute: "numeric"
    }

    const minutes = addMinutes || 0
    return new Date(Date.now().valueOf() + minutes * 60 * 1000).toLocaleString("en-US", options)
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
        return [toEmoji.get(converter.toWords(number))]
    } else {
        return [toEmoji.get("arrow_forward"), toEmoji.get(converter.toWords(10))]
    }
}

// Convert an array of strings into a comma separated list, with "and" inserted as needed
export function readableArray(array: string[]) {
    return array.reduce((a, b, i, array) => a + (i < array.length - 1 ? ', ' : ' and ') + b)
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
