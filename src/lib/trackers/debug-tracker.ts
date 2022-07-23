import { Snowflake } from "discord.js"

const debuggers = new Set<Snowflake>()

// Whether debug mode is on
export function debugOn(memberId: Snowflake) {
    return debuggers.has(memberId)
}

// Toggle debug mode
export function toggleDebug(memberId: Snowflake) {
    debugOn(memberId) ? debuggers.delete(memberId) : debuggers.add(memberId)

    console.debug(`Debug mode is now on for ${memberId}`)
}