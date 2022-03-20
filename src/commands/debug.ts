import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js";
import { unauthorizedOops } from "../lib/error-responses";
import { toggleDebug } from "../lib/firestore";
import { commandFromTextChannel, handleDebug, isAdmin } from "../lib/utils";

export const data = new SlashCommandBuilder()
    .setName("debug")
    .setDescription("(Admin) Toggles debug mode.")

export async function execute(interaction: CommandInteraction, client: Client) {
    if (!commandFromTextChannel(interaction, client)) {
        return
    }

    // Authorization check
    const member = interaction.member as GuildMember
    if (!isAdmin(member)) {
        return unauthorizedOops(interaction)
    }

    const newDebug = await toggleDebug()
    await handleDebug(newDebug)

    const state = newDebug ? "on" : "off"
    interaction.reply({
        content: `Debug mode is now **${state}**.`,
        ephemeral: true
    })
}