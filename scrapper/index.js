import { resolve } from 'node:path'
import {
  downloadAsset,
  getAnimeEpisodes,
  getDownloadLinkFromAlternativeProvider,
  getDownloadLinkFromMainProvider,
  getProvidersLink,
  PROVIDERS_NAME
} from './utils.js'

const ANIME_ID = 'isekai-yakkyoku'
const PATH = resolve('./animes')

export const downloadEpisodes = async (animeId) => {
  const episodes = await getAnimeEpisodes(animeId)

  episodes.forEach(async (episode) => {
    const providers = await getProvidersLink(episode.id)
    let provider = providers.find(({ name }) => name === PROVIDERS_NAME.MAIN)
    let link

    if (provider) {
      link = await getDownloadLinkFromMainProvider(provider.path)
    }

    if (!link) {
      console.log(
        `${episode.id} ${PROVIDERS_NAME.MAIN} provider not found trying with alternative`
      )
      provider = providers.find(
        ({ name }) => name === PROVIDERS_NAME.ALTERNATIVE
      )
      link = await getDownloadLinkFromAlternativeProvider(provider.path)

      console.log(
        `Episode ${episode.episode} not found neither ${PROVIDERS_NAME.MAIN} nor ${PROVIDERS_NAME.ALTERNATIVE}`
      )

      return
    }

    await downloadAsset({
      pathFrom: link,
      pathTo: PATH,
      fileName: `${episode.id}.mp4`
    })
  })
}

export const downloadEpisode = async (episodeId) => {
  const providersLinks = await getProvidersLink(ANIME_ID)

  const provider = providersLinks.find(
    (link) => PROVIDERS_NAME.MAIN === link.name
  )
  const link = await getDownloadLinkFromMainProvider(provider.path)

  await downloadAsset({
    pathFrom: link,
    pathTo: PATH,
    fileName: `${ANIME_ID}.mp4`
  })
}

await downloadEpisodes(ANIME_ID)
