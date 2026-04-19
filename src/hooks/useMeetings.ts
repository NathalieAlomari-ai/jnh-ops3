import { useState, useCallback } from 'react'

export interface Meeting {
  id: string
  title: string
  date: string        // 'yyyy-MM-dd'
  time: string        // 'HH:mm'
  attendee_id: string
  attendee_name: string
  notes: string
  created_at: string
}

const STORAGE_KEY = 'jnh_meetings_v1'

function load(): Meeting[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function persist(meetings: Meeting[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings))
}

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>(load)

  const addMeeting = useCallback(
    (payload: Omit<Meeting, 'id' | 'created_at'>): Meeting => {
      const entry: Meeting = {
        ...payload,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      }
      setMeetings(prev => {
        const next = [...prev, entry].sort((a, b) =>
          `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
        )
        persist(next)
        return next
      })
      return entry
    },
    []
  )

  const deleteMeeting = useCallback((id: string) => {
    setMeetings(prev => {
      const next = prev.filter(m => m.id !== id)
      persist(next)
      return next
    })
  }, [])

  return { meetings, addMeeting, deleteMeeting }
}
