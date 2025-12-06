'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n-provider'

interface User {
  id: string
  identifier: string
  name: string | null
  role: string
  isApproved: boolean
  lastLogin: string | null
  avatarUrl: string | null
  canEditAllDefenses?: boolean
  canEditMap?: boolean
  canEditAssignments?: boolean
  canEditNews?: boolean
  createdAt: string
  updatedAt: string
  _count: {
    defenses: number
    logs: number
  }
}

interface ActivityLog {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string | null
  details: string | null
  createdAt: string
  user: {
    id: string
    identifier: string
    name: string | null
  }
}

interface AdminPanelProps {
  initialUsers: User[]
  initialLogs: ActivityLog[]
}

export function AdminPanel({ initialUsers, initialLogs }: AdminPanelProps) {
  const { t, locale } = useI18n()
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs)
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'tags' | 'reminders' | 'settings'>('users')
  const [tags, setTags] = useState<any[]>([])
  const [showTagModal, setShowTagModal] = useState<{ tag?: any } | null>(null)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState('#3B82F6')
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [instanceName, setInstanceName] = useState('SWGuilds')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [approvalWebhookUrl, setApprovalWebhookUrl] = useState<string | null>(null)
  const [approvalWebhookRoleId, setApprovalWebhookRoleId] = useState<string | null>(null)
  const [newsWebhookUrl, setNewsWebhookUrl] = useState<string | null>(null)
  const [newsWebhookRoleId, setNewsWebhookRoleId] = useState<string | null>(null)
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState<string | null>(null)
  const [settingsTab, setSettingsTab] = useState<'general' | 'webhooks' | 'danger'>('general')
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [updatingSwarfarmData, setUpdatingSwarfarmData] = useState(false)
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all')
  const [logActionFilter, setLogActionFilter] = useState<string>('all')
  const [showPasswordModal, setShowPasswordModal] = useState<{ userId: string; identifier: string } | null>(null)
  const [showRenameModal, setShowRenameModal] = useState<{ userId: string; identifier: string; currentName: string | null } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [showMobileTabsMenu, setShowMobileTabsMenu] = useState(false)
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const mobileTabsMenuRef = useRef<HTMLDivElement>(null)
  const [reminders, setReminders] = useState<any[]>([])
  const [showReminderModal, setShowReminderModal] = useState<{ reminder?: any } | null>(null)
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderDaysOfWeek, setReminderDaysOfWeek] = useState<number[]>([])
  const [reminderHour, setReminderHour] = useState(0)
  const [reminderMinute, setReminderMinute] = useState(0)
  const [reminderDiscordRoleId, setReminderDiscordRoleId] = useState('')
  const [reminderWebhookUrl, setReminderWebhookUrl] = useState('')
  const [reminderIsActive, setReminderIsActive] = useState(true)
  const [usersSearchQuery, setUsersSearchQuery] = useState('')
  const [logsSearchQuery, setLogsSearchQuery] = useState('')
  const [tagsSearchQuery, setTagsSearchQuery] = useState('')
  const [remindersSearchQuery, setRemindersSearchQuery] = useState('')
  const [showDbModal, setShowDbModal] = useState<'export' | 'import' | 'clean' | null>(null)
  const [dbModalConfirmed, setDbModalConfirmed] = useState(false)
  const [dbImportFile, setDbImportFile] = useState<File | null>(null)
  const [showPermissionsModal, setShowPermissionsModal] = useState<{ userId: string; user: User } | null>(null)
  const { data: session, update } = useSession()

  const handleApproveUser = async (userId: string) => {
    setLoading(prev => ({ ...prev, [userId]: true }))
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isApproved: true }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUsers(users.map(u => u.id === userId ? { ...u, ...updatedUser } : u))
        // Recharger les logs avec les filtres actuels
        fetchLogs(
          logTypeFilter !== 'all' ? logTypeFilter : undefined,
          logActionFilter !== 'all' ? logActionFilter : undefined
        )
      }
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error)
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleRejectUser = async (userId: string) => {
    setLoading(prev => ({ ...prev, [userId]: true }))
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isApproved: false }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUsers(users.map(u => u.id === userId ? { ...u, ...updatedUser } : u))
        fetchLogs()
      }
    } catch (error) {
      console.error('Erreur lors du rejet:', error)
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleToggleRole = async (userId: string, currentRole: string) => {
    setLoading(prev => ({ ...prev, [userId]: true }))
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin'
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUsers(users.map(u => u.id === userId ? { ...u, ...updatedUser } : u))
        fetchLogs()
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors du changement de rôle')
      }
    } catch (error) {
      console.error('Erreur lors du changement de rôle:', error)
      alert('Erreur lors du changement de rôle')
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  // Fonction helper pour vérifier si un utilisateur est l'admin créé via .env
  // Note: Cette fonction utilise une variable d'environnement publique côté client
  // Pour la sécurité, cette variable doit être définie dans .env.local ou .env
  const isEnvAdmin = (user: User): boolean => {
    // Utiliser une variable d'environnement publique si disponible, sinon comparer avec identifier
    // Pour éviter d'exposer ADMIN_ID, on peut utiliser une approche différente
    // Pour l'instant, on compare directement avec l'identifier (côté serveur, la protection est déjà en place)
    const adminId = process.env.NEXT_PUBLIC_ADMIN_ID
    return adminId !== undefined && user.identifier === adminId
  }

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(menuRefs.current).forEach(([userId, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          if (openMenuId === userId) {
            setOpenMenuId(null)
          }
        }
      })
    }

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  const handleChangePassword = async () => {
    if (!showPasswordModal || !newPassword || newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(prev => ({ ...prev, [showPasswordModal.userId]: true }))
    try {
      const response = await fetch(`/api/admin/users/${showPasswordModal.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })

      if (response.ok) {
        alert('Mot de passe modifié avec succès')
        setShowPasswordModal(null)
        setNewPassword('')
        fetchLogs()
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la modification du mot de passe')
      }
    } catch (error) {
      console.error('Erreur lors de la modification du mot de passe:', error)
      alert('Erreur lors de la modification du mot de passe')
    } finally {
      setLoading(prev => ({ ...prev, [showPasswordModal.userId]: false }))
    }
  }

  const handleRenameUser = async () => {
    if (!showRenameModal) {
      return
    }

    setLoading(prev => ({ ...prev, [showRenameModal.userId]: true }))
    try {
      const response = await fetch(`/api/admin/users/${showRenameModal.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName || null }),
      })

      if (response.ok) {
        const result = await response.json()
        setUsers(users.map(u => u.id === showRenameModal.userId ? { ...u, name: result.user.name } : u))
        alert('Pseudo modifié avec succès')
        setShowRenameModal(null)
        setNewName('')
        fetchLogs()
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la modification du pseudo')
      }
    } catch (error) {
      console.error('Erreur lors de la modification du nom:', error)
      alert('Erreur lors de la modification du pseudo')
    } finally {
      setLoading(prev => ({ ...prev, [showRenameModal.userId]: false }))
    }
  }

  const handleLockUser = async (userId: string, currentStatus: boolean) => {
    setLoading(prev => ({ ...prev, [userId]: true }))
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: !currentStatus }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUsers(users.map(u => u.id === userId ? { ...u, ...updatedUser } : u))
        fetchLogs()
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la modification du statut')
      }
    } catch (error) {
      console.error('Erreur lors de la modification du statut:', error)
      alert('Erreur lors de la modification du statut')
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleUpdatePermissions = async (userId: string, permission: string, value: boolean) => {
    setLoading(prev => ({ ...prev, [userId]: true }))
    try {
      const updateData: any = {}
      updateData[permission] = value
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        const result = await response.json()
        const updatedUser = { ...users.find(u => u.id === userId)!, ...updateData }
        setUsers(users.map(u => u.id === userId ? updatedUser : u))
        
        // Si l'utilisateur modifié est l'utilisateur actuel, rafraîchir la session
        if (session?.user?.id === userId) {
          await update()
        }
        
        fetchLogs()
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la modification des droits')
      }
    } catch (error) {
      console.error('Erreur lors de la modification des droits:', error)
      alert('Erreur lors de la modification des droits')
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleUpdateAllPermissions = async (userId: string, permissions: {
    canEditAllDefenses?: boolean
    canEditMap?: boolean
    canEditAssignments?: boolean
    canEditNews?: boolean
  }) => {
    setLoading(prev => ({ ...prev, [userId]: true }))
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissions),
      })

      if (response.ok) {
        const result = await response.json()
        const updatedUser = { ...users.find(u => u.id === userId)!, ...permissions }
        setUsers(users.map(u => u.id === userId ? updatedUser : u))
        
        // Si l'utilisateur modifié est l'utilisateur actuel, rafraîchir la session
        if (session?.user?.id === userId) {
          await update()
        }
        
        setShowPermissionsModal(null)
        fetchLogs()
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la modification des droits')
      }
    } catch (error) {
      console.error('Erreur lors de la modification des droits:', error)
      alert('Erreur lors de la modification des droits')
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleExportDb = async () => {
    try {
      const response = await fetch('/api/admin/db/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'dev.db'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setShowDbModal(null)
        setDbModalConfirmed(false)
        alert('Base de données exportée avec succès')
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de l\'export')
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      alert('Erreur lors de l\'export')
    }
  }

  const handleImportDb = async () => {
    if (!dbImportFile) {
      alert('Veuillez sélectionner un fichier')
      return
    }

    setLoading(prev => ({ ...prev, 'import-db': true }))
    try {
      const formData = new FormData()
      formData.append('file', dbImportFile)

      const response = await fetch('/api/admin/db/import', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        alert('Base de données importée avec succès. Veuillez redémarrer l\'application.')
        setShowDbModal(null)
        setDbModalConfirmed(false)
        setDbImportFile(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de l\'import')
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error)
      alert('Erreur lors de l\'import')
    } finally {
      setLoading(prev => ({ ...prev, 'import-db': false }))
    }
  }

  const handleCleanDb = async () => {
    setLoading(prev => ({ ...prev, 'clean-db': true }))
    try {
      const response = await fetch('/api/admin/db/clean', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Nettoyage terminé. ${data.deletedCount} enregistrement(s) supprimé(s).`)
        setShowDbModal(null)
        setDbModalConfirmed(false)
        fetchLogs()
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors du nettoyage')
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error)
      alert('Erreur lors du nettoyage')
    } finally {
      setLoading(prev => ({ ...prev, 'clean-db': false }))
    }
  }

  const handleDeleteUser = async (userId: string, userIdentifier: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le compte de ${userIdentifier} ? Les défenses seront transférées à un administrateur.`)) {
      return
    }

    setLoading(prev => ({ ...prev, [userId]: true }))
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message || 'Utilisateur supprimé avec succès')
        setUsers(users.filter(u => u.id !== userId))
        fetchLogs()
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }))
      setOpenMenuId(null)
    }
  }

  const handleDeleteUserAvatar = async (userId: string) => {
    if (!confirm(t('admin.deleteAvatarConfirm'))) return

    setLoading(prev => ({ ...prev, [userId]: true }))
    try {
      const response = await fetch(`/api/admin/users/${userId}/avatar`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, avatarUrl: null } : u))
        fetchLogs()
        alert('Photo de profil supprimée avec succès')
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la suppression de la photo')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la photo:', error)
      alert('Erreur lors de la suppression de la photo')
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }))
      setOpenMenuId(null)
    }
  }

  const fetchLogs = async (entityType?: string, action?: string) => {
    try {
      let url = '/api/admin/logs'
      const params = new URLSearchParams()
      
      // Si le filtre est "reminder" ou "defense_assignment", on ne peut pas filtrer directement côté API
      // On récupère tous les logs et on filtre côté client
      if (entityType && entityType !== 'all' && entityType !== 'reminder' && entityType !== 'defense_assignment') {
        params.append('entityType', entityType)
      }
      if (action && action !== 'all') {
        params.append('action', action)
      }
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      const response = await fetch(url)
      if (response.ok) {
        let data = await response.json()
        
        // Filtrer les logs de rappel ou gestion si nécessaire
        if (entityType === 'reminder') {
          data = data.filter((log: ActivityLog) => log.entityType === 'reminder')
          // Appliquer aussi le filtre d'action si spécifié
          if (action && action !== 'all') {
            data = data.filter((log: ActivityLog) => log.action === action)
          }
        } else if (entityType === 'defense_assignment') {
          data = data.filter((log: ActivityLog) => log.entityType === 'defense_assignment')
          // Appliquer aussi le filtre d'action si spécifié
          if (action && action !== 'all') {
            data = data.filter((log: ActivityLog) => log.action === action)
          }
        }
        
        setLogs(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des logs:', error)
    }
  }

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/admin/tags')
      if (response.ok) {
        const data = await response.json()
        setTags(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error)
    }
  }

  useEffect(() => {
    if (activeTab === 'tags') {
      fetchTags()
    }
    if (activeTab === 'settings') {
      fetchSettings()
    }
    if (activeTab === 'reminders') {
      fetchReminders()
    }
  }, [activeTab])

  // Démarrer le scheduler pour vérifier les rappels toutes les minutes
  useEffect(() => {
    // Vérifier immédiatement au chargement
    fetch('/api/cron/reminders').catch(() => {
      // Ignorer les erreurs silencieusement
    })

    // Puis vérifier toutes les minutes
    const interval = setInterval(() => {
      fetch('/api/cron/reminders').catch(() => {
        // Ignorer les erreurs silencieusement
      })
    }, 60000) // 60000 ms = 1 minute

    return () => clearInterval(interval)
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        setInstanceName(data.instanceName || 'SWGuilds')
        setLogoUrl(data.logoUrl)
        setApprovalWebhookUrl(data.approvalWebhookUrl || null)
        setApprovalWebhookRoleId(data.approvalWebhookRoleId || null)
        setNewsWebhookUrl(data.newsWebhookUrl || null)
        setNewsWebhookRoleId(data.newsWebhookRoleId || null)
        setDiscordWebhookUrl(data.discordWebhookUrl || null)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error)
    }
  }

  const handleSaveSettings = async () => {
    setSettingsLoading(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, approvalWebhookUrl, approvalWebhookRoleId, newsWebhookUrl, newsWebhookRoleId, discordWebhookUrl }),
      })

      if (response.ok) {
        alert('Paramètres mis à jour avec succès')
        await fetchSettings()
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleCreateTag = async () => {
    if (!tagName.trim()) {
      alert('Le nom du tag est requis')
      return
    }

    try {
      const response = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName, color: tagColor }),
      })

      if (response.ok) {
        await fetchTags()
        setShowTagModal(null)
        setTagName('')
        setTagColor('#3B82F6')
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la création du tag')
      }
    } catch (error) {
      console.error('Erreur lors de la création du tag:', error)
      alert('Erreur lors de la création du tag')
    }
  }

  const handleUpdateTag = async (tagId: string) => {
    if (!tagName.trim()) {
      alert('Le nom du tag est requis')
      return
    }

    try {
      const response = await fetch(`/api/admin/tags/${tagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName, color: tagColor }),
      })

      if (response.ok) {
        await fetchTags()
        setShowTagModal(null)
        setTagName('')
        setTagColor('#3B82F6')
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la mise à jour du tag')
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du tag:', error)
      alert('Erreur lors de la mise à jour du tag')
    }
  }

  const fetchReminders = async () => {
    try {
      const response = await fetch('/api/admin/reminders')
      if (response.ok) {
        const data = await response.json()
        setReminders(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des rappels:', error)
    }
  }

  const handleCreateReminder = async () => {
    if (!reminderTitle || !reminderMessage || reminderDaysOfWeek.length === 0 || !reminderWebhookUrl) {
      alert('Veuillez remplir tous les champs requis')
      return
    }

    setLoading(prev => ({ ...prev, reminder: true }))
    try {
      const response = await fetch('/api/admin/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reminderTitle,
          message: reminderMessage,
          daysOfWeek: JSON.stringify(reminderDaysOfWeek),
          hour: reminderHour,
          minute: reminderMinute,
          discordRoleId: reminderDiscordRoleId || null,
          webhookUrl: reminderWebhookUrl,
          isActive: reminderIsActive,
        }),
      })

      if (response.ok) {
        await fetchReminders()
        setShowReminderModal(null)
        setReminderTitle('')
        setReminderMessage('')
        setReminderDaysOfWeek([])
        setReminderHour(0)
        setReminderMinute(0)
        setReminderDiscordRoleId('')
        setReminderWebhookUrl('')
        setReminderIsActive(true)
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la création du rappel')
      }
    } catch (error) {
      console.error('Erreur lors de la création du rappel:', error)
      alert('Erreur lors de la création du rappel')
    } finally {
      setLoading(prev => ({ ...prev, reminder: false }))
    }
  }

  const handleUpdateReminder = async (reminderId: string) => {
    if (!reminderTitle || !reminderMessage || reminderDaysOfWeek.length === 0 || !reminderWebhookUrl) {
      alert('Veuillez remplir tous les champs requis')
      return
    }

    setLoading(prev => ({ ...prev, [reminderId]: true }))
    try {
      const response = await fetch(`/api/admin/reminders/${reminderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reminderTitle,
          message: reminderMessage,
          daysOfWeek: JSON.stringify(reminderDaysOfWeek),
          hour: reminderHour,
          minute: reminderMinute,
          discordRoleId: reminderDiscordRoleId || null,
          webhookUrl: reminderWebhookUrl,
          isActive: reminderIsActive,
        }),
      })

      if (response.ok) {
        await fetchReminders()
        setShowReminderModal(null)
        setReminderTitle('')
        setReminderMessage('')
        setReminderDaysOfWeek([])
        setReminderHour(0)
        setReminderMinute(0)
        setReminderDiscordRoleId('')
        setReminderWebhookUrl('')
        setReminderIsActive(true)
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la mise à jour du rappel')
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du rappel:', error)
      alert('Erreur lors de la mise à jour du rappel')
    } finally {
      setLoading(prev => ({ ...prev, [reminderId]: false }))
    }
  }

  const handleDeleteReminder = async (reminderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rappel ?')) {
      return
    }

    setLoading(prev => ({ ...prev, [reminderId]: true }))
    try {
      const response = await fetch(`/api/admin/reminders/${reminderId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchReminders()
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la suppression du rappel')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du rappel:', error)
      alert('Erreur lors de la suppression du rappel')
    } finally {
      setLoading(prev => ({ ...prev, [reminderId]: false }))
    }
  }

  const handleSendReminder = async (reminderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir envoyer ce rappel maintenant ?')) {
      return
    }

    setLoading(prev => ({ ...prev, [reminderId]: true }))
    try {
      const response = await fetch(`/api/admin/reminders/${reminderId}/send`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Rappel envoyé avec succès')
        await fetchReminders()
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de l\'envoi du rappel')
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du rappel:', error)
      alert('Erreur lors de l\'envoi du rappel')
    } finally {
      setLoading(prev => ({ ...prev, [reminderId]: false }))
    }
  }

  const handleToggleReminder = async (reminderId: string, currentStatus: boolean) => {
    setLoading(prev => ({ ...prev, [reminderId]: true }))
    try {
      const response = await fetch(`/api/admin/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        await fetchReminders()
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la modification du statut')
      }
    } catch (error) {
      console.error('Erreur lors de la modification du statut:', error)
      alert('Erreur lors de la modification du statut')
    } finally {
      setLoading(prev => ({ ...prev, [reminderId]: false }))
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm(t('admin.deleteTag') + ' ?')) return

    try {
      const response = await fetch(`/api/admin/tags/${tagId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchTags()
      } else {
        alert('Erreur lors de la suppression du tag')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du tag:', error)
      alert('Erreur lors de la suppression du tag')
    }
  }

  const formatDate = (date: string) => {
    try {
      const dateObj = new Date(date)
      const now = new Date()
      const diffMs = now.getTime() - dateObj.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      // Si moins de 5 minutes, afficher "à l'instant"
      if (diffMins < 5) {
        return t('common.justNow')
      }
      // Si moins d'une heure, afficher "il y a X minutes"
      if (diffMins < 60) {
        const key = diffMins > 1 ? 'common.minutesAgo_plural' : 'common.minutesAgo'
        return t(key, { count: String(diffMins) })
      }
      // Si moins de 24 heures, afficher "il y a X heures"
      if (diffHours < 24) {
        const key = diffHours > 1 ? 'common.hoursAgo_plural' : 'common.hoursAgo'
        return t(key, { count: String(diffHours) })
      }
      // Si moins de 7 jours, afficher "il y a X jours"
      if (diffDays < 7) {
        const key = diffDays > 1 ? 'common.daysAgo_plural' : 'common.daysAgo'
        return t(key, { count: String(diffDays) })
      }
      // Sinon, afficher la date complète
      const localeString = locale === 'en' ? 'en-US' : 'fr-FR'
      return dateObj.toLocaleDateString(localeString, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return date
    }
  }

  const getActionsByType = (entityType: string): Array<{ value: string; label: string }> => {
    switch (entityType) {
      case 'user':
        return [
          { value: 'register', label: t('logs.actions.register') },
          { value: 'approve_user', label: t('logs.actions.approve_user') },
          { value: 'lock_user', label: t('logs.actions.lock_user') },
          { value: 'unlock_user', label: t('logs.actions.unlock_user') },
          { value: 'update_user', label: t('logs.actions.update_user') },
          { value: 'rename_user', label: t('logs.actions.rename_user') },
          { value: 'change_password', label: t('logs.actions.change_password') },
          { value: 'delete_user', label: t('logs.actions.delete_user') },
          { value: 'update_profile', label: t('logs.actions.update_profile') },
          { value: 'upload_json', label: t('logs.actions.upload_json') },
          { value: 'delete_avatar', label: t('logs.actions.delete_avatar') },
        ]
      case 'defense':
        return [
          { value: 'create', label: t('logs.actions.create') },
          { value: 'update', label: t('logs.actions.update') },
          { value: 'delete', label: t('logs.actions.delete') },
        ]
      case 'counter':
        return [
          { value: 'create', label: t('logs.actions.create') },
          { value: 'update', label: t('logs.actions.update') },
          { value: 'delete', label: t('logs.actions.delete') },
        ]
      case 'tag':
        return [
          { value: 'create', label: t('logs.actions.create') },
          { value: 'update', label: t('logs.actions.update') },
          { value: 'delete', label: t('logs.actions.delete') },
        ]
      case 'reminder':
        return [
          { value: 'create', label: t('logs.actions.create') },
          { value: 'update', label: t('logs.actions.update') },
          { value: 'delete', label: t('logs.actions.delete') },
          { value: 'activate', label: t('logs.actions.activate') },
          { value: 'deactivate', label: t('logs.actions.deactivate') },
        ]
      case 'news':
        return [
          { value: 'create', label: t('logs.actions.create') },
          { value: 'update', label: t('logs.actions.update') },
          { value: 'delete', label: t('logs.actions.delete') },
        ]
      case 'calendar':
        return [
          { value: 'create', label: t('logs.actions.create') },
          { value: 'update', label: t('logs.actions.update') },
          { value: 'delete', label: t('logs.actions.delete') },
        ]
      case 'map_tower':
        return [
          { value: 'create', label: t('logs.actions.create') },
          { value: 'update', label: t('logs.actions.update') },
          { value: 'delete', label: t('logs.actions.delete') },
        ]
      case 'defense_assignment':
        return [
          { value: 'assign', label: t('logs.actions.assign') },
          { value: 'update', label: t('logs.actions.update') },
          { value: 'delete', label: t('logs.actions.delete') },
        ]
      default:
        return [
          { value: 'register', label: t('logs.actions.register') },
          { value: 'approve_user', label: t('logs.actions.approve_user') },
          { value: 'lock_user', label: t('logs.actions.lock_user') },
          { value: 'unlock_user', label: t('logs.actions.unlock_user') },
          { value: 'update_user', label: t('logs.actions.update_user') },
          { value: 'rename_user', label: t('logs.actions.rename_user') },
          { value: 'change_password', label: t('logs.actions.change_password') },
          { value: 'delete_user', label: t('logs.actions.delete_user') },
          { value: 'create', label: t('logs.actions.create') },
          { value: 'update', label: t('logs.actions.update') },
          { value: 'delete', label: t('logs.actions.delete') },
          { value: 'update_profile', label: t('logs.actions.update_profile') },
        ]
    }
  }

  const formatLogMessage = (log: ActivityLog): { message: string; icon: string; color: string } => {
    const details = log.details ? JSON.parse(log.details) : {}
    
    switch (log.action) {
      case 'register':
        return {
          message: t('logs.messages.accountCreated', { identifier: details.identifier ? `: ${details.identifier}` : '' }),
          icon: '👤',
          color: 'bg-blue-500/20 text-blue-400'
        }
      case 'approve_user':
        return {
          message: t('logs.messages.accountApproved', { identifier: details.identifier ? `: ${details.identifier}` : '' }),
          icon: '✅',
          color: 'bg-green-500/20 text-green-400'
        }
      case 'reject_user':
      case 'lock_user':
        return {
          message: t('logs.messages.accountLocked', { identifier: details.identifier ? `: ${details.identifier}` : '' }),
          icon: '🔒',
          color: 'bg-red-500/20 text-red-400'
        }
      case 'unlock_user':
        return {
          message: t('logs.messages.accountUnlocked', { identifier: details.identifier ? `: ${details.identifier}` : '' }),
          icon: '🔓',
          color: 'bg-green-500/20 text-green-400'
        }
      case 'update_user':
        const previousRole = details.previousRole === 'admin' ? t('logs.roles.admin') : details.previousRole === 'user' ? t('logs.roles.user') : details.previousRole || 'N/A'
        const newRole = details.role === 'admin' ? t('logs.roles.admin') : details.role === 'user' ? t('logs.roles.user') : details.role || 'N/A'
        return {
          message: t('logs.messages.roleChanged', { identifier: details.identifier ? ` de ${details.identifier}` : '', previousRole, newRole }),
          icon: '🔄',
          color: 'bg-yellow-500/20 text-yellow-400'
        }
      case 'rename_user':
        const previousName = details.previousName || t('logs.roles.none')
        const newName = details.newName || t('logs.roles.none')
        return {
          message: t('logs.messages.nameChanged', { identifier: details.identifier ? ` de ${details.identifier}` : '', previousName, newName }),
          icon: '✏️',
          color: 'bg-purple-500/20 text-purple-400'
        }
      case 'change_password':
        return {
          message: t('logs.messages.passwordChanged', { identifier: details.identifier ? ` pour ${details.identifier}` : '' }),
          icon: '🔑',
          color: 'bg-orange-500/20 text-orange-400'
        }
      case 'delete_user':
        const defensesCount = details.defensesTransferred || 0
        const defensesText = defensesCount > 0 ? ` (${defensesCount} ${defensesCount > 1 ? t('admin.defenses') : t('admin.defense')} ${t('logs.messages.transferred')}${defensesCount > 1 ? 's' : ''})` : ''
        return {
          message: t('logs.messages.accountDeleted', { identifier: details.identifier ? `: ${details.identifier}` : '', defensesText }),
          icon: '🗑️',
          color: 'bg-red-500/20 text-red-400'
        }
      case 'create':
        if (log.entityType === 'defense') {
          const userName = details.userName || log.user?.name || log.user?.identifier || ''
          const defenseMonsters = `${details.leaderMonster || 'N/A'} (L) / ${details.monster2 || 'N/A'} / ${details.monster3 || 'N/A'}`
          return {
            message: t('logs.messages.defenseCreated', { userName: userName ? ` par ${userName}` : '', defenseMonsters }),
            icon: '🛡️',
            color: 'bg-blue-500/20 text-blue-400'
          }
        } else if (log.entityType === 'counter') {
          const defenseName = details.leaderMonster 
            ? `${details.leaderMonster} (L) / ${details.monster2 || 'N/A'} / ${details.monster3 || 'N/A'}`
            : (details.defenseId || 'N/A')
          return {
            message: t('logs.messages.counterAdded', { defenseName }),
            icon: '⚔️',
            color: 'bg-green-500/20 text-green-400'
          }
        } else if (log.entityType === 'tag') {
          return {
            message: t('logs.messages.tagCreated', { tagName: details.tagName || 'N/A' }),
            icon: '🏷️',
            color: 'bg-green-500/20 text-green-400'
          }
        } else if (log.entityType === 'calendar') {
          const eventTypeText = details.eventType === 'absence' ? t('calendar.eventTypeAbsence') : t('calendar.eventTypeOther')
          const localeString = locale === 'en' ? 'en-US' : 'fr-FR'
          const dateText = details.startDate ? new Date(details.startDate).toLocaleDateString(localeString) : 'N/A'
          return {
            message: t('logs.messages.calendarEventCreated', { eventType: eventTypeText, date: dateText }),
            icon: '📅',
            color: 'bg-green-500/20 text-green-400'
          }
        } else if (log.entityType === 'reminder') {
          const dayNames = [
            t('logs.days.sunday'),
            t('logs.days.monday'),
            t('logs.days.tuesday'),
            t('logs.days.wednesday'),
            t('logs.days.thursday'),
            t('logs.days.friday'),
            t('logs.days.saturday')
          ]
          const daysArray = details.daysOfWeek || []
          const sortedDays = [...daysArray].sort((a: number, b: number) => {
            if (a === 0) return 1
            if (b === 0) return -1
            return a - b
          })
          const daysText = sortedDays.map((d: number) => dayNames[d]).join(', ')
          const timeText = `${details.hour || 0}:${String(details.minute || 0).padStart(2, '0')}`
          return {
            message: t('logs.messages.reminderCreated', { title: details.title || t('admin.noTitle') || 'Sans titre', days: daysText, time: timeText }),
            icon: '⏰',
            color: 'bg-purple-500/20 text-purple-400'
          }
        } else if (log.entityType === 'news') {
          const contentPreview = details.content ? (details.content.length > 50 ? details.content.substring(0, 50) + '...' : details.content) : 'N/A'
          return {
            message: t('logs.messages.newsCreated', { content: contentPreview }),
            icon: '📰',
            color: 'bg-green-500/20 text-green-400'
          }
        } else if (log.entityType === 'map_tower') {
          const mapNameText = details.mapName === 'map.png' ? t('logs.maps.siege') : details.mapName === 'map_tournament.png' ? t('logs.maps.tournament') : details.mapName || 'N/A'
          const starsText = details.stars === 4 ? '4 ⭐' : details.stars === 5 ? '5 ⭐' : details.stars ? `${details.stars} ⭐` : ''
          return {
            message: t('logs.messages.towerCreated', { towerNumber: details.towerNumber || 'N/A', mapName: mapNameText, stars: starsText ? ` (${starsText})` : '' }),
            icon: '🗼',
            color: 'bg-blue-500/20 text-blue-400'
          }
        }
        return {
          message: t('logs.messages.genericAction', { action: t('logs.actions.create'), entityType: log.entityType, entityId: log.entityId ? ` (ID: ${log.entityId})` : '' }),
          icon: '📝',
          color: 'bg-gray-500/20 text-gray-400'
        }
      case 'update':
        if (log.entityType === 'defense') {
          const userName = details.userName || log.user?.name || log.user?.identifier || ''
          const defenseMonsters = `${details.leaderMonster || 'N/A'} (L) / ${details.monster2 || 'N/A'} / ${details.monster3 || 'N/A'}`
          return {
            message: t('logs.messages.defenseUpdated', { userName: userName ? ` par ${userName}` : '', defenseMonsters }),
            icon: '✏️',
            color: 'bg-yellow-500/20 text-yellow-400'
          }
        } else if (log.entityType === 'counter') {
          const defenseName = details.leaderMonster 
            ? `${details.leaderMonster} (L) / ${details.monster2 || 'N/A'} / ${details.monster3 || 'N/A'}`
            : (details.defenseId || 'N/A')
          return {
            message: t('logs.messages.counterUpdated', { defenseName }),
            icon: '⚔️',
            color: 'bg-yellow-500/20 text-yellow-400'
          }
        } else if (log.entityType === 'tag') {
          return {
            message: t('logs.messages.tagUpdated', { previousName: details.previousName || 'N/A', newName: details.newName || 'N/A' }),
            icon: '🏷️',
            color: 'bg-yellow-500/20 text-yellow-400'
          }
        } else if (log.entityType === 'news') {
          const contentPreview = details.content ? (details.content.length > 50 ? details.content.substring(0, 50) + '...' : details.content) : 'N/A'
          return {
            message: t('logs.messages.newsUpdated', { content: contentPreview }),
            icon: '📰',
            color: 'bg-yellow-500/20 text-yellow-400'
          }
        } else if (log.entityType === 'calendar') {
          const eventTypeText = details.eventType === 'absence' ? t('calendar.eventTypeAbsence') : t('calendar.eventTypeOther')
          const localeString = locale === 'en' ? 'en-US' : 'fr-FR'
          const dateText = details.startDate ? new Date(details.startDate).toLocaleDateString(localeString) : 'N/A'
          return {
            message: t('logs.messages.calendarEventUpdated', { eventType: eventTypeText, date: dateText }),
            icon: '📅',
            color: 'bg-yellow-500/20 text-yellow-400'
          }
        } else if (log.entityType === 'reminder') {
          return {
            message: t('logs.messages.reminderUpdated', { title: details.title || t('admin.noTitle') || 'Sans titre' }),
            icon: '⏰',
            color: 'bg-purple-500/20 text-purple-400'
          }
        } else if (log.entityType === 'map_tower') {
          const mapNameText = details.mapName === 'map.png' ? t('logs.maps.siege') : details.mapName === 'map_tournament.png' ? t('logs.maps.tournament') : details.mapName || 'N/A'
          const starsText = details.stars === 4 ? '4 ⭐' : details.stars === 5 ? '5 ⭐' : details.stars ? `${details.stars} ⭐` : ''
          return {
            message: t('logs.messages.towerUpdated', { towerNumber: details.towerNumber || 'N/A', mapName: mapNameText, stars: starsText ? ` (${starsText})` : '' }),
            icon: '🗼',
            color: 'bg-yellow-500/20 text-yellow-400'
          }
        }
        return {
          message: t('logs.messages.genericAction', { action: t('logs.actions.update'), entityType: log.entityType, entityId: log.entityId ? ` (ID: ${log.entityId})` : '' }),
          icon: '📝',
          color: 'bg-gray-500/20 text-gray-400'
        }
      case 'delete':
        if (log.entityType === 'defense') {
          const userName = details.userName || log.user?.name || log.user?.identifier || ''
          const defenseMonsters = `${details.leaderMonster || 'N/A'} (L) / ${details.monster2 || 'N/A'} / ${details.monster3 || 'N/A'}`
          return {
            message: t('logs.messages.defenseDeleted', { userName: userName ? ` par ${userName}` : '', defenseMonsters }),
            icon: '🗑️',
            color: 'bg-red-500/20 text-red-400'
          }
        } else if (log.entityType === 'counter') {
          const defenseName = details.leaderMonster 
            ? `${details.leaderMonster} (L) / ${details.monster2 || 'N/A'} / ${details.monster3 || 'N/A'}`
            : (details.defenseId || 'N/A')
          return {
            message: t('logs.messages.counterDeleted', { defenseName }),
            icon: '🗑️',
            color: 'bg-red-500/20 text-red-400'
          }
        } else if (log.entityType === 'tag') {
          return {
            message: t('logs.messages.tagDeleted', { tagName: details.tagName || 'N/A' }),
            icon: '🗑️',
            color: 'bg-red-500/20 text-red-400'
          }
        } else if (log.entityType === 'calendar') {
          const eventTypeText = details.eventType === 'absence' ? t('calendar.eventTypeAbsence') : t('calendar.eventTypeOther')
          const localeString = locale === 'en' ? 'en-US' : 'fr-FR'
          const dateText = details.startDate ? new Date(details.startDate).toLocaleDateString(localeString) : 'N/A'
          return {
            message: t('logs.messages.calendarEventDeleted', { eventType: eventTypeText, date: dateText }),
            icon: '📅',
            color: 'bg-red-500/20 text-red-400'
          }
        } else if (log.entityType === 'reminder') {
          return {
            message: t('logs.messages.reminderDeleted', { title: details.title || t('admin.noTitle') || 'Sans titre' }),
            icon: '⏰',
            color: 'bg-red-500/20 text-red-400'
          }
        } else if (log.entityType === 'news') {
          const contentPreview = details.content ? (details.content.length > 50 ? details.content.substring(0, 50) + '...' : details.content) : 'N/A'
          return {
            message: t('logs.messages.newsDeleted', { content: contentPreview }),
            icon: '📰',
            color: 'bg-red-500/20 text-red-400'
          }
        } else if (log.entityType === 'map_tower') {
          const mapNameText = details.mapName === 'map.png' ? t('logs.maps.siege') : details.mapName === 'map_tournament.png' ? t('logs.maps.tournament') : details.mapName || 'N/A'
          return {
            message: t('logs.messages.towerDeleted', { towerNumber: details.towerNumber || 'N/A', mapName: mapNameText }),
            icon: '🗼',
            color: 'bg-red-500/20 text-red-400'
          }
        }
        return {
          message: t('logs.messages.genericAction', { action: t('logs.actions.delete'), entityType: log.entityType, entityId: log.entityId ? ` (ID: ${log.entityId})` : '' }),
          icon: '📝',
          color: 'bg-gray-500/20 text-gray-400'
        }
      case 'update_profile':
        return {
          message: t('logs.messages.profileUpdated', { fields: details.updatedFields?.join(', ') || 'N/A' }),
          icon: '👤',
          color: 'bg-blue-500/20 text-blue-400'
        }
      case 'delete_avatar':
        return {
          message: t('logs.messages.avatarDeleted', { identifier: details.identifier || 'N/A' }),
          icon: '🖼️',
          color: 'bg-orange-500/20 text-orange-400'
        }
      case 'upload_json':
        const playerName = details.name || details.identifier || t('logs.messages.unknownPlayer') || 'Joueur inconnu'
        return {
          message: t('logs.messages.jsonUploaded', { playerName }),
          icon: '📤',
          color: 'bg-blue-500/20 text-blue-400'
        }
      case 'activate':
        if (log.entityType === 'reminder') {
          return {
            message: t('logs.messages.reminderActivated', { title: details.title || t('admin.noTitle') || 'Sans titre' }),
            icon: '⏰',
            color: 'bg-green-500/20 text-green-400'
          }
        }
        return {
          message: t('logs.messages.genericAction', { action: t('logs.actions.activate'), entityType: log.entityType, entityId: '' }),
          icon: '✅',
          color: 'bg-green-500/20 text-green-400'
        }
      case 'deactivate':
        if (log.entityType === 'reminder') {
          return {
            message: t('logs.messages.reminderDeactivated', { title: details.title || t('admin.noTitle') || 'Sans titre' }),
            icon: '⏰',
            color: 'bg-yellow-500/20 text-yellow-400'
          }
        }
        return {
          message: t('logs.messages.genericAction', { action: t('logs.actions.deactivate'), entityType: log.entityType, entityId: '' }),
          icon: '⏸️',
          color: 'bg-yellow-500/20 text-yellow-400'
        }
      case 'send':
        if (log.entityType === 'reminder') {
          const sentManually = details.sentManually ? t('logs.manual') : ''
          return {
            message: t('logs.messages.reminderSent', { title: details.title || t('admin.noTitle') || 'Sans titre', manual: sentManually }),
            icon: '📤',
            color: 'bg-purple-500/20 text-purple-400'
          }
        }
        return {
          message: t('logs.messages.genericAction', { action: t('logs.actions.send'), entityType: log.entityType, entityId: '' }),
          icon: '📤',
          color: 'bg-purple-500/20 text-purple-400'
        }
      case 'send_discord':
        if (log.entityType === 'news') {
          const contentPreview = details.content ? (details.content.length > 50 ? details.content.substring(0, 50) + '...' : details.content) : 'N/A'
          return {
            message: t('logs.messages.newsSentDiscord', { content: contentPreview }),
            icon: '💬',
            color: 'bg-indigo-500/20 text-indigo-400'
          }
        }
        return {
          message: t('logs.messages.genericAction', { action: t('logs.actions.send_discord'), entityType: log.entityType, entityId: '' }),
          icon: '💬',
          color: 'bg-indigo-500/20 text-indigo-400'
        }
      case 'change_language':
        const previousLocaleLabel = details.previousLocale === 'fr' ? t('common.french') : details.previousLocale === 'en' ? t('common.english') : details.previousLocale || 'N/A'
        const newLocaleLabel = details.newLocale === 'fr' ? t('common.french') : details.newLocale === 'en' ? t('common.english') : details.newLocale || 'N/A'
        return {
          message: t('logs.messages.languageChanged', { previousLocale: previousLocaleLabel, newLocale: newLocaleLabel }),
          icon: '🌐',
          color: 'bg-cyan-500/20 text-cyan-400'
        }
      case 'assign':
        if (log.entityType === 'defense_assignment') {
          const defenseMonsters = details.defenseMonsters || t('logs.messages.unknownDefense')
          // Si on a les noms des utilisateurs, les afficher
          if (details.assignedToNames && Array.isArray(details.assignedToNames) && details.assignedToNames.length > 0) {
            const userNames = details.assignedToNames.join(', ')
            const count = details.assignedToNames.length
            const plural = count > 1 ? t('logs.messages.member_plural') : t('logs.messages.member')
            return {
              message: t('logs.messages.assignmentCreated', { defenseMonsters, count: count.toString(), plural, userNames }),
              icon: '📋',
              color: 'bg-blue-500/20 text-blue-400'
            }
          }
          // Sinon, utiliser le nombre
          const count = details.count || 0
          const plural = count > 1 ? t('logs.messages.member_plural') : t('logs.messages.member')
          return {
            message: t('logs.messages.assignmentCreated', { defenseMonsters, count: count.toString(), plural, userNames: '' }),
            icon: '📋',
            color: 'bg-blue-500/20 text-blue-400'
          }
        } else if (log.entityType === 'defense') {
          const defenseMonsters = `${details.leaderMonster || 'N/A'} (L) / ${details.monster2 || 'N/A'} / ${details.monster3 || 'N/A'}`
          return {
            message: t('logs.messages.assignmentCreated', { defenseMonsters, count: '1', plural: '', userNames: '' }),
            icon: '📋',
            color: 'bg-blue-500/20 text-blue-400'
          }
        }
        return {
          message: t('logs.messages.genericAction', { action: t('logs.actions.assign'), entityType: log.entityType, entityId: '' }),
          icon: '📋',
          color: 'bg-blue-500/20 text-blue-400'
        }
      default:
        // Gérer les cas spécifiques pour defense_assignment
        if (log.entityType === 'defense_assignment') {
          if (log.action === 'update') {
            const defenseMonsters = details.defenseMonsters || t('logs.messages.unknownDefense')
            const added = details.added || 0
            const removed = details.removed || 0
            const total = details.total || 0
            
            // Afficher les noms des utilisateurs ajoutés et retirés si disponibles
            const addedNames = details.addedNames && Array.isArray(details.addedNames) && details.addedNames.length > 0
              ? details.addedNames.join(', ')
              : null
            const removedNames = details.removedNames && Array.isArray(details.removedNames) && details.removedNames.length > 0
              ? details.removedNames.join(', ')
              : null
            
            const changes = []
            if (added > 0) {
              const addedText = added > 1 ? t('logs.messages.added_plural') : t('logs.messages.added')
              if (addedNames) {
                changes.push(`${added} ${addedText}: ${addedNames}`)
              } else {
                changes.push(`${added} ${addedText}`)
              }
            }
            if (removed > 0) {
              const removedText = removed > 1 ? t('logs.messages.removed_plural') : t('logs.messages.removed')
              if (removedNames) {
                changes.push(`${removed} ${removedText}: ${removedNames}`)
              } else {
                changes.push(`${removed} ${removedText}`)
              }
            }
            
            const changesText = changes.length > 0 ? ` - ${changes.join(', ')}` : ''
            const totalText = total > 0 ? ` (${total} ${total > 1 ? t('logs.messages.member_plural') : t('logs.messages.member')} ${t('logs.messages.total')})` : ''
            return {
              message: t('logs.messages.assignmentUpdated', { defenseMonsters, changes: changesText, total: totalText, plural: total > 1 ? 's' : '' }),
              icon: '✏️',
              color: 'bg-yellow-500/20 text-yellow-400'
            }
          } else if (log.action === 'delete') {
            const defenseMonsters = details.defenseMonsters || t('logs.messages.unknownDefense')
            const userName = details.userName || details.userIdentifier || t('logs.messages.unknownUser')
            return {
              message: t('logs.messages.assignmentDeleted', { defenseMonsters, userName }),
              icon: '🗑️',
              color: 'bg-red-500/20 text-red-400'
            }
          }
        }
        return {
          message: t('logs.messages.genericAction', { action: log.action, entityType: log.entityType, entityId: log.entityId ? ` (ID: ${log.entityId})` : '' }),
          icon: '📝',
          color: 'bg-gray-500/20 text-gray-400'
        }
    }
  }

  const pendingUsers = users.filter(u => !u.isApproved)
  const approvedUsers = users.filter(u => u.isApproved)

  // Fermer le menu mobile au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileTabsMenuRef.current && !mobileTabsMenuRef.current.contains(event.target as Node)) {
        setShowMobileTabsMenu(false)
      }
    }

    if (showMobileTabsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMobileTabsMenu])

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-slate-700">
        {/* Bouton hamburger pour mobile */}
        <div className="md:hidden relative" ref={mobileTabsMenuRef}>
          <button
            type="button"
            onClick={() => setShowMobileTabsMenu(!showMobileTabsMenu)}
            className="w-full flex items-center justify-between px-4 py-3 text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <span className="font-medium">
              {activeTab === 'users' && `${t('admin.users')}${pendingUsers.length > 0 ? ` (${pendingUsers.length} ${t('common.pending')})` : ''}`}
              {activeTab === 'logs' && t('admin.logs')}
              {activeTab === 'tags' && t('admin.tags')}
              {activeTab === 'reminders' && t('admin.reminders')}
              {activeTab === 'settings' && t('admin.settings')}
            </span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showMobileTabsMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
          {showMobileTabsMenu && (
            <>
              {/* Overlay */}
              <div 
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setShowMobileTabsMenu(false)}
              />
              {/* Menu déroulant */}
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-700 rounded-lg shadow-xl z-50 border border-slate-600 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('users')
                    setShowMobileTabsMenu(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'users'
                      ? 'bg-blue-600/30 text-blue-400'
                      : 'text-gray-300 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {t('admin.users')} {pendingUsers.length > 0 && `(${pendingUsers.length} ${t('common.pending')})`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('logs')
                    setShowMobileTabsMenu(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'logs'
                      ? 'bg-blue-600/30 text-blue-400'
                      : 'text-gray-300 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {t('admin.logs')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('tags')
                    setShowMobileTabsMenu(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'tags'
                      ? 'bg-blue-600/30 text-blue-400'
                      : 'text-gray-300 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {t('admin.tags')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reminders')
                    setShowMobileTabsMenu(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'reminders'
                      ? 'bg-blue-600/30 text-blue-400'
                      : 'text-gray-300 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {t('admin.reminders')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings')
                    setShowMobileTabsMenu(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-blue-600/30 text-blue-400'
                      : 'text-gray-300 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {t('admin.settings')}
                </button>
              </div>
            </>
          )}
        </div>
        {/* Onglets desktop */}
        <nav className="hidden md:flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            {t('admin.users')} {pendingUsers.length > 0 && `(${pendingUsers.length} ${t('common.pending')})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            {t('admin.logs')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'tags'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            {t('admin.tags')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'reminders'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            Rappel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            {t('admin.settings')}
          </button>
        </nav>
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filtre de recherche */}
            <div className="mb-4">
              <input
                type="text"
                value={usersSearchQuery}
                onChange={(e) => setUsersSearchQuery(e.target.value)}
                placeholder={t('admin.searchByNameOrId')}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Utilisateurs en attente */}
            {(usersSearchQuery ? pendingUsers.filter(u => 
              (u.name || '').toLowerCase().includes(usersSearchQuery.toLowerCase()) ||
              u.identifier.toLowerCase().includes(usersSearchQuery.toLowerCase())
            ) : pendingUsers).length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">{t('admin.users')} {t('common.pending')}</h2>
                <div className="space-y-3">
                  {(usersSearchQuery ? pendingUsers.filter(u => 
                    (u.name || '').toLowerCase().includes(usersSearchQuery.toLowerCase()) ||
                    u.identifier.toLowerCase().includes(usersSearchQuery.toLowerCase())
                  ) : pendingUsers).map((user) => (
                    <div key={user.id} className="bg-slate-700 p-4 rounded-lg border border-yellow-500/50">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3 flex-grow">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name || user.identifier}
                              className="w-10 h-10 rounded-full object-cover border-2 border-slate-600 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center border-2 border-slate-600 flex-shrink-0">
                              <span className="text-sm text-gray-300">
                                {(user.name || user.identifier || 'U')[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="text-white font-medium">{user.name || `Identifiant: ${user.identifier}`}</div>
                            {user.name && (
                              <div className="text-gray-400 text-sm">Identifiant: {user.identifier}</div>
                            )}
                            <div className="text-gray-500 text-xs mt-1">
                              {t('admin.createdOn')} {formatDate(user.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={() => handleApproveUser(user.id)}
                            disabled={loading[user.id]}
                            variant="success"
                          >
                            Approuver
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleRejectUser(user.id)}
                            disabled={loading[user.id]}
                            variant="danger"
                          >
                            Rejeter
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Utilisateurs approuvés */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">{t('admin.users')} {t('profile.approved')}</h2>
              {(() => {
                const filteredApprovedUsers = usersSearchQuery ? approvedUsers.filter(u => 
                  (u.name || '').toLowerCase().includes(usersSearchQuery.toLowerCase()) ||
                  u.identifier.toLowerCase().includes(usersSearchQuery.toLowerCase())
                ) : approvedUsers
                
                return filteredApprovedUsers.length === 0 ? (
                  <div className="bg-slate-700 p-6 rounded-lg border border-slate-600 text-center text-gray-400">
                    {usersSearchQuery ? 'Aucun utilisateur ne correspond à la recherche.' : 'Aucun utilisateur approuvé.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredApprovedUsers.map((user) => (
                  <div key={user.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-grow">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name || user.identifier}
                              className="w-10 h-10 rounded-full object-cover border-2 border-slate-600"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center border-2 border-slate-600 flex-shrink-0">
                              <span className="text-sm text-gray-300">
                                {(user.name || user.identifier || 'U')[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                          {user.name ? (
                            <>
                              <span className="text-white font-medium">{user.name}</span>
                              <span className="text-gray-400 hidden sm:inline">•</span>
                              <span className="text-gray-400 text-sm">Identifiant: {user.identifier}</span>
                            </>
                          ) : (
                            <span className="text-white font-medium">Identifiant: {user.identifier}</span>
                          )}
                          <span className="text-gray-400 hidden sm:inline">•</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.role === 'admin' 
                              ? 'bg-purple-500/20 text-purple-400' 
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {user.role === 'admin' ? 'Admin' : 'Utilisateur'}
                          </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                          <span>
                            <button
                              type="button"
                              onClick={() => window.location.href = `/defenses?userId=${user.id}`}
                              className="text-blue-400 hover:text-blue-300 hover:underline"
                            >
                              {user._count.defenses} {user._count.defenses > 1 ? t('admin.defenses') : t('admin.defense')}
                            </button>
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span>
                            {user.lastLogin 
                              ? `${t('admin.lastLogin')} ${formatDate(user.lastLogin)}`
                              : t('admin.neverConnected')
                            }
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="relative inline-block" ref={(el) => { menuRefs.current[user.id] = el }}>
                          <Button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                            disabled={loading[user.id]}
                            variant="secondary"
                            className="text-xs"
                          >
                            {t('admin.actions')}
                          </Button>
                          {openMenuId === user.id && (
                            <>
                              {/* Overlay pour fermer le menu sur mobile */}
                              <div 
                                className="fixed sm:hidden inset-0 bg-black/50 z-40"
                                onClick={() => setOpenMenuId(null)}
                              />
                              {/* Menu */}
                              <div className="fixed sm:absolute left-4 sm:left-auto right-4 sm:right-0 top-1/2 sm:top-auto sm:top-full -translate-y-1/2 sm:translate-y-0 sm:mt-1 w-[calc(100vw-2rem)] sm:w-48 max-w-sm sm:max-w-none bg-slate-700 rounded-lg shadow-xl z-50 border border-slate-600 overflow-hidden">
                              <div className="py-1">
                                {!isEnvAdmin(user) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowRenameModal({ userId: user.id, identifier: user.identifier, currentName: user.name })
                                    setNewName(user.name || '')
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                                >
                                  {t('admin.rename')}
                                </button>
                                )}
                                {!isEnvAdmin(user) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowPasswordModal({ userId: user.id, identifier: user.identifier })
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                                >
                                  {t('admin.changePassword')}
                                </button>
                                )}
                                {user.role !== 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowPermissionsModal({ userId: user.id, user })
                                      setOpenMenuId(null)
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                                  >
                                    {t('admin.manageRights')}
                                  </button>
                                )}
                                {!isEnvAdmin(user) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleLockUser(user.id, user.isApproved)
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                                >
                                  {user.isApproved ? t('admin.lockAccount') : t('admin.unlockAccount')}
                                </button>
                                )}
                                {!isEnvAdmin(user) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleToggleRole(user.id, user.role)
                                      setOpenMenuId(null)
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                                  >
                                    {user.role === 'admin' ? t('admin.removeAdminRole') : t('admin.promoteAdmin')}
                                  </button>
                                )}
                                {!isEnvAdmin(user) && (
                                  <>
                                    {user.avatarUrl && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!confirm(t('admin.deleteAvatarConfirm'))) return
                                          
                                          setLoading(prev => ({ ...prev, [user.id]: true }))
                                          try {
                                            const response = await fetch(`/api/admin/users/${user.id}/avatar`, {
                                              method: 'DELETE',
                                            })

                                            if (response.ok) {
                                              const result = await response.json()
                                              alert(result.message || 'Photo de profil supprimée avec succès')
                                              setUsers(users.map(u => u.id === user.id ? { ...u, avatarUrl: null } : u))
                                              fetchLogs()
                                            } else {
                                              const error = await response.json()
                                              alert(error.error || 'Erreur lors de la suppression')
                                            }
                                          } catch (error) {
                                            console.error('Erreur lors de la suppression:', error)
                                            alert('Erreur lors de la suppression')
                                          } finally {
                                            setLoading(prev => ({ ...prev, [user.id]: false }))
                                            setOpenMenuId(null)
                                          }
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-orange-400 hover:bg-slate-600 transition-colors"
                                      >
                                        Suppr. la photo de profil
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleDeleteUser(user.id, user.identifier)
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-600 transition-colors"
                                    >
                                      {t('admin.deleteUser')}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-3">
            {/* Filtre de recherche */}
            <div className="mb-4">
              <input
                type="text"
                value={logsSearchQuery}
                onChange={(e) => setLogsSearchQuery(e.target.value)}
                placeholder={t('logs.searchPlaceholder')}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Filtres */}
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('logs.filterByType')}
                </label>
                <select
                  value={logTypeFilter}
                  onChange={(e) => {
                    setLogTypeFilter(e.target.value)
                    // Réinitialiser le filtre d'action quand on change le type
                    setLogActionFilter('all')
                    fetchLogs(
                      e.target.value !== 'all' ? e.target.value : undefined,
                      undefined
                    )
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('logs.allTypes')}</option>
                  <option value="user">{t('logs.entityTypes.user')}</option>
                  <option value="news">{t('logs.entityTypes.news')}</option>
                  <option value="defense">{t('logs.entityTypes.defense')}</option>
                  <option value="counter">{t('logs.entityTypes.counter')}</option>
                  <option value="map_tower">{t('logs.entityTypes.map_tower')}</option>
                  <option value="defense_assignment">{t('logs.entityTypes.defense_assignment')}</option>
                  <option value="reminder">{t('logs.entityTypes.reminder')}</option>
                  <option value="calendar">{t('logs.entityTypes.calendar')}</option>
                  <option value="tag">{t('logs.entityTypes.tag')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('logs.filterByAction')}
                </label>
                <select
                  value={logActionFilter}
                  onChange={(e) => {
                    setLogActionFilter(e.target.value)
                    fetchLogs(
                      logTypeFilter !== 'all' ? logTypeFilter : undefined,
                      e.target.value !== 'all' ? e.target.value : undefined
                    )
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('logs.allActions')}</option>
                  {getActionsByType(logTypeFilter !== 'all' ? logTypeFilter : 'all').map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(logsSearchQuery ? logs.filter(log => {
              const logInfo = formatLogMessage(log)
              const searchLower = logsSearchQuery.toLowerCase()
              return (
                logInfo.message.toLowerCase().includes(searchLower) ||
                (log.details && log.details.toLowerCase().includes(searchLower)) ||
                (log.user.name && log.user.name.toLowerCase().includes(searchLower)) ||
                log.user.identifier.toLowerCase().includes(searchLower)
              )
            }) : logs).length === 0 ? (
              <div className="bg-slate-700 p-6 rounded-lg border border-slate-600 text-center text-gray-400">
                {logsSearchQuery ? t('logs.noLogsMatchSearch') : t('logs.noLogsFound')}
              </div>
            ) : (
              (logsSearchQuery ? logs.filter(log => {
                const logInfo = formatLogMessage(log)
                const searchLower = logsSearchQuery.toLowerCase()
                return (
                  logInfo.message.toLowerCase().includes(searchLower) ||
                  (log.details && log.details.toLowerCase().includes(searchLower)) ||
                  (log.user.name && log.user.name.toLowerCase().includes(searchLower)) ||
                  log.user.identifier.toLowerCase().includes(searchLower)
                )
              }) : logs).map((log) => {
                const logInfo = formatLogMessage(log)
                return (
                  <div key={log.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600 hover:bg-slate-650 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-grow min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xl flex-shrink-0">{logInfo.icon}</span>
                          <span className="text-white font-medium flex-shrink-0">{log.user.name || log.user.identifier}</span>
                          <span className="text-gray-400 hidden sm:inline">•</span>
                        </div>
                        <div className={`px-3 py-2 rounded text-sm ${logInfo.color} break-words`}>
                          {logInfo.message}
                        </div>
                      </div>
                      <div className="text-gray-500 text-xs whitespace-nowrap sm:ml-4 flex-shrink-0 self-start">
                        {formatDate(log.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{t('admin.tags')}</h2>
              <Button
                type="button"
                onClick={() => {
                  setShowTagModal({})
                  setTagName('')
                  setTagColor('#3B82F6')
                }}
              >
                + {t('admin.newTag')}
              </Button>
            </div>
            {/* Filtre de recherche */}
            <div>
              <input
                type="text"
                value={tagsSearchQuery}
                onChange={(e) => setTagsSearchQuery(e.target.value)}
                placeholder={t('admin.searchTag')}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(tagsSearchQuery ? tags.filter(tag => 
                tag.name.toLowerCase().includes(tagsSearchQuery.toLowerCase())
              ) : tags).map((tag) => (
                <div key={tag.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-3 py-1 rounded text-sm font-medium"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      {tag.name}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTagModal({ tag })
                          setTagName(tag.name)
                          setTagColor(tag.color)
                        }}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {t('admin.createdOn')} {formatDate(tag.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reminders' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{t('admin.reminders')}</h2>
              <Button
                type="button"
                onClick={() => {
                  setShowReminderModal({})
                  setReminderTitle('')
                  setReminderMessage('')
                  setReminderDaysOfWeek([])
                  setReminderHour(0)
                  setReminderMinute(0)
                  setReminderDiscordRoleId('')
                  setReminderWebhookUrl('')
                  setReminderIsActive(true)
                }}
              >
                + {t('admin.newReminder')}
              </Button>
            </div>
            {/* Filtre de recherche */}
            <div>
              <input
                type="text"
                value={remindersSearchQuery}
                onChange={(e) => setRemindersSearchQuery(e.target.value)}
                placeholder={t('admin.searchReminder')}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(remindersSearchQuery ? reminders.filter(r => 
              (r.title || '').toLowerCase().includes(remindersSearchQuery.toLowerCase()) ||
              r.message.toLowerCase().includes(remindersSearchQuery.toLowerCase())
            ) : reminders).length === 0 ? (
              <div className="bg-slate-700 p-6 rounded-lg border border-slate-600 text-center text-gray-400">
                {remindersSearchQuery ? t('admin.noRemindersFound') : t('admin.noReminders')}
              </div>
            ) : (
              <div className="space-y-3">
                {(remindersSearchQuery ? reminders.filter(r => 
                  (r.title || '').toLowerCase().includes(remindersSearchQuery.toLowerCase()) ||
                  r.message.toLowerCase().includes(remindersSearchQuery.toLowerCase())
                ) : reminders).map((reminder) => {
                  const daysArray: number[] = JSON.parse(reminder.daysOfWeek)
                  const dayNames = [
                    t('admin.sunday'),
                    t('admin.monday'),
                    t('admin.tuesday'),
                    t('admin.wednesday'),
                    t('admin.thursday'),
                    t('admin.friday'),
                    t('admin.saturday')
                  ]
                  // Trier les jours pour afficher Lundi en premier
                  const sortedDays = [...daysArray].sort((a, b) => {
                    // Mettre 0 (dimanche) à la fin
                    if (a === 0) return 1
                    if (b === 0) return -1
                    return a - b
                  })
                  const selectedDays = sortedDays.map(d => dayNames[d]).join(', ')
                  const localeString = locale === 'en' ? 'en-US' : 'fr-FR'
                  const lastSent = reminder.lastSent ? new Date(reminder.lastSent).toLocaleString(localeString) : t('common.never')
                  
                  return (
                    <div key={reminder.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-grow">
                          <div className="text-white font-bold text-lg mb-2">{reminder.title || t('admin.reminderTitle')}</div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              reminder.isActive 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {reminder.isActive ? t('admin.active') : t('admin.inactive')}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400 space-y-1">
                            <div>{t('admin.days')} : {selectedDays}</div>
                            <div>{t('admin.time')} : {reminder.hour}:{reminder.minute}</div>
                            {reminder.discordRoleId && (
                              <div>{t('admin.discordRole')} : <code className="bg-slate-800 px-1 rounded">{reminder.discordRoleId}</code></div>
                            )}
                            <div>{t('admin.lastSent')} : {lastSent}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleSendReminder(reminder.id)}
                            disabled={loading[reminder.id]}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                          >
                            {t('admin.sendNow')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleReminder(reminder.id, reminder.isActive)}
                            disabled={loading[reminder.id]}
                            className={`px-3 py-1 rounded text-sm ${
                              reminder.isActive
                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {reminder.isActive ? t('admin.deactivate') : t('admin.activate')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowReminderModal({ reminder })
                              setReminderTitle(reminder.title || '')
                              setReminderMessage(reminder.message)
                              setReminderDaysOfWeek(JSON.parse(reminder.daysOfWeek))
                              setReminderHour(reminder.hour)
                              setReminderMinute(reminder.minute)
                              setReminderDiscordRoleId(reminder.discordRoleId || '')
                              setReminderWebhookUrl(reminder.webhookUrl)
                              setReminderIsActive(reminder.isActive)
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReminder(reminder.id)}
                            disabled={loading[reminder.id]}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">{t('admin.settings')}</h2>
            
            {/* Onglets */}
            <div className="flex gap-2 border-b border-slate-600">
              <button
                type="button"
                onClick={() => setSettingsTab('general')}
                className={`px-4 py-2 font-medium transition-colors ${
                  settingsTab === 'general'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t('admin.general')}
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('webhooks')}
                className={`px-4 py-2 font-medium transition-colors ${
                  settingsTab === 'webhooks'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t('admin.webhooks')}
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('danger')}
                className={`px-4 py-2 font-medium transition-colors ${
                  settingsTab === 'danger'
                    ? 'text-white border-b-2 border-red-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t('admin.dangerZone')}
              </button>
            </div>

            {/* Onglet Général */}
            {settingsTab === 'general' && (
              <div className="bg-slate-700 p-6 rounded-lg border border-slate-600 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('admin.instanceName')}
                  </label>
                  <input
                    type="text"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="SWGuilds"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('admin.logo')}
                  </label>
                <div className="flex items-center gap-6">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="h-16 object-contain"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-slate-600 rounded flex items-center justify-center text-gray-400 text-sm">
                      {t('admin.noLogo')}
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return

                        setUploadingLogo(true)
                        const formData = new FormData()
                        formData.append('logo', file)

                        try {
                          const response = await fetch('/api/admin/settings', {
                            method: 'POST',
                            body: formData,
                          })

                          const data = await response.json()

                          if (!response.ok) {
                            alert(data.error || t('admin.uploadError'))
                            return
                          }

                          setLogoUrl(data.logoUrl)
                          // Déclencher un événement personnalisé pour notifier la Navbar
                          window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: data.logoUrl } }))
                          alert(t('admin.logoUpdated'))
                          await fetchSettings()
                        } catch (err) {
                          alert(t('admin.uploadError'))
                        } finally {
                          setUploadingLogo(false)
                          e.target.value = ''
                        }
                      }}
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingLogo ? t('admin.uploadingLogo') : logoUrl ? t('admin.changeLogoButton') : t('admin.uploadLogoButton')}
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(t('admin.removeLogo') + ' ?')) return
                          
                          setUploadingLogo(true)
                          
                          try {
                            const response = await fetch('/api/admin/settings', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ logoUrl: null }),
                            })

                            if (response.ok) {
                              setLogoUrl(null)
                              // Déclencher un événement personnalisé pour notifier la Navbar
                              window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: null } }))
                              alert(t('admin.logoRemoved'))
                              await fetchSettings()
                            } else {
                              const data = await response.json()
                              alert(data.error || t('admin.removeLogo') + ' ' + t('errors.deleteError'))
                            }
                          } catch (err) {
                            alert(t('errors.deleteError'))
                          } finally {
                            setUploadingLogo(false)
                          }
                        }}
                        className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        disabled={uploadingLogo}
                      >
                        {t('admin.remove')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-600 pt-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('admin.updateSwarfarmData')}
                  </label>
                  <p className="text-sm text-gray-400 mb-4">
                    {t('admin.updateSwarfarmDataDescription')}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      if (!confirm(t('admin.confirmUpdateSwarfarmData'))) return
                      
                      setUpdatingSwarfarmData(true)
                      try {
                        const response = await fetch('/api/admin/update-swarfarm-data', {
                          method: 'POST',
                        })

                        const data = await response.json()

                        if (!response.ok) {
                          alert(data.error || t('admin.updateSwarfarmDataError'))
                          return
                        }

                        alert(
                          t('admin.updateSwarfarmDataSuccess', {
                            monsters: data.stats.monsters,
                            newMonsters: data.stats.newMonsters || 0,
                            updatedMonsters: data.stats.updatedMonsters || 0,
                            imagesDownloaded: data.stats.imagesDownloaded,
                            imagesAlreadyExists: data.stats.imagesAlreadyExists,
                            imagesErrors: data.stats.imagesErrors,
                          })
                        )
                      } catch (err) {
                        alert(t('admin.updateSwarfarmDataError'))
                      } finally {
                        setUpdatingSwarfarmData(false)
                      }
                    }}
                    disabled={updatingSwarfarmData}
                  >
                    {updatingSwarfarmData ? t('admin.updatingSwarfarmData') : t('admin.updateSwarfarmDataButton')}
                  </Button>
                </div>
              </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-600">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSaveSettings}
                    disabled={settingsLoading}
                  >
                    {settingsLoading ? t('common.saving') : t('common.save')}
                  </Button>
                </div>
              </div>
            )}

            {/* Onglet Webhooks */}
            {settingsTab === 'webhooks' && (
              <div className="bg-slate-700 p-6 rounded-lg border border-slate-600 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('admin.approvalWebhookLabel')}
                  </label>
                  <input
                    type="text"
                    value={approvalWebhookUrl || ''}
                    onChange={(e) => setApprovalWebhookUrl(e.target.value || null)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {t('admin.approvalWebhookDescription')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('admin.approvalWebhookRoleLabel')}
                  </label>
                  <input
                    type="text"
                    value={approvalWebhookRoleId || ''}
                    onChange={(e) => setApprovalWebhookRoleId(e.target.value || null)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456789012345678"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {t('admin.approvalWebhookRoleDescription')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('admin.newsWebhookLabel')}
                  </label>
                  <input
                    type="text"
                    value={newsWebhookUrl || ''}
                    onChange={(e) => setNewsWebhookUrl(e.target.value || null)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {t('admin.newsWebhookDescription')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('admin.newsWebhookRoleLabel')}
                  </label>
                  <input
                    type="text"
                    value={newsWebhookRoleId || ''}
                    onChange={(e) => setNewsWebhookRoleId(e.target.value || null)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456789012345678"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {t('admin.newsWebhookRoleDescription')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('admin.absenceWebhookLabel')}
                  </label>
                  <input
                    type="text"
                    value={discordWebhookUrl || ''}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value || null)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {t('admin.absenceWebhookDescription')}
                  </p>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-600">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSaveSettings}
                    disabled={settingsLoading}
                  >
                    {settingsLoading ? t('common.saving') : t('common.save')}
                  </Button>
                </div>
              </div>
            )}

            {/* Onglet Zone de Danger */}
            {settingsTab === 'danger' && (
              <div className="bg-slate-700 rounded-lg border border-red-600/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-red-600/50">
                  <div className="flex items-center gap-3">
                    <span className="text-red-400 text-xl">⚠️</span>
                    <span className="text-red-300 font-semibold">{t('admin.dangerZoneTitle')}</span>
                  </div>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDbModal('export')
                      setDbModalConfirmed(false)
                    }}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {t('admin.exportDbButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDbModal('import')
                      setDbModalConfirmed(false)
                      setDbImportFile(null)
                    }}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    {t('admin.importDbButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDbModal('clean')
                      setDbModalConfirmed(false)
                    }}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    {t('admin.cleanDbButton')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal pour modifier le mot de passe */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              {t('admin.changePassword')} {showPasswordModal.identifier}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('admin.newPassword')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('admin.passwordMinPlaceholder')}
                  minLength={6}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowPasswordModal(null)
                    setNewPassword('')
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleChangePassword}
                  disabled={loading[showPasswordModal.userId] || !newPassword || newPassword.length < 6}
                >
                  {t('admin.modify')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour gestion des droits */}
      {showPermissionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              Gestion des droits - {showPermissionsModal.user.name || showPermissionsModal.user.identifier}
            </h2>
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPermissionsModal.user.canEditAllDefenses || false}
                    onChange={(e) => {
                      setShowPermissionsModal({
                        ...showPermissionsModal,
                        user: { ...showPermissionsModal.user, canEditAllDefenses: e.target.checked }
                      })
                    }}
                    className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span>{t('admin.editDefenses')}</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPermissionsModal.user.canEditMap || false}
                    onChange={(e) => {
                      setShowPermissionsModal({
                        ...showPermissionsModal,
                        user: { ...showPermissionsModal.user, canEditMap: e.target.checked }
                      })
                    }}
                    className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span>{t('admin.editMap')}</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPermissionsModal.user.canEditAssignments || false}
                    onChange={(e) => {
                      setShowPermissionsModal({
                        ...showPermissionsModal,
                        user: { ...showPermissionsModal.user, canEditAssignments: e.target.checked }
                      })
                    }}
                    className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span>{t('admin.editAssignments')}</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPermissionsModal.user.canEditNews || false}
                    onChange={(e) => {
                      setShowPermissionsModal({
                        ...showPermissionsModal,
                        user: { ...showPermissionsModal.user, canEditNews: e.target.checked }
                      })
                    }}
                    className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span>{t('admin.editNews')}</span>
                </label>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-600">
                <Button
                  onClick={() => setShowPermissionsModal(null)}
                  className="bg-slate-700 hover:bg-slate-600"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={() => handleUpdateAllPermissions(showPermissionsModal.userId, {
                    canEditAllDefenses: showPermissionsModal.user.canEditAllDefenses || false,
                    canEditMap: showPermissionsModal.user.canEditMap || false,
                    canEditAssignments: showPermissionsModal.user.canEditAssignments || false,
                    canEditNews: showPermissionsModal.user.canEditNews || false,
                  })}
                  disabled={loading[showPermissionsModal.userId]}
                >
                  {loading[showPermissionsModal.userId] ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modales de confirmation pour actions DB */}
      {showDbModal === 'export' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">{t('admin.exportDbTitle')}</h2>
            <div className="space-y-4">
              <p className="text-gray-300">
                {t('admin.exportDbDescription')}
              </p>
              <p className="text-red-400 text-sm">
                {t('admin.exportDbWarning')}
              </p>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dbModalConfirmed}
                  onChange={(e) => setDbModalConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                <span>{t('admin.cleanDbConfirm')}</span>
              </label>
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-600">
                <Button
                  onClick={() => {
                    setShowDbModal(null)
                    setDbModalConfirmed(false)
                  }}
                  className="bg-slate-700 hover:bg-slate-600"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleExportDb}
                  disabled={!dbModalConfirmed}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {t('admin.exportButton')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDbModal === 'import' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">{t('admin.importDbTitle')}</h2>
            <div className="space-y-4">
              <p className="text-red-400 font-semibold">
                {t('admin.importDbWarning')}
              </p>
              <p className="text-gray-300 text-sm">
                {t('admin.importDbCurrentDataWarning')}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('admin.importDbFileLabel')}
                </label>
                <input
                  type="file"
                  accept=".db"
                  onChange={(e) => setDbImportFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dbModalConfirmed}
                  onChange={(e) => setDbModalConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                <span>{t('admin.cleanDbConfirm')}</span>
              </label>
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-600">
                <Button
                  onClick={() => {
                    setShowDbModal(null)
                    setDbModalConfirmed(false)
                    setDbImportFile(null)
                  }}
                  className="bg-slate-700 hover:bg-slate-600"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleImportDb}
                  disabled={!dbModalConfirmed || !dbImportFile || loading['import-db']}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading['import-db'] ? t('admin.importing') : t('admin.importButton')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDbModal === 'clean' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">{t('admin.cleanDbTitle')}</h2>
            <div className="space-y-4">
              <p className="text-red-400 font-semibold">
                {t('admin.cleanDbWarning')}
              </p>
              <p className="text-gray-300 text-sm">
                {t('admin.cleanDbDescription')}
              </p>
              <ul className="text-gray-300 text-sm list-disc list-inside space-y-1">
                <li>{t('admin.cleanDbOrphanMonsters')}</li>
                <li>{t('admin.cleanDbOrphanDefenses')}</li>
                <li>{t('admin.cleanDbOrphanCounters')}</li>
                <li>{t('admin.cleanDbOrphanVotes')}</li>
                <li>{t('admin.cleanDbOrphanEvents')}</li>
                <li>Affectations sans utilisateur ou défense</li>
                <li>Logs d&apos;activité sans utilisateur</li>
                <li>Posts News sans créateur/modificateur</li>
              </ul>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dbModalConfirmed}
                  onChange={(e) => setDbModalConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                <span>{t('admin.cleanDbConfirm')}</span>
              </label>
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-600">
                <Button
                  onClick={() => {
                    setShowDbModal(null)
                    setDbModalConfirmed(false)
                  }}
                  className="bg-slate-700 hover:bg-slate-600"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleCleanDb}
                  disabled={!dbModalConfirmed || loading['clean-db']}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading['clean-db'] ? t('admin.cleaning') : t('admin.cleanDb')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour renommer un utilisateur */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              {t('admin.rename')} {showRenameModal.identifier}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('admin.newName')}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('admin.usernamePlaceholder')}
                />
                <p className="text-gray-400 text-xs mt-1">
                  {t('admin.leaveEmptyToRemove')}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowRenameModal(null)
                    setNewName('')
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleRenameUser}
                  disabled={loading[showRenameModal.userId]}
                >
                  {t('admin.modify')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Modal pour créer/modifier un rappel */}
        {showReminderModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                {showReminderModal.reminder ? t('admin.editReminder') : t('admin.newReminderModal')}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('admin.reminderTitleRequired')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('admin.reminderTitlePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('admin.reminderMessageRequired')} <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('admin.reminderMessagePlaceholder')}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('admin.reminderDaysRequired')} <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: 1, label: t('admin.monday') },
                      { value: 2, label: t('admin.tuesday') },
                      { value: 3, label: t('admin.wednesday') },
                      { value: 4, label: t('admin.thursday') },
                      { value: 5, label: t('admin.friday') },
                      { value: 6, label: t('admin.saturday') },
                      { value: 0, label: t('admin.sunday') },
                    ].map((day) => (
                      <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reminderDaysOfWeek.includes(day.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setReminderDaysOfWeek([...reminderDaysOfWeek, day.value])
                            } else {
                              setReminderDaysOfWeek(reminderDaysOfWeek.filter(d => d !== day.value))
                            }
                          }}
                          className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {t('admin.reminderHourLabel')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={reminderHour}
                      onChange={(e) => setReminderHour(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {t('admin.reminderMinuteLabel')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={reminderMinute}
                      onChange={(e) => setReminderMinute(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('admin.reminderRoleIdLabel')}
                  </label>
                  <input
                    type="text"
                    value={reminderDiscordRoleId}
                    onChange={(e) => setReminderDiscordRoleId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456789012345678"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {t('admin.reminderRoleIdHelp')} <code className="bg-slate-900 px-1 rounded">123456789012345678</code>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('admin.reminderWebhookRequired')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    value={reminderWebhookUrl}
                    onChange={(e) => setReminderWebhookUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminderIsActive}
                      onChange={(e) => setReminderIsActive(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">{t('admin.reminderActiveCheckbox')}</span>
                  </label>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-slate-600">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowReminderModal(null)
                      setReminderTitle('')
                      setReminderMessage('')
                      setReminderDaysOfWeek([])
                      setReminderHour(0)
                      setReminderMinute(0)
                      setReminderDiscordRoleId('')
                      setReminderWebhookUrl('')
                      setReminderIsActive(true)
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      if (showReminderModal.reminder) {
                        handleUpdateReminder(showReminderModal.reminder.id)
                      } else {
                        handleCreateReminder()
                      }
                    }}
                    disabled={loading.reminder || !reminderTitle || !reminderMessage || reminderDaysOfWeek.length === 0 || !reminderWebhookUrl}
                  >
                    {showReminderModal.reminder ? t('admin.modify') : t('admin.create')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal pour créer/modifier un tag */}
        {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              {showTagModal.tag ? t('admin.editTag') : t('admin.newTag')}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('admin.tagNameLabel')}
                </label>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('admin.tagNamePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('admin.tagColorLabel')}
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    className="w-16 h-10 rounded border border-slate-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowTagModal(null)
                    setTagName('')
                    setTagColor('#3B82F6')
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (showTagModal.tag) {
                      handleUpdateTag(showTagModal.tag.id)
                    } else {
                      handleCreateTag()
                    }
                  }}
                >
                  {showTagModal.tag ? t('admin.modify') : t('admin.create')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

