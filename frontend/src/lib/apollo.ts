'use client'
import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { getMainDefinition } from '@apollo/client/utilities'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'

const httpLink = createHttpLink({
  uri: `${API_URL}/graphql`
})

const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('examhub_token')
    : null

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : ''
    }
  }
})

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.message === 'UNAUTHENTICATED') {
        localStorage.removeItem('examhub_token')
        window.location.href = '/auth/login'
      }
    }
  }
  if (networkError) {
    console.error('Network error:', networkError)
  }
})

const wsLink = typeof window !== 'undefined'
  ? new GraphQLWsLink(
      createClient({
        url: `${WS_URL}/graphql`,
        connectionParams: () => ({
          authorization: localStorage.getItem('examhub_token')
            ? `Bearer ${localStorage.getItem('examhub_token')}`
            : ''
        })
      })
    )
  : null

const splitLink = wsLink
  ? split(
      ({ query }) => {
        const def = getMainDefinition(query)
        return def.kind === 'OperationDefinition' && def.operation === 'subscription'
      },
      wsLink,
      from([errorLink, authLink, httpLink])
    )
  : from([errorLink, authLink, httpLink])

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          exams: { merge: false },
          questions: { merge: false }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
    query: { fetchPolicy: 'network-only' }
  }
})
