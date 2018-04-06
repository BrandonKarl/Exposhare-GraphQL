import db from '../../database/connection'

export const insertComment = async (user_id, post_id, comment) => {
  return (await db.query(`
    INSERT INTO comments (user_id, post_id, comment) VALUES ($1, $2, $3)
    RETURNING user_id, post_id, comment`,
  [user_id, post_id, comment])).rows[0]
}