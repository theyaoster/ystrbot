import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("help")
    .setDescription("See what commands ystrbot supports!")

const helpMessage = `**ystrbot commands:**

LFG-related commands:
  • Use **/iamafragl0rd** to add yourself to @fragl0rds.
  • Use **/iamnotafragl0rd** to remove yourself from @fragl0rds.
  • Use **/val** in any text channel to summon teammates.
  • Use **/yes** to say you're down to play (to the most recent ping - delayed pings won't count until they fire).

Feedback commands:
  • Use **/ticket** if you encounter issues or want to provide suggestions/feedback.
  • (Admin) Use **/resolve_ticket** to resolve a ticket you created.

Registration related commands:
  • Use **/register** to register yourself as a player who wants to share their in-game status.
  • Use **/unregister** to stop sharing your in-game status.
  • Use **/status** to see the in-game status of all registered players (offline players will be hidden).
  • Use **/contract** to set your in-game contract to a specified agent.

Misc:
  • Use **/help** to show this message again.
  • Use **/cap** when you feel lied to, cheated, or deceived.
  • (Admin) Use **/debug** to toggle debug mode.`

export async function execute(interaction: CommandInteraction, _: Client) {
    interaction.reply({ content: helpMessage, ephemeral: true })
}