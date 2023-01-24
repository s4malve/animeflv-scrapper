import { scrapper, URLS, writeDbFile } from './utils'

export const getAllAnimes = async () => {
  const animes = []
  const MAX_ANIME_INDEX = 1
  const getAnimesFromPage = async (pageNumber) => {
    const url = `${URLS.animeflv.BASE}/${URLS.animeflv.ALL_ANIMES}?page=${pageNumber}`
    const selector = 'ul.ListAnimes.AX.Rows.A03.C02.D02 li'
    const animesFromPage = await scrapper({
      selectors: {
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
      },
      url,
      selector
    })

    return animesFromPage
  }

  for (let i = 1; i <= MAX_ANIME_INDEX; i++) {
    const animesInPage = await getAnimesFromPage(i)

    animes.push(...animesInPage)
  }
}

const animes = await getAllAnimes()

await writeDbFile('animes', animes)
