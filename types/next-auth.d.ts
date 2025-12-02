import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      identifier: string
      name?: string | null
      role?: string
      preferredLocale?: string | null
    }
  }

  interface User {
    id: string
    identifier: string
    name?: string | null
    role?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role?: string
    preferredLocale?: string | null
  }
}

