import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/serve-static.module'

import animes from '../db/animes.json'
import todaysAnimes from '../db/todays-animes.json'

import { paginator } from './utils'

const app = new Hono()

app.use(
  '/api/*',
  cors({
    origin: '*'
  })
)

app.use('/static/*', serveStatic({ root: './' }))

app.get('/', (c) =>
  c.json({
    welcome: 'Hello World'
  })
)

app.get('/animes', (ctx) => {
  const query = ctx.req.query()
  const page = Number(query?.page) ?? 1
  const per_page = Number(query?.per_page) ?? 10

  return ctx.json(paginator(animes, page, per_page))
})

app.get('/animes/today', (ctx) => {
  return ctx.json(todaysAnimes)
})

export default app
