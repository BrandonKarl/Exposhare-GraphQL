import db from '../../database/connection'

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
      SELECT firstname, lastname, followers, following, email, users.created_at AS user_created_at, users.id AS user_id,
        posts.created_at, image_url, posts.id, content, likes, likes.user_id AS liked
      FROM posts
      LEFT JOIN likes ON likes.post_id = posts.id AND likes.user_id = $2
      JOIN users ON users.id = posts.user_id
      WHERE posts.user_id = $1 AND posts.id < $3
      ORDER BY id DESC
      LIMIT 10`,
    [id, context_id, after])
  }
  else {
    return await db.query(`
      SELECT firstname, lastname, followers, following, email, users.created_at AS user_created_at, users.id AS user_id,
        posts.created_at, image_url, posts.id, content, likes, likes.user_id AS liked
      FROM posts
      LEFT JOIN likes ON likes.post_id = posts.id AND likes.user_id = $2
      JOIN users ON users.id = posts.user_id
      WHERE posts.user_id = $1
      ORDER BY id DESC
      LIMIT 10`,
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
      SELECT firstname, lastname, followers, following, users.email, users.created_at AS user_created_at, users.id AS user_id,
        posts.created_at, image_url, posts.id, content, likes, likes.user_id AS liked
      FROM follows 
      JOIN posts ON posts.user_id = followee
      LEFT JOIN likes ON likes.post_id = posts.id AND likes.user_id = $1
      JOIN users ON users.id = posts.user_id
      WHERE follower = $1 AND posts.id < $2
      ORDER BY posts.id DESC
      LIMIT 10`,
    [id, after])
  }
  else {
    return await db.query(`
      SELECT firstname, lastname, followers, following, users.email, users.created_at AS user_created_at, users.id AS user_id,
        posts.created_at, image_url, posts.id, content, likes, likes.user_id AS liked
      FROM follows 
      JOIN posts ON posts.user_id = followee
      LEFT JOIN likes ON likes.post_id = posts.id AND likes.user_id = $1
      JOIN users ON users.id = posts.user_id
      WHERE follower = $1
      ORDER BY posts.id DESC
      LIMIT 10`,
    [id])
  }
}

export const checkUserExists = async (email) => {
  return (await db.query(`
    SELECT * FROM users WHERE email = $1`, 
  [email])).rows.length
}