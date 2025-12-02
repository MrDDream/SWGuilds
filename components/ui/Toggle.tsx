import { useState } from 'react'

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-blue-400">{label}</label>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-green-600' : 'bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="ml-2 text-sm text-gray-400">
        {checked ? 'Oui' : 'Non'}
      </span>
    </div>
  )
}

