import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'

interface JsonViewerProps {
  data: any
  level?: number
  parentKey?: string
}

interface CopyState {
  [key: string]: boolean
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data, level = 0, parentKey = '' }) => {
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({})
  const [copyStates, setCopyStates] = useState<CopyState>({})

  // Filter out unwanted fields from JSON logs
  const filterUnwantedFields = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => filterUnwantedFields(item))
    }

    const filtered: any = {}
    const fieldsToRemove = ['Contents', '_debug_payload_type', '_debug_payload_raw']
    
    for (const [key, value] of Object.entries(obj)) {
      if (!fieldsToRemove.includes(key)) {
        filtered[key] = filterUnwantedFields(value)
      }
    }
    
    return filtered
  }

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const copyToClipboard = async (value: any, key: string) => {
    try {
      const textToCopy = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      await navigator.clipboard.writeText(textToCopy)
      setCopyStates(prev => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setCopyStates(prev => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const tryParseJson = (value: string) => {
    // Skip empty strings or very short strings
    if (!value || value.length < 2) {
      return null
    }

    // Trim whitespace
    let trimmed = value.trim()
    
    // Handle various JSON string formats
    const jsonPatterns = [
      // Original string
      trimmed,
      // Remove outer quotes if present
      trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : null,
      // Handle escaped JSON
      trimmed.replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
      // Handle double-escaped JSON
      trimmed.replace(/\\\\"/g, '\\"').replace(/\\\\\\\\/g, '\\\\'),
      // Handle URL-encoded JSON
      decodeURIComponent(trimmed.replace(/\+/g, ' ')),
    ].filter(Boolean)

    for (const pattern of jsonPatterns) {
      if (!pattern) continue
      
      const cleaned = pattern.trim()
      
      // Check if it looks like JSON (starts with { or [)
      if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        continue
      }

      try {
        const parsed = JSON.parse(cleaned)
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed
        }
      } catch {
        // Continue to next pattern
        continue
      }
    }

    return null
  }

  const renderValue = (value: any, key: string, fullKey: string) => {
    if (value === null) {
      return (
        <span className="flex items-center gap-2">
          <span className="text-gray-500 italic">null</span>
          <CopyButton value={value} copyKey={fullKey} />
        </span>
      )
    }

    if (typeof value === 'boolean') {
      return (
        <span className="flex items-center gap-2">
          <span className={value ? 'text-green-600' : 'text-red-600'}>
            {value.toString()}
          </span>
          <CopyButton value={value} copyKey={fullKey} />
        </span>
      )
    }

    if (typeof value === 'number') {
      return (
        <span className="flex items-center gap-2">
          <span className="text-blue-600">{value}</span>
          <CopyButton value={value} copyKey={fullKey} />
        </span>
      )
    }

    if (typeof value === 'string') {
      // Try to parse as JSON if it looks like JSON
      const parsedJson = tryParseJson(value)
      if (parsedJson) {
        const isCollapsed = collapsed[fullKey]
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleCollapse(fullKey)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              >
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span className="text-purple-600">JSON String</span>
              </button>
              <CopyButton value={value} copyKey={fullKey} />
            </div>
            {!isCollapsed && (
              <div className="ml-0.5 border-l-2 border-gray-200 pl-0.5">
                <JsonViewer data={parsedJson} level={level + 1} parentKey={fullKey} />
              </div>
            )}
            {isCollapsed && (
              <div className="ml-0.5 text-xs text-gray-500 truncate max-w-md">
                {value.substring(0, 100)}...
              </div>
            )}
          </div>
        )
      }

      // Check if it looks like incomplete JSON
      const trimmed = value.trim()
      if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 2) {
        const isCollapsed = collapsed[fullKey]
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleCollapse(fullKey)}
                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800"
              >
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span className="text-orange-600">Incomplete JSON</span>
              </button>
              <CopyButton value={value} copyKey={fullKey} />
            </div>
            {!isCollapsed && (
              <div className="ml-0.5 border-l-2 border-orange-200 pl-0.5">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap break-all font-mono bg-orange-50 p-2 rounded">
                  {value}
                </pre>
              </div>
            )}
            {isCollapsed && (
              <div className="ml-0.5 text-xs text-orange-500 truncate max-w-md">
                {value.substring(0, 100)}...
              </div>
            )}
          </div>
        )
      }

      // Empty string
      if (value === '') {
        return (
          <span className="flex items-center gap-2">
            <span className="text-gray-400 italic">&quot;&quot;</span>
            <CopyButton value={value} copyKey={fullKey} />
          </span>
        )
      }

      // Regular string
      return (
        <span className="flex items-center gap-2">
          <span className="text-green-700 break-all">&quot;{value}&quot;</span>
          <CopyButton value={value} copyKey={fullKey} />
        </span>
      )
    }

    if (Array.isArray(value)) {
      const isCollapsed = collapsed[fullKey]
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleCollapse(fullKey)}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
            >
              {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>Array ({value.length} items)</span>
            </button>
            <CopyButton value={value} copyKey={fullKey} />
          </div>
          {!isCollapsed && (
            <div className="ml-0.5 border-l-2 border-gray-200 pl-0.5 space-y-1">
              {value.map((item, index) => (
                <div key={index} className="flex gap-1">
                  <span className="text-xs text-gray-500 min-w-[20px]">[{index}]:</span>
                  <div className="flex-1">
                    {renderValue(item, index.toString(), `${fullKey}[${index}]`)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (typeof value === 'object') {
      const isCollapsed = collapsed[fullKey]
      const keys = Object.keys(value)
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleCollapse(fullKey)}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
            >
              {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>Object ({keys.length} keys)</span>
            </button>
            <CopyButton value={value} copyKey={fullKey} />
          </div>
          {!isCollapsed && (
            <div className="ml-0.5 border-l-2 border-gray-200 pl-0.5 space-y-1">
              {keys.map(objKey => (
                <div key={objKey} className="flex gap-1">
                  <span className="text-xs text-blue-800 font-medium min-w-fit">&quot;{objKey}&quot;:</span>
                  <div className="flex-1">
                    {renderValue(value[objKey], objKey, `${fullKey}.${objKey}`)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <span className="flex items-center gap-2">
        <span className="text-gray-600">{String(value)}</span>
        <CopyButton value={value} copyKey={fullKey} />
      </span>
    )
  }

  const CopyButton: React.FC<{ value: any; copyKey: string }> = ({ value, copyKey }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(value, copyKey)}
      className={`h-5 w-5 p-0 ${copyStates[copyKey] ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
      title="Copy value"
    >
      {copyStates[copyKey] ? (
        <Check className="w-3 h-3" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </Button>
  )

  // Apply filtering to the data
  const filteredData = filterUnwantedFields(data)

  if (typeof filteredData !== 'object' || filteredData === null) {
    return <div className="text-sm">{renderValue(filteredData, '', 'root')}</div>
  }

  const keys = Object.keys(filteredData)
  
  return (
    <div className="text-sm space-y-1 font-mono">
      {keys.map(key => (
        <div key={key} className="flex gap-1">
          <span className="text-blue-800 font-medium min-w-fit">&quot;{key}&quot;:</span>
          <div className="flex-1">
            {renderValue(filteredData[key], key, key)}
          </div>
        </div>
      ))}
    </div>
  )
}

export default JsonViewer