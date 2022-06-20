import * as utils from "../../../lib/util/async-utils"

test("sleep sleeps for a given number of ms", async () => {
    const wait = 1234
    const before = (new Date()).valueOf()
    await utils.sleep(wait)
    const after = (new Date()).valueOf()

    expect((after - before) / 1000).toBeCloseTo(wait / 1000, 1)
})