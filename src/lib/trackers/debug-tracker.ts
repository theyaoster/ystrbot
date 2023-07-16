import { Snowflake } from "discord.js"

const debuggers = new Set<Snowflake>()

// Whether debug mode is on
export function debugOn(memberId: Snowflake) {
    return debuggers.has(memberId)
}

// Toggle debug mode
export function toggleDebug(memberId: Snowflake) {
    let on = debugOn(memberId)
    if (on) {
        debuggers.delete(memberId)
    } else {
        debuggers.add(memberId)
    }

    console.debug(`Debug mode is now ${on ? "off" : "on"} for ${memberId}`)
}