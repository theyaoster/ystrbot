import { SlashCommandBuilder } from "@discordjs/builders"
import { ChatInputCommandInteraction, Client, GuildMember } from "discord.js"
import { addResponse, latestPing } from "../lib/firestore/pings"
import { commandFromTextChannel, resolveInteraction } from "../lib/util/discord-utils"
import { updateResponseMessage } from "../lib/util/ping-utils"

export const data = new SlashCommandBuilder()
    .setName("yes")
    .setDescription("say you're down to play (to the most recent /val that has pinged @fragl0rds)")

export async function execute(interaction: ChatInputCommandInteraction, _: Client) {
    if (!commandFromTextChannel(interaction)) return

    let latest = await latestPing()
    if (latest) {
        // Check if the caller is the same person who pinged or if they already responded
        if (interaction.user.id === latest.requesterId || latest.responses.includes(interaction.user.id)) return interaction.reply({ content: "yes I know", ephemeral: true })

        await addResponse(interaction.user.id)
        await updateResponseMessage(latest.pingId, interaction.member as GuildMember)

        resolveInteraction(interaction)
    } else {
        interaction.reply({ content: "I don't see a ping to respond to. Maybe it's expired or too old...", ephemeral: true })
    }
}