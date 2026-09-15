import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Images,
  CloudUpload,
  Loader2,
  ArrowRight,
  FileImage,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUploadBatch } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/api/client'

type FileStatus = 'pending' | 'uploading' | 'done' | 'error'

interface FileEntry {
  id: string
  file: File
  preview: string
  status: FileStatus
  progress: number
  error?: string
}

function FileRow({ entry, onRemove }: { entry: FileEntry; onRemove: () => void }) {
  const sizeKB = (entry.file.size / 1024).toFixed(0)
  const sizeMB = (entry.file.size / (1024 * 1024)).toFixed(1)
  const displaySize = entry.file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card group">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0">
        <img src={entry.preview} alt={entry.file.name} className="w-full h-full object-cover" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{entry.file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{displaySize}</span>
          {entry.status === 'uploading' && (
            <span className="text-xs text-primary">{entry.progress}%</span>
          )}
          {entry.status === 'done' && (
            <span className="text-xs text-emerald-400">Uploaded</span>
          )}
          {entry.status === 'error' && (
            <span className="text-xs text-destructive truncate">{entry.error || 'Failed'}</span>
          )}
        </div>

        {/* Progress bar */}
        {entry.status === 'uploading' && (
          <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${entry.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Status icon / remove */}
      <div className="shrink-0">
        {entry.status === 'pending' && (
          <button
            onClick={onRemove}
            className="p-1 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
          >
            <X size={15} />
          </button>
        )}
        {entry.status === 'uploading' && (
          <Loader2 size={16} className="text-primary animate-spin" />
        )}
        {entry.status === 'done' && (
          <CheckCircle2 size={16} className="text-emerald-400" />
        )}
        {entry.status === 'error' && (
          <AlertCircle size={16} className="text-destructive" />
        )}
      </div>
    </div>
  )
}

// ─── Upload Page ───────────────────────────────────────────────────────────────
export default function UploadPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<FileEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadBatch = useUploadBatch()

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return
    const accepted = Array.from(incoming).filter(f => f.type.startsWith('image/'))
    if (accepted.length === 0) return

    const entries: FileEntry[] = accepted.map(f => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      preview: URL.createObjectURL(f),
      status: 'pending',
      progress: 0,
    }))
    setFiles(prev => [...prev, ...entries])
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const entry = prev.find(e => e.id === id)
      if (entry) URL.revokeObjectURL(entry.preview)
      return prev.filter(e => e.id !== id)
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)

  const pendingFiles = files.filter(f => f.status === 'pending')
  const doneCount = files.filter(f => f.status === 'done').length
  const errorCount = files.filter(f => f.status === 'error').length

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return
    setIsUploading(true)

    // Upload in batches of 5
    const BATCH_SIZE = 5
    for (let i = 0; i < pendingFiles.length; i += BATCH_SIZE) {
      const batch = pendingFiles.slice(i, i + BATCH_SIZE)
      const batchIds = batch.map(e => e.id)

      // Mark batch as uploading
      setFiles(prev => prev.map(e =>
        batchIds.includes(e.id) ? { ...e, status: 'uploading', progress: 0 } : e
      ))

      try {
        await uploadBatch.mutateAsync({
          files: batch.map(e => e.file),
          onProgress: (pct: number) => {
            setFiles(prev => prev.map(e =>
              batchIds.includes(e.id) ? { ...e, progress: pct } : e
            ))
          },
        })
        setFiles(prev => prev.map(e =>
          batchIds.includes(e.id) ? { ...e, status: 'done', progress: 100 } : e
        ))
      } catch (err) {
        const msg = getApiErrorMessage(err)
        setFiles(prev => prev.map(e =>
          batchIds.includes(e.id) ? { ...e, status: 'error', error: msg } : e
        ))
      }
    }

    setIsUploading(false)
    setUploadDone(true)
  }

  const handleReset = () => {
    files.forEach(e => URL.revokeObjectURL(e.preview))
    setFiles([])
    setUploadDone(false)
  }

  // ── Success state ──
  if (uploadDone && errorCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Upload complete!</h2>
        <p className="text-sm text-muted-foreground mt-1.5 mb-6">
          {doneCount} photo{doneCount !== 1 ? 's' : ''} uploaded. AI is analyzing them in the background.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset}>
            <Upload size={14} className="mr-1.5" />
            Upload more
          </Button>
          <Button onClick={() => navigate('/gallery')}>
            View gallery
            <ArrowRight size={14} className="ml-1.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Upload photos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Drag & drop or browse — supports JPG, PNG, WEBP, HEIC
          </p>
        </div>
        {files.length > 0 && !isUploading && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
            Clear all
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ── Drop zone ── */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            'relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer',
            'flex flex-col items-center justify-center text-center p-10',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/40 hover:bg-secondary/30',
            isUploading && 'pointer-events-none opacity-60'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => addFiles(e.target.files)}
          />

          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors',
            isDragging ? 'bg-primary/20' : 'bg-secondary'
          )}>
            <CloudUpload size={28} className={isDragging ? 'text-primary' : 'text-muted-foreground'} />
          </div>

          {isDragging ? (
            <p className="text-base font-medium text-primary">Drop to add photos</p>
          ) : (
            <>
              <p className="text-base font-medium text-foreground">
                Drag & drop photos here
              </p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
              <div className="flex items-center gap-4 mt-4">
                {['JPG', 'PNG', 'WEBP', 'HEIC'].map(fmt => (
                  <span key={fmt} className="text-xs text-muted-foreground/70 bg-secondary px-2 py-1 rounded">
                    {fmt}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── File list ── */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileImage size={15} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {files.length} file{files.length !== 1 ? 's' : ''}
                </span>
                {doneCount > 0 && (
                  <span className="text-xs text-emerald-400">{doneCount} done</span>
                )}
                {errorCount > 0 && (
                  <span className="text-xs text-destructive">{errorCount} failed</span>
                )}
              </div>
              {!isUploading && pendingFiles.length > 0 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  + Add more
                </button>
              )}
            </div>

            <div className="space-y-2">
              {files.map(entry => (
                <FileRow
                  key={entry.id}
                  entry={entry}
                  onRemove={() => removeFile(entry.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── AI info banner ── */}
        {files.length === 0 && (
          <div className="rounded-xl border border-border bg-card/50 p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Images size={15} className="text-primary" />
              What happens after upload
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { label: 'Face recognition', desc: 'People are identified and grouped automatically' },
                { label: 'Scene detection', desc: 'Photos categorized by landscape, food, travel, etc.' },
                { label: 'Event grouping', desc: 'Trips and occasions detected from date clusters' },
                { label: 'OCR indexing', desc: 'Text in photos becomes searchable' },
                { label: 'Duplicate detection', desc: 'Near-identical photos flagged for cleanup' },
                { label: 'Memory creation', desc: 'AI curates highlights from your best shots' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/50">
                  <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer action bar ── */}
      {files.length > 0 && (
        <div className="border-t border-border px-6 py-4 bg-background/80 backdrop-blur flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {pendingFiles.length > 0
              ? `${pendingFiles.length} photo${pendingFiles.length !== 1 ? 's' : ''} ready to upload`
              : uploadDone
              ? `${doneCount} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''}`
              : isUploading
              ? 'Uploading…'
              : ''}
          </div>
          <div className="flex items-center gap-2">
            {uploadDone && errorCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpload}
                disabled={isUploading}
              >
                Retry failed
              </Button>
            )}
            {!uploadDone && (
              <Button
                size="sm"
                disabled={pendingFiles.length === 0 || isUploading}
                onClick={handleUpload}
                className="min-w-[120px]"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={13} className="mr-1.5 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload size={13} className="mr-1.5" />
                    Upload {pendingFiles.length > 0 ? `${pendingFiles.length} photo${pendingFiles.length !== 1 ? 's' : ''}` : ''}
                  </>
                )}
              </Button>
            )}
            {uploadDone && (
              <Button size="sm" onClick={() => navigate('/gallery')}>
                View gallery
                <ArrowRight size={13} className="ml-1.5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}