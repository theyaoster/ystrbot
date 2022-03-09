import dotenv from "dotenv"

// Custom required environment variables
const LOCAL_ENV_VARIABLE_NAMES = [
    "DISCORD_TOKEN",
    "FIRESTORE_API_KEY",
]

dotenv.config()
const configVariables = process.env // load all local env variables

const config: Record<string, string> = {}
LOCAL_ENV_VARIABLE_NAMES.forEach(varName => {
    if (!configVariables[varName]) {
        throw new Error(`Missing required .env variable ${varName}!`)
    } else {
        config[varName] = configVariables[varName]!
    }
})

export default config