import db from '../../database/connection'

export const getPost = async (id, context_id) => {
  return await db.query(`
    SELECT firstname, lastname, followers, following, email, users.created_at AS user_created_at, users.id AS user_id,
      posts.created_at, image_url, posts.id, content, likes, likes.user_id AS liked
    FROM posts
    LEFT JOIN likes ON likes.post_id = posts.id AND likes.user_id = $2
    JOIN users ON users.id = posts.user_id
    WHERE posts.id = $1`,
  [id, context_id])
}