import { scrapper, URLS, writeDbFile } from './utils.js'

export const getLastAddedAnimes = async () => {
  const url = URLS.animeflv.BASE
  const selector = 'ul.ListAnimes.AX.Rows.A06.C04.D03 li'
  const animeCards = await scrapper({
    selectors: {
      id: {
        selector: 'a',
        action: {
          name: 'attr',
          value: 'href'
        },
        format: (text) => text.split('/').pop()
      },
      thumbnail: {
        selector: 'div.Image.fa-play-circle-o img',
        action: {
          name: 'attr',
          value: 'src'
        },
        format: (text) => `${URLS.animeflv.BASE}${text}`
      },
      title: {
        selector: 'h3.Title',
        action: {
          name: 'text',
          value: undefined
        },
        format: null
      },
      description: {
        selector: 'p + p',
        action: {
          name: 'text',
          value: undefined
        },
        format: null
      },
      type: {
        selector: 'p span.Type.tv',
        action: {
          name: 'text',
          value: undefined
        },
        format: null
      }
    },
    url,
    selector
  })

  return animeCards
}

const lastAddedAnimes = await getLastAddedAnimes()

await writeDbFile('last-added-animes', lastAddedAnimes)
