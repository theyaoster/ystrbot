import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction } from "discord.js"
import { commandFromTextChannel } from "../lib/util/discord-utils"
import { unregisterPlayer } from "../lib/firestore/game_data"

export const data = new SlashCommandBuilder()
    .setName("unregister")
    .setDescription("delete your registered account")

export async function execute(interaction: CommandInteraction, _: Client) {
    if (!commandFromTextChannel(interaction)) return

    unregisterPlayer(interaction.user.username).then(_ => {
        interaction.reply({ content: `You've been unregistered. You can always register with /register again.`, ephemeral: true })
    }).catch(reason => {
        interaction.reply({ content: `Failed to unregister due to: ${reason}`, ephemeral: true })
    })
}