import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import { Check, ChevronsUpDown, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResourceType {
  type: string
  resources: { id: string; name: string }[]
}

interface SpecificResourceSelectorProps {
  resourceTypes: ResourceType[]
  selectedResourceType: string
  selectedResource: string
  onResourceChange: (resourceId: string) => void
  loading?: boolean
  disabled?: boolean
}

export default function SpecificResourceSelector({
  resourceTypes,
  selectedResourceType,
  selectedResource,
  onResourceChange,
  loading = false,
  disabled = false
}: SpecificResourceSelectorProps) {
  const [open, setOpen] = useState(false)

  const selectedResourceTypeData = resourceTypes.find(rt => rt.type === selectedResourceType)
  const selectedResourceData = selectedResourceTypeData?.resources.find(r => r.id === selectedResource)

  if (loading) {
    return (
      <div className="h-[88px] flex flex-col justify-between">
        <div className="flex items-center justify-between h-6">
          <Label className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Specific Resource
          </Label>
        </div>
        <div className="flex-1 flex items-center">
          <Button variant="outline" disabled className="w-full justify-between h-10">
            Loading...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </div>
        <div className="h-4"></div>
      </div>
    )
  }

  return (
    <div className="h-[88px] flex flex-col justify-between">
      <div className="flex items-center justify-between h-6">
        <Label className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          Specific Resource
        </Label>
      </div>
      
      <div className="flex-1 flex items-center">
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
          <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-md h-10 flex items-center">
            <p className="text-sm text-yellow-700">No resources available</p>
          </div>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
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
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Search resources..." />
                <CommandList>
                  <CommandEmpty>No resource found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        onResourceChange('')
                        setOpen(false)
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
                          setOpen(false)
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
      
      <div className="h-4 flex items-center">
        {selectedResourceData && (
          <div className="text-xs text-gray-500 truncate">
            Selected: {selectedResourceData.name}
          </div>
        )}
      </div>
    </div>
  )
}