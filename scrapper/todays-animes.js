import {
  URLS,
  emptyDir,
  isDirEmpty,
  getProvidersLink,
  PROVIDERS_NAME,
  getDownloadLinkFromMainProvider,
  getDownloadLinkFromAlternativeProvider,
  scrapper,
  writeDbFile,
  downloadAsset
} from './utils.js'
import { resolve } from 'node:path'

const ASSETS_PATH = resolve(URLS.api.lastEpidodesThumbnails)

export const getTodaysAnimes = async () => {
  const rawTodaysAnimes = await scrapper({
    selectors: {
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
    },
    url: URLS.animeflv.BASE,
    selector: 'ul.ListEpisodios.AX.Rows.A06.C04.D03 li'
  })

  if (!(await isDirEmpty(ASSETS_PATH))) {
    await emptyDir(ASSETS_PATH)
  }

  const todaysAnimes = await Promise.all(
    rawTodaysAnimes.map(async (anime) => {
      const providers = await getProvidersLink(anime.id)
      const provider = providers.find(
        ({ name, path }) =>
          name === PROVIDERS_NAME.MAIN || name === PROVIDERS_NAME.ALTERNATIVE
      )
      const downloadLink =
        provider.name === PROVIDERS_NAME.MAIN
          ? await getDownloadLinkFromMainProvider(provider.path)
          : await getDownloadLinkFromAlternativeProvider(provider.path)

      await downloadAsset({
        pathFrom: anime.thumbnail,
        pathTo: ASSETS_PATH,
        fileName: `${anime.id}.jpg`
      })

      return {
        ...anime,
        thumbnail: `${URLS.base}/static/thumbnails/last-episodes/${anime.id}.jpg`,
        downloadLink
      }
    })
  )

  return todaysAnimes
}

const todaysAnimes = await getTodaysAnimes()

await writeDbFile('todays-animes', todaysAnimes)
