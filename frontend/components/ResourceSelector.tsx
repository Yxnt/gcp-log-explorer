import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Check, ChevronsUpDown, Server, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Resource {
  id: string
  name: string
}

interface ResourceType {
  type: string
  resources: Resource[]
}

interface ResourceSelectorProps {
  resourceTypes: ResourceType[]
  selectedResourceType: string
  selectedResource: string
  onResourceTypeChange: (resourceType: string) => void
  onResourceChange: (resourceId: string) => void
  loading?: boolean
  disabled?: boolean
  onRefresh?: () => void
  error?: string
}

export default function ResourceSelector({
  resourceTypes,
  selectedResourceType,
  selectedResource,
  onResourceTypeChange,
  onResourceChange,
  loading = false,
  disabled = false,
  onRefresh,
  error
}: ResourceSelectorProps) {
  const [resourceOpen, setResourceOpen] = useState(false)

  const selectedResourceTypeData = resourceTypes.find(rt => rt.type === selectedResourceType)
  const selectedResourceData = selectedResourceTypeData?.resources.find(r => r.id === selectedResource)

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Resource Type & Specific Resource
          </Label>
          {onRefresh && !disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-6 w-6 p-0"
              title="Refresh resources"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2 p-3 border rounded-md bg-gray-50 h-10">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
          <Button variant="outline" disabled className="w-full justify-between h-10">
            Loading...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Server className="w-4 h-4" />
          Resource Type & Specific Resource
        </Label>
        {onRefresh && !disabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-6 w-6 p-0"
            title="Refresh resources"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Resource Type Selection */}
        <div>
          {error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md h-10 flex items-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : disabled ? (
            <Select disabled>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Select project first" />
              </SelectTrigger>
            </Select>
          ) : resourceTypes.length === 0 ? (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md h-10 flex items-center">
              <p className="text-sm text-yellow-700">No resource types found</p>
            </div>
          ) : (
            <Select
              onValueChange={(value) => {
                onResourceTypeChange(value)
                onResourceChange('') // Reset specific resource selection
              }}
              value={selectedResourceType || undefined}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Select resource type..." />
              </SelectTrigger>
              <SelectContent>
                {resourceTypes.map((resourceType) => (
                  <SelectItem key={resourceType.type} value={resourceType.type}>
                    <span className="truncate">{resourceType.type}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Specific Resource Selection */}
        <div>
          {!selectedResourceType ? (
            <Button
              variant="outline"
              disabled
              className="w-full justify-between h-10"
            >
              Select resource type first
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          ) : !selectedResourceTypeData || selectedResourceTypeData.resources.length === 0 ? (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md h-10 flex items-center">
              <p className="text-sm text-yellow-700">No resources available</p>
            </div>
          ) : (
            <Popover open={resourceOpen} onOpenChange={setResourceOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={resourceOpen}
                  className="w-full justify-between h-10"
                >
                  {selectedResourceData ? (
                    <span className="truncate">{selectedResourceData.name}</span>
                  ) : (
                    "Select resource..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search resources..." />
                  <CommandList>
                    <CommandEmpty>No resource found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          onResourceChange('')
                          setResourceOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedResource === '' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="font-medium text-blue-600">All Resources</span>
                      </CommandItem>
                      {selectedResourceTypeData.resources.map((resource) => (
                        <CommandItem
                          key={resource.id}
                          value={resource.name}
                          onSelect={() => {
                            onResourceChange(resource.id === selectedResource ? '' : resource.id)
                            setResourceOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedResource === resource.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{resource.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
      
      {selectedResourceTypeData && (
        <div className="text-xs text-gray-500 truncate">
          {selectedResourceTypeData.type}
          {selectedResourceData && ` | ${selectedResourceData.name}`}
        </div>
      )}
    </div>
  )
}