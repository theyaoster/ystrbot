import { Snowflake } from "discord.js"

export enum Collections {
    CONFIG = "configuration",
    KEYWORD_TO_EMOJI = "keyword_to_emoji_ids",
    GAME_DATA = "game_data",
    TICKETS = "tickets",
    MEMBERS = "members",
    JOB_DATA = "job_data",
    TRACKING = "tracking",
}

export enum Documents {
    ADMIN = "admin",
    DISCORD_ELEMENTS = "discord_elements",
    TICKET_OVERRIDES = "ticket_overrides",

    SUBSTITUTIONS = "substitutions",
    EMOJI_IDS = "emoji_ids",

    PLAYERS = "players",

    AUTHORS = "authors",

    COMMAND_BANS = "command_bans",
    SILENCES = "silences",

    PATCH_NOTES_SCRAPER = "patch_notes_scraper",
    YOUTUBE_SCRAPER = "youtube_scraper",

    AUDIO = "audio",
    PINGS = "pings",
}

export enum Fields {
    DATA = "data",

    DEBUG_DATA = "debug_data",
    ENDPOINT = "endpoint",

    CONTRACT_AGENT = "contract_agent",
    IGN = "ign",
    STATUS = "status",
    STATUS_CODE = "status_code",
    SECRET = "secret",
    DISCORD_ID = "discord_id",

    MOST_RECENT_PATH = "most_recent_path",

    GAMING_CHANNEL_ID = "gaming_channel_id",
    VALORANT_CHANNEL_ID = "valorant_channel_id",
    LAST_GAMING_ID = "last_gaming_id",
    LAST_VALORANT_ID = "last_valorant_id",

    QUEUE = "queue",
    CURRENT_REQUEST = "current_request",
    CURRENT_MESSAGE_ID = "current_message_id",
    SKIP_VOTES_NEEDED = "skip_votes_needed",

    BANS = "bans",
    PENDING = "pending",
    LATEST = "latest",
    FIRED_HISTORY = "fired_history",
}

export type Ping = {
    requesterId: Snowflake,
    createdAt: number,
    delayLeft?: number,
    ttlLeft?: number,
    fired: boolean,
    mode?: string,
    responseId?: Snowflake,
    responses: string[],
}

export type AudioRequest = {
    requesterId: Snowflake,
    url: string,
    yt: boolean, // youtube link?
    title: string,
    start: number, // offset in seconds
    duration?: number, // seconds
    channelId: Snowflake,
    skipVotes: string[],
}