import { Client } from "discord.js"
import config from "./config/config"
import * as commandModules from "./commands"
import * as helpCommand from "./commands/help"
import * as messageActionModules from "./message-actions"
import { waitForDiscordConfig, signInAndLoadDiscordConfig } from "./config/discord-config"
import { isCommandBanned, isSilenced } from "./lib/firestore"
import { unauthorizedOops } from "./lib/util/error-responses"
import startJobs from "./jobs"

function initializeBot() {
    const commands = Object(commandModules)
    commands[helpCommand.data.name] = helpCommand // Import the help command separately as it's not exported by commands/index

    const client = new Client({
        intents: [
            "GUILDS",
            "GUILD_MEMBERS",
            "GUILD_INVITES",
            "GUILD_MESSAGES",
            "GUILD_MESSAGE_REACTIONS",
            "GUILD_VOICE_STATES",
        ]
    })

    // ***** DISCORD EVENT HANDLING STARTS ***** //

    client.once("ready", () => console.log("Ready to rumble."))

    client.on("interactionCreate", async interaction => {
        if (interaction.isCommand()) {
            if (await isCommandBanned(interaction.user.username, interaction.commandName)) {
                // Check if user is banned from using this command
                unauthorizedOops(interaction)
            } else {
                commands[interaction.commandName].execute(interaction, client)
            }
        }
    })

    client.on("messageCreate", async message => {
        if (await isSilenced(message.author.username)) {
            // Check if user is silenced
            message.delete()
        } else {
            Object.values(messageActionModules).forEach(action => action.execute(message, client))
        }
    })

    // Make sure we log errors
    client.on("error", error => console.error(`Discord client error: ${error.stack}`))
    client.on("unhandledRejection", error => console.error(`Unhandled rejection error: ${error.stack}`))

    // ***** DISCORD EVENT HANDLING ENDS ***** //

    client.login(config.DISCORD_TOKEN)
}

async function main() {
    // This also initializes the Firestore connection
    signInAndLoadDiscordConfig()

    // Only initialize bot (discord client) after config is loaded
    waitForDiscordConfig().then(() => {
        initializeBot()
        startJobs() // Start cron jobs
    }).catch(reason => console.error(`Error occurred while waiting for discord config to load: ${reason}`))
}

main().catch(reason => console.error(`Error occurred during initialization: ${reason}`))