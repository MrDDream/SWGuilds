import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Identifiant', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { identifier: credentials.identifier }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Vérifier que l'utilisateur est approuvé
        if (!user.isApproved) {
          throw new Error('Votre compte n\'a pas encore été approuvé par un administrateur')
        }

        return {
          id: user.id,
          identifier: user.identifier,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        // Mettre à jour la dernière connexion
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        })
      }
      // Si la session est mise à jour (via update()), rafraîchir les données utilisateur
      if (trigger === 'update' && token.id) {
        const user = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { preferredLocale: true }
        })
        // Mettre à jour le preferredLocale dans le token (même si null)
        token.preferredLocale = user?.preferredLocale || null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const userSession = session.user as any
        userSession.id = token.id as string
        userSession.role = token.role as string
        // Récupérer preferredLocale depuis le token (mis à jour dans jwt callback) ou la base de données
        if ((token as any).preferredLocale !== undefined) {
          userSession.preferredLocale = (token as any).preferredLocale
        } else {
          const user = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { preferredLocale: true }
          })
          userSession.preferredLocale = user?.preferredLocale || null
        }
      }
      return session
    },
  },
}

