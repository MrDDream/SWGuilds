'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n-provider'

interface CalendarEvent {
  id: string
  userId: string
  eventType: 'absence' | 'autre'
  startDate: string
  endDate: string
  description?: string | null
  user: {
    id: string
    name: string | null
    identifier: string
  }
}

interface User {
  id: string
  identifier: string
  name: string | null
}

export default function CalendarPage() {
  const { data: session } = useSession()
  const { t, locale } = useI18n()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [eventType, setEventType] = useState<'absence' | 'autre'>('absence')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    if (session?.user) {
      setIsAdmin(session.user.role === 'admin')
      if (session.user.role === 'admin') {
        fetchUsers()
      }
      setSelectedUserId(session.user.id)
    }
  }, [session])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
    }
  }

  const fetchEvents = useCallback(async () => {
    try {
      const monthStr = String(month + 1).padStart(2, '0')
      const response = await fetch(`/api/calendar?month=${monthStr}&year=${year}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleAddEvent = async () => {
    if (!startDate || !endDate) {
      alert(t('calendar.selectDates'))
      return
    }

    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          description: description || null,
          startDate,
          endDate,
          userId: isAdmin && selectedUserId && selectedUserId !== session?.user?.id ? selectedUserId : undefined,
        })
      })

      if (response.ok) {
        await fetchEvents()
        setShowAddModal(false)
        setStartDate('')
        setEndDate('')
        setEventType('absence')
        setDescription('')
        if (session?.user?.id) {
          setSelectedUserId(session.user.id)
        }
        alert(t('calendar.eventAdded'))
      } else {
        const data = await response.json()
        alert(data.error || t('calendar.eventAdded'))
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'événement:', error)
      alert('Erreur lors de l\'ajout de l\'événement')
    }
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event)
    setEventType(event.eventType)
    setDescription(event.description || '')
    setStartDate(event.startDate.split('T')[0])
    setEndDate(event.endDate.split('T')[0])
    setShowEditModal(true)
  }

  const handleUpdateEvent = async () => {
    if (!editingEvent || !startDate || !endDate) {
      alert(t('calendar.fillRequired'))
      return
    }

    try {
      const response = await fetch(`/api/calendar/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          description: description || null,
          startDate,
          endDate,
        })
      })

      if (response.ok) {
        await fetchEvents()
        setShowEditModal(false)
        setEditingEvent(null)
        setStartDate('')
        setEndDate('')
        setEventType('absence')
        setDescription('')
        alert(t('calendar.eventModified'))
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la modification')
      }
    } catch (error) {
      console.error('Erreur lors de la modification:', error)
      alert('Erreur lors de la modification')
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm(t('calendar.deleteConfirm'))) return

    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchEvents()
        alert(t('calendar.eventDeleted'))
      } else {
        const data = await response.json()
        alert(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    // getDay() retourne 0 pour dimanche, 1 pour lundi, etc.
    // Pour commencer par lundi, on convertit : dimanche (0) -> 6, lundi (1) -> 0, etc.
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const getEventsForDate = (day: number) => {
    const date = new Date(year, month, day)
    return events.filter(event => {
      const start = new Date(event.startDate)
      const end = new Date(event.endDate)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      date.setHours(0, 0, 0, 0)
      return date >= start && date <= end
    })
  }

  // Calculer la position et la largeur de chaque événement pour l'affichage continu
  const getEventPosition = (event: CalendarEvent) => {
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)
    monthStart.setHours(0, 0, 0, 0)
    monthEnd.setHours(23, 59, 59, 999)

    // Si l'événement ne chevauche pas ce mois, retourner null
    if (end < monthStart || start > monthEnd) {
      return null
    }

    // Calculer le jour de début dans le mois (1-indexed)
    const eventStartDay = start >= monthStart ? start.getDate() : 1
    const eventEndDay = end <= monthEnd ? end.getDate() : daysInMonth

    // Calculer la position dans la grille (0-indexed, en tenant compte du premier jour du mois)
    const startPosition = firstDay + eventStartDay - 1
    const endPosition = firstDay + eventEndDay

    // Calculer la largeur en nombre de colonnes
    const width = endPosition - startPosition

    return {
      startPosition,
      width,
      startDay: eventStartDay,
      endDay: eventEndDay,
    }
  }

  // Grouper les événements par leur position de départ pour éviter les chevauchements
  const getEventsByPosition = () => {
    const eventsWithPosition = events
      .map(event => ({
        event,
        position: getEventPosition(event),
      }))
      .filter(item => item.position !== null) as Array<{ event: CalendarEvent; position: { startPosition: number; width: number; startDay: number; endDay: number } }>

    // Trier par position de départ
    eventsWithPosition.sort((a, b) => a.position.startPosition - b.position.startPosition)

    // Grouper par ligne pour éviter les chevauchements
    const rows: Array<Array<{ event: CalendarEvent; position: { startPosition: number; width: number; startDay: number; endDay: number } }>> = []

    eventsWithPosition.forEach(item => {
      // Trouver une ligne où l'événement peut être placé sans chevauchement
      let placed = false
      for (const row of rows) {
        const lastInRow = row[row.length - 1]
        if (lastInRow.position.startPosition + lastInRow.position.width <= item.position.startPosition) {
          row.push(item)
          placed = true
          break
        }
      }
      if (!placed) {
        rows.push([item])
      }
    })

    return rows
  }

  const formatDate = (dateStr: string) => {
    const localeString = locale === 'en' ? 'en-US' : 'fr-FR'
    return new Date(dateStr).toLocaleDateString(localeString, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const monthNames = t('calendar.monthNames', { returnObjects: true }) as string[]
  const dayNames = t('calendar.dayNames', { returnObjects: true }) as string[]

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = new Date()
  const isToday = (day: number) => {
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
  }

  const days = []
  // Ajouter des cellules vides pour les jours avant le premier jour du mois
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  // Ajouter tous les jours du mois
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">{t('calendar.title')}</h1>
        <Button onClick={() => setShowAddModal(true)}>
          {t('calendar.addEvent')}
        </Button>
      </div>

      {/* Navigation du mois */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={goToPreviousMonth}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          ← {t('calendar.previousMonth')}
        </button>
        <h2 className="text-2xl font-bold text-white">
          {monthNames[month]} {year}
        </h2>
        <button
          onClick={goToNextMonth}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          {t('calendar.nextMonth')} →
        </button>
      </div>

      {/* Calendrier */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-slate-700">
          {/* En-têtes des jours */}
          {dayNames.map(day => (
            <div key={day} className="bg-slate-800 p-2 text-center text-sm font-medium text-gray-300">
              {day}
            </div>
          ))}

          {/* Jours du mois */}
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="bg-slate-800 min-h-[80px] md:min-h-[100px]" />
            }

            const todayClass = isToday(day) ? 'ring-2 ring-blue-500' : ''
            const eventRows = getEventsByPosition()
            
            // Trouver les événements qui commencent sur ce jour
            const eventsStartingToday = events.filter(event => {
              const eventPos = getEventPosition(event)
              return eventPos && day === eventPos.startDay
            })

            return (
              <div
                key={day}
                className={`bg-slate-800 min-h-[80px] md:min-h-[100px] p-1 md:p-2 border-b border-r border-slate-700 ${todayClass} relative overflow-visible`}
              >
                <div className="text-xs md:text-sm font-medium text-white mb-0.5 md:mb-1">{day}</div>
                <div className="space-y-0.5 md:space-y-1 relative" style={{ minHeight: `${Math.max(1, eventRows.length) * 24}px` }}>
                  {eventsStartingToday.map(event => {
                    const eventPos = getEventPosition(event)
                    if (!eventPos) return null
                    
                    // Trouver dans quelle ligne cet événement est placé
                    let rowIndex = 0
                    for (let i = 0; i < eventRows.length; i++) {
                      if (eventRows[i].some(item => item.event.id === event.id)) {
                        rowIndex = i
                        break
                      }
                    }
                    
                    const isMultiDay = eventPos.width > 1
                    const widthInCols = eventPos.width
                    const cellWidth = 100 / 7 // Largeur d'une cellule en pourcentage
                    const gapWidth = 1 // Largeur du gap en pixels (gap-px = 1px)
                    
                    return (
                      <div
                        key={event.id}
                        className="absolute"
                        style={{
                          left: '0',
                          width: isMultiDay 
                            ? `calc(${widthInCols} * ${cellWidth}% + ${(widthInCols - 1) * gapWidth}px)` 
                            : '100%',
                          top: `${rowIndex * 24}px`,
                          height: '20px',
                          zIndex: 10,
                        }}
                        onMouseEnter={() => setHoveredEvent(event.id)}
                        onMouseLeave={() => setHoveredEvent(null)}
                        onClick={() => {
                          if (event.description) {
                            setHoveredEvent(hoveredEvent === event.id ? null : event.id)
                          }
                        }}
                      >
                        <div
                          className={`h-full text-[10px] md:text-xs p-0.5 md:p-1 flex items-center justify-between gap-0.5 md:gap-1 ${
                            event.eventType === 'absence'
                              ? 'bg-red-900/50 text-red-200 border border-red-700'
                              : 'bg-blue-900/50 text-blue-200 border border-blue-700'
                          }`}
                          style={{
                            borderRadius: isMultiDay ? '4px 0 0 4px' : '4px',
                          }}
                          title={`${event.eventType === 'absence' ? t('calendar.eventTypeAbsence') : t('calendar.eventTypeOther')}: ${event.user.name || event.user.identifier} - ${formatDate(event.startDate)} ${t('calendar.to')} ${formatDate(event.endDate)}${event.description ? t('calendar.clickToSeeNote') : ''}`}
                        >
                          <span className="truncate flex-1 text-[10px] md:text-xs">
                            {event.eventType === 'absence' ? '🔴' : '🔵'} <span className="hidden sm:inline">{event.user.name || event.user.identifier}</span><span className="sm:hidden">{event.user.name?.split(' ')[0] || event.user.identifier}</span>
                          </span>
                          <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
                            {(session?.user?.id === event.userId || session?.user?.role === 'admin') && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditEvent(event)
                                  }}
                                  className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                                  title={t('calendar.modifyEvent')}
                                >
                                  <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteEvent(event.id)
                                  }}
                                  className="text-red-400 hover:text-red-300 flex-shrink-0"
                                  title={t('calendar.deleteEvent')}
                                >
                                  <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {hoveredEvent === event.id && event.description && (
                          <div className="absolute z-50 top-full left-0 mt-1 w-[calc(100vw-2rem)] max-w-64 p-2 bg-slate-800 border border-slate-600 rounded-lg shadow-lg text-[10px] md:text-xs text-white">
                            <div className="font-semibold mb-1">{t('calendar.note')}:</div>
                            <div className="whitespace-pre-wrap">{event.description}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal d'édition d'événement */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
          setShowEditModal(false)
          setEditingEvent(null)
          setStartDate('')
          setEndDate('')
          setEventType('absence')
          setDescription('')
        }}>
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-600" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4">{t('calendar.editEvent')}</h2>
            
            <div className="space-y-4">
              {/* Type d'événement */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('calendar.eventType')}
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as 'absence' | 'autre')}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="absence">{t('calendar.eventTypeAbsence')}</option>
                  <option value="autre">{t('calendar.eventTypeOther')}</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('calendar.noteOptional')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('calendar.addNote')}
                />
              </div>

              {/* Date de début */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('calendar.startDate')}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date de fin */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingEvent(null)
                  setStartDate('')
                  setEndDate('')
                  setEventType('absence')
                  setDescription('')
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleUpdateEvent}
              >
                {t('calendar.modifyEvent')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'ajout d'événement */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-600" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4">{t('calendar.newEvent')}</h2>
            
            <div className="space-y-4">
              {/* Sélecteur d'utilisateur (admin seulement) */}
              {isAdmin && users.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('calendar.createFor')}
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.identifier}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Type d'événement */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('calendar.eventType')}
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as 'absence' | 'autre')}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="absence">{t('calendar.eventTypeAbsence')}</option>
                  <option value="autre">{t('calendar.eventTypeOther')}</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('calendar.noteOptional')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('calendar.addNote')}
                />
              </div>

              {/* Date de début */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('calendar.startDate')}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date de fin */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('calendar.endDate')}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowAddModal(false)
                  setStartDate('')
                  setEndDate('')
                  setEventType('absence')
                  setDescription('')
                  if (session?.user?.id) {
                    setSelectedUserId(session.user.id)
                  }
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleAddEvent}
              >
                {t('calendar.addEvent')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

