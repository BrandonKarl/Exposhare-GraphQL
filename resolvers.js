import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import socket from './socket'
import { withFilter } from 'graphql-subscriptions'
import { GraphQLError } from 'graphql'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { GraphQLUpload } from 'apollo-upload-server'
import aws from 'aws-sdk'
import moment from 'moment'
import db from './database/connection'

import { formatFeed } from './helper/formatFeed'
import { formatFeedComments } from './helper/formatFeedComments'
import { formatConversation } from './helper/formatConversation'

import { getUser, getUserFeed, getUserPosts, 
        getUserFollowers, searchUser, checkUserExists, getUserByUsername } from './db_actions/query/user'
import { isFollowing, getFollowers, getFollowing } from './db_actions/query/follows'
import { getLikedPosts } from './db_actions/query/likes'
import { getPost, getTrending } from './db_actions/query/posts';

import { insertUser, updateInfo } from './db_actions/mutate/user' 
import { insertFollow, incrementFollowers, incrementFollowing, 
        deleteFollow, decrementFollowers, decrementFollowing } from './db_actions/mutate/follows' 
import { insertLike, incrementLikes, deleteLike, decrementLikes } from './db_actions/mutate/likes'
import { insertPost, deletePost } from './db_actions/mutate/posts'
import { insertComment } from './db_actions/mutate/comments';

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET
})

dotenv.config({ path: path.join(__dirname, '/.env') })

const { ENDPOINT } = process.env

const handleErrors = fn =>
  (parent, args) => {
    return Promise.resolve(fn(parent, args))
      .then(res => { return res })
      .catch(e => { throw new GraphQLError(e.message) })
  }

