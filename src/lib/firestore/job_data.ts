import { doc } from "firebase/firestore"
import { Collections, Documents, Fields } from "../../config/firestore-schema"
import { getField, setField } from "./common"
import { db } from "./store"

const patchNotesDocRef = doc(db, Collections.JOB_DATA, Documents.PATCH_NOTES_SCRAPER)
const youtubeDocRef = doc(db, Collections.JOB_DATA, Documents.YOUTUBE_SCRAPER)

export const getMostRecentPath = async () => await getField<string>(patchNotesDocRef, Fields.MOST_RECENT_PATH)
export const setMostRecentPath = async (newPath: string) => await setField<string>(patchNotesDocRef, Fields.MOST_RECENT_PATH, newPath)
export const getYoutubeChannelId = async (fieldName: string) => await getField<string>(youtubeDocRef, fieldName)
export const getLatestVideoId = async (idName: string) => await getField<string>(youtubeDocRef, idName)
export const setLatestVideoId = async (idName: string, newId: string) => await setField<string>(youtubeDocRef, idName, newId)