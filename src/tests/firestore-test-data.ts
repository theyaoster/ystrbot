import { Collections, Documents, Fields } from "../config/firestore-schema"
import { stringMap } from "../lib/util/data-structure-utils"

export const MOCK_DATA = stringMap(Object.values(Collections).sort(), [
    stringMap([Documents.ADMIN, Documents.DISCORD_ELEMENTS, Documents.TICKET_OVERRIDES], [
        stringMap([Fields.DEBUG_DATA, Fields.ENDPOINT], [{ "SOME_PROPERTY": "3748037948332" }, "test.ystrbot.com"]),
        stringMap([Fields.DATA], [{ "SOME_PROPERTY": "1237489049304", "A_PROPERTY": "934578943954" }]),
        stringMap([Fields.DATA], [{ "2739403242343": "93748327498137" }])
    ]),
    stringMap([Documents.PLAYERS], [{ "johndoe": stringMap([Fields.SECRET, Fields.STATUS, Fields.DISCORD_ID], ["somekindofhash", "Offline", "9389083243243"]), "alice": stringMap([Fields.SECRET, Fields.DISCORD_ID], ["hash", "ingame"]) }]),
    stringMap([Documents.PATCH_NOTES_SCRAPER, Documents.YOUTUBE_SCRAPER], [ stringMap([Fields.MOST_RECENT_PATH], ["/en-us/update"]), stringMap([Fields.GAMING_CHANNEL_ID, Fields.VALORANT_CHANNEL_ID, Fields.LAST_GAMING_ID, Fields.LAST_VALORANT_ID], ["fakeurl1", "fakeurl2", "fakeid1", "fakeid2"]) ]),
    stringMap([Documents.EMOJI_IDS, Documents.SUBSTITUTIONS], [{ "agent1": ["123891203223", "274893274982"], "agent2": ["478908094344"] }, { "old": "new" }]),
    stringMap([Documents.COMMAND_BANS, Documents.SILENCES], [{ "johndoe": "val" }, { "johndoe": 84902380423 }]),
    stringMap([Documents.AUTHORS], [{ "12345678910": "23478923243" }]),
    stringMap([Documents.PINGS, Documents.AUDIO], [
        stringMap([Fields.ACTIVE], [[{ requesterId: "abc" }, { requesterId: "def" }, { requesterId: "ghi" }]]),
        stringMap([Fields.QUEUE, Fields.CURRENT_REQUEST, Fields.CURRENT_MESSAGE_ID, Fields.SKIP_VOTES_NEEDED], [[{ requesterId: "234324" }, { requesterId: "23443534" }], { requesterId: "378490238432" }, "3475893454", 4])
    ])
])
