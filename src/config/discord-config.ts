import { GuildMember } from "discord.js"
import _ from "underscore"
import { getConfigsFromFirestore, getDebugData, signIn } from "../lib/firestore"
import { debugOn } from "../lib/trackers/debug-tracker"
import { wait } from "../lib/util/async-utils"

const discordConfig : Record<string, string> = {}
const debugConfig : Record<string, string> = {}

export function getConfig(member?: GuildMember) {
    if (!member) return discordConfig
    return debugOn(member) ? debugConfig : discordConfig
}

// Export this promise so other modules can block until the config is loaded
export async function waitForDiscordConfig() {
    while (!loaded) {
        await wait()
    }
}

let signedIn = false
let loaded = false

export function signInAndLoadDiscordConfig() {
    if (signedIn) {
        console.error("Already signed in. Skipping...")
        return
    }

    signIn().then(async () => {
        signedIn = true

        // Populate discord config
        const configData = await getConfigsFromFirestore()
        Object.keys(configData).forEach(key => discordConfig[key] = configData[key])

        // Populate debug config
        const debugData = await getDebugData()
        Object.keys(discordConfig).forEach(key => debugConfig[key] = debugData[key] ? debugData[key] : discordConfig[key])

        console.log("Configs successfully loaded from Firestore.")

        loaded = true
    })
}