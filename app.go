package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"cloud.google.com/go/logging/logadmin"
	"cloud.google.com/go/resourcemanager/apiv3"
	"cloud.google.com/go/resourcemanager/apiv3/resourcemanagerpb"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
	"golang.org/x/oauth2"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called at application startup
func (a *App) startup(ctx context.Context) {
	// Perform your setup here
	a.ctx = ctx
}

// domReady is called after front-end resources have been loaded
func (a App) domReady(ctx context.Context) {
	// Add your action here
}

// beforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue, false will continue shutdown as normal.
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	return false
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	// Perform your teardown here
}

// Project represents a GCP project
type Project struct {
	ProjectId string `json:"projectId"`
	Name      string `json:"name"`
}

// Resource represents a specific resource instance
type Resource struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

// ResourceType represents a type of resource with its instances
type ResourceType struct {
	Type      string     `json:"type"`
	Resources []Resource `json:"resources"`
}

// LogEntry represents a log entry
type LogEntry struct {
	Timestamp   string                 `json:"timestamp"`
	Severity    string                 `json:"severity"`
	Message     string                 `json:"message"`
	TextPayload string                 `json:"textPayload,omitempty"`
	Resource    map[string]interface{} `json:"resource,omitempty"`
	JsonPayload map[string]interface{} `json:"jsonPayload,omitempty"`
}

// LogResponse represents the response from GetLogs including pagination info
type LogResponse struct {
	Logs          []LogEntry `json:"logs"`
	NextPageToken string     `json:"nextPageToken,omitempty"`
	HasMore       bool       `json:"hasMore"`
}

// LogParams represents log query parameters
type LogParams struct {
	ProjectId      string `json:"projectId"`
	ResourceType   string `json:"resourceType"`
	ResourceId     string `json:"resourceId,omitempty"`
	Filter         string `json:"filter,omitempty"`
	Severity       string `json:"severity,omitempty"`
	Limit          int    `json:"limit,omitempty"`
	StartTime      string `json:"startTime,omitempty"`
	EndTime        string `json:"endTime,omitempty"`
	PageToken      string `json:"pageToken,omitempty"`
	JsonOnly       bool   `json:"jsonOnly,omitempty"`
	LastTimestamp  string `json:"lastTimestamp,omitempty"` // For incremental fetching
}

// GetProjects retrieves available GCP projects
func (a *App) GetProjects() ([]Project, error) {
	ctx := context.Background()
	
	// Create a resource manager client with authentication
	var client *resourcemanager.ProjectsClient
	var err error
	
	if globalAccessToken != "" {
		// Use the stored access token
		tokenSource := oauth2.StaticTokenSource(&oauth2.Token{
			AccessToken: globalAccessToken,
		})
		client, err = resourcemanager.NewProjectsClient(ctx, option.WithTokenSource(tokenSource))
	} else {
		// Fall back to default credentials
		client, err = resourcemanager.NewProjectsClient(ctx)
	}
	
	if err != nil {
		return nil, fmt.Errorf("failed to create resource manager client: %v", err)
	}
	defer client.Close()

	// Search projects (instead of list)
	req := &resourcemanagerpb.SearchProjectsRequest{}
	it := client.SearchProjects(ctx, req)
	
	var projects []Project
	for {
		project, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to search projects: %v", err)
		}
		
		// Only include active projects
		if project.State == resourcemanagerpb.Project_ACTIVE {
			displayName := project.DisplayName
			if displayName == "" {
				displayName = project.ProjectId
			}
			projects = append(projects, Project{
				ProjectId: project.ProjectId,
				Name:      displayName,
			})
		}
	}
	
	return projects, nil
}

