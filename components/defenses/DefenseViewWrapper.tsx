'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Defense } from '@/types/defense'
import { DefenseForm } from './DefenseForm'
import { DefenseView } from './DefenseView'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { transformDefense } from '@/lib/transform-defense'

interface DefenseViewWrapperProps {
  defense: Defense
}

export function DefenseViewWrapper({ defense }: DefenseViewWrapperProps) {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const { permissions } = useUserPermissions()
  const [isEditing, setIsEditing] = useState(false)
  const [currentDefense, setCurrentDefense] = useState(defense)
  const [initialTab, setInitialTab] = useState<'apercu' | 'contres'>('apercu')
  const [editingCounterId, setEditingCounterId] = useState<string | null>(null)

  // Vérifier si l'utilisateur peut éditer (créateur, admin ou avec permission canEditAllDefenses)
  const userIdentifier = session?.user?.name || session?.user?.identifier || ''
  const isCreator = defense.createdBy === userIdentifier || defense.createdBy === session?.user?.identifier || defense.createdBy === session?.user?.name
  const isAdmin = permissions?.role === 'admin'
  const canEditAllDefenses = permissions?.canEditAllDefenses === true
  const canEdit = isCreator || isAdmin || canEditAllDefenses
  
  // Vérifier si on doit ouvrir directement l'onglet contres pour ajouter un contre
  const addCounter = searchParams?.get('addCounter') === 'true'
  const canAddCounter = defense.isPublic || canEdit

  useEffect(() => {
    if (addCounter && canAddCounter) {
      setInitialTab('contres')
      setIsEditing(true)
      // Remonter en haut de la page
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // Nettoyer l'URL
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [addCounter, canAddCounter])

  const handleSave = async (updatedDefense: Defense) => {
    // Recharger la défense complète avec les contres depuis le serveur
    try {
      const response = await fetch(`/api/defenses/${updatedDefense.id}`)
      if (response.ok) {
        const fullDefenseData = await response.json()
        // Transformer la défense pour s'assurer qu'elle a le bon format
        const fullDefense = transformDefense(fullDefenseData)
        setCurrentDefense(fullDefense)
      } else {
        // Si le rechargement échoue, utiliser la défense mise à jour
        setCurrentDefense(updatedDefense)
      }
    } catch (error) {
      // En cas d'erreur, utiliser la défense mise à jour
      setCurrentDefense(updatedDefense)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditingCounterId(null)
  }

  const handleEdit = (tab?: 'apercu' | 'contres', counterId?: string) => {
    if (tab) {
      setInitialTab(tab)
    }
    if (counterId) {
      setEditingCounterId(counterId)
    }
    
    // Si on édite un contre spécifique, vérifier si l'utilisateur est le créateur
    if (counterId && session?.user) {
      const counter = currentDefense.counters?.find(c => c.id === counterId)
      const userIdentifier = session.user.name || session.user.identifier || ''
      const isCounterCreator = counter?.createdBy === userIdentifier || 
                               counter?.createdBy === session.user.identifier || 
                               counter?.createdBy === session.user.name
      
      // Si l'utilisateur est le créateur du contre, permettre l'édition même sans autres permissions
      if (isCounterCreator) {
        setIsEditing(true)
        return
      }
    }
    
    // Permettre l'édition même si l'utilisateur n'est pas propriétaire, mais seulement pour ajouter des contres
    if (tab === 'contres' && canAddCounter) {
      setIsEditing(true)
      // Remonter en haut de la page uniquement si c'est une création (pas d'édition de contre)
      if (!counterId) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } else if (canEdit) {
      setIsEditing(true)
      // Remonter en haut de la page uniquement si c'est une création (pas d'édition de contre)
      if (!counterId) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  if (isEditing) {
    return (
      <DefenseForm 
        defense={currentDefense} 
        onCancel={handleCancel}
        onSave={handleSave}
        initialTab={initialTab}
        allowAddCounterOnly={!canEdit && initialTab === 'contres'}
        initialEditingCounterId={editingCounterId || undefined}
      />
    )
  }

  // Toujours passer handleEdit pour permettre l'édition des contres que l'utilisateur peut modifier
  // (même s'il ne peut pas éditer la défense elle-même)
  return <DefenseView defense={currentDefense} onEdit={handleEdit} canEditDefense={canEdit} />
}

