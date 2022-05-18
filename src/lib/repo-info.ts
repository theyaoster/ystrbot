import got from "got"

const YSTR_LATEST_RELEASE_URL = "https://api.github.com/repos/theyaoster/valorant-ystr/releases/latest"
const YSTR_DOWNLOAD_LINK = (tag: string) => `https://github.com/theyaoster/valorant-ystr/releases/download/${tag}/VALORANT-ystr.exe`

// Get download link for the latest .exe
export async function getLatestExeLink() {
    const { tag_name } = await got.get(YSTR_LATEST_RELEASE_URL).json()
    return YSTR_DOWNLOAD_LINK(tag_name)
}