// GetResources dynamically retrieves available resource types for a project
func (a *App) GetResources(projectId string) ([]ResourceType, error) {
	ctx := context.Background()
	
	// Create a logging admin client with authentication
	var client *logadmin.Client
	var err error
	
	if globalAccessToken != "" {
		// Use the stored access token
		tokenSource := oauth2.StaticTokenSource(&oauth2.Token{
			AccessToken: globalAccessToken,
		})
		client, err = logadmin.NewClient(ctx, projectId, option.WithTokenSource(tokenSource))
	} else {
		// Fall back to default credentials
		client, err = logadmin.NewClient(ctx, projectId)
	}
	
	if err != nil {
		return nil, fmt.Errorf("failed to create logging client: %v", err)
	}
	defer client.Close()

	// Use a map to group resources by type
	resourceMap := make(map[string]map[string]bool)
	
	// Query for monitored resources to discover what's actually available
	// We'll look at recent log entries to find active resources
	query := `timestamp >= "` + time.Now().Add(-24*time.Hour).Format(time.RFC3339) + `"`
	
	// List log entries with the query
	iter := client.Entries(ctx, logadmin.Filter(query))
	iter.PageInfo().MaxSize = 1000 // Limit to avoid too many API calls
	
	count := 0
	maxEntries := 1000 // Process up to 1000 entries to discover resources
	
	for count < maxEntries {
		entry, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			// If we can't access logs, fall back to common resource types
			return a.getFallbackResources(), nil
		}
		
		if entry.Resource != nil && entry.Resource.Type != "" {
			resourceType := entry.Resource.Type
			
			// Initialize the resource type map if it doesn't exist
			if resourceMap[resourceType] == nil {
				resourceMap[resourceType] = make(map[string]bool)
			}
			
			// Extract resource identifier from labels
			resourceId := a.extractResourceId(entry.Resource.Type, entry.Resource.Labels)
			if resourceId != "" {
				resourceMap[resourceType][resourceId] = true
			}
		}
		count++
	}
	
	// Convert map to ResourceType slice
	var resourceTypes []ResourceType
	for resourceType, resourceIds := range resourceMap {
		var resources []Resource
		for resourceId := range resourceIds {
			resources = append(resources, Resource{
				Id:   resourceId,
				Name: resourceId,
			})
		}
		
		if len(resources) > 0 {
			resourceTypes = append(resourceTypes, ResourceType{
				Type:      resourceType,
				Resources: resources,
			})
		}
	}
	
	// If no resources found, return fallback
	if len(resourceTypes) == 0 {
		return a.getFallbackResources(), nil
	}
	
	return resourceTypes, nil
}

// extractResourceId extracts a meaningful resource identifier from resource labels
func (a *App) extractResourceId(resourceType string, labels map[string]string) string {
	switch resourceType {
	case "gce_instance":
		if instanceId, ok := labels["instance_id"]; ok {
			return instanceId
		}
	case "k8s_container", "k8s_pod":
		// if podName, ok := labels["pod_name"]; ok {
		// 	return podName
		// }
		if containerName, ok := labels["container_name"]; ok {
			return containerName
		}
	case "cloud_function":
		if functionName, ok := labels["function_name"]; ok {
			return functionName
		}
	case "gae_app":
		if service, ok := labels["service"]; ok {
			if version, ok := labels["version"]; ok {
				return service + "-" + version
			}
			return service
		}
	case "cloud_sql_database":
		if databaseId, ok := labels["database_id"]; ok {
			return databaseId
		}
	case "cloud_run_revision":
		if serviceName, ok := labels["service_name"]; ok {
			return serviceName
		}
	case "pubsub_topic", "pubsub_subscription":
		if topicId, ok := labels["topic_id"]; ok {
			return topicId
		}
		if subscriptionId, ok := labels["subscription_id"]; ok {
			return subscriptionId
		}
	}
	
	// Fallback: try common label names
	for _, labelKey := range []string{"name", "resource_name", "id", "instance_name"} {
		if value, ok := labels[labelKey]; ok && value != "" {
			return value
		}
	}
	
	return "default"
}

// getFallbackResources returns common GCP resource types as fallback
func (a *App) getFallbackResources() []ResourceType {
	return []ResourceType{
		{
			Type: "gce_instance",
			Resources: []Resource{
				{Id: "default", Name: "default"},
			},
		},
		{
			Type: "k8s_container",
			Resources: []Resource{
				{Id: "default", Name: "default"},
			},
		},
		{
			Type: "cloud_function",
			Resources: []Resource{
				{Id: "default", Name: "default"},
			},
		},
		{
			Type: "gae_app",
			Resources: []Resource{
				{Id: "default", Name: "default"},
			},
		},
		{
			Type: "cloud_run_revision",
			Resources: []Resource{
				{Id: "default", Name: "default"},
			},
		},
	}
}

