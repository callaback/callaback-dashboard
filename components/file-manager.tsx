"use client"

import { useState, useCallback } from "react"
import { Upload, File, Trash2, Download, Eye, X, FileText, Image as ImageIcon, Video, Music, Archive } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

interface LocalFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  createdAt: Date
}

export function FileManager() {
  const [files, setFiles] = useState<LocalFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<LocalFile | null>(null)

  // Upload file
  const uploadFile = useCallback(async (file: File) => {
    setUploading(true)
    try {
      let url = URL.createObjectURL(file)
      let name = file.name
      let type = file.type

      // Convert image to PDF
      if (file.type.startsWith("image/")) {
        const canvas = document.createElement("canvas")
        const img = new Image()
        
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.drawImage(img, 0, 0)
            canvas.toBlob((blob) => {
              if (blob) {
                const pdfUrl = URL.createObjectURL(blob)
                const newFile: LocalFile = {
                  id: Date.now().toString(),
                  name: file.name.replace(/\.[^/.]+$/, ".pdf"),
                  size: blob.size,
                  type: "application/pdf",
                  url: pdfUrl,
                  createdAt: new Date()
                }
                setFiles(prev => [newFile, ...prev])
                toast.success(`Image converted to PDF: ${newFile.name}`)
              }
            }, "application/pdf")
          }
        }
        img.src = url
        return
      }

      const newFile: LocalFile = {
        id: Date.now().toString(),
        name: name,
        size: file.size,
        type: type,
        url: url,
        createdAt: new Date()
      }

      setFiles(prev => [newFile, ...prev])
      toast.success(`File added: ${file.name}`)
    } catch (error: any) {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
    }
  }, [])

  // Delete file
  const deleteFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file) {
        URL.revokeObjectURL(file.url)
        toast.success("File removed")
      }
      return prev.filter(f => f.id !== fileId)
    })
    if (selectedFile?.id === fileId) {
      setSelectedFile(null)
    }
  }, [selectedFile])

  // Download file
  const downloadFile = useCallback((file: LocalFile) => {
    const a = document.createElement('a')
    a.href = file.url
    a.download = file.name
    a.click()
    toast.success("Download started")
  }, [])

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    droppedFiles.forEach(file => uploadFile(file))
  }, [uploadFile])

  // Handle file input
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    selectedFiles.forEach(file => uploadFile(file))
    e.target.value = ''
  }, [uploadFile])

  // Get file icon
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />
    if (type.includes('zip') || type.includes('rar')) return <Archive className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5" />
            File Manager
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden p-4">
        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-6 transition-all flex-shrink-0
            ${isDragging 
              ? 'border-primary bg-primary/5 scale-[0.98]' 
              : 'border-border hover:border-primary/50 hover:bg-accent/5'
            }
            ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
        >
          <input
            type="file"
            multiple
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className={`
              h-12 w-12 rounded-xl flex items-center justify-center transition-all
              ${isDragging 
                ? 'bg-primary text-white scale-110' 
                : 'bg-primary/10 text-primary'
              }
            `}>
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {uploading ? "Adding..." : isDragging ? "Drop files here" : "Drop or click to add files"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Images, documents, videos & more
              </p>
            </div>
          </div>
        </div>

        {/* Files List - Scrollable */}
        <div className="flex-1 min-h-0 -mr-4">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-2">
              {files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <File className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No files yet</p>
                  <p className="text-xs mt-1">Add files to get started</p>
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className={`
                      group flex items-center gap-2 p-2.5 rounded-lg border transition-all
                      ${selectedFile?.id === file.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-accent/5'
                      }
                    `}
                  >
                    {/* File Icon */}
                    <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      {getFileIcon(file.type)}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-medium truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatSize(file.size)}
                        </p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {file.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setSelectedFile(file)}
                        title="Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => downloadFile(file)}
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteFile(file.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* File count summary */}
        {files.length > 0 && (
          <div className="flex-shrink-0 text-xs text-muted-foreground text-center pt-2 border-t">
            Total: {formatSize(files.reduce((acc, f) => acc + f.size, 0))}
          </div>
        )}
      </CardContent>

      {/* File Preview Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedFile(null)}>
          <div className="bg-background rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{selectedFile.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {formatSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              {selectedFile.type.startsWith('image/') ? (
                <img
                  src={selectedFile.url}
                  alt={selectedFile.name}
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <div className="text-center py-12">
                  <File className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">Preview not available</p>
                  <Button onClick={() => downloadFile(selectedFile)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

