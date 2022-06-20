import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client } from "discord.js"
import { findBestMatch } from "string-similarity"
import _ from "underscore"
import { getPlayerContractInternal, setPlayerContractInternal } from "../lib/firestore"
import { sleepSeconds } from "../lib/util/async-utils"
import { fetchAgents } from "../lib/valorant-content"

const MAX_WAIT_COUNT = 15
const WAIT_PERIOD = 5 // seconds

export const data = new SlashCommandBuilder()
    .setName("contract")
    .setDescription("set your in-game contract to a specified agent")
    .addStringOption(option => option.setName("agent").setDescription("The name of the agent (e.g. Astra, Breach) whose contract you want to activate.").setRequired(true))

export async function execute(interaction: CommandInteraction, __: Client) {
    const name = interaction.user.username
    const allAgents = await fetchAgents()
    const agentInput = interaction.options.getString("agent", true)
    const selectedAgent = findBestMatch(agentInput.toLowerCase(), allAgents).bestMatch.target
    const currentAgent = await getPlayerContractInternal(name) // Could be undefined

    if (selectedAgent == currentAgent) {
        // If input agent is the same as currently selected
        interaction.reply({ content: `Your contract is already set to ${selectedAgent}.`, ephemeral: true })
    } else {
        console.log(`Changing ${name}'s contract to ${selectedAgent}.`)
        await setPlayerContractInternal(name, selectedAgent)

        interaction.reply({ content: `Your contract agent is now set to '${selectedAgent}' (was ${currentAgent}).`, ephemeral: true })

        // Buffer to see if contract is reverted
        for (const __ of _.range(MAX_WAIT_COUNT)) {
            await sleepSeconds(WAIT_PERIOD)

            const checkContract = await getPlayerContractInternal(name)
            if (checkContract == currentAgent) {
                // If contract was reverted, assume contract is complete
                return interaction.followUp({ content: `Actually, you already completed ${selectedAgent}'s contract, so you're back on ${currentAgent}'s contract.`, ephemeral: true })
            }
        }
    }
}
