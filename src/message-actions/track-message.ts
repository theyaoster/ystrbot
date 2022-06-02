import { Client, GuildMember, Message, TextChannel } from "discord.js"
import { setLatestMessage } from "../lib/trackers/message-tracker"

export function execute(message: Message, __: Client) {
    setLatestMessage(message.channel as TextChannel, message.member as GuildMember, message)
}