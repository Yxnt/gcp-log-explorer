import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Server, RefreshCw } from 'lucide-react'

interface ResourceType {
  type: string
  resources: { id: string; name: string }[]
}

interface ResourceTypeSelectorProps {
  resourceTypes: ResourceType[]
  selectedResourceType: string
  onResourceTypeChange: (resourceType: string) => void
  loading?: boolean
  disabled?: boolean
  onRefresh?: () => void
  error?: string
}

export default function ResourceTypeSelector({
  resourceTypes,
  selectedResourceType,
  onResourceTypeChange,
  loading = false,
  disabled = false,
  onRefresh,
  error
}: ResourceTypeSelectorProps) {
  const selectedResourceTypeData = resourceTypes.find(rt => rt.type === selectedResourceType)

  if (loading) {
    return (
      <div className="h-[88px] flex flex-col justify-between">
        <div className="flex items-center justify-between h-6">
          <Label className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Resource Type
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
        <div className="flex-1 flex items-center">
          <div className="w-full flex items-center space-x-2 p-3 border rounded-md bg-gray-50 h-10">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
        <div className="h-4"></div>
      </div>
    )
  }

  return (
    <div className="h-[88px] flex flex-col justify-between">
      <div className="flex items-center justify-between h-6">
        <Label className="flex items-center gap-2">
          <Server className="w-4 h-4" />
          Resource Type
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
      
      <div className="flex-1 flex items-center">
        {error ? (
          <div className="w-full p-3 bg-red-50 border border-red-200 rounded-md h-10 flex items-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : disabled ? (
          <Select disabled>
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="Select project first" />
            </SelectTrigger>
          </Select>
        ) : resourceTypes.length === 0 ? (
          <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-md h-10 flex items-center">
            <p className="text-sm text-yellow-700">No resource types found</p>
          </div>
        ) : (
          <Select
            onValueChange={onResourceTypeChange}
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
      
      <div className="h-4 flex items-center">
        {selectedResourceTypeData && (
          <div className="text-xs text-gray-500 truncate">
            {selectedResourceTypeData.resources.length} resources available
          </div>
        )}
      </div>
    </div>
  )
}