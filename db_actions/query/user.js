import db from '../../database/connection'
import { formatFeedComments } from '../../helper/formatFeedComments'

export const getUser = async (id) => {
  return (await db.query(`
    SELECT id, firstname, lastname, email, created_at, bio, username, profile_picture, followers, following
    FROM users
    WHERE id = $1`,
  [id])).rows[0]
}

export const getUserByUsername = async (username) => {
  return (await db.query(`
    SELECT id, firstname, lastname, email, created_at, bio, username, profile_picture, followers, following
    FROM users
    WHERE username = $1`,
  [username])).rows[0]
}

export const getUserPosts = async (id, context_id, after) => {
  if(after) {
    return await db.query(`
      SELECT u1.firstname, u1.lastname, u1.followers, u1.following, u1.email, u1.created_at AS user_created_at, u1.id AS user_id, u1.username,
        u2.firstname AS cmt_firstname, u2.lastname AS cmt_lastname, u2.id AS cmt_user_id, u2.username AS cmt_username, u2.profile_picture as cmt_profile,
        posts.created_at, image_url, posts.id, content, likes, likes.user_id AS liked, comments.comment
      FROM posts
      LEFT JOIN likes ON likes.post_id = posts.id AND likes.user_id = $2
      LEFT JOIN comments ON comments.post_id = posts.id
      JOIN users u1 ON u1.id = posts.user_id
      LEFT JOIN users u2 ON u2.id = comments.user_id
      WHERE posts.user_id = $1 AND posts.id < $3 AND posts.id >= $4
      ORDER BY posts.id DESC`,
    [id, context_id, after, (after - 15)])
  }
  else {
    return await db.query(`
      SELECT u1.firstname, u1.lastname, u1.followers, u1.following, u1.email, u1.created_at AS user_created_at, u1.id AS user_id, u1.username,
        u2.firstname AS cmt_firstname, u2.lastname AS cmt_lastname, u2.id AS cmt_user_id, u2.username AS cmt_username, u2.profile_picture as cmt_profile,
        posts.created_at, image_url, posts.id, content, likes, likes.user_id AS liked, comments.comment
      FROM posts
      LEFT JOIN likes ON likes.post_id = posts.id AND likes.user_id = $2
      LEFT JOIN comments ON comments.post_id = posts.id
      JOIN users u1 ON u1.id = posts.user_id
      LEFT JOIN users u2 ON u2.id = comments.user_id
      WHERE posts.user_id = $1
      ORDER BY posts.id DESC
      LIMIT 15`,
    [id, context_id])
  }
}

export const searchUser = async (identifier) => {
  return (await db.query(`
    SELECT id, firstname, lastname, email, created_at, bio, username, profile_picture, followers, following, password
    FROM users
    WHERE LOWER(username) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1)`,
  [`%${identifier}%`])).rows
}

export const getUserFeed = async (id, after) => {
  if(after) {
    return await db.query(`
      SELECT u1.firstname, u1.lastname, u1.followers, u1.following, u1.email, u1.created_at AS user_created_at, u1.id AS user_id, u1.username,
        u2.firstname AS cmt_firstname, u2.lastname AS cmt_lastname, u2.id AS cmt_user_id, u2.username AS cmt_username, u2.profile_picture as cmt_profile,
        posts.created_at, image_url, posts.id, content, likes, likes.user_id AS liked, comments.comment
      FROM follows 
      JOIN posts ON posts.user_id = followee
      LEFT JOIN likes ON likes.post_id = posts.id AND likes.user_id = $1
      LEFT JOIN comments ON comments.post_id = posts.id
      JOIN users u1 ON u1.id = posts.user_id 
      LEFT JOIN users u2 ON u2.id = comments.user_id
      WHERE follower = $1 AND posts.id < $2 AND posts.id >= $3
      ORDER BY posts.id DESC`,
    [id, after, (after - 15)])
  }
  else {
    return await db.query(`
      SELECT u1.firstname, u1.lastname, u1.followers, u1.following, u1.email, u1.created_at AS user_created_at, u1.id AS user_id, u1.username,
        u2.firstname AS cmt_firstname, u2.lastname AS cmt_lastname, u2.id AS cmt_user_id, u2.username AS cmt_username, u2.profile_picture as cmt_profile,
        posts.created_at, image_url, posts.id, content, likes, likes.user_id AS liked, comments.comment
      FROM follows 
      JOIN posts ON posts.user_id = followee
      LEFT JOIN likes ON likes.post_id = posts.id AND likes.user_id = $1
      LEFT JOIN comments ON comments.post_id = posts.id
      JOIN users u1 ON u1.id = posts.user_id 
      LEFT JOIN users u2 ON u2.id = comments.user_id
      WHERE follower = $1
      ORDER BY posts.id DESC
      LIMIT 15`,
    [id])
  }
}

export const checkUserExists = async (email) => {
  return (await db.query(`
    SELECT * FROM users WHERE email = $1`, 
  [email])).rows.length
}
