import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v10"
import config from "../config/config"
import { waitForDiscordConfig, discordConfig, signInAndLoadDiscordConfig } from "../config/discord-config"
import * as commandModules from "../commands"

signInAndLoadDiscordConfig() // This also initializes the Firestore connection
waitForDiscordConfig().then(() => {
    const commands = []
    for (const module of Object.values(commandModules)) {
        commands.push(module.data)
    }

    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN)

    rest.put(Routes.applicationGuildCommands(discordConfig.CLIENT_ID, discordConfig.GUILD_ID), { body: commands }).then(() => {
        console.log("Registered commands successfully.")
    }).catch(console.error).finally(process.exit)
})