import { getAuth, signInWithEmailAndPassword } from "@firebase/auth"
import { deleteField, doc, DocumentReference, getDoc, updateDoc } from "firebase/firestore"
import _ from "underscore"
import { createHash } from "crypto"
import config from "../../config/config"
import { Collections, Documents, Fields } from "../../config/firestore-schema"
import { forEachReverse, stringMap } from "../util/data-structure-utils"
import { db } from "./store"

const DEFAULT_ROOT_KEY = Fields.DATA as string

// Sign in using configured email
export async function signIn() {
    const signInResult = await signInWithEmailAndPassword(getAuth(), config.FIREBASE_EMAIL, config.FIREBASE_SECRET)
    console.log(`Authenticated as ${signInResult.user.email}`)
}

// Helper for retrieving a field's value from a doc
export async function getField<T>(docRef: DocumentReference, fieldPath = DEFAULT_ROOT_KEY, defaultValue?: T) {
    const document = await getDoc(docRef)

    if (!document.get(fieldPath)) {
        if (!_.isUndefined(defaultValue)) {
            // This allows falsey values other than undefined to be default values
            return defaultValue
        }

        throw new Error(`No such field ${docRef.path}/${fieldPath}`)
    }

    return document.get(fieldPath) as T
}

// Helper for setting a single field in a doc - returns whether the field was updated
export async function setField<T>(docRef: DocumentReference, fieldPath: string, value: T, replace: boolean = true) {
    if (!replace && (await getDoc(docRef)).get(fieldPath)) {
        return false
    }

    updateDoc(docRef, stringMap([fieldPath], [value]))
    return true
}

// Helper for deleting a single field in a doc
export async function removeField(docRef: DocumentReference, fieldPath: string) {
    updateDoc(docRef, stringMap([fieldPath], [deleteField()]))
}

// Helper function for retrieving a single player string field
export async function getPlayerField(name: string, field: string, token?: string) {
    const playerData = token ? await authenticate(name, token) : await getField(doc(db, Collections.GAME_DATA, Documents.PLAYERS), name)

    if (!(field in playerData)) {
        throw new Error(`${field} is not a field in ${name}`)
    }

    return playerData[field]
}

// Helper function for setting player string field(s)
export async function setPlayerFields(name: string, fieldMap: { [field: string] : string }, token?: string) {
    const oldPlayerData = token ? await authenticate(name, token) : await getField(doc(db, Collections.GAME_DATA, Documents.PLAYERS), name)
    for (const key of Object.keys(fieldMap)) {
        if (!(key in oldPlayerData)) {
            console.log(`Setting previously undefined field ${key} for ${name}.`)
        }

        oldPlayerData[key] = fieldMap[key]
    }
    const newData = stringMap([name], [oldPlayerData])

    return updateDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS), newData)
}

// Helper for pushing values to an array field - returns whether the values were successfully pushed
export async function arrayFieldPush<T>(docRef: DocumentReference, fieldPath: string, checkForDuplicates = false, ...values: T[]) {
    const currentArray = await getField(docRef, fieldPath, []) as T[]

    if (checkForDuplicates) {
        const duplicates = values.filter(value => currentArray.includes(value))
        if (!_.isEmpty(duplicates)) {
            console.error(`Could not push values - duplicates found: ${duplicates}`)

            return false
        }
    }

    currentArray.push(...values)

    updateDoc(docRef, stringMap([fieldPath], [currentArray]))
    return true
}

// Remove specified values from an array field - returns whether the values were successfully removed
export async function arrayFieldRemove<T>(docRef: DocumentReference, fieldPath: string, ...values: T[]) {
    const currentData = await getField(docRef, fieldPath)
    const currentArray = currentData as T[]

    for (const value of values) {
        const index = currentArray.indexOf(value)
        if (index < 0) {
            console.error(`Value '${value}' does not exist in the array at ${docRef.path}/${fieldPath}!`)
            return false
        } else {
            currentArray.splice(index, 1)
        }
    }

    updateDoc(docRef, stringMap([fieldPath], [currentArray]))
    return true
}

// Remove values at specified indices from an array field - returns whether the values were successfully removed
export async function arrayFieldRemoveByIndices<T>(docRef: DocumentReference, fieldPath: string, ...indices: number[]) {
    const currentData = await getField(docRef, fieldPath)
    const currentArray = currentData as T[]
    forEachReverse(indices, index => {
        if (index < 0 || index >= currentArray.length) {
            console.error(`Index '${index}' out of range at ${docRef.path}/${fieldPath}!`)
            return false
        }
        currentArray.splice(index, 1)
    })

    updateDoc(docRef, stringMap([fieldPath], [currentArray]))
    return true
}

// Pop the first element of an array field
export async function arrayFieldPop<T>(docRef: DocumentReference, fieldPath: string) {
    const currentData = await getField(docRef, fieldPath)

    const popped = (currentData as T[])[0]
    arrayFieldRemoveByIndices<T>(docRef, fieldPath, 0)
    return popped
}

// Authenticate registered player against secret
export async function authenticate(name: string, token: string) {
    const document = await getDoc(doc(db, Collections.GAME_DATA, Documents.PLAYERS))
    const hash = createHash("sha512").update(token).digest("hex")

    // Fail if registration does not exist or token hash doesn't match
    if (!document.get(name) || document.get(name)[Fields.SECRET] !== hash) {
        console.error(`Bad auth attempt: ${name}, ${token}`)

        throw new Error(`Authentication failed!`)
    }

    return document.get(name)
}