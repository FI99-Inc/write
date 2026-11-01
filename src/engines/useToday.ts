import { useEffect, useState } from 'react'

export function useToday(): Date {
  const [today, setToday] = useState(() => new Date())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function update() {
      const now = new Date()
      setToday(now)
      const midnight = new Date(now)
      midnight.setDate(midnight.getDate() + 1)
      midnight.setHours(0, 0, 0, 0)
      timer = setTimeout(update, midnight.getTime() - now.getTime() + 10)
    }
    const now = new Date()
    const midnight = new Date(now)
    midnight.setDate(midnight.getDate() + 1)
    midnight.setHours(0, 0, 0, 0)
    timer = setTimeout(update, midnight.getTime() - now.getTime() + 10)
    return () => clearTimeout(timer)
  }, [])
  return today
}
