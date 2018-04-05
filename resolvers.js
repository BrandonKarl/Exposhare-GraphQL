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

import { getUser, getUserFeed, getUserPosts, 
        getUserFollowers, searchUser, checkUserExists, getUserByUsername } from './db_actions/query/user'
import { isFollowing, getFollowers, getFollowing } from './db_actions/query/follows'
import { getLikedPosts } from './db_actions/query/likes'
import { getPost } from './db_actions/query/posts';

import { insertUser, updateInfo } from './db_actions/mutate/user' 
import { insertFollow, incrementFollowers, incrementFollowing, 
        deleteFollow, decrementFollowers, decrementFollowing } from './db_actions/mutate/follows' 
import { insertLike, incrementLikes, deleteLike, decrementLikes } from './db_actions/mutate/likes'
import { insertPost, deletePost } from './db_actions/mutate/posts'

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
      return formatFeed(feed)
    }),
    userPosts: handleErrors(async (parent, { id, context_id, after }) => {
      const posts = await getUserPosts(id, context_id, after)
      return formatFeed(posts)
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
      return formatFeed(post)[0]
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
        user:
        token
      }
    }),
    newLike: handleErrors(async (parent, { user_id, post_id }) => {
      const like = await insertLike(user_id, post_id)
      await incrementLikes(post_id)
      return like
    }),
    newFollow: handleErrors(async (parent, { follower, followee }) => {
      const follow = await insertFollow(follower, followee)
      await incrementFollowers(followee)
      await incrementFollowing(follower)
      return follow
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
        ...newPost, user
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
      return { message: 'removed like' }
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