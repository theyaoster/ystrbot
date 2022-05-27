import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import { audioTracker, generateBotPlayingMessage, idle, skip, voteSkip } from "../lib/audio-tracker"
import { isAdmin } from "../lib/discord-utils"

export const data = new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip what's currently playing.")

export async function execute(interaction: CommandInteraction, _: Client) {
    const member = interaction.member as GuildMember

    if (!idle()) {
        const current = audioTracker.current!
        if (isAdmin(member) || member.id == current?.requester.id) {
            skip()

            interaction.reply({ content: `Skipping "${current?.title}".`, ephemeral: true })

            // Update bot message
            audioTracker.currentMessage?.edit(`~~${audioTracker.currentMessage.content}~~ SKIPPED`)
        } else {
            // When someone tries to skip someone else's request
            if (voteSkip(member)) {
                const voteCount = current.skipVotes.size
                const votesNeeded = audioTracker.skipVotesNeeded

                // Check if the required number of votes has been reached
                if (voteCount >= votesNeeded) {
                    skip()

                    interaction.reply({ content: `Reached needed number of skip votes (${votesNeeded}) - skipping "${current?.title}".`, ephemeral: true })
                } else {
                    interaction.reply({ content: `Voted to skip "${current?.title}".`, ephemeral: true })
                }

                // Update bot message to reflect vote
                audioTracker.currentMessage?.edit(generateBotPlayingMessage())
            } else {
                interaction.reply({ content: "You already submitted a vote for this request.", ephemeral: true })
            }
        }
    } else {
        interaction.reply({ content: "Queue is empty - nothing to skip.", ephemeral: true })
    }
}