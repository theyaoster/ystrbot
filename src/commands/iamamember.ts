import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client, GuildMemberRoleManager } from "discord.js";
import { discordConfig } from "../config/discord-config";
import { findEmoji } from "../lib/discord-utils";

export const data = new SlashCommandBuilder()
    .setName("iamafragl0rd")
    .setDescription("add yourself to @fragl0rds")

export async function execute(interaction: CommandInteraction, client: Client) {
    const roles = interaction.member?.roles as GuildMemberRoleManager
    if (roles.cache.has(discordConfig.VAL_ROLE_ID)) {
        return interaction.reply({ content: "you are correct", ephemeral: true })
    } else {
        const roleObj = interaction.guild?.roles.cache.get(discordConfig.VAL_ROLE_ID)!
        roles.add(roleObj).catch(console.error)
        return interaction.reply({ content: `yes you are! ${findEmoji("kjoy", client)}`, ephemeral: true })
    }
}