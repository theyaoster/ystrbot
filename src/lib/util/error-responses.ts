import { CommandInteraction, TextChannel } from "discord.js"
import { findEmoji } from "./discord-utils"

export function useTextChannelOops(interaction: CommandInteraction) {
    return interaction.reply({ content: `you can only use **/${interaction.commandName}** in a **text channel**. :hash:`, ephemeral: true })
}

export function useTextChannelThreadOops(interaction: CommandInteraction, channel?: TextChannel) {
    const endString = channel ? `${channel}` : "a text channel"
    return interaction.reply({ content: `you can only use **/${interaction.commandName}** in a **thread** in ${endString}. :thread:`, ephemeral: true })
}

export function genericOops(interaction: CommandInteraction) {
    return interaction.reply({ content: `uh oh, something went wrong. please report this using /ticket! ${findEmoji("kjlove", interaction.client)}`, ephemeral: true })
}

export function unauthorizedOops(interaction: CommandInteraction) {
    return interaction.reply({ content: `you're not allowed to do that ${findEmoji("teehee", interaction.client)}`, ephemeral: true })
}