export default {
  Upload: GraphQLUpload,
  Query: {
    user: handleErrors(async (parent, { username, context_id }) => {
      const user = await getUserByUsername(username)
      if(!user) {
        throw new Error('User does not exist')
      }
      const is_following = await isFollowing(user.id, context_id)
      return { ...user, is_following }
    }),
    userFeed: handleErrors(async (parent, { id, after }) => {
      const feed = await getUserFeed(id, after)
      return formatFeedComments(feed)
    }),
    userPosts: handleErrors(async (parent, { id, context_id, after }) => {
      const posts = await getUserPosts(id, context_id, after)
      return formatFeedComments(posts)
    }),
    followers: handleErrors(async (parent, { id }) => {
      return await getFollowers(id)
    }),
    searchUser: handleErrors(async (parent, { username }) => {
      return await searchUser(username)
    }),
    following: handleErrors(async (parent, { id }) => {
      return await getFollowing(id)
    }),
    likedPosts: handleErrors(async (parent, { id }) => {
      const likedPosts = await getLikedPosts(id)
      return formatFeed(likedPosts)
    }),
    post: handleErrors(async (parent, { id, context_id }) => {
      const post = await getPost(id, context_id)
      if(!post.rows.length) {
        throw new Error('Post does not exist')
      }
      return formatFeedComments(post)[0]
    }),
    trending: handleErrors(async (parent, {}) => {
      const trending = await getTrending()
      return formatFeedComments(trending)
    }),
    userConversations: handleErrors(async (parent, { user_id }) => {
      const conversations = await db.query(`
        SELECT user1, user2, conversations.id, message, messages.user_id, 
        u1.firstname, u1.lastname, u1.id as user_id, u1.profile_picture,
        u2.firstname AS uo_first, u2.lastname AS uo_last, u2.username AS uo_user, u2.id AS uo_id, u2.profile_picture AS uo_p,
        u3.firstname AS ut_first, u3.lastname AS ut_last, u3.username AS ut_user, u3.id AS ut_id, u3.profile_picture AS ut_p
        FROM conversations
        JOIN messages ON messages.conversation_id = conversations.id
        JOIN users u1 ON u1.id = messages.user_id
        JOIN users u2 ON u2.id = user1
        JOIN users u3 ON u3.id = user2
        WHERE user1 = $1 OR user2 = $1
        ORDER BY conversations.id DESC, messages.id`,
      [user_id])

      return formatConversation(conversations)
    })
  },
  Mutation: {
    newUser: handleErrors(async (parent, { firstname, lastname, email, password, bio, username }) => {
      const foundUser = await checkUserExists(email)
      if(foundUser) {
        throw new Error('Email in use')
      }
      const hashedPass = bcrypt.hashSync(password, 10)
      const user = await insertUser(firstname, lastname, email, hashedPass, bio, username)

      const token = jwt.sign({ user }, process.env.JWT)
      await insertFollow(user.id, user.id)

      return {
        user,
        token
      }
    }),
    newLike: handleErrors(async (parent, { user_id, post_id }) => {
      const like = await insertLike(user_id, post_id)
      await incrementLikes(post_id)
      const post = await getPost(like.post_id)
      return post.rows[0]
    }),
    newFollow: handleErrors(async (parent, { follower, followee }) => {
      const follow = await insertFollow(follower, followee)
      await incrementFollowers(followee)
      await incrementFollowing(follower)
      return follow
    }),
    newComment: handleErrors(async (parent, { user_id, post_id, comment }) => {
      return await insertComment(user_id, post_id, comment)
    }),
    newPost: handleErrors(async (parent, { file, content, user_id }) => {
      const time = moment().format().replace(/:|\+/g, '-')
      const { stream, filename, mimetype, encoding } = await file

      await s3.upload({
        Body: stream,
        Bucket: `gui-project-database/${user_id}`,
        Key: `${time}.png`,
        ACL: 'public-read'
      }).promise()

      const newPost = await insertPost(content, user_id, time)
      const user = await getUser(user_id)

      socket.publish('NEW_POST', {
         newPost: { ...newPost, user }
      })

      return {
        ...newPost, user
      }
    }),
    deletePost: handleErrors(async (parent, { post_id }) => {
      const post = await getPost(post_id)
      await deletePost(post_id)
      await s3.deleteObject({
        Bucket: `gui-project-database/${post.rows[0].user_id}`,
        Key: post.rows[0].image_url
      }).promise()
      return { message: 'removed post' }
    }),
    updateInfo: handleErrors(async (parent, { id, bio, profile_picture }) => {
      const { stream, filename, mimetype, encoding } = await profile_picture
      await s3.upload({
        Body: stream,
        Bucket: `gui-project-database/${id}`,
        Key: `profile_picture.png`,
        ACL: 'public-read'
      }).promise()

      await updateInfo(bio, id)
      const updatedUser = await getUser(id)
      return updatedUser
    }),
    loginUser: handleErrors(async (parent, { email, password }) => {
      const foundUser = await searchUser(email)
      if(!foundUser.length) {
        throw new Error('User not found')
      }
      if(!bcrypt.compareSync(password, foundUser[0].password)) {
        throw new Error('Incorrect password')
      }
      delete foundUser[0]['password']
      const token = jwt.sign({
        user: foundUser[0],
      }, process.env.JWT)

      return {
        user: foundUser[0],
        token
      }
    }),
    removeFollow: handleErrors(async (parent, { follower, followee }) => {
      await deleteFollow(follower, followee)
      await decrementFollowers(followee)
      await decrementFollowing(follower)
      return { message: 'removed follow' }
    }),
    removeLike: handleErrors(async (parent, { user_id, post_id }) => {
      await deleteLike(user_id, post_id)
      await decrementLikes(post_id)
      const post = await getPost(post_id)
      return post.rows[0]
    }),
    newConversation: handleErrors(async (parent, { user1, user2 }) => {
      try {
        var conversation = await db.query(`
        INSERT INTO conversations (user1, user2) VALUES ($1, $2)
        RETURNING user1, user2, id`,
        [user1, user2])
      } catch(e) {
        var conversation = await db.query(`
        SELECT id FROM conversations WHERE user1 IN ($1, $2) AND user2 IN ($1, $2)`,
        [user1, user2])
      }

      return conversation.rows[0]
    }),
    newMessage: handleErrors(async (parent, { user_id, message, conversation_id }) => {
      const message_id = (await db.query(`
        INSERT INTO messages (user_id, message, conversation_id)
        VALUES ($1, $2, $3) RETURNING id`,
      [user_id, message, conversation_id])).rows[0].id

      const newMessage = await db.query(`
        SELECT messages.user_id, messages.message, messages.conversation_id, users.profile_picture, users.firstname, users.lastname 
        FROM messages
        JOIN users ON users.id = messages.user_id
        WHERE messages.id = $1`,
      [message_id])

      socket.publish('NEW_MESSAGE', {
        newMessage: { ...newMessage.rows[0] }
      })

      return newMessage.rows[0]
    })
  },
  Subscription: {
    newPost: {
      subscribe: withFilter(
        () => socket.asyncIterator('NEW_POST'),
        async (payload, args) => {
          let found = false
          const followees = await db.query(`
            SELECT * FROM follows WHERE follower = $1`,
          [args.feed_id])
          followees.rows.map(followee => {
            if (followee.followee === payload.newPost.user.id) {
              found = true
            }
          })

          return found
        }
      )
    },
    newMessage: {
      subscribe: withFilter(
        () => socket.asyncIterator('NEW_MESSAGE'),
        async (payload, args) => {
          var found = false
          const conversations = await db.query(`
            SELECT * FROM conversations WHERE user1 = $1 OR user2 = $1`,
          [args.user_id])
          conversations.rows.map(conversation => {
            if(conversation.id === payload.newMessage.conversation_id) {
              found = true
            }
          })
          
          return found
        }
      )
    }
  }
}