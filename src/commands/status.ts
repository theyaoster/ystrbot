import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction } from "discord.js"
import { commandFromTextChannel, findEmoji, sendBotMessage } from "../lib/util/discord-utils"
import { getPlayerStatuses } from "../lib/firestore"
import _ from "underscore"

const PADDING_CHARACTERS = 5

export const data = new SlashCommandBuilder()
    .setName("status")
    .setDescription("see the in-game status of all registered players (offline players will be hidden)")

export async function execute(interaction: CommandInteraction, __: Client) {
    if (!commandFromTextChannel(interaction)) {
        return
    }

    getPlayerStatuses().then(statuses => {
        if (_.isEmpty(statuses)) {
            interaction.reply({ content: `I don't see anyone online ${findEmoji("omencry")}`, ephemeral: true })
        } else {
            const maxLength = Math.max(...(Object.keys(statuses).map(name => name.length)))
            let displayedContent = "```"
            Object.keys(statuses).forEach(name => {
                displayedContent += `${name} ${"-".repeat(maxLength + PADDING_CHARACTERS - name.length)}> ${statuses[name]}\n`
            })
            displayedContent += "```"

            // Show player statuses in the bot channel
            sendBotMessage(displayedContent, interaction)
        }
    }).catch(console.error)
}