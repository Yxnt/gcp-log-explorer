import type { NextPage } from 'next'
import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import LoginPage from '../components/LoginPage'
import ProjectSelector from '../components/ProjectSelector'
import ResourceTypeSelector from '../components/ResourceTypeSelector'
import SpecificResourceSelector from '../components/SpecificResourceSelector'
import TimeRangeSelector from '../components/TimeRangeSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LogOut, X } from 'lucide-react'
import JsonViewer from '../components/JsonViewer'
import { GetProjects, GetLogs, GetResources, CheckGcloudAuth } from '../wailsjs/wailsjs/go/main/App'

interface Project {
  projectId: string
  name: string
}

interface ResourceType {
  type: string
  resources: { id: string; name: string }[]
}

interface LogEntry {
  timestamp: string
  severity: string
  message: string
  textPayload?: string
  jsonPayload?: Record<string, unknown>
  resource?: Record<string, unknown>
  logName?: string
}

interface LogResponse {
  logs: LogEntry[]
  nextPageToken?: string
  hasMore: boolean
}

interface TimeRange {
  from: Date
  to: Date
  label: string
}


const Home: NextPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<string>('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([])
  const [selectedResourceType, setSelectedResourceType] = useState<string>('')
  const [selectedResource, setSelectedResource] = useState<string>('')
  const [resourceOpen, setResourceOpen] = useState(false)
  const [loadingResources, setLoadingResources] = useState(false)
  const [jsonLogsOnly, setJsonLogsOnly] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isAutoRefresh, setIsAutoRefresh] = useState(false)
  const [pageToken, setPageToken] = useState<string>('')
  const [totalLogCount, setTotalLogCount] = useState(0)
  const [hasMoreLogs, setHasMoreLogs] = useState(true)
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // Mock time range for now
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
    from: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
    to: new Date(),
    label: 'Last 5 minutes'
  })

  // Load projects on component mount (only if authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      loadProjects()
    }
  }, [isAuthenticated])

  const handleLoginSuccess = (user: string) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentUser('')
    setProjects([])
    setSelectedProject('')
    setResourceTypes([])
    setSelectedResourceType('')
    setSelectedResource('')
    setLogs([])
    setError('')
    setHasAttemptedFetch(false)
  }

  const loadProjects = async () => {
    setLoadingProjects(true)
    try {
      const projectList = await GetProjects()
      setProjects(projectList)
    } catch (err) {
      setError('Failed to load projects: ' + err)
    } finally {
      setLoadingProjects(false)
    }
  }

  const fetchResources = async (projectId: string) => {
    setLoadingResources(true)
    try {
      setError('')
      setResourceTypes([])
      setSelectedResourceType('')
      setSelectedResource('')

      const resourceList = await GetResources(projectId)
      setResourceTypes(resourceList)
    } catch (err) {
      setError('Failed to load resources: ' + err)
    } finally {
      setLoadingResources(false)
    }
  }


  useEffect(() => {
    if (selectedProject) {
      fetchResources(selectedProject)
    } else {
      setResourceTypes([])
      setSelectedResourceType('')
      setSelectedResource('')
    }
  }, [selectedProject])

  const cancelFetch = () => {
    setIsCancelling(true)
    setLoading(false)
    setIsAutoRefresh(false)
    // Don't set error message - cancellation is not an error
    // Keep existing logs data intact
    setTimeout(() => {
      setIsCancelling(false)
    }, 1000)
  }

  const fetchLogs = useCallback(async (isInitial = true) => {
    if (!selectedProject || !selectedResourceType) {
      setError('Please select project and resource type first')
      return
    }

    if (isInitial) {
      setLoading(true)
      setIsCancelling(false)
      setError('')
      setCurrentPage(1) // Reset pagination
      setLogs([]) // Clear existing logs for initial fetch
      setPageToken('') // Reset page token
      setTotalLogCount(0)
      setHasMoreLogs(true)
      setHasAttemptedFetch(true) // Mark that we've attempted to fetch logs
    }

    try {
      const response = await GetLogs({
        projectId: selectedProject,
        resourceType: selectedResourceType,
        resourceId: selectedResource || undefined,
        limit: 100,
        jsonOnly: jsonLogsOnly,
        startTime: selectedTimeRange.from.toISOString(),
        endTime: selectedTimeRange.to.toISOString(),
        pageToken: isInitial ? undefined : pageToken
      })

      // Check if operation was cancelled
      if (isCancelling) {
        return
      }

      if (isInitial) {
        setLogs(response.logs)
        setTotalLogCount(response.logs.length)
        setHasMoreLogs(response.hasMore)

        // Start auto-refresh after initial fetch if there are more logs
        if (response.hasMore) {
          setIsAutoRefresh(true)
          setPageToken(response.nextPageToken || '')
        }
      } else {
        // Append new logs to existing ones
        if (response.logs.length > 0) {
          setLogs(prevLogs => [...prevLogs, ...response.logs])
          setTotalLogCount(prevCount => prevCount + response.logs.length)

          // Update pagination info
          setHasMoreLogs(response.hasMore)
          setPageToken(response.nextPageToken || '')

          // Stop auto-refresh if no more logs
          if (!response.hasMore) {
            setIsAutoRefresh(false)
          }
        } else {
          // No more logs found
          setHasMoreLogs(false)
          setIsAutoRefresh(false)
        }
      }
    } catch (err) {
      if (!isCancelling) {
        setError('Failed to fetch logs: ' + err)
      }
      if (!isInitial) {
        // If auto-refresh fails, stop it
        setIsAutoRefresh(false)
        setLoading(false)
      }
    } finally {
      if (isInitial && !isCancelling) {
        setLoading(false)
      }
    }
  }, [selectedProject, selectedResourceType, selectedResource, jsonLogsOnly, selectedTimeRange, pageToken, isCancelling])

  // Auto-refresh effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (isAutoRefresh && selectedProject && selectedResourceType && logs.length > 0) {
      intervalId = setInterval(() => {
        fetchLogs(false) // Fetch incremental logs
      }, 5000) // Every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isAutoRefresh, selectedProject, selectedResourceType, logs.length, pageToken, fetchLogs])

  // Search and filter logs
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      log.message?.toLowerCase().includes(query) ||
      log.severity?.toLowerCase().includes(query) ||
      log.textPayload?.toLowerCase().includes(query) ||
      JSON.stringify(log.jsonPayload || {}).toLowerCase().includes(query)
    )
  })

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize)
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  // Extract and flatten JSON fields
  const extractAndFlattenFields = useCallback((jsonPayload: Record<string, unknown>): Record<string, unknown> => {
    // Simplified version for now
    return jsonPayload
  }, [])

  const PaginationControls = ({ showPageSize = true }: { showPageSize?: boolean }) => (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-700">
        Showing {Math.min((currentPage - 1) * pageSize + 1, filteredLogs.length)} to{' '}
        {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} results
      </div>

      {showPageSize && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
            <SelectTrigger className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 30, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 px-2">
            Page {totalPages > 0 ? currentPage : 0} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>GCP Log Explorer - Login</title>
        </Head>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </>
    )
  }

  return (
    <main className="flex min-h-screen flex-col p-6 bg-gray-50 w-full max-w-full">
      <Head>
        <title>GCP Log Explorer</title>
      </Head>

      <Card className="mb-6 w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-sm">GCP Log Explorer</Badge>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Welcome, {currentUser}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* All Selectors in One Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
            {/* Project Selection */}
            <div className="lg:col-span-1">
              <div className="h-full">
                <ProjectSelector
                  projects={projects}
                  selectedProject={selectedProject}
                  onProjectChange={setSelectedProject}
                  loading={loadingProjects}
                  onRefresh={loadProjects}
                  error={error && error.includes('projects') ? error : undefined}
                />
              </div>
            </div>

            {/* Resource Type Selection */}
            <div className="lg:col-span-1">
              <div className="h-full">
                <ResourceTypeSelector
                  resourceTypes={resourceTypes}
                  selectedResourceType={selectedResourceType}
                  onResourceTypeChange={(value) => {
                    setSelectedResourceType(value)
                    setSelectedResource('') // Reset specific resource selection
                    setHasAttemptedFetch(false) // Hide logs area when resource type changes
                    setLogs([]) // Clear existing logs
                    setError('') // Clear any errors
                  }}
                  loading={loadingResources}
                  disabled={!selectedProject}
                  onRefresh={() => selectedProject && fetchResources(selectedProject)}
                  error={error && error.includes('resources') ? error : undefined}
                />
              </div>
            </div>

            {/* Specific Resource Selection */}
            <div className="lg:col-span-1">
              <div className="h-full">
                <SpecificResourceSelector
                  resourceTypes={resourceTypes}
                  selectedResourceType={selectedResourceType}
                  selectedResource={selectedResource}
                  onResourceChange={setSelectedResource}
                  loading={loadingResources}
                  disabled={!selectedProject || !selectedResourceType}
                />
              </div>
            </div>

            {/* Time Range Selection */}
            <div className="lg:col-span-1">
              <div className="h-full">
                <TimeRangeSelector
                  selectedTimeRange={selectedTimeRange}
                  onTimeRangeChange={setSelectedTimeRange}
                  disabled={!selectedProject}
                />
              </div>
            </div>
          </div>

          {/* JSON Logs Filter */}
          {selectedProject && selectedResourceType && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="json-only"
                checked={jsonLogsOnly}
                onCheckedChange={(checked) => setJsonLogsOnly(checked === true)}
              />
              <Label htmlFor="json-only" className="text-sm text-gray-700">Only show JSON logs</Label>
            </div>
          )}

          {/* Fetch Logs Button */}
          {selectedProject && selectedResourceType && (
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => fetchLogs(true)}
                disabled={loading || isAutoRefresh || isCancelling}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                size="lg"
              >
                {loading ? "Loading Logs..." : isAutoRefresh ? "Loading Logs..." : "Fetch Logs"}
              </Button>
              
              {(loading || isAutoRefresh) && (
                <Button
                  onClick={cancelFetch}
                  disabled={isCancelling}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-semibold"
                  size="lg"
                >
                  <X className="h-4 w-4 mr-1" />
                  {isCancelling ? "Cancelling..." : "Cancel"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProject && selectedResourceType && hasAttemptedFetch && (loading || logs.length > 0 || error) && (
        <Card className="w-full">
          <CardContent className="space-y-6">
            {/* Search Controls and Status */}
            {logs.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mt-4">
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-4">
                      {isAutoRefresh && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-600 font-medium">Live - Auto-refreshing every 5s</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Search Input */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Search className="w-4 h-4 text-blue-500" />
                      Search Logs
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="search-input"
                        type="text"
                        placeholder="Search in log messages, JSON fields, or severity..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Search across all log fields including JSON payload content, text messages, and severity levels.
                      </p>
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchQuery('')}
                          className="text-gray-400 hover:text-gray-600 h-6 px-2"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center p-8">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <p className="mt-2 text-gray-600">Loading Logs...</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-600">No logs found for the selected criteria.</p>
              </div>
            ) : logs.length > 0 ? (
              <div className="space-y-4">
                {searchQuery && (
                  <div className={`p-4 rounded-lg border ${filteredLogs.length === 0
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-blue-50 border-blue-200'
                    }`}>
                    <div className="flex items-center gap-2">
                      <Search className={`w-4 h-4 ${filteredLogs.length === 0 ? 'text-amber-500' : 'text-blue-500'
                        }`} />
                      <p className={`text-sm font-medium ${filteredLogs.length === 0 ? 'text-amber-700' : 'text-blue-700'
                        }`}>
                        {filteredLogs.length === 0 && logs.length > 0
                          ? `No results found for "${searchQuery}"`
                          : `Found ${filteredLogs.length} of ${logs.length} logs matching "${searchQuery}"`
                        }
                      </p>
                    </div>
                    {filteredLogs.length === 0 && logs.length > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Try adjusting your search terms or clearing the search to see all logs.
                      </p>
                    )}
                  </div>
                )}

                {/* Top Pagination Controls */}
                {logs.length > 0 && (
                  <div className="border-b pb-4">
                    <PaginationControls showPageSize={false} />
                  </div>
                )}

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead className="w-[200px]">Resource</TableHead>
                        <TableHead>Payload</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map((log, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium text-xs">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">
                                {(typeof log.resource?.type === 'string' ? log.resource?.type : 'Unknown')}
                              </div>
                              <div className="text-gray-600">
                                {(() => {
                                  const labels = log.resource?.labels as Record<string, string> | undefined
                                  return labels?.container_name ||
                                    labels?.name ||
                                    labels?.instance_name ||
                                    labels?.function_name ||
                                    labels?.service_name ||
                                    'N/A'
                                })()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {log.textPayload && (
                              <p className="mb-1">{log.textPayload}</p>
                            )}
                            {log.jsonPayload && (
                              <div className="mt-2">
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border overflow-auto max-h-96 shadow-sm break-words overflow-x-auto">
                                  <div className="p-4">
                                    <div className="flex items-center justify-between mb-4">
                                      <button
                                        onClick={async () => {
                                          try {
                                            await navigator.clipboard.writeText(JSON.stringify(log.jsonPayload ? extractAndFlattenFields(log.jsonPayload) : {}, null, 2))
                                            setCopiedIndex(index)
                                            setTimeout(() => setCopiedIndex(null), 2000)
                                          } catch (err) {
                                            console.error('Failed to copy:', err)
                                          }
                                        }}
                                        className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${copiedIndex === index
                                          ? 'bg-green-500 text-white'
                                          : 'bg-blue-500 text-white hover:bg-blue-600'
                                          }`}
                                        title="Copy JSON to clipboard"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          {copiedIndex === index ? (
                                            <path d="M9 16.17L5.53 12.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4.18 4.18c.39.39 1.02.39 1.41 0L20.29 7.71c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L9 16.17z" fill="currentColor" />
                                          ) : (
                                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor" />
                                          )}
                                        </svg>
                                        {copiedIndex === index ? 'Copied!' : 'Copy'}
                                      </button>
                                    </div>
                                    <JsonViewer data={extractAndFlattenFields(log.jsonPayload)} />
                                  </div>
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Bottom Pagination Controls */}
                {logs.length > 0 && (
                  <div className="border-t pt-4">
                    <PaginationControls />
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </main>
  )
}

export default Home
