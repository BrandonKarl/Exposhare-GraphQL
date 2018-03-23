import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import socket from './socket'
import { withFilter } from 'graphql-subscriptions'
import { GraphQLError } from 'graphql'

dotenv.config({ path: path.join(__dirname, '/.env') })

const { ENDPOINT } = process.env

export default {
  Query: {
    user: async (parent, { id }) => {
      try {
        const user = await axios.get(`${ENDPOINT}/api/users/${id}`)
        return user.data
      } catch(e) {
        throw new GraphQLError(e.response.data.error)
      }
    },
    userFeed: async (parent, { id }) => {
      try {
        const feed = await axios.get(`${ENDPOINT}/api/users/${id}/feed`)
        return feed.data
      } catch(e) {
        throw new GraphQLError(e.response.data.error)
      }
    },
    userPosts: async (parent, { id }) => {
      try {
        const posts = await axios.get(`${ENDPOINT}/api/users/${id}/posts`)
        return posts.data
      } catch(e) {
        throw new GraphQLError(e.response.data.error)
      }
    },
    followers: async (parent, { id }) => {
      try {
        const posts = await axios.get(`${ENDPOINT}/api/users/${id}/followers`)
        return posts.data
      } catch(e) {
        throw new GraphQLError(e.response.data.error)
      }
    },
    searchUser: async (parent, { username }) => {
      try {
        const posts = await axios.get(`${ENDPOINT}/api/users/search/${username}`)
        return posts.data
      } catch(e) {
        throw new GraphQLError(e.response.data.error)
      }
    },
    following: async (parent, { id }) => {
      try {
        const posts = await axios.get(`${ENDPOINT}/api/users/${id}/following`)
        return posts.data
      } catch(e) {
        throw new GraphQLError(e.response.data.error)
      }
    },
    post: async (parent, { id }) => {
      try {
        const post = await axios.get(`${ENDPOINT}/api/posts/${id}`)
        return post.data
      } catch(e) {
        throw new GraphQLError(e.response.data.error)
      }
    }
  },
  Mutation: {
    newUser: async (parent, { firstname, lastname, email, password, bio, username }) => {
      try {
        const user = await axios.post(`${ENDPOINT}/api/users`, { firstname, lastname, email, password, bio, username })
        return user.data
      } catch(e) {
        throw new GraphQLError(e.response.data.error)
      }
    },
    newLike: async (parent, { user_id, post_id }) => {
      try {
        const like = await axios.post(`${ENDPOINT}/api/likes`, { user_id, post_id })
        return like.data
      } catch(e) {
        throw new GraphQLError(e.response.data.error)
      }
    },
    newFollow: async (parent, { follower, followee }) => {
      try {
        const follow = await axios.post(`${ENDPOINT}/api/follows`, { follower, followee })
        return follow.data
      } catch(e) {
        throw new GraphQLError(e.response.data.error)
      }
    },
    newPost: async (parent, { post_id }) => {
      try {
        var post = await axios.get(`${ENDPOINT}/api/posts/${post_id}`)
      } catch(e) {
        throw new GraphQLError(e.response.data.error)
      }

      socket.publish('NEW_POST', 
      {
        newPost: post.data
      })
      
      return post.data
    },
    loginUser: async (parent, { email, password }) => {
      try {
        const user = await axios.post(`${ENDPOINT}/api/users/authenticate`, { email, password })
        return user.data
      } catch(e) {
        throw new GraphQLError(e.response.data.error)
      }
    },
    removeLike: async (parent, { user_id, post_id }) => {
      console.log(user_id)
      try {
        const user = await axios.delete(`${ENDPOINT}/api/likes/${user_id}/${post_id}`)
        return { message: user.data }
      } catch(e) {
        throw new GraphQLError(e.response.data.error)
      }
    }
  },
  Subscription: {
    newPost: {
      subscribe: withFilter(
        () => socket.asyncIterator('NEW_POST'),
        async (payload, args) => {
          let found = false
          const followees = await axios.get(`${ENDPOINT}/api/follows/${args.feed_id}`)
          followees.data.map(followee => {
            if (followee.followee === payload.newPost.user_id) {
              found = true
            }
          })

          return found
        }
      )
    }
  }
}