// GetLogs retrieves logs from GCP Logging using the actual API
func (a *App) GetLogs(params LogParams) (LogResponse, error) {
	ctx := context.Background()
	
	// Create a logging admin client with authentication
	var client *logadmin.Client
	var err error
	
	if globalAccessToken != "" {
		// Use the stored access token
		tokenSource := oauth2.StaticTokenSource(&oauth2.Token{
			AccessToken: globalAccessToken,
		})
		client, err = logadmin.NewClient(ctx, params.ProjectId, option.WithTokenSource(tokenSource))
	} else {
		// Fall back to default credentials
		client, err = logadmin.NewClient(ctx, params.ProjectId)
	}
	
	if err != nil {
		return LogResponse{}, fmt.Errorf("failed to create logging client: %v", err)
	}
	defer client.Close()

	// Build filter string
	var filterParts []string
	
	// Add resource type filter
	if params.ResourceType != "" && params.ResourceType != "all" {
		filterParts = append(filterParts, fmt.Sprintf(`resource.type="%s"`, params.ResourceType))
	}
	
	// Add specific resource filter
	if params.ResourceId != "" && params.ResourceId != "all" {
		// For k8s_container, filter by container_name
		if params.ResourceType == "k8s_container" {
			filterParts = append(filterParts, fmt.Sprintf(`resource.labels.container_name="%s"`, params.ResourceId))
		} else if params.ResourceType == "gce_instance" {
			filterParts = append(filterParts, fmt.Sprintf(`resource.labels.instance_id="%s"`, params.ResourceId))
		} else if params.ResourceType == "cloud_function" {
			filterParts = append(filterParts, fmt.Sprintf(`resource.labels.function_name="%s"`, params.ResourceId))
		} else if params.ResourceType == "gae_app" {
			// For GAE, the resource ID might be service-version format
			if strings.Contains(params.ResourceId, "-") {
				parts := strings.SplitN(params.ResourceId, "-", 2)
				if len(parts) == 2 {
					filterParts = append(filterParts, fmt.Sprintf(`resource.labels.service="%s"`, parts[0]))
					filterParts = append(filterParts, fmt.Sprintf(`resource.labels.version="%s"`, parts[1]))
				}
			} else {
				filterParts = append(filterParts, fmt.Sprintf(`resource.labels.service="%s"`, params.ResourceId))
			}
		} else if params.ResourceType == "cloud_run_revision" {
			filterParts = append(filterParts, fmt.Sprintf(`resource.labels.service_name="%s"`, params.ResourceId))
		} else if params.ResourceType == "cloud_sql_database" {
			filterParts = append(filterParts, fmt.Sprintf(`resource.labels.database_id="%s"`, params.ResourceId))
		} else {
			// Generic fallback - try common label names
			filterParts = append(filterParts, fmt.Sprintf(`(resource.labels.name="%s" OR resource.labels.resource_name="%s" OR resource.labels.id="%s" OR resource.labels.instance_name="%s")`, params.ResourceId, params.ResourceId, params.ResourceId, params.ResourceId))
		}
	}
	
	// Add severity filter
	if params.Severity != "" && params.Severity != "all" {
		filterParts = append(filterParts, fmt.Sprintf(`severity>="%s"`, strings.ToUpper(params.Severity)))
	}
	
	// Add time range filter
	if params.StartTime != "" {
		filterParts = append(filterParts, fmt.Sprintf(`timestamp>="%s"`, params.StartTime))
	}
	if params.EndTime != "" {
		filterParts = append(filterParts, fmt.Sprintf(`timestamp<="%s"`, params.EndTime))
	}
	
	// For incremental fetching, use lastTimestamp as startTime
	if params.LastTimestamp != "" {
		filterParts = append(filterParts, fmt.Sprintf(`timestamp>"%s"`, params.LastTimestamp))
	}
	
	// Add custom filter if provided
	if params.Filter != "" {
		filterParts = append(filterParts, params.Filter)
	}
	
	// Add JSON payload filter if requested
	if params.JsonOnly {
		filterParts = append(filterParts, "jsonPayload:*")
	}
	
	// Combine all filter parts
	filterString := strings.Join(filterParts, " AND ")
	
	// Set default limit if not provided
	if params.Limit == 0 {
		params.Limit = 100
	}
	
	// Create iterator with filter and options
	iter := client.Entries(ctx, logadmin.Filter(filterString))
	
	// Set page size
	iter.PageInfo().MaxSize = params.Limit
	
	// Handle pagination token
	if params.PageToken != "" {
		iter.PageInfo().Token = params.PageToken
	}
	
	var logs []LogEntry
	count := 0
	
	// Iterate through log entries
	for count < params.Limit {
		entry, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return LogResponse{}, fmt.Errorf("failed to fetch log entries: %v", err)
		}
		
		// Convert log entry to our format
		logEntry := LogEntry{
			Timestamp: entry.Timestamp.Format(time.RFC3339),
			Severity:  entry.Severity.String(),
		}
		
		// Handle different payload types
		var message string
		var jsonPayload map[string]interface{}
		var textPayload string
		
		if entry.Payload != nil {
			// Handle different payload types from GCP logging
			switch payload := entry.Payload.(type) {
			case string:
				// Simple string payload
				message = payload
				textPayload = payload
			default:
				// For structured payloads, try to extract meaningful data
				payloadStr := fmt.Sprintf("%v", entry.Payload)
				
				// Add debug information to help understand the payload structure
				debugInfo := map[string]interface{}{
					"_debug_payload_type": fmt.Sprintf("%T", entry.Payload),
					"_debug_payload_raw":  payloadStr,
				}
				
				// Check if it looks like structured data (contains "fields:" pattern)
				if strings.Contains(payloadStr, "fields:") {
					// This is likely a structured payload, try to extract JSON
					jsonPayload = a.parseStructuredPayload(payloadStr)
					if jsonPayload != nil {
						// Add debug info to the parsed payload
						for k, v := range debugInfo {
							jsonPayload[k] = v
						}
						
						// Try to extract message from common fields
						if msg, ok := jsonPayload["Message"].(string); ok {
							message = msg
						} else if msg, ok := jsonPayload["message"].(string); ok {
							message = msg
						} else if msg, ok := jsonPayload["msg"].(string); ok {
							message = msg
						} else if msg, ok := jsonPayload["text"].(string); ok {
							message = msg
						} else if msg, ok := jsonPayload["content"].(string); ok {
							message = msg
						} else {
							// If no obvious message field, create a summary
							message = fmt.Sprintf("Structured log with %d fields", len(jsonPayload))
						}
					} else {
						// If parsing failed, create a debug payload
						jsonPayload = debugInfo
						message = payloadStr
						textPayload = payloadStr
					}
				} else {
					// Simple payload that's not a string - still add debug info
					jsonPayload = debugInfo
					message = payloadStr
					textPayload = payloadStr
				}
			}
		}
		
		logEntry.Message = message
		logEntry.TextPayload = textPayload
		if jsonPayload != nil {
			logEntry.JsonPayload = jsonPayload
		}
		
		// Add resource information if available
		if entry.Resource != nil {
			logEntry.Resource = map[string]interface{}{
				"type":   entry.Resource.Type,
				"labels": entry.Resource.Labels,
			}
		}
		
		logs = append(logs, logEntry)
		count++
	}
	
	// Get next page token from iterator for the next request
	nextPageToken := iter.PageInfo().Token
	
	// Check if there are more logs
	// We have more logs if we got exactly the limit requested
	hasMore := len(logs) == params.Limit
	
	return LogResponse{
		Logs:          logs,
		NextPageToken: nextPageToken,
		HasMore:       hasMore,
	}, nil
}

