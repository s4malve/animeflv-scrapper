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

export const scrapeCheerio = async (url: string) => {
  const cheerio = await import('cheerio')
  const res = await fetch(url)
  const html = await res.text()

  return cheerio.load(html)
}

export const scrapePlaywright = async (
  url: string,
  callback: (page: any) => any
): Promise<any> => {
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

export const downloadVideo = async (videoUrl: string, pathToSave: string) => {
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
