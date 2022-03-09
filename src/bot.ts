import { Client } from "discord.js"
import config from "./config/config"
import * as commandModules from "./commands"
import * as messageActionModules from "./message-actions"
import { discordConfigBlocker } from "./config/discord-config"

function initialize() {
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

async function initializeWrapper() {
    await discordConfigBlocker()
    initialize()
}

initializeWrapper().catch(console.error)