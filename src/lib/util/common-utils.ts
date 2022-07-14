import _ from "underscore"
import { sleepSeconds } from "./async-utils"

const MAX_RETRIES = 5
const BASE_WAIT = 1 // seconds

// Wrapper that handles errors to avoid unhandled promise rejection errors
export async function withHandling<T>(methodDict: { [methodId: string]: (...args: any[]) => Promise<T> }, ...args: any[]): Promise<T | null> {
    const methodName = Object.keys(methodDict)[0]
    const method = methodDict[methodName]

    try {
        const output = args.length > 0 ? await method(...args) : await method()
        return output
    } catch (error: any) {
        console.error(`Error occurred while calling ${methodName}: ${error.stack}`)

        return null
    }
}

// Wrapper that handles errors and retries
export async function withRetries<T>(methodDict: { [methodId: string]: (...args: any[]) => Promise<T> }, ...args: any[]): Promise<T | null> {
    const methodName = Object.keys(methodDict)[0]
    const method = methodDict[methodName]

    let retry = 0
    let wait = BASE_WAIT
    while (retry < MAX_RETRIES) {
        try {
            const output = args.length > 0 ? await method(...args) : await method()
            return output
        } catch (error: any) {
            console.error(`Error occurred during ${methodName}(${args.join(", ")}) on retry ${retry + 1}: ${error.stack}`)

            await sleepSeconds(wait)
        }

        retry++
        wait *= 2
    }

    console.error(`${methodName}(${args.join(", ")}) failed all (${MAX_RETRIES}) retries.`)

    return null
}