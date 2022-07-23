import { getAuth, signInWithEmailAndPassword } from "@firebase/auth"
import { arrayRemove, arrayUnion, deleteField, doc, DocumentReference, getDoc, updateDoc } from "firebase/firestore"
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
    await updateDoc(docRef, stringMap([fieldPath], [deleteField()]))
}

// Helper function for retrieving a single player string field
export async function getPlayerField(name: string, field: string, token?: string) {
    const playerData = token ? await authenticate(name, token) : await getField(doc(db, Collections.GAME_DATA, Documents.PLAYERS), name)

    if (!(field in playerData)) throw new Error(`${field} is not a field in ${name}`)
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

// Helper for running Array#find on an array field in Firestore
export async function arrayFieldFetch<T>(docRef: DocumentReference, fieldPath: string, predicate: (element: T) => boolean, strict = false) {
    const currentArray = await getField<T[]>(docRef, fieldPath, [])
    const element = currentArray.find(predicate)
    if (strict && !element) throw Error(`No matching element found in ${JSON.stringify(currentArray)} at ${docRef.path}/${fieldPath}`)
    return element
}

// Helper for pushing values to an array field - returns whether the values were successfully pushed
export async function arrayFieldPush<T>(docRef: DocumentReference, fieldPath: string, checkForDuplicates = false, ...values: T[]) {
    const currentArray = await getField<T[]>(docRef, fieldPath, [])

    if (checkForDuplicates) {
        const duplicates = values.filter(value => currentArray.includes(value))
        if (_.isEmpty(duplicates)) {
            // No duplicates - safe to union
            updateDoc(docRef, stringMap([fieldPath], [arrayUnion(values)]))
            return true
        } else {
            console.error(`Could not push values - duplicates found: ${duplicates}`)

            return false
        }
    } else {
        // Just append everything
        currentArray.push(...values)
        updateDoc(docRef, stringMap([fieldPath], [currentArray]))
        return true
    }
}

// Remove specified values from an array field (though they may not be present to begin with)
export async function arrayFieldRemove(docRef: DocumentReference, fieldPath: string, ...values: any[]) {
    await updateDoc(docRef, stringMap([fieldPath], [arrayRemove(...values)]))
}

// Remove values at specified indices from an array field - returns whether the values were successfully removed
export async function arrayFieldRemoveByIndices<T>(docRef: DocumentReference, fieldPath: string, ...indices: number[]) {
    const currentArray = await getField<T[]>(docRef, fieldPath)
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

// Remove all values in an array field satisfying a condition
export async function arrayFieldRemoveByCondition<T>(docRef: DocumentReference, fieldPath: string, condition: (element: T) => boolean) {
    const currentArray = await getField<T[]>(docRef, fieldPath)
    await arrayFieldRemove(docRef, fieldPath, ...currentArray.filter(condition))
}

// Pop the first element of an array field
export async function arrayFieldPop<T>(docRef: DocumentReference, fieldPath: string) {
    const currentData = await getField<T[]>(docRef, fieldPath)

    const popped = currentData[0]
    arrayFieldRemoveByIndices<T>(docRef, fieldPath, 0)
    return popped
}

// Modify elements of an array satisfying the filter with the updated data (only useful for arrays of objects)
export async function arrayFieldModify<T>(docRef: DocumentReference, fieldPath: string, update: (element: T) => void, filter: (element: T) => boolean) {
    const currentArray = await getField<T[]>(docRef, fieldPath)

    for (const element of currentArray) {
        if (filter(element)) update(element)
    }

    await updateDoc(docRef, stringMap([fieldPath], [currentArray]))
}

// Check if an array field contains a value
export async function arrayFieldContains<T>(docRef: DocumentReference, fieldPath: string, value: T) {
    return (await getField<T[]>(docRef, fieldPath)).includes(value)
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