// extractGCPStructuredPayload extracts structured data from GCP's nested payload format
func (a *App) extractGCPStructuredPayload(payload map[string]interface{}) map[string]interface{} {
	// Handle GCP's structured logging format with nested fields
	if fields, ok := payload["fields"]; ok {
		if fieldsMap, ok := fields.(map[string]interface{}); ok {
			result := make(map[string]interface{})
			
			for key, value := range fieldsMap {
				if valueMap, ok := value.(map[string]interface{}); ok {
					// Handle different value types in GCP's structure
					if structValue, ok := valueMap["struct_value"]; ok {
						if structMap, ok := structValue.(map[string]interface{}); ok {
							if structFields, ok := structMap["fields"]; ok {
								if structFieldsMap, ok := structFields.(map[string]interface{}); ok {
									// Recursively extract nested structure
									nestedResult := make(map[string]interface{})
									for nestedKey, nestedValue := range structFieldsMap {
										if nestedValueMap, ok := nestedValue.(map[string]interface{}); ok {
											if stringValue, ok := nestedValueMap["string_value"]; ok {
												nestedResult[nestedKey] = stringValue
											} else if numberValue, ok := nestedValueMap["number_value"]; ok {
												nestedResult[nestedKey] = numberValue
											} else if boolValue, ok := nestedValueMap["bool_value"]; ok {
												nestedResult[nestedKey] = boolValue
											}
										}
									}
									result[key] = nestedResult
								}
							}
						}
					} else if stringValue, ok := valueMap["string_value"]; ok {
						result[key] = stringValue
					} else if numberValue, ok := valueMap["number_value"]; ok {
						result[key] = numberValue
					} else if boolValue, ok := valueMap["bool_value"]; ok {
						result[key] = boolValue
					}
				}
			}
			
			// If we found structured data, flatten the Contents field if it exists
			if contents, ok := result["Contents"]; ok {
				if contentsMap, ok := contents.(map[string]interface{}); ok {
					// Merge Contents fields into the main result for easier access
					for k, v := range contentsMap {
						result[k] = v
					}
				}
			}
			
			return result
		}
	}
	
	// If it's not the expected GCP structure, return the original payload
	return payload
}

