'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface UserPermissions {
  role: string
  canEditAllDefenses: boolean
  canEditMap: boolean
  canEditAssignments: boolean
  canEditNews: boolean
}

interface UseUserPermissionsReturn {
  permissions: UserPermissions | null
  loading: boolean
  canEditDefense: (defenseUserId: string, currentUserId: string) => boolean
  canEditMap: () => boolean
  canEditAssignments: () => boolean
  canEditNews: () => boolean
}

export function useUserPermissions(): UseUserPermissionsReturn {
  const { data: session } = useSession()
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) {
      setPermissions(null)
      setLoading(false)
      return
    }

    fetch('/api/user/profile')
      .then(res => res.json())
      .then(data => {
        setPermissions({
          role: data.role || 'user',
          canEditAllDefenses: data.canEditAllDefenses === true || data.canEditAllDefenses === 1,
          canEditMap: data.canEditMap === true || data.canEditMap === 1,
          canEditAssignments: data.canEditAssignments === true || data.canEditAssignments === 1,
          canEditNews: data.canEditNews === true || data.canEditNews === 1,
        })
      })
      .catch(() => {
        setPermissions(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [session?.user?.id])

  const canEditDefense = (defenseUserId: string, currentUserId: string): boolean => {
    if (!permissions) return false
    if (permissions.role === 'admin') return true
    if (permissions.canEditAllDefenses) return true
    return defenseUserId === currentUserId
  }

  const canEditMap = (): boolean => {
    if (!permissions) return false
    if (permissions.role === 'admin') return true
    return permissions.canEditMap
  }

  const canEditAssignments = (): boolean => {
    if (!permissions) return false
    if (permissions.role === 'admin') return true
    return permissions.canEditAssignments
  }

  const canEditNews = (): boolean => {
    if (!permissions) return false
    if (permissions.role === 'admin') return true
    return permissions.canEditNews
  }

  return {
    permissions,
    loading,
    canEditDefense,
    canEditMap,
    canEditAssignments,
    canEditNews,
  }
}

