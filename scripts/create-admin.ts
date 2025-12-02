import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  try {
    const adminId = process.env.ADMIN_ID
    const adminPassword = process.env.ADMIN_PASSWORD
    const adminName = process.env.ADMIN_NAME || 'Admin'

    if (!adminId || !adminPassword) {
      console.log('ADMIN_ID and ADMIN_PASSWORD not set, skipping admin creation.')
      return
    }

    // Vérifier si un utilisateur avec cet identifiant existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { identifier: adminId }
    })

    if (existingUser) {
      // Mettre à jour l'utilisateur existant pour s'assurer qu'il est admin et approuvé
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          name: adminName,
          role: 'admin',
          isApproved: true,
        }
      })

      console.log(`✅ Admin account updated: ${updatedUser.identifier}`)
    } else {
      // Créer un nouveau compte admin
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      
      const newUser = await prisma.user.create({
        data: {
          identifier: adminId,
          password: hashedPassword,
          name: adminName,
          role: 'admin',
          isApproved: true,
        }
      })

      console.log(`✅ Admin account created: ${newUser.identifier}`)
    }
  } catch (error) {
    console.error('❌ Error creating/updating admin account:', error)
    // Ne pas faire échouer le démarrage si la création d'admin échoue
  } finally {
    await prisma.$disconnect()
  }
}

main()