// parseStructuredPayload parses the string representation of GCP structured payload
func (a *App) parseStructuredPayload(payloadStr string) map[string]interface{} {
	// This parser extracts ALL fields from the GCP structured payload format
	// The format looks like: fields:{key:"Contents" value:{struct_value:{fields:{...}}}}
	
	result := make(map[string]interface{})
	
	// First, try to extract all top-level fields
	topLevelFields := a.extractTopLevelFields(payloadStr)
	for key, value := range topLevelFields {
		result[key] = value
	}
	
	// Look for the Contents field which contains the actual log data
	if strings.Contains(payloadStr, `key:"Contents"`) {
		// Extract the Contents section
		contentsStart := strings.Index(payloadStr, `key:"Contents"`)
		if contentsStart != -1 {
			// Find the struct_value section within Contents
			structStart := strings.Index(payloadStr[contentsStart:], "struct_value:")
			if structStart != -1 {
				structStart += contentsStart
				// Extract key-value pairs from the struct
				remaining := payloadStr[structStart:]
				
				// Dynamically extract ALL fields instead of just predefined ones
				extractedFields := a.extractAllFieldsFromStructure(remaining)
				
				// Add all extracted fields to result, with Contents prefix for clarity
				contentsData := make(map[string]interface{})
				for key, value := range extractedFields {
					contentsData[key] = value
					// Also add to top level for easier access
					result[key] = value
				}
				
				// Keep the original Contents structure as well
				if len(contentsData) > 0 {
					result["Contents"] = contentsData
				}
			}
		}
	}
	
	// Try alternative parsing methods for different GCP log formats
	if len(result) == 0 {
		// Try parsing as direct field extraction
		directFields := a.extractDirectFields(payloadStr)
		for key, value := range directFields {
			result[key] = value
		}
	}
	
	// If we still haven't found anything, try regex-based extraction
	if len(result) == 0 {
		regexFields := a.extractFieldsWithRegex(payloadStr)
		for key, value := range regexFields {
			result[key] = value
		}
	}
	
	// If we found any structured data, return it
	if len(result) > 0 {
		return result
	}
	
	return nil
}

// extractDirectFields tries to extract fields using direct string matching
func (a *App) extractDirectFields(payloadStr string) map[string]interface{} {
	result := make(map[string]interface{})
	
	// Common field patterns in GCP logs
	commonFields := []string{
		"Message", "RequestJson", "ResponseJson", "RequestTime", 
		"ResponseTime", "Level", "Source", "Topic", "UniqueID",
		"ServerHost", "FromUrl", "method", "status", "duration",
		"user", "ip", "userAgent", "referer", "requestId",
	}
	
	for _, fieldName := range commonFields {
		// Try multiple patterns for each field
		patterns := []string{
			fmt.Sprintf(`key:"%s" value:{string_value:"`, fieldName),
			fmt.Sprintf(`"%s":"`, fieldName),
			fmt.Sprintf(`%s:`, fieldName),
		}
		
		for _, pattern := range patterns {
			if value := a.extractValueAfterPattern(payloadStr, pattern); value != "" {
				result[fieldName] = value
				break
			}
		}
	}
	
	return result
}

// extractValueAfterPattern extracts a quoted string value after a given pattern
func (a *App) extractValueAfterPattern(str, pattern string) string {
	start := strings.Index(str, pattern)
	if start == -1 {
		return ""
	}
	
	valueStart := start + len(pattern)
	
	// Look for the closing quote or delimiter
	var valueEnd int
	if strings.HasSuffix(pattern, `"`) {
		// Pattern ends with quote, look for closing quote
		valueEnd = a.findClosingQuote(str, valueStart)
	} else {
		// Look for common delimiters
		for i := valueStart; i < len(str); i++ {
			if str[i] == '"' || str[i] == ',' || str[i] == '}' || str[i] == ' ' || str[i] == '\n' {
				valueEnd = i
				break
			}
		}
	}
	
	if valueEnd > valueStart {
		value := str[valueStart:valueEnd]
		return a.unescapeString(strings.Trim(value, `"`))
	}
	
	return ""
}

