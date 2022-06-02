import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import { unauthorizedOops } from "../lib/util/error-responses"
import { getDebug, setDebug } from "../lib/firestore"
import { commandFromTextChannel, handleDebug, isAdmin } from "../lib/util/discord-utils"

export const data = new SlashCommandBuilder()
    .setName("debug")
    .setDescription("toggle debug mode (ADMIN)")

export async function execute(interaction: CommandInteraction, client: Client) {
    if (!commandFromTextChannel(interaction, client)) {
        return
    }

    // Authorization check
    const member = interaction.member as GuildMember
    if (!isAdmin(member)) {
        return unauthorizedOops(interaction)
    }

    const newDebug = !(await getDebug())
    await setDebug(newDebug)
    await handleDebug(newDebug)

    const state = newDebug ? "on" : "off"
    const message = `Debug mode is now **${state}**.`
    interaction.reply({ content: message, ephemeral: true })
    console.log(message)
}