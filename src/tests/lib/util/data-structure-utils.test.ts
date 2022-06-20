import * as utils from "../../../lib/util/data-structure-utils"

test("withoutEmojis removes custom emojis", () => {
    expect(utils.withoutEmojis("I love <:kekw:945738495893450433>! :heart:")).toBe("I love ! ")
})

test("withoutEmojis does not touch messages without emojis", () => {
    const message = "I love laughing! <3"
    expect(utils.withoutEmojis(message)).toBe(message)
})

test("numToEmoji only handles non-negative inputs", () => {
    expect(() => utils.numToEmoji(-1)).toThrow(Error)
})

test("numToEmoji handles single-digit numbers", () => {
    expect(utils.numToEmoji(0)).toEqual(["0️⃣"])
    expect(utils.numToEmoji(6)).toEqual(["6️⃣"])
})

test("numToEmoji handles inputs of 10 and greater than 10", () => {
    expect(utils.numToEmoji(10)).toEqual(["🔟"])
    expect(utils.numToEmoji(11)).toEqual(["▶️", "🔟"])
})

test("nameToEmoji converts common names to emojis", () => {
    expect(utils.nameToEmoji("tada")).toBe("🎉")
    expect(utils.nameToEmoji("heart_eyes_cat")).toBe("😻")
    expect(utils.nameToEmoji("billed_cap")).toBe("🧢")
})

test("readableArray produces readable output for empty and single element inputs", () => {
    expect(utils.readableArray([])).toBe("")
    expect(utils.readableArray(["hello"])).toBe("hello")
})

test("readableArray produces readable output for inputs with two or more elements", () => {
    expect(utils.readableArray(["alice", "bob"])).toBe("alice and bob")
    expect(utils.readableArray(["charlie", "delta", "echo", "foxtrot"])).toBe("charlie, delta, echo and foxtrot")
})

test("stringMap throws an error if inputs are not of equal length", () => {
    expect(() => utils.stringMap(["alice"], ["bob", "charlie"])).toThrow(Error)
})

test("stringMap creates an object using the given keys and values", () => {
    const obj = utils.stringMap(["alice", "bob"], ["hello", ["world"]])
    expect(Object.keys(obj)).toEqual(["alice", "bob"])
    expect(Object.values(obj)).toEqual(["hello", ["world"]])
    expect(obj["alice"]).toBe("hello")
    expect(obj["bob"]).toEqual(["world"])
})

test("timeCode creates padded timecodes from an input number of seconds", () => {
    expect(utils.timeCode(0)).toBe("00:00:00")
    expect(utils.timeCode(13)).toBe("00:00:13")
    expect(utils.timeCode(120)).toBe("00:02:00")
    expect(utils.timeCode(1323)).toBe("00:22:03")
    expect(utils.timeCode(48212)).toBe("13:23:32")
})

test("readableTimeMinutes represents input number of minutes as hours and minutes", () => {
    expect(utils.readableTimeMinutes(0)).toBe("0m")
    expect(utils.readableTimeMinutes(34)).toBe("34m")
    expect(utils.readableTimeMinutes(142)).toBe("2h 22m")
    expect(utils.readableTimeMinutes(903)).toBe("15h 3m")
})

test("readableTimeSeconds represents input number of seconds as minutes and seconds", () => {
    expect(utils.readableTimeSeconds(0)).toBe("0s")
    expect(utils.readableTimeSeconds(58)).toBe("58s")
    expect(utils.readableTimeSeconds(481)).toBe("8m 1s")
    expect(utils.readableTimeSeconds(1033)).toBe("17m 13s")
})

test("nameFromDirectUrl throws error if the url is not direct", () => {
    expect(() => utils.nameFromDirectUrl("https://www.google.com")).toThrow(Error)
})

test("nameFromDirectUrl fetches the filename", () => {
    expect(utils.nameFromDirectUrl("https://www.google.com/something.js")).toBe("something.js")
    expect(utils.nameFromDirectUrl("https://upload.wikimedia.org/wikipedia/commons/7/7d/Margaryn_022.jpg")).toBe("Margaryn_022.jpg")
    expect(utils.nameFromDirectUrl("https://static.wikia.nocookie.net/valorant/images/d/df/YoruPick.mp3/revision/latest?cb=20210702142559")).toBe("YoruPick.mp3")
})