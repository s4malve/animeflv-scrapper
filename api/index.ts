import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) =>
  c.json({
    welcome: 'Hello World'
  })
)

export default app
