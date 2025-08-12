import { useState } from 'react'

export function useForm(submitFn) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')
    setError(null)
    const form = e.currentTarget
    const data = new FormData(form)
    try {
      await submitFn(data)
      setStatus('success')
      form.reset()
    } catch (err) {
      setStatus('error')
      setError(err?.message || 'Something went wrong')
    }
  }

  return { status, error, handleSubmit }
}
