/**
 * Password rules shared by the signup and reset forms. Keep in step with
 * `minimum_password_length` in `supabase/config.toml`, which is what the auth
 * server enforces; the client check only gives the user a clearer message.
 */
export const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_TOO_SHORT_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
