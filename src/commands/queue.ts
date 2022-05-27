import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client } from "discord.js"
import { audioTracker, idle } from "../lib/audio-tracker"
import { sendBotMessage } from "../lib/discord-utils"

export const data = new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Display the audio queue.")

export async function execute(interaction: CommandInteraction, client: Client) {
    const queue = audioTracker.queue
    const current = audioTracker.current

    if (queue.length > 0 || !idle()) {
        let queueContents = `**Currently playing**: ${current?.title}\n\n**In Queue:**\n`
        let place = 1
        for (const request of queue.iterator()) {
            queueContents += `${place}. ${request.title}\n`
            place++
        }

        sendBotMessage(client, queueContents, interaction)
    } else {
        sendBotMessage(client, "Queue is empty.", interaction)
    }
}