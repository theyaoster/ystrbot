import { Collections, Documents, Fields } from "../config/firestore-schema"
import { stringMap } from "../lib/util/data-structure-utils"

export const MOCK_DATA = stringMap(Object.values(Collections).sort(), [
    stringMap([Documents.ADMIN, Documents.DISCORD_ELEMENTS, Documents.TICKET_OVERRIDES], [
        stringMap([Fields.DEBUG, Fields.DEBUG_DATA, Fields.ENDPOINT], [true, { "SOME_PROPERTY": "3748037948332" }, "test.ystrbot.com"]),
        stringMap([Fields.DATA], [{ "SOME_PROPERTY": "1237489049304", "A_PROPERTY": "934578943954" }]),
        stringMap([Fields.DATA], [{ "2739403242343": "93748327498137" }])
    ]),
    stringMap([Documents.PLAYERS], [{ "johndoe": stringMap([Fields.SECRET, Fields.STATUS, Fields.DISCORD_ID], ["somekindofhash", "Offline", "9389083243243"]), "alice": stringMap([Fields.SECRET, Fields.DISCORD_ID], ["hash", "ingame"]) }]),
    stringMap([Documents.EMOJI_IDS, Documents.SUBSTITUTIONS], [{ "agent1": ["123891203223", "274893274982"], "agent2": ["478908094344"] }, { "old": "new" }]),
    stringMap([Documents.COMMAND_BANS], [{ "johndoe": "val" }]),
    stringMap([Documents.AUTHORS], [{ "12345678910": "23478923243" }]),
])
