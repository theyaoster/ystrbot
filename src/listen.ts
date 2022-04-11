import express from "express"
import _ from "underscore"
import { getAuth, signInWithEmailAndPassword } from "@firebase/auth"
import config from "./config/config"
import { setPlayerStatus } from "./lib/firestore"
import { sleep } from "./lib/data-structure-utils"

const APP = express()
const HOST = "0.0.0.0"
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 80
const BACKLOG = 511 // default
const NAME_KEY = "name"
const STATUS_KEY = "status"
const SECRET_KEY = "secret"
const REQUIRED_FIELDS = [NAME_KEY, STATUS_KEY, SECRET_KEY]
const SLEEP_TIME = 1000 // ms

// Authenticate
let authenticated = false
signInWithEmailAndPassword(getAuth(), config.FIREBASE_EMAIL, config.FIREBASE_SECRET).then(_ => authenticated = true)

// Expect JSON content type
APP.use(express.json())

APP.put("/live_status", async (request, response) => {
    const missingFields = REQUIRED_FIELDS.filter(field => !request.body[field])
    if (!_.isEmpty(missingFields)) {
        response.json({ message: `Request body is missing expected fields: ${missingFields}` })
        return
    }

    // Wait for sign-in to complete if needed
    while (!authenticated) {
        await sleep(SLEEP_TIME)
    }

    setPlayerStatus(request.body[NAME_KEY], request.body[STATUS_KEY], request.body[SECRET_KEY]).then(_ => {
        response.json({ message: `Updated status for ${request.body[NAME_KEY]} to ${request.body[STATUS_KEY]}.`})
    }).catch(error => {
        console.error(`Error occurred while setting player status: ${error}`)
    })
})

APP.listen(PORT, HOST, BACKLOG, () => {
    console.log(`Listening for events on ${HOST}:${PORT}...`)
})