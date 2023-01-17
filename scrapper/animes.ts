// @ts-check
import type { Page } from 'playwright'
import { downloadVideo, scrapeCheerio, scrapePlaywright, URLS } from './utils'

export const getMaxAnimeIndex = async () => {
  const $ = await scrapeCheerio(
    `${URLS.animeflv.BASE}/${URLS.animeflv.ALL_ANIMES}`
  )
  const $lastPaginationNumber = $('ul.pagination li:nth-last-child(2)')
  const lastIndex = $lastPaginationNumber.text()

  return Number(lastIndex)
}

export const getAllAnimesInPage = async (pageNumber = 1) => {
  const animesFromPage: {}[] = []
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
      format: (text: string) => text.slice(7)
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

export const getAnimeEpisodes = async (animeId: string) => {
  const episodes = await scrapePlaywright(
    `${URLS.tioanime.BASE}/${URLS.tioanime.SINGLE_ANIME}/${animeId}`,
    async (page: Page) =>
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
  const todaysAnimes: {
    id: string
    episode: number
  }[] = []
  const TODAYS_ANIME_SELECTORS = {
    id: {
      selector: 'a',
      action: {
        name: 'attr',
        value: 'href'
      },
      format: (text: string) => text.slice(5)
    },
    episode: {
      selector: 'span.Capi',
      action: {
        name: 'text',
        value: undefined
      },
      format: (text: string) => Number(text.split(' ')[1])
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

export const getProviderLink = async (episodeId: string) => {
  const PREFFER_PROVIDER = 'Zippyshare'
  const NOT_RECOMMENDED_PROVIDER = 'MEGA'
  const PROVIDER_IF_PREFFER_PROVIDER_DONT_EXIST = 'Stape'
  const downloadsProviders: {
    [key in keyof typeof DOWNLOADS_PROVIDERS_SELECTORS]: string
  }[] = []
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

  const preferProviderExist = downloadsProviders.find(
    ({ name }) => name === PREFFER_PROVIDER
  )

  const fileteredDownloadsProviders = downloadsProviders.filter(({ name }) => {
    return (
      name !== NOT_RECOMMENDED_PROVIDER &&
      (preferProviderExist
        ? name === PREFFER_PROVIDER
        : name === PROVIDER_IF_PREFFER_PROVIDER_DONT_EXIST)
    )
  })

  return fileteredDownloadsProviders
}

export const downloadVideoWithPreferProvider = async (
  providerUrl: string,
  pathToSave: string
) => {
  const pathArray = providerUrl.split('/')
  const pathProtocol = pathArray[0]
  const pathHost = pathArray[2]
  const downloadLink = await scrapePlaywright(
    providerUrl,
    async (page: Page) =>
      await page.$eval('a#dlbutton', (el) => el.getAttribute('href')?.slice(1))
  )
  const absolutePath = `${pathProtocol}//${pathHost}/${downloadLink}`

  return await downloadVideo(absolutePath, pathToSave)
}

console.log(
  await downloadVideoWithPreferProvider(
    'https://www18.zippyshare.com/v/90DeH4c0/file.html',
    'D:/s4malve/Documents/test-folder/video.mp4'
  )
)

export {}
