import db from '../../database/connection'

export const insertUser = async (firstname, lastname, email, password, bio, username) => {
  return (await db.query(`
    INSERT INTO users (firstname, lastname, email, password, bio, username)
    VALUES ($1, $2, $3, $4, $5, $6) 
    RETURNING firstname, lastname, email, id, created_at, bio, username, profile_picture`,
  [firstname, lastname, email, hashedPass, bio, username])).rows[0]
}

export const updateInfo = async (bio, id) => {
  return await db.query(`
    UPDATE users SET profile_picture = '/profile_picture', bio = $1 WHERE id = $2`,     
  [bio, id])
}