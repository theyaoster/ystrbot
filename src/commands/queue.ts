import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client } from "discord.js"
import _ from "underscore"
import { audioTracker, idle, requestToString } from "../lib/trackers/audio-tracker"
import { sendBotMessage } from "../lib/util/discord-utils"

const QUEUE_MESSAGE_TIMEOUT = 15 //seconds

export const data = new SlashCommandBuilder()
    .setName("queue")
    .setDescription("view the queue of audio requests")

export async function execute(interaction: CommandInteraction, _: Client) {
    const queue = audioTracker.queue
    const current = audioTracker.current

    // Send message with queue contents
    if (queue.length > 0 || !idle()) {
        let queueContents = `**Currently playing**: ${requestToString(current!)}\n\n`
        queueContents += queue.length > 0 ? "**In Queue:**\n" : "*(Queue is empty.)*"

        let place = 1
        for (const request of queue.iterator()) {
            queueContents += `${place}. ${requestToString(request)}\n`
            place++
        }

        sendBotMessage(queueContents, interaction, QUEUE_MESSAGE_TIMEOUT)
    } else {
        sendBotMessage("Queue is empty.", interaction, QUEUE_MESSAGE_TIMEOUT)
    }
}