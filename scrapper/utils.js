// @ts-check

export const PROVIDERS_NAME = {
  MAIN: 'Zippyshare',
  ALTERNATIVE: 'Stape',
  NOT_RECOMMENDED: 'MEGA'
}

export const URLS = {
  base: 'https://animeflv-scrapper.s4malve.workers.dev',
  api: {
    lastEpidodesThumbnails: './assets/static/thumbnails/last-episodes',
    thumbnails: './assets/static/thumbnails'
  },
  animeflv: {
    BASE: 'https://www3.animeflv.net',
    CHAPTER: '/ver',
    ALL_ANIMES: '/browse',
    SINGLE_ANIME: '/anime'
  },
  tioanime: {
    BASE: 'https://tioanime.com',
    CHAPTER: '/ver',
    ALL_ANIMES: '/directorio',
    SINGLE_ANIME: '/anime'
  }
}

export const destructureURL = (path) => {
  const [protocol, domain, ...routes] = path
    .split('/')
    .filter((text) => text !== '')

  return { protocol, domain, routes }
}

export const scrapeCheerio = async (url) => {
  const cheerio = await import('cheerio')
  const res = await fetch(url)
  const html = await res.text()

  return cheerio.load(html)
}

/**
 *
 * @param {string} url
 * @param {(page:import('playwright').Page) => any} callback
 * @returns Promise<any>
 */
export const scrapePlaywright = async (url, callback) => {
  const playwright = await import('playwright')
  const browser = await playwright.chromium.launch({ headless: true })
  const page = await browser.newPage({
    javaScriptEnabled: true
  })

  await page.goto(url)

  const scrapeActions = await callback(page)

  await browser.close()

  return scrapeActions
}

export const downloadAsset = async ({ pathFrom, pathTo, fileName }) => {
  try {
    const axios = await import('axios').then((axios) => axios.default)
    const { createWriteStream } = await import('node:fs')
    const isVideoFile = fileName.endsWith('.mp4')
    const fileType = isVideoFile ? 'video' : 'image'

    console.log(`Fetching ${fileType} for file name: ${fileName}`)

    const { data, status } = await axios.get(pathFrom, {
      responseType: 'stream'
    })

    if (status !== 200) throw new Error(data)

    console.log(`Writing ${fileType} to disk ${fileName}`)

    const writer = createWriteStream(`${pathTo}/${fileName}`)

    return new Promise((resolve, reject) => {
      data.pipe(writer)

      let error = null

      writer.on('error', (err) => {
        error = err
        writer.close()
        reject(err)
      })

      writer.on('close', () => {
        if (!error) {
          console.log(`Everything is done! ${fileName}`)

          resolve(true)
        }
      })
    })
  } catch (error) {
    console.error(error)

    return error
  }
}

export const getMaxAnimeIndex = async () => {
  const $ = await scrapeCheerio(
    `${URLS.animeflv.BASE}/${URLS.animeflv.ALL_ANIMES}`
  )
  const $lastPaginationNumber = $('ul.pagination li:nth-last-child(2)')
  const lastIndex = $lastPaginationNumber.text()

  return Number(lastIndex)
}

/**
 *
 * @param {string} animeId
 * @returns {Promise<{ id: string; episode: number }[]>}  A list of object with anime id and episode number
 *
 * @example
 *  const ANIME_ID = 'kinsou-no-vermeil'
 *  const animeEpisodes = await getAnimeEpisodes(ANIME_ID)
 *
 *  console.log(animeEpisodes) // [
    //  { id: 'kinsou-no-vermeil-2', episode: 2 },
    //  { id: 'kinsou-no-vermeil-1', episode: 1 }
    // ]
 *
 */
export const getAnimeEpisodes = async (animeId) => {
  const $ = await scrapeCheerio(
    `${URLS.animeflv.BASE}/${URLS.animeflv.SINGLE_ANIME}/${animeId}`
  )
  const scripts = $(
    'body script[src="/assets/animeflv/js/alertify.js"] + script'
  ).text()
  // const splitedScript = neededScript.split(/\[(.*?)\]|\[/g)
  const splitedScript = scripts.split('\n ')
  const neededScript = splitedScript[2]
  const rawEpisodes = neededScript.split(' ').pop()?.slice(0, -1)
  const episodesMatrix = JSON.parse(rawEpisodes)
  const episodes = episodesMatrix.map(([episode]) => ({
    id: `${animeId}-${episode}`,
    episode
  }))

  return episodes
}

/**
 * @param {{
 *  url: string
 *  selector: string
 * selectors: {
 *  [key:string]: {
 *  selector: string
 *  action: {
 *    name:string
 *    value: string | undefined
 *  }
 *  format: ((text:string) => string | number) | null
 *  }
 * }
 * }} params
 * @returns
 */
