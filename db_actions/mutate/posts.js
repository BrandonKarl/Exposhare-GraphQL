import db from '../../database/connection'

export const insertPost = async (content, user_id, time) => {
  return (await db.query(`
    INSERT INTO posts (content, user_id, image_url)
    VALUES ($1, $2, $3)
    RETURNING id, content, image_url, created_at, likes`,
  [content, user_id, `/${user_id}/${time}.png`])).rows[0]
}

export const deletePost = async (id) => {
  return await db.query( `
    DELETE FROM posts WHERE id = $1`,
  [id])
}