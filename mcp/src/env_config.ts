function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const ENV = {
  get FIREB_PROJECT_ID() { return required('FIREB_PROJECT_ID') },
  get FIREB_PRIVATE_KEY() { return required('FIREB_PRIVATE_KEY') },
  get FIREB_CLIENT_EMAIL() { return required('FIREB_CLIENT_EMAIL') },
}
