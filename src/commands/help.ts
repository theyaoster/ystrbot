import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, Client } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("help")
    .setDescription("See what commands ystrbot supports!")

const helpMessage = `**NOTE**: If you're registered and need to manually change your config or want to view debug logs, check for them in \`%APPDATA%\\VALORANT-ystr\`

-- **ystrbot commands directory** --

LFG-related commands:
  • Use **/iamafragl0rd** to add yourself to @fragl0rds.
  • Use **/iamnotafragl0rd** to remove yourself from @fragl0rds.
  • Use **/val** in any text channel to summon teammates.
  • Use **/yes** to say you're down to play (to the most recent /val - but note that delayed pings won't count until they fire).

Registration related commands:
  • Use **/register** to register yourself as a player who wants to share their in-game status.
  • Use **/unregister** to delete your registered info.
  • Use **/status** to see the in-game status of all registered players (offline players will be hidden).
  • Use **/contract** to set your in-game contract to a specified agent.
  • Use **/ign** to show your IGN (or that of another registered user) for 60s.

Voice related commands:
  • Use **/play** with a YouTube link or direct link to an audio file (verified to work with .mp3, .wav, .aif, .ogg) while in a voice channel to play it.
  • Use **/skip** to skip the current audio (if you requested it). (Admin)
  • Use **/queue** to view the queued audio requests.

Misc:
  • Use **/help** to show this message again.
  • Use **/cap** when you feel lied to, cheated, or deceived.
  • Use **/ticket** if you encounter issues or want to provide suggestions/feedback.
  • Use **/resolve_ticket** to resolve a ticket you created. (Admin)
  • Use **/debug** to toggle debug mode. (Admin only)`

export async function execute(interaction: CommandInteraction, _: Client) {
    interaction.reply({ content: helpMessage, ephemeral: true })
}