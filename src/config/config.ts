import dotenv from "dotenv"

// Custom required environment variables
const LOCAL_ENV_VARIABLE_NAMES = [
    "DISCORD_TOKEN",
    "FIRESTORE_API_KEY",
    "FIRESTORE_AUTH_DOMAIN",
    "FIRESTORE_PROJECT_ID",
    "FIRESTORE_STORAGE_BUCKET",
    "FIRESTORE_MESSAGING_SENDER_ID",
    "FIRESTORE_APP_ID",
    "FIRESTORE_MEASUREMENT_ID",
    "FIREBASE_EMAIL",
    "FIREBASE_SECRET"
]

// Attempt to load variables from local .env
const loadLocalConfigResult = dotenv.config()

const configVariables = process.env
if (loadLocalConfigResult.error) {
    console.log(`No .env file found - will assume environment variables are already present.`)
}

const config: Record<string, string> = {}
LOCAL_ENV_VARIABLE_NAMES.forEach(varName => {
    if (!configVariables[varName]) {
        throw new Error(`Missing required env variable ${varName}!`)
    } else {
        config[varName] = configVariables[varName]!
    }
})

export default config