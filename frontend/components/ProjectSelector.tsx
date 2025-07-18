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
import { Check, ChevronsUpDown, RefreshCw, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project {
  projectId: string
  name: string
}

interface ProjectSelectorProps {
  projects: Project[]
  selectedProject: string
  onProjectChange: (projectId: string) => void
  loading?: boolean
  onRefresh?: () => void
  error?: string
}

export default function ProjectSelector({
  projects,
  selectedProject,
  onProjectChange,
  loading = false,
  onRefresh,
  error
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false)

  const selectedProjectData = projects.find(p => p.projectId === selectedProject)

  if (loading) {
    return (
      <div className="h-[88px] flex flex-col justify-between">
        <div className="flex items-center justify-between h-6">
          <Label className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Select Project
          </Label>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-6 w-6 p-0"
              title="Refresh projects"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex-1 flex items-center">
          <div className="w-full flex items-center space-x-2 p-3 border rounded-md bg-gray-50 h-10">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading projects...</span>
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
          <Building2 className="w-4 h-4" />
          Select Project
        </Label>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-6 w-6 p-0"
            title="Refresh projects"
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
        ) : projects.length === 0 ? (
          <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-md h-10 flex items-center">
            <p className="text-sm text-yellow-700">No projects found</p>
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
                {selectedProjectData ? (
                  <span className="truncate">{selectedProjectData.name}</span>
                ) : (
                  "Select project..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Search projects..." />
                <CommandList>
                  <CommandEmpty>No project found.</CommandEmpty>
                  <CommandGroup>
                    {projects.map((project) => (
                      <CommandItem
                        key={project.projectId}
                        value={`${project.name} ${project.projectId}`}
                        onSelect={() => {
                          onProjectChange(project.projectId === selectedProject ? '' : project.projectId)
                          setOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedProject === project.projectId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{project.name}</span>
                          <span className="text-xs text-gray-500">{project.projectId}</span>
                        </div>
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
        {selectedProjectData && (
          <div className="text-xs text-gray-500 truncate">
            {selectedProjectData.name}
          </div>
        )}
      </div>
    </div>
  )
}