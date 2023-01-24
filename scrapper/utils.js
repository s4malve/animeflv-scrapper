// @ts-check

export const PROVIDERS_NAME = {
  MAIN: 'Zippyshare',
  ALTERNATIVE: 'Stape',
  NOT_RECOMMENDED: 'MEGA'
}

export const URLS = {
  base: 'https://animeflv-scrapper.s4malve.workers.dev',
  api: {
    lastEpidodesThumbnails: './assets/static/thumbnails/last-episodes'
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

/**
 *
 * @param {string} assetUrl
 * @param {string} pathToSave
 * @returns void
 */
export const downloadAsset = async ({ pathFrom, pathTo, fileName }) => {
  try {
    const axios = await import('axios').then((axios) => axios.default)
    const { createWriteStream } = await import('node:fs')

    console.log(`Fetching image for file name: ${fileName}`)

    const { data, status } = await axios.get(pathFrom, {
      responseType: 'stream'
    })

    if (status !== 200) throw new Error(data)

    console.log(`Writing image to disk ${fileName}`)

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

export const getTodaysAnimes = async () => {
  const todaysAnimes = []
  const TODAYS_ANIME_SELECTORS = {
    id: {
      selector: 'a',
      action: {
        name: 'attr',
        value: 'href'
      },
      format: (text) => text.slice(5)
    },
    thumbnail: {
      selector: 'span.Image img',
      action: {
        name: 'attr',
        value: 'src'
      },
      format: (text) => `${URLS.animeflv.BASE}${text}`
    },
    episode: {
      selector: 'span.Capi',
      action: {
        name: 'text',
        value: undefined
      },
      format: (text) => Number(text.split(' ')[1])
    },
    anime: {
      selector: 'strong.Title',
      action: {
        name: 'text',
        value: undefined
      },
      format: null
    }
  }
  const $ = await scrapeCheerio(URLS.animeflv.BASE)
  const $todaysAnimes = $('ul.ListEpisodios.AX.Rows.A06.C04.D03 li')
  const todaysAnimeSelectorsEntries = Object.entries(TODAYS_ANIME_SELECTORS)

  $todaysAnimes.each((_, el) => {
    const todaysAnimeEntries = todaysAnimeSelectorsEntries.map(
      ([key, { action, format, selector }]) => {
        const rawValue = $(el).find(selector)[action.name](action.value)
        const value = format ? format(rawValue) : rawValue

        return [key, value]
      }
    )

    todaysAnimes.push(Object.fromEntries(todaysAnimeEntries))
  })

  return todaysAnimes
}

/**
 *
 * @param {string} episodeId
 * @returns {Promise<[{name:string;path:string}]>}
 */
export const getProvidersLink = async (episodeId) => {
  const providers = []
  const PROVIDERS_SELECTORS = {
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
  }
  const providersSelectorsEntries = Object.entries(PROVIDERS_SELECTORS)
  const $ = await scrapeCheerio(
    `${URLS.animeflv.BASE}/${URLS.animeflv.CHAPTER}/${episodeId}`
  )
  const $providers = $('table.RTbl.Dwnl tbody tr')

  $providers.each((_, el) => {
    const providersEntries = providersSelectorsEntries.map(
      ([key, { action, selector }]) => {
        const value = $(el).find(selector)[action.name](action.value)

        return [key, value]
      }
    )

    providers.push(Object.fromEntries(providersEntries))
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
    const urlOrNull = await scrapePlaywright(providerUrl, (page) => {
      const TITLE_WHEN_NOT_FOUND = 'Video not found'
      const title = page.$eval(
        'head',
        (el) => el.querySelector('title')?.textContent
      )

      if (title?.includes(TITLE_WHEN_NOT_FOUND)) return null

      const url = page.$eval('video#mainvideo', (el) => el.src)

      return url
    })

    return urlOrNull
  } catch (error) {
    return error
  }
}

export const writeFile = async (filePath, data) => {
  const { writeFile: nodeWriteFile } = await import('node:fs')
  return await nodeWriteFile(
    filePath,
    JSON.stringify(data, null, 2),
    (err) => err && console.log(err)
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
