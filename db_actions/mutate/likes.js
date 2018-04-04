import db from '../../database/connection'

export const insertLike = async (user_id, post_id) => {
  return (await db.query(`
    INSERT INTO likes (user_id, post_id)
    VALUES ($1, $2)
    RETURNING user_id, post_id`,
  [user_id, post_id])).rows[0]
}

export const incrementLikes = async (post_id) => {
  return await db.query(`
    UPDATE posts SET likes = likes + 1 WHERE id=$1`, 
  [post_id])
}

export const deleteLike = async (user_id, post_id) => {
  return await db.query(`
    DELETE FROM likes WHERE user_id = $1 AND post_id = $2`,
  [user_id, post_id])
}

export const decrementLikes = async (post_id) => {
  return await db.query(`
    UPDATE posts SET likes = likes - 1 WHERE id=$1`, 
  [post_id])
}