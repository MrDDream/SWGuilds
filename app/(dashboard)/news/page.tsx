'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n-provider'

interface NewsPost {
  id: string
  title: string | null
  content: string
  isPinned: boolean
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  createdByUser: {
    name: string
  }
  updatedByUser: {
    name: string
  }
}

export default function NewsPage() {
  const { data: session } = useSession()
  const { t, locale } = useI18n()
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [canEdit, setCanEdit] = useState(false)
  const [showEditModal, setShowEditModal] = useState<{ post?: NewsPost } | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editIsPinned, setEditIsPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAddButton, setShowAddButton] = useState(false)
  const [sendingDiscord, setSendingDiscord] = useState(false)
  const [newsWebhookUrl, setNewsWebhookUrl] = useState<string | null>(null)
  const [showEditButtons, setShowEditButtons] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (session?.user) {
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          const user = data
          setCanEdit(session.user?.role === 'admin' || user.canEditNews === true || user.canEditNews === 1)
        })
        .catch(() => {
          setCanEdit(session.user?.role === 'admin')
        })
    }
  }, [session])

  const fetchPosts = useCallback(async () => {
    try {
      const response = await fetch('/api/news')
      if (response.ok) {
        const data = await response.json()
        setPosts(data)
      } else {
        setError(t('news.loadError'))
      }
    } catch (err) {
      console.error('Erreur lors du chargement des posts:', err)
      setError(t('news.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchPosts()
    // Charger les settings pour vérifier si le webhook News est configuré
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        setNewsWebhookUrl(data.newsWebhookUrl || null)
      })
      .catch(() => {})
  }, [fetchPosts])

  const handleCreate = () => {
    setEditTitle('')
    setEditContent('')
    setEditIsPinned(false)
    setShowEditModal({})
  }

  const handleEdit = (post: NewsPost) => {
    setEditTitle(post.title || '')
    setEditContent(post.content)
    setEditIsPinned(post.isPinned)
    setShowEditModal({ post })
    // Masquer les boutons d'édition pour ce post
    setShowEditButtons({ ...showEditButtons, [post.id]: false })
  }

  const handleSave = async () => {
    if (!editContent.trim()) {
      alert(t('news.contentEmpty'))
      return
    }

    setSaving(true)
    try {
      const url = showEditModal?.post
        ? `/api/news/${showEditModal.post.id}`
        : '/api/news'
      
      const method = showEditModal?.post ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim() || null,
          content: editContent,
          isPinned: editIsPinned,
        }),
      })

      if (response.ok) {
        const postId = showEditModal?.post?.id
        setShowEditModal(null)
        // Masquer les boutons d'édition pour ce post si on était en train de le modifier
        if (postId) {
          setShowEditButtons({ ...showEditButtons, [postId]: false })
        }
        fetchPosts()
      } else {
        const data = await response.json()
        alert(data.error || t('news.saveError'))
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err)
      alert(t('news.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm(t('news.deleteConfirm'))) {
      return
    }

    try {
      const response = await fetch(`/api/news/${postId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchPosts()
      } else {
        const data = await response.json()
        alert(data.error || t('news.deleteError'))
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err)
      alert(t('news.deleteError'))
    }
  }

  const handleTogglePin = async (post: NewsPost) => {
    try {
      const response = await fetch(`/api/news/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: post.content,
          isPinned: !post.isPinned,
        }),
      })

      if (response.ok) {
        fetchPosts()
      } else {
        const data = await response.json()
        alert(data.error || t('news.modifyError'))
      }
    } catch (err) {
      console.error('Erreur lors de la modification:', err)
      alert(t('news.modifyError'))
    }
  }

  const handleSendDiscord = async (postId: string) => {
    if (!newsWebhookUrl) {
      alert(t('news.webhookNotConfigured'))
      return
    }

    // Si on est en mode édition, sauvegarder d'abord
    if (showEditModal?.post?.id === postId) {
      if (!editContent.trim()) {
        alert(t('news.contentEmpty'))
        return
      }

      setSaving(true)
      try {
        const response = await fetch(`/api/news/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editTitle.trim() || null,
            content: editContent,
            isPinned: editIsPinned,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          alert(data.error || t('news.saveError'))
          return
        }
      } catch (err) {
        console.error('Erreur lors de la sauvegarde:', err)
        alert(t('news.saveError'))
        return
      } finally {
        setSaving(false)
      }
    }

    setSendingDiscord(true)
    try {
      const response = await fetch(`/api/news/${postId}/send-discord`, {
        method: 'POST',
      })

      if (response.ok) {
        alert(t('news.sendDiscordSuccess'))
        // Rafraîchir les posts si on était en mode édition
        if (showEditModal?.post?.id === postId) {
          fetchPosts()
        }
      } else {
        const data = await response.json()
        alert(data.error || t('news.sendError'))
      }
    } catch (err) {
      console.error('Erreur lors de l\'envoi sur Discord:', err)
      alert(t('news.sendError'))
    } finally {
      setSendingDiscord(false)
    }
  }

  const formatDate = (dateString: string) => {
    const localeString = locale === 'en' ? 'en-US' : 'fr-FR'
    return new Date(dateString).toLocaleDateString(localeString, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8">
          <div className="text-gray-900 dark:text-white text-center">{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">News</h1>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddButton(!showAddButton)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              title={t('news.toggleAddButton')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            {showAddButton && (
              <Button onClick={handleCreate}>
                {t('news.addBlockButton')}
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8">
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            {t('news.noPosts')}
            {canEdit && showAddButton && (
              <div className="mt-4">
                <Button onClick={handleCreate}>
                  {t('news.createFirst')}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white dark:bg-slate-800 rounded-lg p-6 relative border border-gray-200 dark:border-slate-700 w-full"
            >
              {post.title && (
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {post.title}
                </h2>
              )}
              {canEdit && showAddButton && (
                <div className="absolute top-4 right-4 flex gap-2">
                  {!showEditButtons[post.id] && (
                    <button
                      onClick={() => setShowEditButtons({ ...showEditButtons, [post.id]: true })}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                      title={t('news.showOptions')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                  {showEditButtons[post.id] && (
                    <>
                      <button
                        onClick={() => handleTogglePin(post)}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                        title={post.isPinned ? t('news.unpin') : t('news.pin')}
                      >
                        {post.isPinned ? '📌' : '📍'}
                      </button>
                      <button
                        onClick={() => handleEdit(post)}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title={t('news.modify')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title={t('news.delete')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowEditButtons({ ...showEditButtons, [post.id]: false })}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                        title={t('news.hideOptions')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="prose prose-invert prose-slate max-w-none mb-4">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="text-gray-800 dark:text-gray-200"
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 mt-6" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 mt-5" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 mt-4" {...props} />,
                    p: ({ node, ...props }) => <p className="text-gray-700 dark:text-gray-300 mb-4" {...props} />,
                    a: ({ node, ...props }) => <a className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2" {...props} />,
                    li: ({ node, ...props }) => <li className="text-gray-700 dark:text-gray-300" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 italic text-gray-600 dark:text-gray-400 my-4" {...props} />,
                    code: ({ node, inline, ...props }: any) => 
                      inline ? (
                        <code className="bg-gray-200 dark:bg-slate-700 px-1 py-0.5 rounded text-sm text-blue-700 dark:text-blue-300" {...props} />
                      ) : (
                        <code className="block bg-gray-200 dark:bg-slate-700 p-4 rounded text-sm text-blue-700 dark:text-blue-300 overflow-x-auto my-4" {...props} />
                      ),
                    img: ({ node, ...props }: any) => <img className="max-w-full h-auto rounded my-4" alt={props.alt || ''} {...props} />,
                  }}
                >
                  {post.content}
                </ReactMarkdown>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 text-sm text-gray-500 dark:text-gray-400">
                <div>
                  {t('news.createdBy')} <span className="text-gray-700 dark:text-gray-300">{post.createdByUser.name}</span> {t('news.on')} {formatDate(post.createdAt)}
                </div>
                {post.updatedAt !== post.createdAt && (
                  <div className="mt-1">
                    {t('news.lastModified')} {formatDate(post.updatedAt)} {t('news.by')} <span className="text-gray-700 dark:text-gray-300">{post.updatedByUser.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {showEditModal.post ? t('news.editPost') : t('news.newPost')}
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('news.title')}
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('news.titlePlaceholder')}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('news.contentMarkdown')}
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={15}
                placeholder={t('news.contentPlaceholder')}
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={editIsPinned}
                  onChange={(e) => setEditIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                {t('news.pinTop')}
              </label>
            </div>

              <div className="flex gap-3 justify-between">
              {showEditModal.post && newsWebhookUrl && (
                <Button
                  onClick={() => handleSendDiscord(showEditModal.post!.id)}
                  disabled={sendingDiscord}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {sendingDiscord ? t('news.sendDiscordSending') : t('news.sendDiscord')}
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button
                  onClick={() => {
                    const postId = showEditModal?.post?.id
                    setShowEditModal(null)
                    // Masquer les boutons d'édition pour ce post si on était en train de le modifier
                    if (postId) {
                      setShowEditButtons({ ...showEditButtons, [postId]: false })
                    }
                  }}
                  className="bg-gray-600 dark:bg-slate-700 hover:bg-gray-700 dark:hover:bg-slate-600"
                >
                  {t('news.cancel')}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !editContent.trim()}
                >
                  {saving ? t('news.saving') : t('news.save')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

