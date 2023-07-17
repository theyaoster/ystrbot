import { SlashCommandBuilder } from "@discordjs/builders"
import { ChatInputCommandInteraction, Client } from "discord.js"
import { getPlayerIgn } from "../lib/firestore/game_data"
import { sleepSeconds } from "../lib/util/async-utils"

export const data = new SlashCommandBuilder()
    .setName("ign")
    .setDescription("show your IGN (or that of another registered user) for 30s")
    .addUserOption(option => option.setName("player").setDescription("A registered user.").setRequired(false))

export async function execute(interaction: ChatInputCommandInteraction, _: Client) {
    const user = interaction.options.getUser("player") || interaction.user

    getPlayerIgn(user.username).then(async ign => {
        if (ign) {
            interaction.reply(`${ign} (will self-delete)`)

            await sleepSeconds(30)

            interaction.deleteReply()
        } else {
            interaction.reply({ content: "I don't see their IGN in the database. Have they launched VALORANT-ystr recently?", ephemeral: true })
        }
    }).catch(reason => {
        console.error(`Failed to fetch IGN: ${reason.stack}`)

        interaction.reply({ content: `User is not registered - could not fetch IGN.`, ephemeral: true })
    })
}