"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Type declarations for ElectronAPI
declare global {
  interface Window {
    electronAPI: {
      checkGcloudAuth: () => void;
      onGcloudAuthStatus: (callback: (result: { authenticated: boolean }) => void) => void;
      runGcloudAuth: () => void;
      onGcloudAuthResult: (callback: (result: { success: boolean; error?: string }) => void) => void;
      getProjects: () => Promise<{ projectId: string; name: string }[]>;
      getResources: (projectId: string) => Promise<ResourceType[]>;

      getLogs: (params: {
        projectId: string;
        resourceType: string;
        filter?: string;
        severity?: string;
        limit?: number;
        startTime?: string;
        endTime?: string;
        pageToken?: string;
        jsonOnly?: boolean;
      }) => Promise<LogEntry[] | { logs: LogEntry[]; nextPageToken?: string }>;
    };
  }
}
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import JsonView from '@uiw/react-json-view';
import { TimePicker } from "@/components/ui/time-picker";

// Define the type for our Electron API

interface Project {
  projectId: string;
  name: string;
}

interface ResourceType {
  type: string;
  resources: { id: string; name: string }[];
}



interface LogEntry {
  timestamp: string;
  severity: string;
  textPayload?: string;
  jsonPayload?: Record<string, unknown>;
  resource?: Record<string, unknown>;
  logName?: string;
}

interface TimeRange {
  from: Date;
  to: Date;
  label: string;
}

