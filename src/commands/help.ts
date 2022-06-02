import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client } from "discord.js"
import _ from "underscore"
import * as commands from "./index"

export const data = new SlashCommandBuilder()
    .setName("help")
    .setDescription("see what commands ystrbot supports")

// Modules to exclude when importing
const HELP_DESC_OVERRIDE = "to show this message again"
const GROUP_NAMES = ["LFG commands", "Registration/registered user comands", "Voice-related commands", "Miscellaneous"]
const GROUP_DEFINITONS : Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">[][] = [
    [commands.val.data, commands.yes.data, commands.iamafragl0rd.data, commands.iamnotafragl0rd.data],
    [commands.register.data, commands.unregister.data, commands.status.data, commands.contract.data, commands.ign.data],
    [commands.play.data, commands.skip.data, commands.queue.data],
    [data, commands.cap.data, commands.ticket.data, commands.resolve_ticket.data, commands.debug.data],
]

let commandList = ""
for (const i of _.range(GROUP_NAMES.length)) {
    commandList += `__${GROUP_NAMES[i]}:__\n`

    for (const commandData of GROUP_DEFINITONS[i]) {
        const description = commandData.name == data.name ? HELP_DESC_OVERRIDE : commandData.description
        commandList += `  • Use **/${commandData.name}** to ${description}.\n`
    }
    commandList += "\n"
}

const HELP_MESSAGE = `**NOTE:** *If you're registered and are using the VALORANT-ystr client, and need to manually change your config or want to view debug logs, check for them in* \`%APPDATA%\\VALORANT-ystr\`\n\n${commandList.trimEnd()}`

export async function execute(interaction: CommandInteraction, _: Client) {
    interaction.reply({ content: HELP_MESSAGE, ephemeral: true })
}