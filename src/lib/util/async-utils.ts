// Idle wait in ms
export async function sleep(milliseconds: number) {
    await new Promise(f => setTimeout(f, milliseconds))
}

// Idle wait in seconds
export async function sleepSeconds(seconds: number) {
    await sleep(seconds * 1000)
}

// Idle wait in minutes
export async function sleepMinutes(minutes: number) {
    await sleep(minutes * 60 * 1000)
}

// Idle wait in hours
export async function sleepHours(hours: number) {
    await sleep(hours * 60 * 60 * 1000)
}

// When we wait for something async, let's sleep for one second
export async function wait() {
    await sleepSeconds(1)
}