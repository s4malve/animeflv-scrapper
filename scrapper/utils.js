// @ts-check

export const URLS = {
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

export const destructurePath = (path) => {
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
 * @param {string} videoUrl
 * @param {string} pathToSave
 * @returns void
 */
export const downloadVideo = async (videoUrl, pathToSave) => {
  const axios = await import('axios').then((axios) => axios.default)
  const { createWriteStream } = await import('node:fs')

  const { data, status } = await axios.get(videoUrl, {
    responseType: 'stream'
  })

  if (status !== 200) throw new Error(data)

  const writer = createWriteStream(pathToSave)

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
        resolve(true)
      }
    })
  })
}

export const getMaxAnimeIndex = async () => {
  const $ = await scrapeCheerio(
    `${URLS.animeflv.BASE}/${URLS.animeflv.ALL_ANIMES}`
  )
  const $lastPaginationNumber = $('ul.pagination li:nth-last-child(2)')
  const lastIndex = $lastPaginationNumber.text()

  return Number(lastIndex)
}

export const getAllAnimesInPage = async (pageNumber = 1) => {
  const animesFromPage = []
  const $ = await scrapeCheerio(
    `${URLS.animeflv.BASE}/${URLS.animeflv.ALL_ANIMES}?page=${pageNumber}`
  )
  const $animeCards = $('ul.ListAnimes.AX.Rows.A03.C02.D02 li')
  const ANIME_SELECTORS = {
    id: {
      selector: 'article.Anime.alt.B a',
      action: {
        name: 'attr',
        value: 'href'
      },
      format: (text) => text.slice(7)
    },
    title: {
      selector: 'h3.Title',
      action: {
        name: 'text',
        value: undefined
      },
      format: null
    },
    descripton: {
      selector: 'div.Description p + p',
      action: {
        name: 'text',
        value: undefined
      },
      format: null
    },
    image: {
      selector: 'div.Image.fa-play-circle-o img',
      action: {
        name: 'attr',
        value: 'src'
      },
      format: null
    },
    type: {
      selector: 'div.Image.fa-play-circle-o span.Type',
      action: {
        name: 'text',
        value: undefined
      },
      format: null
    }
  }
  const animeSelctorEntries = Object.entries(ANIME_SELECTORS)

  $animeCards.each((idx, el) => {
    const animeEntries = animeSelctorEntries.map(
      ([key, { selector, action, format }]) => {
        const rawValue = $(el).find(selector)
        const obtainedValue = rawValue[action.name](action.value)
        const value = format ? format(obtainedValue) : obtainedValue

        return [key, value]
      }
    )

    animesFromPage.push(Object.fromEntries(animeEntries))
  })

  return animesFromPage
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
  const episodes = await scrapePlaywright(
    `${URLS.tioanime.BASE}/${URLS.tioanime.SINGLE_ANIME}/${animeId}`,
    /**
     *
     * @param {import('playwright').Page} page
     * @returns
     */
    async (page) =>
      await page.$$eval('ul.episodes-list li', (nodes) => {
        const EPISODES_SELECTORS = {
          id: {
            selector: 'a',
            action: {
              name: 'getAttribute',
              value: 'href'
            },
            format: (text) => text.slice(5)
          },
          episode: {
            selector: 'div.flex-grow-1 p span',
            action: {
              name: 'textContent',
              value: null
            },
            format: (text) => Number(text.split(' ')[1])
          }
        }

        const episodesSelectorsEntries = Object.entries(EPISODES_SELECTORS)

        return nodes.map((el) => {
          const episodesEntries = episodesSelectorsEntries.map(
            ([key, { action, selector, format }]) => {
              const rawValue = el.querySelector(selector)

              if (!rawValue) throw new Error('No raw value returned')

              const obtainedValue = action.value
                ? rawValue[action.name](action.value)
                : rawValue[action.name]
              const value = format(obtainedValue)

              return [key, value]
            }
          )

          return Object.fromEntries(episodesEntries)
        })
      })
  )

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
    episode: {
      selector: 'span.Capi',
      action: {
        name: 'text',
        value: undefined
      },
      format: (text) => Number(text.split(' ')[1])
    }
  }
  const $ = await scrapeCheerio(URLS.animeflv.BASE)
  const $todaysAnimes = $('ul.ListEpisodios.AX.Rows.A06.C04.D03 li')
  const todaysAnimeSelectorsEntries = Object.entries(TODAYS_ANIME_SELECTORS)

  $todaysAnimes.each((_, el) => {
    const todaysAnimeEntries = todaysAnimeSelectorsEntries.map(
      ([key, { action, format, selector }]) => {
        const rawValue = $(el).find(selector)[action.name](action.value)
        const value = format(rawValue)

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
 * @returns {Promise<{name:string;path:string}>}
 */
export const getProviderLink = async (episodeId) => {
  const PROVIDERS = {
    MAIN: 'Zippyshare',
    ALTERNATIVE: 'Stape',
    NOT_RECOMMENDED: 'MEGA'
  }
  const downloadsProviders = []
  const DOWNLOADS_PROVIDERS_SELECTORS = {
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
  const downloadsProvidersSelectorsEntries = Object.entries(
    DOWNLOADS_PROVIDERS_SELECTORS
  )
  const $ = await scrapeCheerio(
    `${URLS.animeflv.BASE}/${URLS.animeflv.CHAPTER}/${episodeId}`
  )
  const $downloadsProviders = $('table.RTbl.Dwnl tbody tr')

  $downloadsProviders.each((_, el) => {
    const downloadsProvidersEntries = downloadsProvidersSelectorsEntries.map(
      ([key, { action, selector }]) => {
        const value = $(el).find(selector)[action.name](action.value)

        return [key, value]
      }
    )

    downloadsProviders.push(Object.fromEntries(downloadsProvidersEntries))
  })

  const filteredProviders = downloadsProviders.filter(({ name }) => {
    return name !== PROVIDERS.NOT_RECOMMENDED
  })

  const provider = filteredProviders.find(
    ({ name }) => name === PROVIDERS.MAIN || name === PROVIDERS.ALTERNATIVE
  )

  return provider
}

/**
 * @param {string} providerUrl
 * @param {string} pathToSave
 */
export const downloadVideoWithPreferProvider = async (
  providerUrl,
  pathToSave
) => {
  const pathArray = providerUrl.split('/')
  const pathProtocol = pathArray[0]
  const pathHost = pathArray[2]
  const downloadLink = await scrapePlaywright(
    providerUrl,
    /**
     *
     * @param {import('playwright').Page} page
     * @returns
     */
    async (page) =>
      await page.$eval('a#dlbutton', (el) => el.getAttribute('href')?.slice(1))
  )
  const absolutePath = `${pathProtocol}//${pathHost}/${downloadLink}`

  return await downloadVideo(absolutePath, pathToSave)
}
