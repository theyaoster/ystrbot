import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client } from "discord.js";
import { findBestMatch } from "string-similarity";
import { getPlayerContractInternal, setPlayerContract } from "../lib/firestore";
import { fetchAgents } from "../lib/valorant-content";

export const data = new SlashCommandBuilder()
    .setName("contract")
    .setDescription("Set your in-game contract")
    .addStringOption(option => option.setName("agent").setDescription("The name of the agent (e.g. Astra, Breach) whose contract you want to activate.").setRequired(true))

export async function execute(interaction: CommandInteraction, __: Client) {
    const name = interaction.user.username
    const allAgents = await fetchAgents()
    const agentInput = interaction.options.getString("agent")!
    const selectedAgent = `${findBestMatch(agentInput.toLowerCase(), allAgents)}`
    const currentAgent = await getPlayerContractInternal(name) as string // Could be undefined

    if (selectedAgent == currentAgent) {
        // If input agent is the same as currently selected
        interaction.reply({ content: `Your contract is already set to ${selectedAgent}.`, ephemeral: true })
    } else {
        console.log(`Changing ${name}'s contract to ${selectedAgent}`)
        setPlayerContract(name, `${selectedAgent}`)

        interaction.reply({ content: "Your contract has been updated.", ephemeral: true })
    }
}
