import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import socket from './socket'
import { withFilter } from 'graphql-subscriptions'

dotenv.config({ path: path.join(__dirname, '/.env') })

export default {
  Query: {
    user: async (parent, { id }) => {
      const user = await axios.get(`${process.env.HOST}/api/users/${id}`)
      return user.data
    },
    post: async (parent, { id }) => {
      const post = await axios.get(`${process.env.HOST}/api/posts/${id}`)
      return post.data
    }
  },
  Mutation: {
    newUser: async (parent, { firstname, lastname, email, password }) => {
      const user = await axios.post(`${process.env.HOST}/api/users`, { firstname, lastname, email, password })
      return user.data
    },
    newLike: async (parent, { user_id, post_id }) => {
      const like = await axios.post(`${process.env.HOST}/api/likes`, { user_id, post_id })
      return like.data
    },
    newFollow: async (parent, { follower, followee }) => {
      const follow = await axios.post(`${process.env.HOST}/api/follows`, { follower, followee })
      return follow.data
    },
    newPost: async (parent, { post_id }) => {
      const post = await axios.get(`${process.env.HOST}/api/posts/${post_id}`)

      socket.publish('NEW_POST', 
      {
        newPost: {
          id: post.data.id,
          content: post.data.content,
          firstname: post.data.user.firstname,
          lastname: post.data.user.lastname,
          user_id: post.data.user_id,
          likes: "0",
          created_at: post.data.created_at,
          image_url: post.data.image_url
        }
      })
      
      return post.data
    }
  },
  Subscription: {
    newPost: {
      subscribe: withFilter(
        () => socket.asyncIterator('NEW_POST'),
        async (payload, args) => {
          let found = false
          const followees = await axios.get(`${process.env.HOST}/api/follows/${args.feed_id}`)
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