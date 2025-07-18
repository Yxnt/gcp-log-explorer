"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  className?: string
}

export function TimePicker({ date, setDate, className }: TimePickerProps) {
  const [time, setTime] = React.useState<string>("")

  React.useEffect(() => {
    if (date) {
      const hours = date.getHours().toString().padStart(2, "0")
      const minutes = date.getMinutes().toString().padStart(2, "0")
      setTime(`${hours}:${minutes}`)
    }
  }, [date])

  const handleTimeChange = (newTime: string) => {
    setTime(newTime)
    if (date && newTime) {
      const [hours, minutes] = newTime.split(":").map(Number)
      const newDate = new Date(date)
      newDate.setHours(hours, minutes, 0, 0)
      setDate(newDate)
    }
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Label htmlFor="time" className="text-sm font-medium">
        Time:
      </Label>
      <Input
        id="time"
        type="time"
        value={time}
        onChange={(e) => handleTimeChange(e.target.value)}
        className="w-32"
      />
    </div>
  )
}