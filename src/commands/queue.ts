import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client } from "discord.js"
import { audioTracker, idle, requestToString } from "../lib/trackers/audio-tracker"
import { sendBotMessage } from "../lib/util/discord-utils"

export const data = new SlashCommandBuilder()
    .setName("queue")
    .setDescription("view the queue of audio requests")

export async function execute(interaction: CommandInteraction, client: Client) {
    const queue = audioTracker.queue
    const current = audioTracker.current

    if (queue.length > 0 || !idle()) {
        let queueContents = `**Currently playing**: ${requestToString(current!)}\n\n**In Queue:**\n`
        let place = 1
        for (const request of queue.iterator()) {
            queueContents += `${place}. ${requestToString(request)}\n`
            place++
        }

        sendBotMessage(client, queueContents, interaction)
    } else {
        sendBotMessage(client, "Queue is empty.", interaction)
    }
}