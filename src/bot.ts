import { Client } from "discord.js"
import config from "./config/config"
import * as commandModules from "./commands"
import * as helpCommand from "./commands/help"
import * as messageActionModules from "./message-actions"
import { waitForDiscordConfig, signInAndLoadDiscordConfig } from "./config/discord-config"
import { isCommandBanned } from "./lib/firestore"
import { unauthorizedOops } from "./lib/util/error-responses"

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

    // Event handling starts
    client.once("ready", () => console.log("Ready to rumble."))

    client.on("interactionCreate", async interaction => {
        if (interaction.isCommand()) {
            if (await isCommandBanned(interaction.user.username, interaction.commandName)) {
                unauthorizedOops(interaction)
            } else {
                commands[interaction.commandName].execute(interaction, client)
            }
        }
    })

    client.on("messageCreate", async message => {
        Object.values(messageActionModules).forEach(action => action.execute(message, client))
    })
    // Event handling ends

    client.login(config.DISCORD_TOKEN)
}

async function main() {
    signInAndLoadDiscordConfig() // This also initializes the Firestore connection

    waitForDiscordConfig().then(initializeBot).catch(reason => console.error(`Error occurred while waiting for discord config to load: ${reason}`))
}

main().catch(reason => console.error(`Error occurred during initialization: ${reason}`))