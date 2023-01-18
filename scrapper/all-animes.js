import { resolve } from 'node:path'
import { writeFile } from 'node:fs'

import { getAllAnimesInPage } from './utils'

const animes = []

const MAX_ANIME_INDEX = 1

for (let i = 1; i <= MAX_ANIME_INDEX; i++) {
  const animesInPage = await getAllAnimesInPage(i)

  animes.push(...animesInPage)
}

const filePath = resolve('./db/animes.json')

await writeFile(filePath, JSON.stringify(animes, null, 2), (err) => {
  if (err) console.log(err)
})
