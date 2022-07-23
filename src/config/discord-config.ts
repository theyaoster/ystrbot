import { GuildMember } from "discord.js"
import _ from "underscore"
import { signIn } from "../lib/firestore/common"
import { getConfigsFromFirestore, getDebugData } from "../lib/firestore/configuration"
import { debugOn } from "../lib/trackers/debug-tracker"
import { wait } from "../lib/util/async-utils"

const discordConfig : Record<string, string> = {}
const debugConfig : Record<string, string> = {}

export function getConfig(member?: GuildMember) {
    if (!member) return discordConfig
    return debugOn(member.id) ? debugConfig : discordConfig
}

// Export this promise so other modules can block until the config is loaded
export async function waitForDiscordConfig() {
    while (!loaded) {
        await wait()
    }
}

let signedIn = false
let loaded = false

export async function signInAndLoadDiscordConfig() {
    if (signedIn) {
        console.error("Already signed in. Skipping...")
        return
    }

    await signIn().then(async () => {
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