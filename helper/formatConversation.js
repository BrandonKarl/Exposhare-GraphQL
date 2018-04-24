export const formatConversation = (conversations) => {
  if(conversations.rows === 0) {
    return []
  }

  let conArr = []
  let currentIndex = 0
  let currentId = conversations.rows[0].id
  conArr.push({
    user1: {
      firstname: conversations.rows[0].uo_first,
      lastname: conversations.rows[0].uo_last,
      username: conversations.rows[0].uo_user,
      id: conversations.rows[0].uo_id,
    },
    user2: {
      firstname: conversations.rows[0].ut_first,
      lastname: conversations.rows[0].ut_last,
      username: conversations.rows[0].ut_user,
      id: conversations.rows[0].ut_id,
    },
    id: conversations.rows[0].id,
    messages: [{
      user_id: conversations.rows[0].user_id,
      profile_picture: conversations.rows[0].profile_picture,
      firstname: conversations.rows[0].firstname,
      lastname: conversations.rows[0].lastname,
      message: conversations.rows[0].message,
      conversation_id: conversations.rows[0].id
    }]
  })
  
  for(let i = 1; i < conversations.rows.length; i++) {
    if(conversations.rows[i].id === currentId) {
      conArr[currentIndex].messages.push({
        user_id: conversations.rows[0].user_id,
        profile_picture: conversations.rows[0].profile_picture,
        firstname: conversations.rows[0].firstname,
        lastname: conversations.rows[0].lastname,
        message: conversations.rows[0].message,
        conversation_id: conversations.rows[0].id
      })
    }
    else {
      currentId = conversations.rows[i].id
      currentIndex++
      conArr.push({
        user1: {
          firstname: conversations.rows[i].uo_first,
          lastname: conversations.rows[i].uo_last,
          username: conversations.rows[i].uo_user,
          id: conversations.rows[i].uo_id,
        },
        user2: {
          firstname: conversations.rows[i].ut_first,
          lastname: conversations.rows[i].ut_last,
          username: conversations.rows[i].ut_user,
          id: conversations.rows[i].ut_id,
        },
        id: conversations.rows[i].id,
        messages: [{
          user_id: conversations.rows[i].user_id,
          profile_picture: conversations.rows[i].profile_picture,
          firstname: conversations.rows[i].firstname,
          lastname: conversations.rows[i].lastname,
          message: conversations.rows[i].message,
          conversation_id: conversations.rows[0].id
        }]
      })
    }
  }

  return conArr
}