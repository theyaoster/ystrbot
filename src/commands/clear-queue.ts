import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, GuildMember, ChatInputCommandInteraction } from "discord.js"
import { resolveInteraction, sendBotMessage } from "../lib/util/discord-utils"
import { clearQueue } from "../lib/firestore/audio_requests"
import { skipRequest } from "../lib/util/audio-request-utils"

export const data = new SlashCommandBuilder()
    .setName("clear_queue")
    .setDescription("clear the audio request queue")

export async function execute(interaction: ChatInputCommandInteraction, _: Client) {
    const member = interaction.member as GuildMember

    await clearQueue()
    skipRequest()

    resolveInteraction(interaction)
    sendBotMessage(`Queue cleared by ${member.user.username}.`, member)
}