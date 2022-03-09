import { getConfigsFromFirestore } from "../lib/firestore"
import { sleep } from "../lib/utils"

const BUFFER = 1 // seconds

export const discordConfig: Record<string, string> = {}

// Export this promise so other modules can block until the config is loaded
const configPromise = getConfigsFromFirestore()
export const discordConfigBlocker = async () => {
    const configData = await configPromise
    await sleep(BUFFER * 1000)
    return configData
} 

configPromise.then(configData => {
    Object.keys(configData).forEach(key => discordConfig[key] = configData[key])
})