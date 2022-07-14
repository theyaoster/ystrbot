import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import _ from "underscore"
import { getCurrentRequest, getQueue } from "../lib/firestore/audio_requests"
import { playerIdle, requestToString } from "../lib/trackers/audio-tracker"
import { sendBotMessage } from "../lib/util/discord-utils"

const QUEUE_MESSAGE_TIMEOUT = 15 //seconds

export const data = new SlashCommandBuilder()
    .setName("queue")
    .setDescription("view the queue of audio requests")

export async function execute(interaction: CommandInteraction, _: Client) {
    const queue = await getQueue()
    const current = await getCurrentRequest()
    const member = interaction.member as GuildMember

    // Send message with queue contents
    if (queue.length > 0 || !playerIdle()) {
        let queueContents = `**Currently playing**: ${requestToString(current!)}\n\n`
        queueContents += queue.length > 0 ? "**In Queue:**\n" : "*(Queue is empty.)*"

        let place = 1
        for (const request of queue) {
            queueContents += `${place}. ${requestToString(request)}\n`
            place++
        }

        sendBotMessage(queueContents, member, interaction, QUEUE_MESSAGE_TIMEOUT)
    } else {
        sendBotMessage("Queue is empty.", member, interaction, QUEUE_MESSAGE_TIMEOUT)
    }
}