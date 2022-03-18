import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"
import config from "../config/config"
import { discordConfigBlocker, discordConfig } from "../config/discord-config"
import * as commandModules from "../commands"

type Command = {
    data: unknown
}

discordConfigBlocker().then(_ => {
    const commands = []
    for (const module of Object.values<Command>(commandModules)) {
        commands.push(module.data)
    }
    
    const rest = new REST({ version: '9' }).setToken(config.DISCORD_TOKEN)
    
    rest.put(Routes.applicationGuildCommands(discordConfig.CLIENT_ID, discordConfig.GUILD_ID), { body: commands }).then(_ => {
        console.log("Registered commands successfully.")
    }).catch(console.error)
})