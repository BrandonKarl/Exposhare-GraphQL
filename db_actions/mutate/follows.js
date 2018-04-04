import db from '../../database/connection'

export const insertFollow = async (follower, followee) => {
  return (await db.query(`
    INSERT INTO follows (follower, followee)
    VALUES ($1, $2)
    RETURNING follower, followee`,
  [follower, followee])).rows[0]
}

export const incrementFollowers = async (id) => {
  return await db.query(`
    UPDATE users SET followers = followers + 1 WHERE id = $1`,
  [id])
}

export const incrementFollowing = async (id) => {
  return await db.query(`
    UPDATE users SET following = following + 1 WHERE id = $1`,
  [id])
}

export const decrementFollowers = async (id) => {
  return await db.query(`
    UPDATE users SET followers = followers - 1 WHERE id = $1`,
  [id])
}

export const decrementFollowing = async (id) => {
  return await db.query(`
    UPDATE users SET following = following - 1 WHERE id = $1`,
  [id])
}

export const deleteFollow = async (follower, followee) => {
  return await db.query(`
    DELETE FROM follows WHERE follower = $1 AND followee = $2`,
  [follower, followee])
}