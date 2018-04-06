export const formatFeedComments = (feed) => {
  if(feed.rows.length === 0) {
    return []
  }

  const feedArr = []
  let currentIndex = 0;
  let currentId = feed.rows[0].id
  feedArr.push({
    id: feed.rows[0].id,
    content: feed.rows[0].content,
    likes: feed.rows[0].likes,
    created_at: feed.rows[0].created_at,
    image_url: feed.rows[0].image_url,
    liked: Number(feed.rows[0].liked) ? true : false,
    comments: feed.rows[0].comment === null ? [] : [{ 
      firstname: feed.rows[0].cmt_firstname,
      lastname: feed.rows[0].cmt_lastname,
      username: feed.rows[0].cmt_username,
      comment: feed.rows[0].comment,
      profile_picture: feed.rows[0].cmt_profile
    }],
    user: {
      firstname: feed.rows[0].firstname,
      lastname: feed.rows[0].lastname,
      email: feed.rows[0].email,
      id: feed.rows[0].user_id,
      created_at: feed.rows[0].user_created_at,
      followers: feed.rows[0].followers,
      following: feed.rows[0].following,
      username: feed.rows[0].username
    }
  })
  for(let i = 1; i < feed.rows.length; i++) {
    if(feed.rows[i].id === currentId) {
      feedArr[currentIndex].comments.push({ 
        firstname: feed.rows[i].cmt_firstname,
        lastname: feed.rows[i].cmt_lastname,
        username: feed.rows[i].cmt_username,
        comment: feed.rows[i].comment
      })
    }
    else {
      currentId = feed.rows[i].id
      currentIndex++
      feedArr.push({
        id: feed.rows[i].id,
        content: feed.rows[i].content,
        likes: feed.rows[i].likes,
        created_at: feed.rows[i].created_at,
        image_url: feed.rows[i].image_url,
        liked: Number(feed.rows[i].liked) ? true : false,
        comments: feed.rows[i].comment === null ? [] : [{ 
          firstname: feed.rows[i].cmt_firstname,
          lastname: feed.rows[i].cmt_lastname,
          username: feed.rows[i].cmt_username,
          comment: feed.rows[i].comment
        }],
        user: {
          firstname: feed.rows[i].firstname,
          lastname: feed.rows[i].lastname,
          email: feed.rows[i].email,
          id: feed.rows[i].user_id,
          created_at: feed.rows[i].user_created_at,
          followers: feed.rows[i].followers,
          following: feed.rows[i].following,
          username: feed.rows[i].username
        }
      })
    }
  }
  return feedArr
}