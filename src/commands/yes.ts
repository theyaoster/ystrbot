import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction, GuildMember, Message } from "discord.js"
import { getLatestPing } from "../lib/trackers/ping-tracker"
import { trackYes } from "../lib/trackers/response-tracker"
import { commandFromTextChannel, pingChannel } from "../lib/util/discord-utils"

export const data = new SlashCommandBuilder()
    .setName("yes")
    .setDescription("say you're down to play (to the most recent /val that has pinged @fragl0rds)")

export async function execute(interaction: CommandInteraction, _: Client) {
    if (!commandFromTextChannel(interaction)) {
        return
    }

    const latest = getLatestPing()
    const pingMessage = latest[0] as Message
    if (!pingMessage) {
        return interaction.reply({ content: "I can't find the latest ping... maybe I was restarted recently?", ephemeral: true })
    }

    // Check if the caller is the same person who pinged
    const pinger = latest[1] as GuildMember
    if (pinger.id === interaction.user.id) {
        return interaction.reply({ content: "yes I know", ephemeral: true })
    }

    const member = interaction.member as GuildMember
    const added = await trackYes(pingMessage, member, await pingChannel())
    interaction.reply({ content: added ? "you've reported for duty" : "you've left your duty", ephemeral: true })
}