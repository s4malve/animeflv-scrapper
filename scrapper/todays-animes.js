import {
  getTodaysAnimes,
  writeFile,
  downloadAsset,
  URLS,
  emptyDir,
  isDirEmpty
} from './utils.js'
import { resolve } from 'node:path'

const rawTodaysAnimes = await getTodaysAnimes()

const ASSETS_PATH = resolve(URLS.api.lastEpidodesThumbnails)

if (!(await isDirEmpty(URLS.api.lastEpidodesThumbnails))) {
  await emptyDir(URLS.api.lastEpidodesThumbnails)
}

rawTodaysAnimes.forEach(async ({ thumbnail, id }) => {
  await downloadAsset(thumbnail, `${ASSETS_PATH}/${id}.jpg`)
})

const todaysAnimes = rawTodaysAnimes.map((anime) => ({
  ...anime,
  thumbnail: `${URLS.base}/static/thumbnails/${anime.id}.jpg`
}))

const FILE_PATH = resolve('./db/todays-animes.json')

await writeFile(FILE_PATH, todaysAnimes)
