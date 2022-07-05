import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMember } from "discord.js"
import { getConfig } from "../config/discord-config"
import { commandFromTextChannel, findEmoji } from "../lib/util/discord-utils"

export const data = new SlashCommandBuilder()
    .setName("iamnotafragl0rd")
    .setDescription("remove yourself from @fragl0rds")

export async function execute(interaction: CommandInteraction, _: Client) {
    if (!commandFromTextChannel(interaction)) return

    const member = interaction.member as GuildMember
    if (member.roles.cache.has(getConfig(member).VAL_ROLE_ID)) {
        const roleObj = interaction.guild?.roles.cache.get(getConfig(member).VAL_ROLE_ID)!
        member.roles.remove(roleObj).catch(console.error)
        return interaction.reply({ content: `ok, bye ${findEmoji("sadge")}`, ephemeral: true })
    } else {
        return interaction.reply({ content: "you are correct", ephemeral: true })
    }
}