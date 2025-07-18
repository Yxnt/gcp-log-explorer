import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DateTimePicker } from '@/components/ui/datetime-picker'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar, Clock, ChevronsUpDown } from 'lucide-react'

interface TimeRange {
  from: Date
  to: Date
  label: string
}

interface TimeRangeSelectorProps {
  selectedTimeRange: TimeRange
  onTimeRangeChange: (timeRange: TimeRange) => void
  disabled?: boolean
}

const PRESET_RANGES = [
  {
    label: 'Last 5 minutes',
    getValue: () => ({
      from: new Date(Date.now() - 5 * 60 * 1000),
      to: new Date(),
      label: 'Last 5 minutes'
    })
  },
  {
    label: 'Last 15 minutes',
    getValue: () => ({
      from: new Date(Date.now() - 15 * 60 * 1000),
      to: new Date(),
      label: 'Last 15 minutes'
    })
  },
  {
    label: 'Last 30 minutes',
    getValue: () => ({
      from: new Date(Date.now() - 30 * 60 * 1000),
      to: new Date(),
      label: 'Last 30 minutes'
    })
  },
  {
    label: 'Last 1 hour',
    getValue: () => ({
      from: new Date(Date.now() - 60 * 60 * 1000),
      to: new Date(),
      label: 'Last 1 hour'
    })
  },
  {
    label: 'Last 6 hours',
    getValue: () => ({
      from: new Date(Date.now() - 6 * 60 * 60 * 1000),
      to: new Date(),
      label: 'Last 6 hours'
    })
  },
  {
    label: 'Last 12 hours',
    getValue: () => ({
      from: new Date(Date.now() - 12 * 60 * 60 * 1000),
      to: new Date(),
      label: 'Last 12 hours'
    })
  },
  {
    label: 'Last 24 hours',
    getValue: () => ({
      from: new Date(Date.now() - 24 * 60 * 60 * 1000),
      to: new Date(),
      label: 'Last 24 hours'
    })
  },
  {
    label: 'Last 7 days',
    getValue: () => ({
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: new Date(),
      label: 'Last 7 days'
    })
  }
]

export default function TimeRangeSelector({
  selectedTimeRange,
  onTimeRangeChange,
  disabled = false
}: TimeRangeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined)
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined)

  const handlePresetSelect = (preset: typeof PRESET_RANGES[0]) => {
    const timeRange = preset.getValue()
    onTimeRangeChange(timeRange)
    setOpen(false)
    setCustomMode(false)
  }

  const handleCustomTimeRange = () => {
    if (customFrom && customTo && customFrom < customTo) {
      const formatDate = (date: Date) => {
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const year = date.getFullYear()
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        return `${month}/${day}/${year} ${hours}:${minutes}`
      }
      
      onTimeRangeChange({
        from: customFrom,
        to: customTo,
        label: `${formatDate(customFrom)} - ${formatDate(customTo)}`
      })
      setOpen(false)
      setCustomMode(false)
    }
  }

  const initializeCustomInputs = () => {
    setCustomFrom(selectedTimeRange.from)
    setCustomTo(selectedTimeRange.to)
    setCustomMode(true)
  }

  return (
    <div className="h-[88px] flex flex-col justify-between">
      <div className="flex items-center justify-between h-6">
        <Label className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Time Range
        </Label>
      </div>
      
      <div className="flex-1 flex items-center">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className="w-full justify-between h-10"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="truncate">{selectedTimeRange.label}</span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-80 p-0">
            <div className="p-4 space-y-4">
              {!customMode ? (
                <>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Quick Select</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESET_RANGES.map((preset) => (
                        <Button
                          key={preset.label}
                          variant="ghost"
                          size="sm"
                          className="justify-start h-8 text-xs"
                          onClick={() => handlePresetSelect(preset)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={initializeCustomInputs}
                    >
                      Custom Time Range
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Custom Time Range</h4>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">From</Label>
                      <DateTimePicker
                        date={customFrom}
                        setDate={setCustomFrom}
                        placeholder="Select start date and time"
                        className="text-xs"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">To</Label>
                      <DateTimePicker
                        date={customTo}
                        setDate={setCustomTo}
                        placeholder="Select end date and time"
                        className="text-xs"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCustomTimeRange}
                      disabled={!customFrom || !customTo || customFrom >= customTo}
                      className="flex-1"
                    >
                      Apply
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomMode(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="h-4 flex items-center">
        <div className="text-xs text-gray-500 truncate">
          {(() => {
            const formatCompactDate = (date: Date) => {
              const month = (date.getMonth() + 1).toString().padStart(2, '0')
              const day = date.getDate().toString().padStart(2, '0')
              const hours = date.getHours().toString().padStart(2, '0')
              const minutes = date.getMinutes().toString().padStart(2, '0')
              return `${month}/${day} ${hours}:${minutes}`
            }
            return `${formatCompactDate(selectedTimeRange.from)} - ${formatCompactDate(selectedTimeRange.to)}`
          })()}
        </div>
      </div>
    </div>
  )
}