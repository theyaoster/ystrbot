import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client,  GuildMember } from "discord.js"
import { getConfig } from "../config/discord-config"
import { commandFromTextChannel, findEmoji, guild } from "../lib/util/discord-utils"

export const data = new SlashCommandBuilder()
    .setName("iamafragl0rd")
    .setDescription("add yourself to @fragl0rds")

export async function execute(interaction: CommandInteraction, _: Client) {
    if (!commandFromTextChannel(interaction)) return

    const member = interaction.member as GuildMember
    if (member.roles.cache.has(getConfig(member).VAL_ROLE_ID)) {
        return interaction.reply({ content: "you are correct", ephemeral: true })
    } else {
        const roleObj = (await guild()).roles.cache.get(getConfig(member).VAL_ROLE_ID)!
        member.roles.add(roleObj).catch(console.error)
        return interaction.reply({ content: `yes you are! ${findEmoji("kjoy")}`, ephemeral: true })
    }
}