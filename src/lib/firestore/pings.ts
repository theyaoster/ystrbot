import { Snowflake } from "discord-api-types/globals"
import { doc } from "firebase/firestore"
import _ from "underscore"
import { Collections, Documents, Fields, Ping } from "../../config/firestore-schema"
import { arrayFieldFetch, arrayFieldModify, arrayFieldPush, arrayFieldRemoveByCondition, getField } from "./common"
import { db } from "./store"

const LIFETIME = 24 // hours

const pingDocRef = doc(db, Collections.TRACKING, Documents.PINGS)

export const trackPing = async (ping: Ping) => await arrayFieldPush<Ping>(pingDocRef, Fields.ACTIVE, false, ping)
export const fetchPing = async (pingId: Snowflake) => await arrayFieldFetch<Ping>(pingDocRef, Fields.ACTIVE, ping => ping.pingId === pingId, true)
export const markFired = async (pingId: Snowflake) => await arrayFieldModify<Ping>(pingDocRef, Fields.ACTIVE, ping => ping.fired = true, ping => ping.pingId === pingId)
export const setMessageId = async (pingId: Snowflake, messageId: Snowflake) => await arrayFieldModify<Ping>(pingDocRef, Fields.ACTIVE, ping => ping.messageId = messageId, ping => ping.pingId === pingId)
export const setResponseMessageId = async (pingId: Snowflake, responseMessageId: Snowflake) => await arrayFieldModify<Ping>(pingDocRef, Fields.ACTIVE, ping => ping.responseMessageId = responseMessageId, ping => ping.pingId === pingId)

export const allPings = async () => await getField<Ping[]>(pingDocRef, Fields.ACTIVE)
export const removePing = async (pingId: Snowflake) => await arrayFieldRemoveByCondition<Ping>(pingDocRef, Fields.ACTIVE, ping => ping.pingId === pingId)
export const cleanOldPings = async () => await arrayFieldRemoveByCondition<Ping>(pingDocRef, Fields.ACTIVE, ping => ping.createdAt + LIFETIME * 60 * 60 * 1000 < Date.now())

export async function addResponse(responderId: Snowflake) {
    const latest = await latestPing()
    if (latest) await arrayFieldModify<Ping>(pingDocRef, Fields.ACTIVE, ping => ping.responses.push(responderId), ping => ping.pingId === latest.pingId)
}

export async function decrementPings() {
    await arrayFieldModify<Ping>(pingDocRef, Fields.ACTIVE, ping => !_.isUndefined(ping.ttlLeft) ? ping.ttlLeft-- : null, ping => !_.isUndefined(ping.ttlLeft) && ping.ttlLeft > 0 && (!ping.delayLeft || ping.delayLeft === 0))
    await arrayFieldModify<Ping>(pingDocRef, Fields.ACTIVE, ping => !_.isUndefined(ping.delayLeft) ? ping.delayLeft-- : null, ping => !_.isUndefined(ping.delayLeft) && ping.delayLeft > 0)
}

export async function latestPing() {
    const pings = await allPings()
    const lastFiredIndex = _.findLastIndex(pings, ping => ping.fired)
    return lastFiredIndex < 0 ? null : pings[lastFiredIndex]
}