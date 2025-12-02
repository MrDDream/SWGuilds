'use client'

import { useState, useEffect } from 'react'
import { Button } from './Button'

interface ListInputProps {
  label?: string
  value: string // Chaîne séparée par des retours à la ligne ou des virgules
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function ListInput({
  label,
  value,
  onChange,
  placeholder = 'Ajouter un élément...',
  className = '',
}: ListInputProps) {
  // Convertir la valeur en tableau (supporte les retours à la ligne et les virgules)
  const parseValue = (val: string): string[] => {
    if (!val) return []
    // Séparer par retours à la ligne ou virgules
    return val
      .split(/\n|,/)
      .map(item => item.trim())
      .filter(item => item.length > 0)
  }

  const [items, setItems] = useState<string[]>(parseValue(value))
  const [newItem, setNewItem] = useState('')

  // Mettre à jour les items quand la valeur externe change
  useEffect(() => {
    setItems(parseValue(value))
  }, [value])

  // Convertir le tableau en chaîne (séparée par des retours à la ligne)
  const itemsToString = (itemsArray: string[]): string => {
    return itemsArray.join('\n')
  }

  const handleAddItem = () => {
    if (newItem.trim()) {
      const updatedItems = [...items, newItem.trim()]
      setItems(updatedItems)
      onChange(itemsToString(updatedItems))
      setNewItem('')
    }
  }

  const handleRemoveItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index)
    setItems(updatedItems)
    onChange(itemsToString(updatedItems))
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddItem()
    }
  }

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-blue-400 mb-2">
          {label}
        </label>
      )}
      
      {/* Input pour ajouter un nouvel élément */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Button
          type="button"
          onClick={handleAddItem}
          disabled={!newItem.trim()}
          className="px-4"
        >
          Ajouter
        </Button>
      </div>

      {/* Liste des éléments */}
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-slate-800 px-4 py-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <span className="text-blue-400 font-medium">•</span>
              <span className="text-white flex-1">{item}</span>
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="ml-2 text-red-400 hover:text-red-300 transition-colors text-xl leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-red-900/20"
                aria-label="Supprimer"
                title="Supprimer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-400 text-sm py-4 text-center border border-dashed border-gray-700 rounded-lg">
          Aucun élément ajouté. Utilisez le champ ci-dessus pour ajouter des éléments à la liste.
        </div>
      )}
    </div>
  )
}

