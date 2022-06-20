import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMemberRoleManager } from "discord.js"
import { discordConfig } from "../config/discord-config"
import { findEmoji } from "../lib/util/discord-utils"

export const data = new SlashCommandBuilder()
    .setName("iamnotafragl0rd")
    .setDescription("remove yourself from @fragl0rds")

export async function execute(interaction: CommandInteraction, _: Client) {
    const roles = interaction.member?.roles as GuildMemberRoleManager
    if (roles.cache.has(discordConfig.VAL_ROLE_ID)) {
        const roleObj = interaction.guild?.roles.cache.get(discordConfig.VAL_ROLE_ID)!
        roles.remove(roleObj).catch(console.error)
        return interaction.reply({ content: `ok, bye ${findEmoji("sadge")}`, ephemeral: true })
    } else {
        return interaction.reply({ content: "you are correct", ephemeral: true })
    }
}