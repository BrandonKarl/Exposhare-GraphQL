import db from '../../database/connection'

export const getLikedPosts = async (id) => {
  return await db.query(`
    SELECT firstname, lastname, followers, following, email, users.created_at AS user_created_at, users.id AS user_id,
      posts.created_at, image_url, posts.id, content, likes, likes.user_id AS liked
    FROM likes
    JOIN posts ON posts.id = likes.post_id
    JOIN users on users.id = posts.user_id
    WHERE likes.user_id = $1`,
  [id])
}