import { Client, Message } from "discord.js"
import _ from "underscore"
import { withoutEmojis } from "../lib/data-structure-utils"
import { isBot } from "../lib/discord-utils"
import { getKeywordSubstitutions, getKeywordEmojiLists } from "../lib/firestore"

export async function execute(message: Message, __: Client) {
    const content = withoutEmojis(message.content.toLowerCase())

    // Don't react to emoji-only messages or bot messages
    if (content.trim().length === 0 || isBot(message.member)) {
        return
    }

    const mentionedKeywords = new Set<string>()

    // Find all mentioned keywords
    const substitutions = await getKeywordSubstitutions()
    Object.keys(substitutions).filter(alt => content.includes(alt)).forEach(alt => mentionedKeywords.add(substitutions[alt]))
    const keywordToEmojiList = await getKeywordEmojiLists()
    Object.keys(keywordToEmojiList).filter(kw => content.includes(kw)).forEach(kw => mentionedKeywords.add(kw))

    // React for all mentioned keywords
    mentionedKeywords.forEach(kw => {
        const chosenEmojiId = _.sample(keywordToEmojiList[kw])
        if (!chosenEmojiId) {
            return console.log(`No emoji available for ${kw}!`)
        }
        const emoji = message.guild?.emojis.cache.get(chosenEmojiId)
        if (!emoji) {
            return console.error(`Bad emoji ID ${chosenEmojiId} for agent ${kw}!`)
        }

        message.react(emoji).catch(console.error)
    })
}