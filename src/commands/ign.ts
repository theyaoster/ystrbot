import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client } from "discord.js";
import { sleep } from "../lib/data-structure-utils";
import { getPlayerIgn } from "../lib/firestore";

export const data = new SlashCommandBuilder()
    .setName("ign")
    .setDescription("Show your IGN or another registered user's IGN.")
    .addUserOption(option => option.setName("player").setDescription("A registered user.").setRequired(false))

export async function execute(interaction: CommandInteraction, _: Client) {
    const user = interaction.options.getUser("player") || interaction.user

    getPlayerIgn(user.username).then(async ign => {
        if (ign) {
            interaction.reply(`${ign} (will delete in 1m)`)

            await sleep(60 * 1000)

            interaction.deleteReply()
        } else {
            interaction.reply({ content: "I don't see their IGN in the database. Have they launched VALORANT-ystr recently?", ephemeral: true })
        }
    }).catch(reason => {
        console.log(reason.stack)
        interaction.reply({
            content: `The specified user is not registered - could not fetch IGN.`,
            ephemeral: true
        })
    })

}