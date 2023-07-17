import _ from "underscore"
import { Client, Events, GatewayIntentBits } from "discord.js"
import config from "./config/config"
import * as commandModules from "./commands"
import * as helpCommand from "./commands/help"
import * as messageActionModules from "./message-actions"
import { waitForDiscordConfig, signInAndLoadDiscordConfig, getConfig } from "./config/discord-config"
import { unauthorizedOops } from "./lib/util/error-responses"
import startJobs from "./jobs"
import { getCurrentRequest, updateSkipVotesNeeded } from "./lib/firestore/audio_requests"
import { isCommandBanned, isSilenced } from "./lib/firestore/admin"
import { playerIdle, processAudioQueue } from "./lib/util/audio-request-utils"
import { toggleDebug } from "./lib/trackers/debug-tracker"

function initializeBot() {
    const commands = Object(commandModules)
    commands[helpCommand.data.name] = helpCommand // Import the help command separately as it's not exported by commands/index

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildInvites,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildVoiceStates,
        ]
    })

    // ***** DISCORD EVENT HANDLING STARTS ***** //

    client.once(Events.ClientReady, () => {
        if (config.DEBUGGERS) config.DEBUGGERS.split(",").forEach(toggleDebug)

        console.log("Ready to rumble.")
    })

    client.on(Events.InteractionCreate, async interaction => {
        if (interaction.isChatInputCommand()) {
            if (await isCommandBanned(interaction.user.username, interaction.commandName)) {
                // Check if user is banned from using this command
                unauthorizedOops(interaction)
            } else {
                try {
                    commands[interaction.commandName].execute(interaction, client)
                } catch (error) {
                    console.error(error)
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: 'Something went wrong. Please DM the server admin.', ephemeral: true })
                    } else {
                        await interaction.reply({ content: 'Something went wrong. Please DM the server admin.', ephemeral: true })
                    }
                }
            }
        }
    })

    client.on(Events.MessageCreate, async message => {
        if (await isSilenced(message.author.username)) {
            // Check if user is silenced
            message.delete()
        } else if (message.inGuild()) {
            Object.values(messageActionModules).forEach(action => action.execute(message))
        }
    })

    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        if (!playerIdle() && (_.isNull(oldState.channelId) || _.isNull(newState.channelId)) && ![oldState.member?.id, newState.member?.id].includes(getConfig().CLIENT_ID)) {
            // If a user enters or leaves a voice channel and the audio player isn't idle
            const current = await getCurrentRequest()
            if (newState.channelId === current.channelId) {
                updateSkipVotesNeeded(newState.channel!.members.size)
            }
        }
    })

    // Make sure we log errors
    client.on(Events.Error, error => console.error(`Discord client error: ${error}`))
    client.on("unhandledRejection", error => console.error(`Unhandled rejection error (client): ${error}`))

    // ***** DISCORD EVENT HANDLING ENDS ***** //

    client.login(config.DISCORD_TOKEN)
}

async function main() {
    // Log rejected promises
    process.on("unhandledRejection", (error: any) => {
        console.error(`Unhandled rejection error (process): ${error} ${error.stack}`)

        throw error
    });

    // This also initializes the Firestore connection
    signInAndLoadDiscordConfig()

    waitForDiscordConfig().then(async () => {
        initializeBot() // Create client that listens to commands and other events
        startJobs() // Start cron jobs
        processAudioQueue() // Process audio queue, in case we just restarted
    }).catch(reason => console.error(`Error occurred while waiting for discord config to load: ${reason}`))
}

main().catch(reason => console.error(`Error occurred during initialization: ${reason}`))