import { Client } from "discord.js"
import { getAuth, signInWithEmailAndPassword } from "@firebase/auth"
import config from "./config/config"
import * as commandModules from "./commands"
import * as messageActionModules from "./message-actions"
import { waitForDiscordConfig, loadDiscordConfig } from "./config/discord-config"

function initializeBot() {
    const commands = Object(commandModules)

    const client = new Client({
        intents: [
            "GUILDS",
            "GUILD_MEMBERS",
            "GUILD_INVITES",
            "GUILD_MESSAGES",
            "GUILD_MESSAGE_REACTIONS",
        ]
    })

    // Event handling starts
    client.once("ready", () => {
        console.log("Ready to rumble.")
    })

    client.on("interactionCreate", async interaction => {
        if (interaction.isCommand()) {
            const { commandName } = interaction
            commands[commandName].execute(interaction, client)
        }
    })

    client.on("messageCreate", async message => {
        Object.values(messageActionModules).forEach(action => {
            action.execute(message, client)
        })
    })
    // Event handling ends

    client.login(config.DISCORD_TOKEN)
}

async function init() {
    const signInResult = await signInWithEmailAndPassword(getAuth(), config.FIREBASE_EMAIL, config.FIREBASE_SECRET)
    console.log(`Authenticated as ${signInResult.user.displayName}`)

    loadDiscordConfig() // This also initializes the Firestore connection

    console.log("Now waiting for discord config to load from Firestore...")
    waitForDiscordConfig().then(() => {
        console.log("Firestore configs loaded. Now initializing the bot...")
        initializeBot()
    }).catch(reason => console.error(`Error occurred while waiting for discord config to load: ${reason}`))
}

init().catch(reason => {
    console.error(`Error occurred during initialization: ${reason}`)
})