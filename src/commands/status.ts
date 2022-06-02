import { SlashCommandBuilder } from "@discordjs/builders"
import { Client, CommandInteraction } from "discord.js"
import { commandFromTextChannel, findEmoji } from "../lib/util/discord-utils"
import { getPlayerStatuses } from "../lib/firestore"
import _ from "underscore"

const PADDING_CHARACTERS = 5

export const data = new SlashCommandBuilder()
    .setName("status")
    .setDescription("see the in-game status of all registered players (offline players will be hidden)")

export async function execute(interaction: CommandInteraction, client: Client) {
    if (!commandFromTextChannel(interaction, client)) {
        return
    }

    getPlayerStatuses().then(statuses => {
        if (_.isEmpty(statuses)) {
            interaction.reply(`I don't see anyone online ${findEmoji("omencry", client)}`)
        } else {
            const maxLength = Math.max(...(Object.keys(statuses).map(name => name.length)))
            let displayedContent = "```"
            Object.keys(statuses).forEach(name => {
                displayedContent += `${name} ${"-".repeat(maxLength + PADDING_CHARACTERS - name.length)}> ${statuses[name]}\n`
            })
            displayedContent += "```"

            interaction.reply(displayedContent)
        }
    }).catch(console.error)
}