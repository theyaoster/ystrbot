import { GuildMember } from "discord.js"

const debuggers = new Set<GuildMember>()

// Whether debug mode is on
export function debugOn(member: GuildMember) {
    return debuggers.has(member)
}

// Toggle debug mode
export async function toggleDebug(member: GuildMember) {
    debugOn(member) ? debuggers.delete(member) : debuggers.add(member)
}