// extractFieldsWithRegex uses regex patterns to extract fields as a last resort
func (a *App) extractFieldsWithRegex(payloadStr string) map[string]interface{} {
	result := make(map[string]interface{})
	
	// Simple key-value extraction patterns
	// This is a simplified approach - in a real implementation you might want to use proper regex
	lines := strings.Split(payloadStr, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		// Look for key:value patterns
		if colonIndex := strings.Index(line, ":"); colonIndex != -1 {
			key := strings.TrimSpace(line[:colonIndex])
			value := strings.TrimSpace(line[colonIndex+1:])
			
			// Clean up the key and value
			key = strings.Trim(key, `"`)
			value = strings.Trim(value, `"`)
			
			if key != "" && value != "" && len(key) < 50 { // Reasonable key length
				result[key] = value
			}
		}
	}
	
	return result
}

// extractAllFieldsFromStructure dynamically extracts all fields from the structured payload
func (a *App) extractAllFieldsFromStructure(structureStr string) map[string]interface{} {
	result := make(map[string]interface{})
	
	// Find all key-value pairs in the structure
	// Pattern: key:"FieldName" value:{...}
	keyPattern := `key:"`
	pos := 0
	
	for {
		keyStart := strings.Index(structureStr[pos:], keyPattern)
		if keyStart == -1 {
			break
		}
		keyStart += pos
		
		// Extract the field name
		keyNameStart := keyStart + len(keyPattern)
		keyNameEnd := strings.Index(structureStr[keyNameStart:], `"`)
		if keyNameEnd == -1 {
			break
		}
		keyNameEnd += keyNameStart
		fieldName := structureStr[keyNameStart:keyNameEnd]
		
		// Find the value part
		valueStart := strings.Index(structureStr[keyNameEnd:], "value:{")
		if valueStart == -1 {
			pos = keyNameEnd + 1
			continue
		}
		valueStart += keyNameEnd
		
		// Extract the value based on its type
		var fieldValue interface{}
		
		// Check for string_value with improved parsing
		if stringValuePos := strings.Index(structureStr[valueStart:], "string_value:"); stringValuePos != -1 {
			stringValuePos += valueStart
			// Look for the opening quote
			if quoteStart := strings.Index(structureStr[stringValuePos:], `"`); quoteStart != -1 {
				quoteStart += stringValuePos + 1
				// Find the closing quote, handling escaped quotes
				quoteEnd := a.findClosingQuote(structureStr, quoteStart)
				if quoteEnd != -1 {
					rawValue := structureStr[quoteStart:quoteEnd]
					// Unescape the string value
					fieldValue = a.unescapeString(rawValue)
				}
			}
		} else if numberValuePos := strings.Index(structureStr[valueStart:], "number_value:"); numberValuePos != -1 {
			// Handle number values with better parsing
			numberValuePos += valueStart + len("number_value:")
			// Find the end of the number (space, } or end of string)
			numberEnd := numberValuePos
			for numberEnd < len(structureStr) && 
				structureStr[numberEnd] != ' ' && 
				structureStr[numberEnd] != '}' && 
				structureStr[numberEnd] != '\n' {
				numberEnd++
			}
			if numberEnd > numberValuePos {
				fieldValue = strings.TrimSpace(structureStr[numberValuePos:numberEnd])
			}
		} else if boolValuePos := strings.Index(structureStr[valueStart:], "bool_value:"); boolValuePos != -1 {
			// Handle boolean values with better parsing
			boolValuePos += valueStart + len("bool_value:")
			// Find the end of the boolean value
			boolEnd := boolValuePos
			for boolEnd < len(structureStr) && 
				structureStr[boolEnd] != ' ' && 
				structureStr[boolEnd] != '}' && 
				structureStr[boolEnd] != '\n' {
				boolEnd++
			}
			if boolEnd > boolValuePos {
				boolStr := strings.TrimSpace(structureStr[boolValuePos:boolEnd])
				fieldValue = boolStr == "true"
			}
		}
		
		// Add the field to result if we extracted a value
		if fieldValue != nil {
			result[fieldName] = fieldValue
		}
		
		pos = valueStart + 1
	}
	
	return result
}

