import React, { useEffect } from 'react'

const Toast = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => onClose && onClose(), duration)
    return () => clearTimeout(t)
  }, [message, duration, onClose])

  if (!message) return null

  const bg = type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'

  return (
    <div className={`fixed right-4 bottom-6 w-full max-w-sm ${bg} border p-3 rounded shadow-lg z-50`}>
      <div className="flex justify-between items-start">
        <div className="text-sm">{message}</div>
        <button onClick={onClose} className="ml-3 text-sm font-semibold">Fechar</button>
      </div>
    </div>
  )
}

export default Toast