export default function Home() {
  const [authStatus, setAuthStatus] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [loadingResources, setLoadingResources] = useState<boolean>(false);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [resourceOpen, setResourceOpen] = useState<boolean>(false);



  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [jsonLogsOnly, setJsonLogsOnly] = useState<boolean>(false);

  // Pagination progress tracking
  const [fetchProgress, setFetchProgress] = useState<{
    currentBatch: number;
    totalFetched: number;
    inTimeWindow: number;
    status?: 'fetching' | 'waiting' | 'rate_limit_wait';
  } | null>(null);
  
  // Cancel functionality - using useRef for immediate updates
  const [cancelFetch, setCancelFetch] = useState<boolean>(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const cancelRef = useRef<boolean>(false);

  // Simple text search functionality
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);

  // Pagination functionality
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [paginatedLogs, setPaginatedLogs] = useState<LogEntry[]>([]);

  // Copy functionality
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Time window selection - keeping for backward compatibility
  const [timeWindow] = useState<string>("15"); // Default to 15 minutes
  const [customStartTime, setCustomStartTime] = useState<string>("now-1h");
  const [, setCustomEndTime] = useState<string>("now");

  // New Grafana-style time range selection
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
    from: new Date(Date.now() - 15 * 60 * 1000), // Default to 15 minutes ago
    to: new Date(),
    label: 'Last 15 minutes'
  });


  // Initialize custom time when switching to custom mode
  useEffect(() => {
    if (timeWindow === "custom" && !customStartTime) {
      setCustomStartTime("now-1h");
      setCustomEndTime("now");
    }
  }, [timeWindow, customStartTime]);

  useEffect(() => {
    // Check authentication status on startup
    window.electronAPI.checkGcloudAuth();

    // Set up the listener for authentication status check results
    window.electronAPI.onGcloudAuthStatus((result) => {
      setCheckingAuth(false);
      if (result.authenticated) {
        setAuthStatus("Already authenticated!");
        setIsAuthenticated(true);
        // Don't call fetchProjects here - let the useEffect below handle it
      } else {
        setAuthStatus("");
        setIsAuthenticated(false);
      }
    });

    // Set up the listener for authentication results
    window.electronAPI.onGcloudAuthResult((result) => {
      if (result.success) {
        setAuthStatus("Authentication successful!");
        setIsAuthenticated(true);
        // Don't call fetchProjects here - let the useEffect below handle it
      } else {
        setAuthStatus(`Authentication failed: ${result.error || 'Authentication was cancelled'}`);
        setIsAuthenticated(false);
        // Reset all related states when authentication fails
        setProjects([]);
        setSelectedProject(null);
        setResourceTypes([]);
        setSelectedResourceType(null);
        setSelectedResource(null);
        setLogs([]);
        setProjectError(null);
        setResourceError(null);
        setLogError(null);
      }
    });
  }, []);

  const handleLoginClick = () => {
    setAuthStatus("Attempting to authenticate via gcloud...");
    // Reset authentication state
    setIsAuthenticated(false);
    window.electronAPI.runGcloudAuth();
  };

  const handleRetryLogin = () => {
    setAuthStatus("");
    handleLoginClick();
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthStatus("");
    setProjects([]);
    setSelectedProject(null);
    setResourceTypes([]);
    setSelectedResourceType(null);
    setSelectedResource(null);
    setLogs([]);
    setProjectError(null);
    setResourceError(null);
    setLogError(null);
  };

  const handleFetchLogs = () => {
    if (selectedProject && selectedResourceType) {
      // Time parameters will be handled in future updates
      fetchLogs(selectedProject, selectedResourceType, selectedResource || undefined, jsonLogsOnly);
    }
  };

  const fetchProjects = useCallback(async () => {
    console.log("fetchProjects called");
    setLoadingProjects(true);
    setProjectError(null);
    setAuthStatus("Fetching projects...");
    try {
      console.log("Calling window.electronAPI.getProjects()");
      const data: Project[] = await window.electronAPI.getProjects();
      console.log("Projects received:", data);
      setProjects(data);
      // Don't auto-select the first project, let user choose
      if (data.length === 0) {
        setProjectError("No projects found or you don't have access to any.");
        setAuthStatus("No projects found.");
      } else {
        setAuthStatus(`Projects loaded successfully. Found ${data.length} projects.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error fetching projects:", error);
      setProjectError(`Failed to load projects: ${errorMessage}`);
      setAuthStatus("Failed to load projects after authentication.");
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const fetchResources = async (projectId: string) => {
    console.log("fetchResources called for project:", projectId);
    setLoadingResources(true);
    setResourceError(null);
    setResourceTypes([]);
    setSelectedResourceType(null);
    setSelectedResource(null);
    try {
      console.log("Calling window.electronAPI.getResources()");
      const data: ResourceType[] = await window.electronAPI.getResources(projectId);
      console.log("Resources received:", data);
      setResourceTypes(data);
      // Remove automatic selection - let user choose
      console.log("Resources loaded, no auto-selection");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error fetching resources:", error);
      setResourceError(`Failed to load resources: ${errorMessage}`);
    } finally {
      setLoadingResources(false);
    }
  };



  // Helper function for cancellable delay with immediate cancel support
  const delay = (ms: number, cancelRef: { current: boolean }) => {
    return new Promise<void>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined; // eslint-disable-line prefer-const
      let intervalId: NodeJS.Timeout | undefined; // eslint-disable-line prefer-const
      
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
      };
      
      const checkCancel = () => {
        if (cancelRef.current) {
          cleanup();
          reject(new Error('Cancelled'));
          return true;
        }
        return false;
      };
      
      // Check immediately
      if (checkCancel()) return;
      
      // Set up timeout
      timeoutId = setTimeout(() => {
        cleanup();
        if (!cancelRef.current) {
          resolve();
        }
      }, ms);
      
      // Check for cancellation every 50ms for faster response
      intervalId = setInterval(checkCancel, 50);
    });
  };

  const fetchLogs = async (projectId: string, resourceType?: string, resourceId?: string, jsonOnly?: boolean) => {
    setLoadingLogs(true);
    setLogError(null);
    setCancelFetch(false);
    cancelRef.current = false; // Reset the ref
    setLogs([]); // Clear existing logs at start
    setCurrentPage(1); // Reset pagination to first page

    // Use the component-level cancelRef for immediate cancellation detection
    const localCancelRef = cancelRef;

    try {
      // Use the new Grafana-style time range
      const startTime = selectedTimeRange.from;
      const endTime = selectedTimeRange.to;

      const allLogs: LogEntry[] = [];
      let pageToken: string | undefined;
      let hasMoreData = true;
      let totalFetched = 0;
      const maxIterations = 50; // Safety limit to prevent infinite loops
      let iterations = 0;

      console.log(`Fetching logs from ${startTime.toISOString()} to ${endTime.toISOString()}`);

      while (hasMoreData && iterations < maxIterations && !cancelRef.current) {
        iterations++;

        // Update progress
        setFetchProgress({
          currentBatch: iterations,
          totalFetched: totalFetched,
          inTimeWindow: allLogs.length,
          status: 'fetching'
        });

        const params = {
          projectId,
          resourceType: resourceType || 'all',
          filter: resourceId ? `resource.labels.namespace_name="${resourceId}"` : undefined,
          severity: jsonOnly ? undefined : 'all',
          limit: 100,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          pageToken: pageToken,
          jsonOnly: jsonOnly,
        };

        console.log(`Fetching batch ${iterations}, pageToken: ${pageToken || 'none'}`);

        try {
          const response = await window.electronAPI.getLogs(params);
          const batchLogs = Array.isArray(response) ? response : response.logs || [];
          const nextPageToken = Array.isArray(response) ? undefined : response.nextPageToken;

          if (batchLogs.length === 0) {
            console.log('No more logs returned, stopping');
            break;
          }

          // Accept all logs returned by the server - server-side filtering handles time range
          const filteredBatch = batchLogs;

          allLogs.push(...filteredBatch);
          totalFetched += batchLogs.length;

          console.log(`Batch ${iterations}: ${batchLogs.length} logs fetched, ${filteredBatch.length} within time window, total: ${allLogs.length}`);

          // Update UI immediately with current logs (progressive loading)
          const sortedLogs = [...allLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setLogs(sortedLogs);

          // Update progress with latest numbers
          setFetchProgress({
            currentBatch: iterations,
            totalFetched: totalFetched,
            inTimeWindow: allLogs.length,
            status: 'fetching'
          });

          // Check if we have more data to fetch
          if (nextPageToken && batchLogs.length === 100) {
            pageToken = nextPageToken;
            hasMoreData = true;
          } else {
            hasMoreData = false;
          }

          // If the oldest log in this batch is older than our start time, we can stop
          if (batchLogs.length > 0) {
            const oldestLogTime = new Date(batchLogs[batchLogs.length - 1].timestamp);
            if (oldestLogTime < startTime) {
              console.log('Reached logs older than start time, stopping');
              break;
            }
          }

          // Add 5-second delay between requests to avoid rate limits (except for the last iteration)
          if (hasMoreData && !cancelRef.current) {
            console.log('Waiting 5 seconds before next request to avoid rate limits...');
            setFetchProgress({
              currentBatch: iterations,
              totalFetched: totalFetched,
              inTimeWindow: allLogs.length,
              status: 'waiting'
            });
            
            try {
              await delay(5000, localCancelRef); // 5 second delay
            } catch {
              // Delay was cancelled
              console.log('Delay cancelled, stopping fetch');
              break;
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error fetching batch ${iterations}:`, error);
          
          // If it's a rate limit error, wait longer before retrying
          if (errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
            console.log('Rate limit exceeded, waiting 10 seconds before retry...');
            setFetchProgress({
              currentBatch: iterations,
              totalFetched: totalFetched,
              inTimeWindow: allLogs.length,
              status: 'rate_limit_wait'
            });
            
            try {
              await delay(10000, localCancelRef); // 10 second delay for rate limit
              continue; // Retry the same batch
            } catch {
              console.log('Rate limit delay cancelled, stopping fetch');
              break;
            }
          } else {
            // For other errors, stop the fetch
            throw error;
          }
        }
      }

      if (cancelRef.current) {
        console.log('Fetch cancelled by user');
        setLogError('Fetch cancelled by user');
      } else {
        console.log(`Completed fetching: ${iterations} iterations, ${totalFetched} total logs fetched, ${allLogs.length} logs within time window`);
        
        // Final sort and update (in case there were any issues)
        const finalSortedLogs = allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(finalSortedLogs);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error fetching logs:", error);
      setLogError(`Failed to load logs: ${errorMessage}`);
    } finally {
      setLoadingLogs(false);
      setFetchProgress(null); // Clear progress when done
      setCancelFetch(false);
      cancelRef.current = false; // Reset the ref
    }
  };

  // If authenticated, try to fetch projects on component mount
  useEffect(() => {
    if (isAuthenticated) {
      console.log("isAuthenticated changed to true, calling fetchProjects");
      fetchProjects();
    }
  }, [isAuthenticated, fetchProjects]);

  // Fetch resources when selected project changes
  useEffect(() => {
    if (selectedProject) {
      fetchResources(selectedProject);
      // Clear logs when project changes
      setLogs([]);
      setLogError(null);
    }
  }, [selectedProject]);

  // Clear logs when resource type or specific resource changes
  useEffect(() => {
    setLogs([]);
    setLogError(null);
  }, [selectedResourceType, selectedResource]);

  // Remove automatic log fetching - now only triggered by user action
  // useEffect(() => {
  //   if (selectedProject && selectedResourceType) {
  //     fetchLogs(selectedProject, selectedResourceType, selectedResource || undefined);
  //   }
  // }, [selectedProject, selectedResourceType, selectedResource]);

  // Filter logs using simple text search when search query or logs change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLogs(logs);
      return;
    }

    const searchLower = searchQuery.toLowerCase();
    const filtered = logs.filter(log => {
      // Search in textPayload
      if (log.textPayload && log.textPayload.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in jsonPayload (flattened)
      if (log.jsonPayload) {
        const flattened = extractAndFlattenFields(log.jsonPayload);
        const jsonString = JSON.stringify(flattened).toLowerCase();
        if (jsonString.includes(searchLower)) {
          return true;
        }
      }

      // Search in severity
      if (log.severity && log.severity.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in resource type and labels
      if (log.resource) {
        if (log.resource.type && typeof log.resource.type === 'string' && log.resource.type.toLowerCase().includes(searchLower)) {
          return true;
        }
        if (log.resource.labels) {
          const resourceLabels = Object.values(log.resource.labels).join(' ').toLowerCase();
          if (resourceLabels.includes(searchLower)) {
            return true;
          }
        }
      }

      return false;
    });

    setFilteredLogs(filtered);
  }, [logs, searchQuery]);

  // Handle pagination when filtered logs change
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setPaginatedLogs(filteredLogs.slice(startIndex, endIndex));
  }, [filteredLogs, currentPage, pageSize]);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate pagination info
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredLogs.length);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Reusable pagination component
  const PaginationControls = ({ showPageSize = true }) => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Results info */}
      <div className="text-sm text-gray-600">
        Showing {filteredLogs.length > 0 ? startIndex : 0} to {endIndex} of {filteredLogs.length} results
        {searchQuery && " (filtered)"}
      </div>

      {/* Page size selector */}
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

      {/* Pagination buttons */}
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
  );

  // Function to extract and flatten field data from GCP log structure with deep extraction
  const extractAndFlattenFields = useCallback((jsonPayload: Record<string, unknown>): Record<string, unknown> => {

    // Helper function to recursively parse JSON strings
    const parseJsonStringRecursively = (value: unknown): unknown => {
      if (typeof value === 'string' && value.length > 0) {
        // Check if it looks like JSON
        if ((value.startsWith('{') && value.endsWith('}')) ||
            (value.startsWith('[') && value.endsWith(']'))) {
          try {
            const parsed = JSON.parse(value);
            // Recursively parse nested JSON strings in the parsed object
            return parseJsonStringRecursively(parsed);
          } catch {
            return value;
          }
        }
        return value;
      } else if (Array.isArray(value)) {
        return value.map(parseJsonStringRecursively);
      } else if (value && typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
          result[key] = parseJsonStringRecursively(val);
        }
        return result;
      }
      return value;
    };

    // Helper function to extract value from field structure
    const extractFieldValue = (field: unknown): unknown => {
      if (!field || typeof field !== 'object') {
        return field;
      }

      const fieldObj = field as Record<string, unknown>;

      // Handle different value types in GCP logging format
      if ('stringValue' in fieldObj) {
        const stringValue = fieldObj.stringValue as string;
        // Use recursive JSON parsing for string values
        return parseJsonStringRecursively(stringValue);
      } else if ('numberValue' in fieldObj) {
        return fieldObj.numberValue;
      } else if ('boolValue' in fieldObj) {
        return fieldObj.boolValue;
      } else if ('timestampValue' in fieldObj) {
        return fieldObj.timestampValue;
      } else if ('nullValue' in fieldObj) {
        return null;
      } else if ('listValue' in fieldObj && fieldObj.listValue && typeof fieldObj.listValue === 'object') {
        const listObj = fieldObj.listValue as Record<string, unknown>;
        if ('values' in listObj && Array.isArray(listObj.values)) {
          return listObj.values.map(extractFieldValue);
        }
      } else if ('structValue' in fieldObj && fieldObj.structValue && typeof fieldObj.structValue === 'object') {
        const structObj = fieldObj.structValue as Record<string, unknown>;
        if ('fields' in structObj && structObj.fields && typeof structObj.fields === 'object') {
          return extractAndFlattenFields(structObj.fields as Record<string, unknown>);
        }
      }

      // If it doesn't match the expected field structure, return as-is
      return field;
    };

    // Helper function to deeply extract core data, removing wrapper fields
    const deepExtract = (obj: Record<string, unknown>): Record<string, unknown> => {
      const result: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(obj)) {
        // Skip common wrapper fields and the 'kind' field that don't contain meaningful data
        if (key === 'fields' || key === 'Contents' || key === 'field' || key === 'content' || key === 'payload' || key === 'kind') {
          if (value && typeof value === 'object' && !Array.isArray(value) && key !== 'kind') {
            // Extract the contents of wrapper fields and merge them (but exclude 'kind' field entirely)
            const extracted = deepExtract(value as Record<string, unknown>);
            Object.assign(result, extracted);
          }
          continue;
        }

        // Special handling for nested structures that might contain the actual data
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const valueObj = value as Record<string, unknown>;

          // Check if this looks like a field structure with value types
          if ('stringValue' in valueObj || 'numberValue' in valueObj || 'boolValue' in valueObj ||
            'timestampValue' in valueObj || 'nullValue' in valueObj || 'listValue' in valueObj ||
            'structValue' in valueObj) {
            result[key] = extractFieldValue(value);
          } else {
            // Check if the object is a container that should be unwrapped
            const objectKeys = Object.keys(valueObj);

            // If the object has only one key and it's a wrapper field, unwrap it
            if (objectKeys.length === 1 &&
              (objectKeys[0] === 'fields' || objectKeys[0] === 'Contents' ||
                objectKeys[0] === 'field' || objectKeys[0] === 'content' ||
                objectKeys[0] === 'payload' || objectKeys[0] === 'data')) {
              const innerValue = valueObj[objectKeys[0]];
              if (innerValue && typeof innerValue === 'object' && !Array.isArray(innerValue)) {
                const extracted = deepExtract(innerValue as Record<string, unknown>);
                if (Object.keys(extracted).length > 0) {
                  Object.assign(result, extracted);
                } else {
                  result[key] = innerValue;
                }
              } else {
                result[key] = innerValue;
              }
            } else {
              // For nested objects, recursively process with deep extraction
              const extracted = deepExtract(valueObj);
              // If the extracted object has meaningful content, use it
              if (Object.keys(extracted).length > 0) {
                result[key] = extracted;
              } else {
                // Check if we should include the original object
                const hasNonWrapperKeys = objectKeys.some(k =>
                  k !== 'fields' && k !== 'Contents' && k !== 'field' &&
                  k !== 'content' && k !== 'payload' && k !== 'data' && k !== 'kind'
                );
                if (hasNonWrapperKeys) {
                  result[key] = extractAndFlattenFields(valueObj);
                }
              }
            }
          }
        } else {
          // For primitive values or arrays, apply recursive JSON parsing
          result[key] = parseJsonStringRecursively(value);
        }
      }

      return result;
    };

    const extracted = deepExtract(jsonPayload);
    return parseJsonStringRecursively(extracted) as Record<string, unknown>;
  }, []);


  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="w-full flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">GCP Log Explorer</h1>
        {isAuthenticated && (
          <Button
            onClick={handleLogout}
            variant="outline"
            className="text-gray-600 hover:text-gray-800"
          >
            Logout
          </Button>
        )}
      </div>

      {!isAuthenticated && (
        <div className="mb-8 text-center">
          {checkingAuth ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Checking authentication status...</span>
            </div>
          ) : (
            <Button
              onClick={authStatus.includes("failed") || authStatus.includes("cancelled") ? handleRetryLogin : handleLoginClick}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
            >
              {authStatus.includes("failed") || authStatus.includes("cancelled") ? "Retry Login" : "Login with Google"}
            </Button>
          )}
          {authStatus && (
            <p className={`mt-4 text-center text-sm ${authStatus.includes("failed") || authStatus.includes("cancelled")
              ? "text-red-500"
              : authStatus.includes("successful")
                ? "text-green-500"
                : "text-gray-600"
              }`}>
              {authStatus}
            </p>
          )}
          {(authStatus.includes("failed") || authStatus.includes("cancelled")) && (
            <p className="mt-2 text-center text-xs text-gray-500">
              Click &ldquo;Retry Login&rdquo; to try authenticating again
            </p>
          )}
        </div>
      )}

      {isAuthenticated && (
        <div className="w-full mb-8 space-y-4">
          {/* All selections in one row - 4 columns */}
          <div className="flex flex-row gap-4">
            {/* Project Selection */}
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Project</label>
              {loadingProjects ? (
                <p>Loading projects...</p>
              ) : projectError ? (
                <p className="text-red-500">{projectError}</p>
              ) : (
                <Select onValueChange={setSelectedProject} value={selectedProject || ""}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="----" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.projectId} value={project.projectId}>
                        {project.name} ({project.projectId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Resource Type Selection */}
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Resource Type</label>
              {!selectedProject ? (
                <Select disabled>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select project first" />
                  </SelectTrigger>
                </Select>
              ) : loadingResources ? (
                <p>Loading resource types...</p>
              ) : resourceError ? (
                <p className="text-red-500">{resourceError}</p>
              ) : (
                <Select
                  onValueChange={(value) => {
                    setSelectedResourceType(value);
                    // Don't auto-select first resource - let user choose
                    setSelectedResource(null);
                  }}
                  value={selectedResourceType || undefined}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="----" />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceTypes.map((resourceType) => (
                      <SelectItem key={resourceType.type} value={resourceType.type}>
                        {resourceType.type} ({resourceType.resources.length} resources)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Specific Resource Selection with Search */}
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Specific Resource</label>
              {!selectedResourceType ? (
                <Button
                  variant="outline"
                  disabled
                  className="w-full justify-between"
                >
                  Select resource type first
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              ) : (
                <Popover open={resourceOpen} onOpenChange={setResourceOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={resourceOpen}
                      className="w-full justify-between"
                    >
                      {selectedResource
                        ? resourceTypes
                          .find(rt => rt.type === selectedResourceType)
                          ?.resources.find((resource) => resource.id === selectedResource)?.name || selectedResource
                        : "----"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search resources..." />
                      <CommandList>
                        <CommandEmpty>No resource found.</CommandEmpty>
                        <CommandGroup>
                          {resourceTypes
                            .find(rt => rt.type === selectedResourceType)
                            ?.resources.map((resource) => (
                              <CommandItem
                                key={resource.id}
                                value={resource.id}
                                onSelect={(currentValue) => {
                                  setSelectedResource(currentValue === selectedResource ? null : currentValue);
                                  setResourceOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedResource === resource.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {resource.name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Grafana-style Time Range Selection */}
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Time Range</label>
              <TimePicker
                value={selectedTimeRange}
                onChange={setSelectedTimeRange}
                className="w-full"
              />
            </div>
          </div>

          {/* JSON Logs Filter */}
          {selectedProject && selectedResourceType && (
            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={jsonLogsOnly}
                  onChange={(e) => setJsonLogsOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Only show JSON logs</span>
              </label>
            </div>
          )}

          {/* Fetch Logs Button */}
          {selectedProject && selectedResourceType && (
            <div className="mt-6 text-center">
              <div className="flex justify-center gap-3">
                <Button
                  onClick={handleFetchLogs}
                  disabled={loadingLogs}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded"
                >
                  {loadingLogs ? "Loading Logs..." : "Fetch Logs"}
                </Button>
                
                {loadingLogs && (
                  <Button
                    onClick={() => {
                      setCancelFetch(true);
                      cancelRef.current = true; // Immediately update the ref for instant cancellation
                      console.log('Cancel button clicked - immediate cancellation triggered');
                    }}
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white py-2 px-6 rounded"
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {/* Status indicator */}
              {fetchProgress && (
                <div className="mt-3 text-sm text-gray-600">
                  {fetchProgress.status === 'fetching' && (
                    <span>Batch {fetchProgress.currentBatch} • {fetchProgress.inTimeWindow} logs</span>
                  )}
                  {fetchProgress.status === 'waiting' && (
                    <span>Waiting 5 seconds before next request...</span>
                  )}
                  {fetchProgress.status === 'rate_limit_wait' && (
                    <span>Rate limit reached, waiting 10 seconds...</span>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {isAuthenticated && selectedProject && selectedResourceType && (loadingLogs || logs.length > 0 || logError) && (
        <div className="w-full mt-8">
          <h2 className="text-2xl font-semibold mb-4">
            Logs for {selectedProject} - {selectedResourceType}
            {selectedResource && selectedResource !== 'all' && ` (${selectedResource})`}
          </h2>

          {/* Simple Text Search Input */}
          {logs.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                <Search className="inline-block w-4 h-4 mr-1" />
                Search Logs
              </label>
              <Input
                type="text"
                placeholder="Search in log messages, JSON fields, or severity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                Search across all log fields including JSON payload content, text messages, and severity levels.
              </p>
            </div>
          )}
          {/* Debug info */}
          <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
            Debug: loadingLogs={loadingLogs.toString()}, logs.length={logs.length}, filteredLogs.length={filteredLogs.length}, paginatedLogs.length={paginatedLogs.length}, logError={logError || 'null'}
          </div>

          {logError ? (
            <p className="text-red-500">{logError}</p>
          ) : logs.length === 0 && !loadingLogs ? (
            <p>No logs found for the selected criteria.</p>
          ) : (logs.length > 0 || loadingLogs) ? (
            <>
              {searchQuery && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Found {filteredLogs.length} of {logs.length} logs matching &quot;{searchQuery}&quot;
                    {filteredLogs.length === 0 && logs.length > 0 && " (No results found)"}
                  </p>
                </div>
              )}

              {/* Top Pagination Controls */}
              {logs.length > 0 && (
                <div className="mb-4">
                  <PaginationControls showPageSize={false} />
                </div>
              )}
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
                              const labels = log.resource?.labels as Record<string, string> | undefined;
                              return labels?.container_name ||
                                labels?.name ||
                                labels?.instance_name ||
                                labels?.function_name ||
                                labels?.service_name ||
                                'N/A';
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
                            {/* <div className="text-xs text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 p-3 rounded-r mb-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-semibold text-blue-800">JSON Payload:</span>
                                  <div className="mt-1 font-mono text-gray-600">{getJsonSummary(log.jsonPayload)}</div>
                                </div>
                                <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                  {Object.keys(extractAndFlattenFields(log.jsonPayload)).length} fields
                                </div>
                              </div>
                            </div> */}
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:bg-gray-800 rounded-lg border overflow-auto max-h-96 shadow-sm break-words overflow-x-auto">
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(JSON.stringify(log.jsonPayload ? extractAndFlattenFields(log.jsonPayload) : {}, null, 2));
                                        setCopiedIndex(index);
                                        setTimeout(() => setCopiedIndex(null), 2000);
                                      } catch (err) {
                                        console.error('Failed to copy:', err);
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
                                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    JSON Data
                                  </div>
                                </div>
                                <JsonView
                                  value={extractAndFlattenFields(log.jsonPayload)}
                                  collapsed={false}
                                  displayDataTypes={false}
                                  displayObjectSize={false}
                                  enableClipboard={true}
                                  shortenTextAfterLength={0}
                                  style={{
                                    fontSize: '13px',
                                    fontFamily: 'SF Mono, Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
                                    backgroundColor: 'transparent',
                                    lineHeight: '1.5',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    maxWidth: '100%',
                                    width: '100%',
                                  } as React.CSSProperties & {
                                    '--w-rjv-string-color'?: string;
                                    '--w-rjv-background-color'?: string;
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        {/* You can add more fields here if needed, wrapped in Accordion */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Bottom Pagination Controls */}
              {logs.length > 0 && (
                <div className="mt-6">
                  <PaginationControls showPageSize={true} />
                </div>
              )}
              
              {/* Loading indicator at bottom when still fetching */}
              {loadingLogs && (
                <div className="mt-6 text-center">
                  <p className="text-gray-600">Loading logs...</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </main>
  );
}