import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import _ from "underscore"
import { isAdmin } from "../lib/util/discord-utils"
import * as commands from "./index"

export const data = new SlashCommandBuilder()
    .setName("help")
    .setDescription("see what commands ystrbot supports")

// Modules to exclude when importing
const HELP_DESC_OVERRIDE = "show this message again"
const ADMIN_GROUP_NAME = "Admin commands"
const GROUP_NAMES = ["LFG commands", "Registration/registered user commands", "Voice-related commands", "Miscellaneous"]
const GROUP_DEFINITONS : Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">[][] = [
    [commands.val.data, commands.yes.data, commands.iamafragl0rd.data, commands.iamnotafragl0rd.data],
    [commands.register.data, commands.unregister.data, commands.status.data, commands.contract.data, commands.ign.data],
    [commands.play.data, commands.skip.data, commands.queue.data],
    [data, commands.cap.data, commands.ticket.data, commands.resolve_ticket.data],
    [commands.command_ban.data, commands.command_unban.data, commands.silence.data, commands.debug.data],
]

export async function execute(interaction: CommandInteraction, __: Client) {
    const groupNames = Object.assign([], GROUP_NAMES)
    if (await isAdmin(interaction.member as GuildMember)) groupNames.push(ADMIN_GROUP_NAME)

    let commandList = ""
    for (const i of _.range(groupNames.length)) {
        commandList += `__${groupNames[i]}:__\n`

        for (const commandData of GROUP_DEFINITONS[i]) {
            const description = commandData.name == data.name ? HELP_DESC_OVERRIDE : commandData.description
            commandList += `  • Use **/${commandData.name}** to ${description}.\n`
        }
        commandList += "\n"
    }

    const helpMessage = `**NOTE:** *If you're registered and are using the VALORANT-ystr client, and need to manually change your config or want to view debug logs, check for them in* \`%APPDATA%\\VALORANT-ystr\`\n\n${commandList.trimEnd()}`

    interaction.reply({ content: helpMessage, ephemeral: true })
}