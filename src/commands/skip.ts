import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import { getCurrentMessage, getCurrentRequest } from "../lib/firestore/audio_requests"
import { generateBotPlayingMessage, playerIdle, skipRequest, voteSkip } from "../lib/trackers/audio-tracker"
import { isAdmin, resolveInteraction } from "../lib/util/discord-utils"

export const data = new SlashCommandBuilder()
    .setName("skip")
    .setDescription("vote to skip what's currently playing (votes are not needed if you requested it)")

export async function execute(interaction: CommandInteraction, _: Client) {
    const member = interaction.member as GuildMember

    if (playerIdle()) {
        interaction.reply({ content: "Player is idle - nothing to skip.", ephemeral: true })
    } else {
        // Make sure caller is in the proper voice state
        const current = await getCurrentRequest()
        if (!member.voice.channelId || current.channelId !== member.voice.channelId) {
            return interaction.reply({ content: "You need to be in the voice channel where the audio is playing.", ephemeral: true })
        }

        // Check if the caller is authorized to skip
        const currentMessage = await getCurrentMessage(member)
        if ((await isAdmin(member)) || member.id === current.requesterId) {
            skipRequest()

            interaction.reply({ content: `Skipping "${current.title}".`, ephemeral: true })

            // Update bot message
            currentMessage.edit(`~~${currentMessage.content}~~ SKIPPED`)
        } else {
            // When someone tries to skip someone else's request
            if (await voteSkip(member)) {
                resolveInteraction(interaction)

                // Update bot message to reflect vote
                currentMessage.edit(await generateBotPlayingMessage())
            } else {
                interaction.reply({ content: "You already voted to skip this request.", ephemeral: true })
            }
        }
    }
}