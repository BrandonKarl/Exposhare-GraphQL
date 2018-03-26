import express from 'express'

import { createServer } from 'http'

import bodyParser from 'body-parser'
import cors from 'cors'

// GraphQL imports
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express'
import { makeExecutableSchema } from 'graphql-tools'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { subscribe, execute } from 'graphql'
import { importSchema } from 'graphql-import'
import { apolloUploadExpress } from 'apollo-upload-server'

import resolvers from './resolvers'

const typeDefs = importSchema('schema.graphql')

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
})

const app = express()

app.use(cors())
app.use(bodyParser.json())

app.use('/graphql', 
  apolloUploadExpress(),
  graphqlExpress({ schema })
)

app.use('/graphiql', graphiqlExpress({
  endpointURL: '/graphql',
  subscriptionsEndpoint: 'ws://localhost:4001/subscriptions'
}))

const server = createServer(app)

server.listen(4001, () => {
  new SubscriptionServer({
    schema,
    execute,
    subscribe,
    onConnect: () => console.log('Connected to subscription server')
  },
  {
    server,
    path: '/subscriptions'
  })

  console.log('Running on port 4001')
})