// findClosingQuote finds the closing quote, handling escaped quotes
func (a *App) findClosingQuote(str string, start int) int {
	for i := start; i < len(str); i++ {
		if str[i] == '"' {
			// Check if this quote is escaped
			escapeCount := 0
			for j := i - 1; j >= start && str[j] == '\\'; j-- {
				escapeCount++
			}
			// If even number of backslashes (including 0), the quote is not escaped
			if escapeCount%2 == 0 {
				return i
			}
		}
	}
	return -1
}

// unescapeString unescapes common escape sequences in strings
func (a *App) unescapeString(str string) string {
	// Handle common escape sequences
	str = strings.ReplaceAll(str, `\"`, `"`)
	str = strings.ReplaceAll(str, `\\`, `\`)
	str = strings.ReplaceAll(str, `\n`, "\n")
	str = strings.ReplaceAll(str, `\r`, "\r")
	str = strings.ReplaceAll(str, `\t`, "\t")
	return str
}

// extractTopLevelFields extracts any top-level fields that might exist outside of Contents
func (a *App) extractTopLevelFields(payloadStr string) map[string]interface{} {
	result := make(map[string]interface{})
	
	// Look for top-level fields pattern: fields:{key:"FieldName" value:{...}}
	if fieldsStart := strings.Index(payloadStr, "fields:{"); fieldsStart != -1 {
		// Extract everything within the main fields block
		fieldsContent := payloadStr[fieldsStart:]
		
		// Find all top-level keys that are not "Contents"
		keyPattern := `key:"`
		pos := 0
		
		for {
			keyStart := strings.Index(fieldsContent[pos:], keyPattern)
			if keyStart == -1 {
				break
			}
			keyStart += pos
			
			// Extract the field name
			keyNameStart := keyStart + len(keyPattern)
			keyNameEnd := strings.Index(fieldsContent[keyNameStart:], `"`)
			if keyNameEnd == -1 {
				break
			}
			keyNameEnd += keyNameStart
			fieldName := fieldsContent[keyNameStart:keyNameEnd]
			
			// Skip Contents field as it's handled separately
			if fieldName == "Contents" {
				pos = keyNameEnd + 1
				continue
			}
			
			// Extract the value for this top-level field
			valueStart := strings.Index(fieldsContent[keyNameEnd:], "value:{")
			if valueStart == -1 {
				pos = keyNameEnd + 1
				continue
			}
			valueStart += keyNameEnd
			
			// Extract value based on type (similar to extractAllFieldsFromStructure)
			var fieldValue interface{}
			
			if stringValuePos := strings.Index(fieldsContent[valueStart:], "string_value:"); stringValuePos != -1 {
				stringValuePos += valueStart
				if quoteStart := strings.Index(fieldsContent[stringValuePos:], `"`); quoteStart != -1 {
					quoteStart += stringValuePos + 1
					if quoteEnd := strings.Index(fieldsContent[quoteStart:], `"`); quoteEnd != -1 {
						quoteEnd += quoteStart
						fieldValue = fieldsContent[quoteStart:quoteEnd]
					}
				}
			}
			
			if fieldValue != nil {
				result[fieldName] = fieldValue
			}
			
			pos = valueStart + 1
		}
	}
	
	return result
}

// extractFieldValue extracts a string value for a given field from the structured payload string
func extractFieldValue(payload, fieldName string) string {
	// Look for pattern: key:"FieldName" value:{string_value:"actual_value"}
	pattern := fmt.Sprintf(`key:"%s"`, fieldName)
	start := strings.Index(payload, pattern)
	if start == -1 {
		return ""
	}
	
	// Find the string_value part
	stringValueStart := strings.Index(payload[start:], "string_value:")
	if stringValueStart == -1 {
		return ""
	}
	stringValueStart += start + len("string_value:")
	
	// Find the quoted value
	quoteStart := strings.Index(payload[stringValueStart:], `"`)
	if quoteStart == -1 {
		return ""
	}
	quoteStart += stringValueStart + 1
	
	// Find the closing quote
	quoteEnd := strings.Index(payload[quoteStart:], `"`)
	if quoteEnd == -1 {
		return ""
	}
	quoteEnd += quoteStart
	
	return payload[quoteStart:quoteEnd]
}

