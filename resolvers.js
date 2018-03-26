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
    user: handleErrors(async (parent, { id }) => {
      const user = await db.query(`
        SELECT id, firstname, lastname, email, created_at, bio, username, profile_picture, followers, following
        FROM users
        WHERE id = $1`,
      [id]).catch(e => { throw new Error(e.message) })
      return user.rows[0]
    }),
    userFeed: handleErrors(async (parent, { id }) => {
      const feed = await db.query(`
        SELECT firstname, lastname, followers, following, users.email, users.created_at AS user_created_at, users.id AS user_id,
          posts.created_at, image_url, posts.id, content, likes
        FROM follows 
        JOIN posts ON posts.user_id = followee
        JOIN users ON users.id = posts.user_id
        WHERE follower = $1
        ORDER BY posts.id DESC`,
      [id]).catch(e => { throw new Error(e.message) })

      const formattedFeed = feed.rows.map(post => {
        return {
          id: post.id,
          content: post.content,
          likes: post.likes,
          created_at: post.created_at,
          image_url: post.image_url,
          user: {
            firstname: post.firstname,
            lastname: post.lastname,
            email: post.email,
            id: post.user_id,
            created_at: post.user_created_at,
            followers: post.followers,
            following: post.following
          }
        }
      })

      return formattedFeed
    }),
    userPosts: handleErrors(async (parent, { id }) => {
      const feed = await db.query(`
        SELECT id, content, image_url, likes, user_id, created_at
        FROM posts
        WHERE user_id = $1
        ORDER BY id DESC`,
      [id]).catch(e => { throw new Error(e.message) })
      return feed.rows
    }),
    followers: async (parent, { id }) => {
      const followers = await db.query(`
        SELECT id, firstname, lastname, email, users.created_at, bio, username, profile_picture, followers, following
        FROM follows
        JOIN users ON users.id = follower
        WHERE followee = $1`,
      [id]).catch(e => { throw new Error(e.message) })
      return followers.rows
    },
    searchUser: async (parent, { username }) => {
      const users = await db.query(`
        SELECT id, firstname, lastname, email, created_at, bio, username, profile_picture, followers, following
        FROM users
        WHERE username LIKE $1`,
      [`%${username}%`]).catch(e => { throw new Error(e.message) })
      return users.rows
    },
    following: async (parent, { id }) => {
      var following = await db.query(`
        SELECT id, firstname, lastname, email, users.created_at, bio, username, profile_picture, followers, following
        FROM follows
        JOIN users ON users.id = followee
        WHERE follower = $1`,
      [id]).catch(e => { throw new Error(e.message) })
      return following.rows
    },
    post: async (parent, { id }) => {
      const post = await db.query(`
        SELECT posts.id, content, posts.user_id, created_at, image_url, likes
        FROM posts WHERE id = $1`,
      [id]).catch(e => { throw new Error(e.message) })
      return post.rows[0]
    }
  },
  Mutation: {
    newUser: handleErrors(async (parent, { firstname, lastname, email, password, bio, username }) => {
      const foundUser = await db.query(`
        SELECT * FROM users WHERE email = $1`, 
      [email]).catch(e => { throw new Error(e.message) })

      if(foundUser.rows.length) {
        throw new Error('Email in use')
      }

      const hashedPass = bcrypt.hashSync(password, 10)

      const newUser = await db.query(`
        INSERT INTO users (firstname, lastname, email, password, bio, username)
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING firstname, lastname, email, id, created_at, bio, username, profile_picture`,
      [firstname, lastname, email, hashedPass, bio, username]).catch(e => { throw new Error(e.message) })

      const token = jwt.sign({
        user: newUser.rows[0],
      }, process.env.JWT)

      return {
        user: newUser.rows[0],
        token
      }
    }),
    newLike: handleErrors(async (parent, { user_id, post_id }) => {
      const like = await db.query(`
        INSERT INTO likes (user_id, post_id)
        VALUES ($1, $2)
        RETURNING user_id, post_id`,
      [user_id, post_id]).catch(e => { throw new Error(e.message) })
      
      await db.query(`
        UPDATE posts SET likes = likes + 1 WHERE id=$1`, 
      [post_id]).catch(e => { throw new Error(e.message) })

      return like.rows[0]
    }),
    newFollow: handleErrors(async (parent, { follower, followee }) => {
      const follow = await db.query(`
        INSERT INTO follows (follower, followee)
        VALUES ($1, $2)
        RETURNING follower, followee`,
      [follower, followee]).catch(e => { throw new Error(e.message) })

      await db.query(`
        UPDATE users SET followers = followers + 1 WHERE id = $1`,
      [followee]).catch(e => { throw new Error(e.message) })

      await db.query(`
        UPDATE users SET following = following + 1 WHERE id = $1`,
      [follower]).catch(e => { throw new Error(e.message) })

      return follow.rows[0]
    }),
    newPost: handleErrors(async (parent, { file, content, user_id }) => {
      console.log('okkkkkkkk')
      const time = moment().format().replace(/:/g, '-')
      const { stream, filename, mimetype, encoding } = await file

      await s3.upload({
        Body: stream,
        Bucket: `gui-project-database/${user_id}`,
        Key: `${time}.png`,
        ACL: 'public-read'
      }).promise()

      const newPost = await db.query(`
        INSERT INTO posts (content, user_id, image_url)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, content, image_url, created_at`,
        [content, user_id, `/${user_id}/${time}.png`]
      )

      const user = await db.query(
        'SELECT id, firstname, lastname, email, created_at FROM users WHERE id = $1',
        [newPost.rows[0].user_id]
      )

      return {
        ...newPost.rows[0], user: user.rows[0]
      }
    }),
    loginUser: handleErrors(async (parent, { email, password }) => {
      const foundUser = await db.query(`
        SELECT *
        FROM users
        WHERE email = $1`,
      [email]).catch(e => { throw new Error(e.message) })

      if(!foundUser.rows.length) {
        throw new Error('User not found')
      }

      if(!bcrypt.compareSync(password, foundUser.rows[0].password)) {
        throw new Error('Incorrect password')
      }

      delete foundUser.rows[0]['password']
      const token = jwt.sign({
        user: foundUser.rows[0],
      }, process.env.JWT)

      return {
        user: foundUser.rows[0],
        token
      }
    }),
    removeFollow: handleErrors(async (parent, { follower, followee }) => {
      await db.query(`
        DELETE FROM follows WHERE follower = $1 AND followee = $2`,
      [follower, followee]).catch(e => { throw new Error(e.message) })

      await db.query(`
        UPDATE users SET followers = followers - 1 WHERE id = $1`,
      [followee]).catch(e => { throw new Error(e.message) })

      await db.query(`
        UPDATE users SET following = following - 1 WHERE id = $1`,
      [follower]).catch(e => { throw new Error(e.message) })

      return { message: 'removed follow' }
    }),
    removeLike: handleErrors(async (parent, { user_id, post_id }) => {
      await db.query(`
        DELETE FROM likes WHERE user_id = $1 AND post_id = $2`,
      [user_id, post_id]).catch(e => { throw new Error(e.message) })

      await db.query(`
        UPDATE posts SET likes = likes - 1 WHERE id = $1`, 
      [post_id]).catch(e => { throw new Error(e.message) })

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