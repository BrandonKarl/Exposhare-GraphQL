export const formatFeed = (feed) => {
  return feed.rows.map(post => {
    return {
      id: post.id,
      content: post.content,
      likes: post.likes,
      created_at: post.created_at,
      image_url: post.image_url,
      liked: Number(post.liked) ? true : false,
      user: {
        firstname: post.firstname,
        lastname: post.lastname,
        email: post.email,
        id: post.user_id,
        created_at: post.user_created_at,
        followers: post.followers,
        following: post.following,
        username: post.username
      }
    }
  })
}