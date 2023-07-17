const dotenv = require("dotenv").config()

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
    "FIREBASE_SECRET",
    "DEBUGGERS",
]

if (dotenv.error) {
    console.log(`No .env file found - will assume environment variables are already present.`)
} else {
    console.log(`Loaded configs from .env.`)
}

const config: Record<string, string> = {}
LOCAL_ENV_VARIABLE_NAMES.forEach(varName => {
    if (process.env[varName]) {
        config[varName] = process.env[varName]!
    } else {
        console.debug(`No value provided for environment variable ${varName}.`)
    }
})

export default config