// CheckGcloudAuth checks if user is authenticated with gcloud or has a valid token
func (a *App) CheckGcloudAuth() (bool, error) {
	// First check if we have a stored token
	if globalAccessToken != "" {
		// Validate the stored token
		isValid, _ := a.ValidateToken(globalAccessToken)
		if isValid {
			return true, nil
		} else {
			// Token is invalid, clear it
			globalAccessToken = ""
			os.Setenv("GOOGLE_OAUTH_ACCESS_TOKEN", "")
		}
	}
	
	// Fallback to gcloud CLI method
	cmd := exec.Command("gcloud", "auth", "print-access-token")
	output, err := cmd.Output()
	if err != nil {
		return false, nil // Not authenticated or gcloud not installed
	}
	
	// Check if output contains a valid token (non-empty and not an error message)
	token := strings.TrimSpace(string(output))
	if token == "" || strings.Contains(token, "ERROR") {
		return false, nil
	}
	
	return true, nil
}

// LoginWithGcloud initiates gcloud authentication
func (a *App) LoginWithGcloud() error {
	cmd := exec.Command("gcloud", "auth", "login", "--no-launch-browser")
	err := cmd.Run()
	if err != nil {
		return fmt.Errorf("failed to login with gcloud: %v", err)
	}
	return nil
}

// GetCurrentUser returns the current authenticated user
func (a *App) GetCurrentUser() (string, error) {
	// If we have a token stored, try to get user info from token first
	if globalAccessToken != "" {
		user, err := a.GetCurrentUserFromToken()
		if err == nil && user != "" {
			return user, nil
		}
	}
	
	// Fallback to gcloud CLI method
	cmd := exec.Command("gcloud", "auth", "list", "--filter=status:ACTIVE", "--format=value(account)")
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get current user: %v", err)
	}
	
	user := strings.TrimSpace(string(output))
	if user == "" {
		return "", fmt.Errorf("no active user found")
	}
	
	return user, nil
}



// Global variable to store the access token
var globalAccessToken string

// ValidateToken validates a Google Cloud access token
func (a *App) ValidateToken(token string) (bool, error) {
	if token == "" {
		return false, fmt.Errorf("token is empty")
	}
	
	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	
	// Create request to validate token against Cloud Resource Manager API
	req, err := http.NewRequest("GET", "https://cloudresourcemanager.googleapis.com/v1/projects?pageSize=1", nil)
	if err != nil {
		return false, fmt.Errorf("failed to create request: %v", err)
	}
	
	// Set authorization header
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	
	// Make the request
	resp, err := client.Do(req)
	if err != nil {
		return false, nil // Network error or token invalid
	}
	defer resp.Body.Close()
	
	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, nil // Failed to read response
	}
	
	// Check HTTP status code
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return false, nil // Token is invalid
	}
	
	// Check if response is valid JSON
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return false, nil // Invalid JSON response
	}
	
	// Check for error in response
	if _, exists := result["error"]; exists {
		return false, nil // API returned an error
	}
	
	// If we get here, the token is valid
	return true, nil
}

// LoginWithToken sets the access token for authentication
func (a *App) LoginWithToken(token string) error {
	if token == "" {
		return fmt.Errorf("token is empty")
	}
	
	// Store the token globally
	globalAccessToken = token
	
	// Set the token as an environment variable for Google Cloud client libraries
	// This allows the Google Cloud Go client libraries to use this token
	os.Setenv("GOOGLE_OAUTH_ACCESS_TOKEN", token)
	
	return nil
}

// UserInfo represents the user information from Google OAuth2 API
type UserInfo struct {
	Email         string `json:"email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	VerifiedEmail bool   `json:"verified_email"`
}

// GetCurrentUserFromToken gets user info from the access token
func (a *App) GetCurrentUserFromToken() (string, error) {
	if globalAccessToken == "" {
		return "", fmt.Errorf("no access token available")
	}
	
	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	
	// Create request to get user info from Google's OAuth2 API
	req, err := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}
	
	// Set authorization header
	req.Header.Set("Authorization", "Bearer "+globalAccessToken)
	req.Header.Set("Content-Type", "application/json")
	
	// Make the request
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to get user info: %v", err)
	}
	defer resp.Body.Close()
	
	// Check HTTP status code
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to get user info, status code: %d", resp.StatusCode)
	}
	
	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %v", err)
	}
	
	// Parse JSON response
	var userInfo UserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return "", fmt.Errorf("failed to parse user info: %v", err)
	}
	
	// Return email if available, otherwise return name
	if userInfo.Email != "" {
		return userInfo.Email, nil
	} else if userInfo.Name != "" {
		return userInfo.Name, nil
	}
	
	return "token-user", nil // Fallback if we can't extract user info
}