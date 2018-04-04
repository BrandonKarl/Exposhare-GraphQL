import db from '../../database/connection'

export const isFollowing = async (id, context_id) => {
  return (await db.query(`
    SELECT * FROM follows WHERE follower = $1 AND followee = $2`,
  [context_id, id])).rows.length > 0
}

export const getFollowers = async (id) => {
  return (await db.query(`
    SELECT id, firstname, lastname, email, users.created_at, bio, username, profile_picture, followers, following
    FROM follows
    JOIN users ON users.id = follower
    WHERE followee = $1`,
  [id])).rows
}

export const getFollowing = async (id) => {
  return (await db.query(`
    SELECT id, firstname, lastname, email, users.created_at, bio, username, profile_picture, followers, following
    FROM follows
    JOIN users ON users.id = followee
    WHERE follower = $1`,
  [id])).rows
}