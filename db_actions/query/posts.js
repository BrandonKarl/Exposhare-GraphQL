import db from '../../database/connection'

export const getPost = async (id, context_id) => {
  return await db.query(`
    SELECT u1.firstname, u1.lastname, u1.followers, u1.following, u1.profile_picture, u1.email, u1.created_at AS user_created_at, u1.id AS user_id, u1.username,
      u2.firstname AS cmt_firstname, u2.lastname AS cmt_lastname, u2.id AS cmt_user_id, u2.username AS cmt_username, u2.profile_picture as cmt_profile,
      posts.created_at, image_url, posts.id, content, likes, likes.user_id AS liked, comments.comment
    FROM posts
    LEFT JOIN likes ON likes.post_id = posts.id AND likes.user_id = $2
    LEFT JOIN comments ON comments.post_id = posts.id
    JOIN users u1 ON u1.id = posts.user_id
    LEFT JOIN users u2 ON u2.id = comments.user_id
    WHERE posts.id = $1`,
  [id, context_id])
}

export const getTrending = async () => {
  return await db.query(`
    SELECT u1.firstname, u1.lastname, u1.followers, u1.following, u1.profile_picture, u1.email, u1.created_at AS user_created_at, u1.id AS user_id, u1.username,
      u2.firstname AS cmt_firstname, u2.lastname AS cmt_lastname, u2.id AS cmt_user_id, u2.username AS cmt_username, u2.profile_picture as cmt_profile,
      posts.created_at, image_url, posts.id, content, likes, comments.comment
    FROM posts
    LEFT JOIN comments ON comments.post_id = posts.id
    JOIN users u1 ON u1.id = posts.user_id
    LEFT JOIN users u2 ON u2.id = comments.user_id
    WHERE posts.created_at > current_date - interval '30 days' 
    ORDER BY likes DESC 
    LIMIT 15`)
}