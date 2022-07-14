import { GuildMember, Snowflake } from "discord.js"

const debuggers = new Set<Snowflake>()

// Whether debug mode is on
export function debugOn(member: GuildMember) {
    return debuggers.has(member.id)
}

// Toggle debug mode
export function toggleDebug(member: GuildMember) {
    debugOn(member) ? debuggers.delete(member.id) : debuggers.add(member.id)
}