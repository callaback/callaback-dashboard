"use client"

import { useState, useCallback, useEffect } from "react"
import { 
  Upload, 
  File, 
  Image, 
  Video, 
  Music, 
  Archive, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  ExternalLink,
  FolderPlus,
  RefreshCw,
  Link,
  HardDrive
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface StorageFile {
  name: string
  id?: string
  created_at?: string
  updated_at?: string
  size?: number
  type?: string
  url: string
}

interface StorageDropzoneProps {
  bucketName?: string
  folderPath?: string
  maxSize?: number // in MB
  allowedTypes?: string[]
  onFileUploaded?: (file: StorageFile) => void
  onFileDeleted?: (fileName: string) => void
  className?: string
}

export function StorageDropzone({ 
  bucketName = "base",
  folderPath = "",
  maxSize = 50, // 50MB default
  allowedTypes = ["image/*", "application/pdf", "text/*"],
  onFileUploaded,
  onFileDeleted,
  className
}: StorageDropzoneProps) {
  const [files, setFiles] = useState<StorageFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedFile, setCopiedFile] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [showNewFolder, setShowNewFolder] = useState(false)
  
  const supabase = createClient()
  const { toast } = useToast()

  // Fetch existing files
  const fetchFiles = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(folderPath)
      
      if (error) throw error
      
      const fileList: StorageFile[] = (data || [])
        .filter(item => item.name !== ".emptyFolderPlaceholder")
        .map(item => ({
          name: item.name,
          id: item.id,
          created_at: item.created_at,
          updated_at: item.updated_at,
          size: item.metadata?.size,
          type: item.metadata?.mimetype,
          url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${folderPath ? folderPath + '/' : ''}${item.name}`
        }))
      
      setFiles(fileList)
    } catch (error) {
      console.error("Error fetching files:", error)
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [bucketName, folderPath, supabase, toast])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  // Handle file drop
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    await handleFiles(droppedFiles)
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    await handleFiles(selectedFiles)
    e.target.value = "" // Reset input
  }, [])

  // Process and upload files
  const handleFiles = async (fileList: File[]) => {
    if (fileList.length === 0) return
    
    const validFiles = fileList.filter(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds ${maxSize}MB limit`,
          variant: "destructive"
        })
        return false
      }
      
      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          const category = type.split('/')[0]
          return file.type.startsWith(`${category}/`)
        }
        return file.type === type
      })) {
        toast({
          title: "File type not allowed",
          description: `${file.name} type is not supported`,
          variant: "destructive"
        })
        return false
      }
      
      return true
    })
    
    if (validFiles.length === 0) return
    
    setIsUploading(true)
    
    for (const file of validFiles) {
      try {
        const filePath = folderPath ? `${folderPath}/${file.name}` : file.name
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
            onUploadProgress: (progress) => {
              const percent = Math.round((progress.loaded / progress.total) * 100)
              setUploadProgress(prev => ({ ...prev, [file.name]: percent }))
            }
          })
        
        if (error) throw error
        
        const publicUrl = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath).data.publicUrl
        
        const newFile: StorageFile = {
          name: file.name,
          url: publicUrl,
          size: file.size,
          type: file.type
        }
        
        setFiles(prev => [...prev, newFile])
        onFileUploaded?.(newFile)
        
        toast({
          title: "Upload successful",
          description: `${file.name} uploaded successfully`,
        })
        
      } catch (error) {
        console.error("Upload error:", error)
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        })
      } finally {
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[file.name]
          return newProgress
        })
      }
    }
    
    setIsUploading(false)
  }

  // Delete file
  const handleDelete = async (fileName: string) => {
    try {
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath])
      
      if (error) throw error
      
      setFiles(prev => prev.filter(file => file.name !== fileName))
      onFileDeleted?.(fileName)
      
      toast({
        title: "File deleted",
        description: `${fileName} has been deleted`,
      })
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Delete failed",
        description: `Failed to delete ${fileName}`,
        variant: "destructive"
      })
    }
  }

  // Copy URL to clipboard
  const copyToClipboard = async (url: string, fileName: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedFile(fileName)
      setTimeout(() => setCopiedFile(null), 2000)
      
      toast({
        title: "Copied!",
        description: "URL copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy URL",
        variant: "destructive"
      })
    }
  }

  // Download file
  const downloadFile = async (file: StorageFile) => {
    try {
      const response = await fetch(file.url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      toast({
        title: "Download failed",
        description: `Failed to download ${file.name}`,
        variant: "destructive"
      })
    }
  }

  // Create new folder
  const createFolder = async () => {
    if (!newFolderName.trim()) return
    
    try {
      const folderPathWithName = folderPath ? `${folderPath}/${newFolderName}` : newFolderName
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(`${folderPathWithName}/.emptyFolderPlaceholder`, new Blob())
      
      if (error) throw error
      
      toast({
        title: "Folder created",
        description: `Folder "${newFolderName}" created`,
      })
      
      setNewFolderName("")
      setShowNewFolder(false)
      fetchFiles()
    } catch (error) {
      toast({
        title: "Folder creation failed",
        description: "Failed to create folder",
        variant: "destructive"
      })
    }
  }

  const getFileIcon = (type?: string) => {
    if (!type) return <File className="h-4 w-4" />
    if (type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />
    if (type.startsWith('video/')) return <Video className="h-4 w-4 text-purple-500" />
    if (type.startsWith('audio/')) return <Music className="h-4 w-4 text-green-500" />
    if (type.includes('zip') || type.includes('compressed')) return <Archive className="h-4 w-4 text-orange-500" />
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Storage
            <Badge variant="outline" className="text-xs font-normal">
              {bucketName}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={fetchFiles}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowNewFolder(true)}>
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => document.getElementById('file-input')?.click()}>
                  Upload Files
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {folderPath && (
          <div className="text-xs text-muted-foreground truncate mt-1">
            Path: /{folderPath}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 p-4">
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* New Folder Input */}
          {showNewFolder && (
            <div className="p-3 border rounded-lg bg-secondary/30 shrink-0">
              <div className="flex items-center gap-2">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                />
                <Button size="sm" onClick={createFolder}>
                  Create
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowNewFolder(false)
                    setNewFolderName("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Dropzone Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors shrink-0",
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/30 hover:border-muted-foreground/50"
            )}
            onDragEnter={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault()
              setIsDragging(false)
            }}
            onDrop={handleDrop}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground mb-3">
              Max size: {maxSize}MB • Supports: {allowedTypes.join(', ')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('file-input')?.click()}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Select Files"}
            </Button>
            <input
              id="file-input"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept={allowedTypes.join(',')}
            />
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-2 shrink-0">
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate">{fileName}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1" />
                </div>
              ))}
            </div>
          )}

          {/* Files List */}
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Files ({files.length})
              </span>
              <span className="text-xs text-muted-foreground">
                Total: {formatFileSize(files.reduce((acc, file) => acc + (file.size || 0), 0))}
              </span>
            </div>
            
            <div className="space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No files uploaded yet</p>
                  <p className="text-xs mt-1">Drop files above to get started</p>
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.name}
                    className="group flex items-center justify-between p-2 hover:bg-secondary/50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getFileIcon(file.type)}
                      <div className="min-w-0">
                        <p className="text-sm truncate">{file.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(file.size)}</span>
                          {file.type && <span>• {file.type.split('/')[1] || file.type}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(file.url, file.name)}
                        title="Copy URL"
                      >
                        {copiedFile === file.name ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Link className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => downloadFile(file)}
                        title="Download"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() => handleDelete(file.name)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions - Fixed at bottom */}
        <div className="flex items-center gap-2 pt-3 border-t mt-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-xs flex-1"
            onClick={() => {
              const urls = files.map(f => f.url).join('\n')
              navigator.clipboard.writeText(urls)
              toast({
                title: "Copied all URLs",
                description: "All file URLs copied to clipboard",
              })
            }}
          >
            <Copy className="h-3 w-3 mr-2" />
            Copy All URLs
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs flex-1"
            onClick={() => window.open(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}`, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Open Bucket
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
