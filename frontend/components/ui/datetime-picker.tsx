"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateTimePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

export function DateTimePicker({
  date,
  setDate,
  placeholder = "Pick a date and time",
  className
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [tempDate, setTempDate] = React.useState<Date | undefined>(date)
  const [selectedHour, setSelectedHour] = React.useState<string>("")
  const [selectedMinute, setSelectedMinute] = React.useState<string>("")
  const [currentMonth, setCurrentMonth] = React.useState(new Date())

  React.useEffect(() => {
    if (date) {
      const hours = date.getHours().toString().padStart(2, "0")
      const minutes = date.getMinutes().toString().padStart(2, "0")
      setSelectedHour(hours)
      setSelectedMinute(minutes)
      setTempDate(date)
      setCurrentMonth(date)
    }
  }, [date])

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    if (tempDate) {
      newDate.setHours(tempDate.getHours(), tempDate.getMinutes(), 0, 0)
    }
    setTempDate(newDate)
  }

  const handleHourChange = (hour: string) => {
    setSelectedHour(hour)
    updateTempDateTime(parseInt(hour), selectedMinute ? parseInt(selectedMinute) : 0)
  }

  const handleMinuteChange = (minute: string) => {
    setSelectedMinute(minute)
    updateTempDateTime(selectedHour ? parseInt(selectedHour) : 0, parseInt(minute))
  }

  const updateTempDateTime = (hours: number, minutes: number) => {
    if (tempDate) {
      const newDate = new Date(tempDate)
      newDate.setHours(hours, minutes, 0, 0)
      setTempDate(newDate)
    } else {
      // If no date is selected, create a new date with today's date
      const newDate = new Date()
      newDate.setHours(hours, minutes, 0, 0)
      setTempDate(newDate)
    }
  }

  const handleApply = () => {
    setDate(tempDate)
    setOpen(false)
  }

  const handleReset = () => {
    setTempDate(undefined)
    setSelectedHour("")
    setSelectedMinute("")
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const isSelectedDay = (day: number | null) => {
    if (!day || !tempDate) return false
    return tempDate.getDate() === day && 
           tempDate.getMonth() === currentMonth.getMonth() && 
           tempDate.getFullYear() === currentMonth.getFullYear()
  }

  const isToday = (day: number | null) => {
    if (!day) return false
    const today = new Date()
    return today.getDate() === day && 
           today.getMonth() === currentMonth.getMonth() && 
           today.getFullYear() === currentMonth.getFullYear()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "MMM dd, yyyy HH:mm") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4">
          {/* Header with navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar */}
          <div className="mb-4">
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth().map((day, index) => (
                <div key={index} className="aspect-square">
                  {day && (
                    <Button
                      variant={isSelectedDay(day) ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleDateSelect(day)}
                      className={cn(
                        "h-8 w-8 p-0 font-normal",
                        isToday(day) && !isSelectedDay(day) && "bg-accent text-accent-foreground"
                      )}
                    >
                      {day}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Time selection */}
          <div className="border-t pt-4 mb-4">
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              Time
            </Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Hour</Label>
                <Select value={selectedHour} onValueChange={handleHourChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="00" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, "0")
                      return (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Minute</Label>
                <Select value={selectedMinute} onValueChange={handleMinuteChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="00" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 60 }, (_, i) => {
                      const minute = i.toString().padStart(2, "0")
                      return (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="flex-1"
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!tempDate}
              className="flex-1"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}