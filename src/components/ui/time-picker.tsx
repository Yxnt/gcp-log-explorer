"use client"

import React, { useState, useEffect } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Clock, Search, X, Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeRange {
  from: Date
  to: Date
  label: string
}

interface TimePickerProps {
  value?: TimeRange
  onChange?: (range: TimeRange) => void
  className?: string
}

const QUICK_RANGES = [
  { label: 'Last 5 minutes', minutes: 5 },
  { label: 'Last 15 minutes', minutes: 15 },
  { label: 'Last 30 minutes', minutes: 30 },
  { label: 'Last 1 hour', minutes: 60 },
  { label: 'Last 3 hours', minutes: 180 },
  { label: 'Last 6 hours', minutes: 360 },
  { label: 'Last 12 hours', minutes: 720 },
  { label: 'Last 24 hours', minutes: 1440 },
  { label: 'Last 2 days', minutes: 2880 },
  { label: 'Last 7 days', minutes: 10080 },
  { label: 'Last 30 days', minutes: 43200 },
]

// Enhanced Calendar component with date and time selection
const DateTimeCalendar = ({ selectedDate, onDateTimeSelect, onClose }: { 
  selectedDate: Date, 
  onDateTimeSelect: (date: Date) => void,
  onClose: () => void 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  const [selectedHour, setSelectedHour] = useState(selectedDate.getHours())
  const [selectedMinute, setSelectedMinute] = useState(selectedDate.getMinutes())

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDay = getFirstDayOfMonth(currentMonth)
  const days = []

  // Previous month's trailing days
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }

  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  const [tempSelectedDate, setTempSelectedDate] = useState(selectedDate)

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, selectedHour, selectedMinute)
    setTempSelectedDate(newDate)
  }

  const handleTimeApply = () => {
    const finalDate = new Date(tempSelectedDate.getFullYear(), tempSelectedDate.getMonth(), tempSelectedDate.getDate(), selectedHour, selectedMinute)
    onDateTimeSelect(finalDate)
  }

  const handleHourChange = (hour: number) => {
    setSelectedHour(hour)
    const newDate = new Date(tempSelectedDate.getFullYear(), tempSelectedDate.getMonth(), tempSelectedDate.getDate(), hour, selectedMinute)
    setTempSelectedDate(newDate)
  }

  const handleMinuteChange = (minute: number) => {
    setSelectedMinute(minute)
    const newDate = new Date(tempSelectedDate.getFullYear(), tempSelectedDate.getMonth(), tempSelectedDate.getDate(), selectedHour, minute)
    setTempSelectedDate(newDate)
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

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  return (
    <div className="p-3 time-picker" data-date-picker>
      {/* Header with close button */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">Select Date & Time</h4>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-1 hover:bg-gray-100 rounded"
        >
          ←
        </button>
        <h3 className="font-medium">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          onClick={() => navigateMonth('next')}
          className="p-1 hover:bg-gray-100 rounded"
        >
          →
        </button>
      </div>

      {/* Week days */}
      <div className="calendar-week-grid">
        {weekDays.map(day => (
          <div 
            key={day} 
            className="text-xs text-gray-500 text-center font-medium"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="calendar-days-grid">
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => day && handleDateClick(day)}
            disabled={!day}
            className={cn(
              "text-sm rounded hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300",
              !day && "invisible",
              day === tempSelectedDate.getDate() &&
              currentMonth.getMonth() === tempSelectedDate.getMonth() &&
              currentMonth.getFullYear() === tempSelectedDate.getFullYear() &&
              "bg-blue-500 text-white hover:bg-blue-600"
            )}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Time selection */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-900 mb-3">Select Time</h4>
        <div className="flex items-center space-x-2 mb-3">
          <div className="flex-1">
            <label className="text-sm text-gray-600 block mb-1">Hour</label>
            <select
              value={selectedHour}
              onChange={(e) => handleHourChange(parseInt(e.target.value))}
              className="w-full p-2 border rounded text-sm"
            >
              {hours.map(hour => (
                <option key={hour} value={hour}>
                  {hour.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-sm text-gray-600 block mb-1">Minute</label>
            <select
              value={selectedMinute}
              onChange={(e) => handleMinuteChange(parseInt(e.target.value))}
              className="w-full p-2 border rounded text-sm"
            >
              {minutes.map(minute => (
                <option key={minute} value={minute}>
                  {minute.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleTimeApply}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
        >
          Apply Date & Time
        </button>
      </div>
    </div>
  )
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [fromInput, setFromInput] = useState('now-1h')
  const [toInput, setToInput] = useState('now')
  const [recentRanges, setRecentRanges] = useState<TimeRange[]>([])
  const [showFromDatePicker, setShowFromDatePicker] = useState(false)
  const [showToDatePicker, setShowToDatePicker] = useState(false)
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 60 * 60 * 1000))
  const [toDate, setToDate] = useState(new Date())

  const currentRange = value || {
    from: new Date(Date.now() - 60 * 60 * 1000),
    to: new Date(),
    label: 'Last 1 hour'
  }

  // Update inputs when value changes
  useEffect(() => {
    if (value) {
      setFromInput(value.from.toISOString().slice(0, 16))
      setToInput(value.to.toISOString().slice(0, 16))
    }
  }, [value])

  useEffect(() => {
    const saved = localStorage.getItem('timePickerRecentRanges')
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((item: {from: string, to: string, label: string}) => ({
          ...item,
          from: new Date(item.from),
          to: new Date(item.to)
        }))
        setRecentRanges(parsed)
      } catch (e) {
        console.error('Failed to parse recent ranges:', e)
      }
    }
  }, [])

  const saveRecentRange = (range: TimeRange) => {
    const newRecent = [range, ...recentRanges.filter(r => r.label !== range.label)].slice(0, 5)
    setRecentRanges(newRecent)
    localStorage.setItem('timePickerRecentRanges', JSON.stringify(newRecent))
  }

  const parseRelativeTime = (timeStr: string): Date => {
    const now = new Date()
    if (timeStr === 'now') return now

    if (timeStr.startsWith('now-')) {
      const timeExpr = timeStr.substring(4)
      const match = timeExpr.match(/^(\d+)([smhdw])$/)

      if (match) {
        const value = parseInt(match[1])
        const unit = match[2]

        switch (unit) {
          case 's': return new Date(now.getTime() - value * 1000)
          case 'm': return new Date(now.getTime() - value * 60 * 1000)
          case 'h': return new Date(now.getTime() - value * 60 * 60 * 1000)
          case 'd': return new Date(now.getTime() - value * 24 * 60 * 60 * 1000)
          case 'w': return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000)
        }
      }
    }

    return new Date(timeStr)
  }

  const handleQuickRange = (minutes: number, label: string) => {
    const to = new Date()
    const from = new Date(Date.now() - minutes * 60 * 1000)
    const range = { from, to, label }
    onChange?.(range)
    saveRecentRange(range)
    setIsOpen(false)
  }


  const formatDateTimeForDisplay = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const handleFromDateTimeSelect = (date: Date) => {
    setFromDate(date)
    setFromInput(formatDateTimeForDisplay(date))
    setShowFromDatePicker(false)
  }

  const handleToDateTimeSelect = (date: Date) => {
    setToDate(date)
    setToInput(formatDateTimeForDisplay(date))
    setShowToDatePicker(false)
  }

  const handleCalendarIconClick = (type: 'from' | 'to') => {
    console.log('Calendar icon clicked:', type)
    if (type === 'from') {
      console.log('Setting showFromDatePicker to true')
      setShowFromDatePicker(true)
      setShowToDatePicker(false)
    } else {
      console.log('Setting showToDatePicker to true')
      setShowToDatePicker(true)
      setShowFromDatePicker(false)
    }
  }

  const handleAbsoluteRange = () => {
    try {
      let from: Date
      let to: Date

      // Try to parse as formatted date first, then as relative time
      try {
        from = new Date(fromInput)
        if (isNaN(from.getTime())) {
          from = parseRelativeTime(fromInput)
        }
      } catch {
        from = parseRelativeTime(fromInput)
      }

      try {
        to = new Date(toInput)
        if (isNaN(to.getTime())) {
          to = parseRelativeTime(toInput)
        }
      } catch {
        to = parseRelativeTime(toInput)
      }

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        alert('请输入有效的时间格式')
        return
      }

      if (from >= to) {
        alert('开始时间必须早于结束时间')
        return
      }

      const range = {
        from,
        to,
        label: `${formatDateTimeForDisplay(from)} to ${formatDateTimeForDisplay(to)}`
      }
      onChange?.(range)
      saveRecentRange(range)
      setIsOpen(false)
    } catch {
      alert('时间格式错误')
    }
  }

  const filteredRanges = QUICK_RANGES.filter(range =>
    range.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-between min-w-[200px] bg-white", className)}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="truncate">{currentRange.label}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[900px] p-0" align="end">
        <div className="flex h-[600px]">
          {/* Left Panel - Calendar and Absolute Time */}
          <div className="flex-1 border-r bg-white flex flex-col">
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h3 className="font-medium text-gray-900">Select a time range</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
              
              {/* Date Time Pickers */}
              {showFromDatePicker && (
                <div className="border rounded-lg bg-white">
                  <DateTimeCalendar
                    selectedDate={fromDate}
                    onDateTimeSelect={handleFromDateTimeSelect}
                    onClose={() => setShowFromDatePicker(false)}
                  />
                </div>
              )}

              {showToDatePicker && (
                <div className="border rounded-lg bg-white">
                  <DateTimeCalendar
                    selectedDate={toDate}
                    onDateTimeSelect={handleToDateTimeSelect}
                    onClose={() => setShowToDatePicker(false)}
                  />
                </div>
              )}

              {/* Absolute Time Range */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h4 className="font-medium mb-3 text-gray-900">Absolute time range</h4>
                {!showFromDatePicker && !showToDatePicker && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block text-gray-700">From</label>
                      <div className="relative">
                        <Input
                          placeholder="now-1h"
                          value={fromInput}
                          onChange={(e) => setFromInput(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          onClick={() => handleCalendarIconClick('from')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block text-gray-700">To</label>
                      <div className="relative">
                        <Input
                          placeholder="now"
                          value={toInput}
                          onChange={(e) => setToInput(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          onClick={() => handleCalendarIconClick('to')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <Button onClick={handleAbsoluteRange} className="w-full bg-blue-600 hover:bg-blue-700">
                      Apply time range
                    </Button>
                  </div>
                )}
              </div>

              {/* Recently Used */}
              {recentRanges.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 text-gray-900">Recently used absolute ranges</h4>
                  <div className="space-y-1">
                    {recentRanges.map((range, index) => (
                      <button
                        key={index}
                        className="w-full text-left p-3 text-sm hover:bg-gray-50 rounded border text-gray-700"
                        onClick={() => {
                          onChange?.(range)
                          setIsOpen(false)
                        }}
                      >
                        {range.from.toLocaleDateString()} {range.from.toLocaleTimeString()} to {range.to.toLocaleDateString()} {range.to.toLocaleTimeString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Quick Ranges */}
          <div className="w-80 bg-gray-50 flex flex-col">
            <div className="p-4 border-b bg-white flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search quick ranges"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>

            <div className="flex-1 p-2 space-y-1 overflow-y-auto">
              {filteredRanges.map((range) => (
                <button
                  key={range.label}
                  className="w-full text-left p-3 text-sm hover:bg-white hover:shadow-sm rounded transition-colors text-gray-700 bg-transparent"
                  onClick={() => handleQuickRange(range.minutes, range.label)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}