export const scrapper = async ({ url, selector, selectors }) => {
  const items = []
  const $ = await scrapeCheerio(url)
  const $items = $(selector)
  const selectorsEntries = Object.entries(selectors)

  $items.each((_, el) => {
    const entries = selectorsEntries.map(
      ([key, { action, format, selector }]) => {
        const rawValue = $(el).find(selector)[action.name](action.value)
        const value = format ? format(rawValue) : rawValue

        return [key, value]
      }
    )

    items.push(Object.fromEntries(entries))
  })

  return items
}

/**
 *
 * @param {string} episodeId
 * @returns {Promise<[{name:string;path:string}]>}
 */
export const getProvidersLink = async (episodeId) => {
  const providers = await scrapper({
    selectors: {
      name: {
        selector: 'td:first-child',
        action: {
          name: 'text',
          value: undefined
        }
      },
      path: {
        selector: 'td:last-child a',
        action: {
          name: 'attr',
          value: 'href'
        }
      }
    },
    url: `${URLS.animeflv.BASE}/${URLS.animeflv.CHAPTER}/${episodeId}`,
    selector: 'table.RTbl.Dwnl tbody tr'
  })

  return providers
}

/**
 * @param {string} providerUrl
 * @param {string} pathToSave
 */
export const getDownloadLinkFromMainProvider = async (providerUrl) => {
  const $ = await scrapeCheerio(providerUrl)
  const TEXT_WHEN_NOT_FOUND = 'File does not exist on this server'
  const isNotFound = $('div#lrbox').text().includes(TEXT_WHEN_NOT_FOUND)

  if (isNotFound) return null

  const sanitizeString = (str) => str.replace(/"|'|\(|\)|;/g, '')
  const pageScript = $('div.center script').text()
  const searchedScript = pageScript.split('\n')[1]
  const splitedScript = searchedScript.split(' ').filter((text) => text !== '')
  const INITIAL_PATH_INDEX = 2
  const VIDEO_PATH_INDEX = splitedScript.length - 1
  const FIRST_OPERATION_INDEX = 4
  const SECOND_OPERATION_INDEX = 6
  const THIRD_OPERATION_INDEX = 8
  const LAST_OPERATION_INDEX = 10
  const initialPath = sanitizeString(splitedScript[INITIAL_PATH_INDEX])
  const videoPath = sanitizeString(splitedScript[VIDEO_PATH_INDEX])
  const firstOperation = Number(
    sanitizeString(splitedScript[FIRST_OPERATION_INDEX])
  )
  const secondOperation = Number(splitedScript[SECOND_OPERATION_INDEX])
  const thirdOperation = Number(splitedScript[THIRD_OPERATION_INDEX])
  const lastOperation = Number(
    sanitizeString(splitedScript[LAST_OPERATION_INDEX])
  )
  const opertaion =
    (firstOperation % secondOperation) + (thirdOperation % lastOperation)

  const { protocol, domain } = destructureURL(providerUrl)

  const finalPath = `${protocol}//${domain}${initialPath}${opertaion}${videoPath}`

  return finalPath
}

/**
 *
 * @param {url} providerUrl
 * @returns {Promise<string | null>} video url or null
 */
export const getDownloadLinkFromAlternativeProvider = async (providerUrl) => {
  try {
    const $ = await scrapeCheerio(providerUrl)
    const rawScripts = $('div#norobotlink + script').text()

    if (!rawScripts) return null

    const formatScripts = (scripts) => scripts.trim().split('\n')
    const getIdFromScript = (script) => {
      const ID_INDEX = script.indexOf('=') + 1
      const id = script.slice(ID_INDEX)

      // eslint-disable-next-line no-eval
      return String(eval(id)).slice(2)
    }

    const noRobotsScript = formatScripts(rawScripts).find((script) => {
      const ID = 'norobotlink'

      return script.includes(ID)
    })

    return getIdFromScript(noRobotsScript)
  } catch (error) {
    return error
  }
}

export const writeDbFile = async (dbName, data) => {
  const { writeFile } = await import('node:fs')
  const { resolve } = await import('node:path')

  const DB_PATH = resolve('./db/')

  return await writeFile(
    `${DB_PATH}/${dbName}.json`,
    JSON.stringify(data, null, 2),
    (err) => {
      if (err) {
        console.log(err)

        throw err
      }
    }
  )
}

export const emptyDir = async (dirPath) => {
  const { readdir, unlink } = await import('node:fs')
  const { join } = await import('node:path')

  readdir(dirPath, (err, files) => {
    if (err) throw err

    for (const file of files) {
      unlink(join(dirPath, file), (err) => {
        if (err) throw err
      })
    }
  })
}

export const isDirEmpty = async (dirPath) => {
  const { readdirSync } = await import('node:fs')

  return readdirSync(dirPath).length === 0
}
