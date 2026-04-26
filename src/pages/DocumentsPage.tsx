import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  FolderOpen, Plus, Trash2, ExternalLink, FileText,
  FileSpreadsheet, Presentation, File,
} from 'lucide-react'
import { useDocuments, DOCUMENT_CATEGORIES } from '@/hooks/useDocuments'
import type { DocumentCategory } from '@/hooks/useDocuments'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isGoogleDriveUrl(url: string) {
  return url.includes('drive.google.com') || url.includes('docs.google.com')
    || url.includes('sheets.google.com') || url.includes('slides.google.com')
}

function getDriveDocType(url: string): 'doc' | 'sheet' | 'slide' | 'drive' {
  if (url.includes('docs.google.com/document')) return 'doc'
  if (url.includes('docs.google.com/spreadsheets') || url.includes('sheets.google.com')) return 'sheet'
  if (url.includes('docs.google.com/presentation') || url.includes('slides.google.com')) return 'slide'
  return 'drive'
}

function DocIcon({ url, size = 18 }: { url: string; size?: number }) {
  if (!isGoogleDriveUrl(url)) {
    return <File size={size} style={{ color: 'var(--t3)' }} />
  }
  const type = getDriveDocType(url)
  if (type === 'sheet') return <FileSpreadsheet size={size} style={{ color: '#0f9d58' }} />
  if (type === 'slide') return <Presentation size={size} style={{ color: '#f4b400' }} />
  if (type === 'doc')   return <FileText size={size} style={{ color: '#4285f4' }} />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#4285f4" opacity="0.15" />
      <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="#4285f4" strokeWidth="1.5" fill="none" />
      <path d="M12 3V21M4 7.5L20 16.5M20 7.5L4 16.5" stroke="#4285f4" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

const CATEGORY_COLORS: Record<DocumentCategory, { bg: string; color: string }> = {
  'Report':        { bg: 'rgba(37,99,235,0.10)',  color: '#2563eb' },
  'Meeting Notes': { bg: 'rgba(124,58,237,0.10)', color: '#7c3aed' },
  'Template':      { bg: 'rgba(16,185,129,0.10)', color: '#059669' },
  'Reference':     { bg: 'rgba(100,116,139,0.10)', color: '#64748b' },
  'Other':         { bg: 'rgba(249,115,22,0.10)', color: '#f97316' },
}

function CategoryBadge({ category }: { category: DocumentCategory }) {
  const { bg, color } = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Other']
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: bg, color }}
    >
      {category}
    </span>
  )
}

// ─── Add Document Form ────────────────────────────────────────────────────────
function AddDocumentForm({ onClose }: { onClose: () => void }) {
  const { addDocument, isAdding, addError } = useDocuments()
  const [form, setForm] = useState({
    title: '',
    url: '',
    category: 'Reference' as DocumentCategory,
    description: '',
  })

  const inputCls = [
    'w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all',
    'border-[1.5px]',
  ].join(' ')
  const inputStyle = { borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--t1)' }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.url.trim()) return
    try {
      await addDocument({
        title: form.title.trim(),
        url: form.url.trim(),
        category: form.category,
        description: form.description.trim() || null,
      })
      onClose()
    } catch {
      // error shown via addError
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
          Document Title <span className="text-red-500 normal-case tracking-normal">*</span>
        </label>
        <input
          required
          className={inputCls}
          placeholder="e.g. Q1 Strategy Report"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          style={inputStyle}
        />
      </div>

      {/* URL */}
      <div>
        <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
          Google Drive / Document Link <span className="text-red-500 normal-case tracking-normal">*</span>
        </label>
        <input
          required
          type="url"
          className={inputCls}
          placeholder="https://drive.google.com/…"
          value={form.url}
          onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
          style={inputStyle}
        />
        <p className="text-[11px] mt-1" style={{ color: 'var(--t3)' }}>
          Paste a shareable Google Drive, Docs, Sheets, or Slides link.
        </p>
      </div>

      {/* Category */}
      <div>
        <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
          Category
        </label>
        <select
          className={inputCls}
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value as DocumentCategory }))}
          style={inputStyle}
        >
          {DOCUMENT_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t3)' }}>
          Description
        </label>
        <textarea
          rows={2}
          className={inputCls}
          placeholder="Brief description of what this document contains…"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          style={{ ...inputStyle, resize: 'none' }}
        />
      </div>

      {/* Error */}
      {addError && (
        <div
          className="rounded-xl px-4 py-3 text-[13px]"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
        >
          ⚠️ {(addError as Error).message ?? 'Failed to add document'}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isAdding || !form.title.trim() || !form.url.trim()}>
          {isAdding ? 'Adding…' : 'Add Document'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

// ─── Document Card ────────────────────────────────────────────────────────────
function DocumentCard({
  doc,
  canDelete,
  onDelete,
}: {
  doc: ReturnType<typeof useDocuments>['documents'][number]
  canDelete: boolean
  onDelete: () => void
}) {
  const isDrive = isGoogleDriveUrl(doc.url)

  return (
    <Card>
      <CardBody className="flex items-start gap-4 py-4">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: isDrive ? 'rgba(66,133,244,0.08)' : 'var(--surface-2)', border: '1.5px solid var(--border)' }}
        >
          <DocIcon url={doc.url} size={20} />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--t1)' }}>
              {doc.title}
            </h3>
            <CategoryBadge category={doc.category} />
          </div>

          {doc.description && (
            <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--t2)' }}>
              {doc.description}
            </p>
          )}

          <div className="flex items-center gap-3">
            <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
              Added {format(parseISO(doc.created_at), 'MMM d, yyyy')}
            </span>
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
              style={{ background: 'rgba(0,123,255,0.08)', color: '#007bff', border: '1px solid rgba(0,123,255,0.2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,123,255,0.14)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,123,255,0.08)' }}
            >
              <ExternalLink size={11} />
              {isDrive ? 'Open in Drive' : 'Open'}
            </a>
          </div>
        </div>

        {/* Delete */}
        {canDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#ef4444'
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--t3)'
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
            aria-label="Delete document"
          >
            <Trash2 size={14} />
          </button>
        )}
      </CardBody>
    </Card>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center rounded-2xl"
      style={{ border: '1.5px dashed var(--border-strong)', background: 'var(--surface)' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(0,123,255,0.08)' }}
      >
        <FolderOpen size={26} style={{ color: '#007bff' }} />
      </div>
      <h3 className="text-base font-bold mb-1" style={{ color: 'var(--t1)' }}>No documents yet</h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--t2)' }}>
        Add Google Drive links to keep all your team documents in one place.
      </p>
      <Button onClick={onAdd}><Plus size={14} /> Add Document</Button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { documents, isLoading, deleteDocument } = useDocuments()
  const { isAdmin, profile } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'All'>('All')

  const currentUserId = profile?.id ?? null

  const filtered = filterCategory === 'All'
    ? documents
    : documents.filter(d => d.category === filterCategory)

  const driveCount = documents.filter(d => isGoogleDriveUrl(d.url)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--t1)' }}>Documents</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>
            {documents.length} document{documents.length !== 1 ? 's' : ''}
            {driveCount > 0 ? ` · ${driveCount} from Google Drive` : ''}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus size={14} /> Add Document</Button>
      </div>

      {/* Category filter */}
      {documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(['All', ...DOCUMENT_CATEGORIES] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                background: filterCategory === cat
                  ? 'linear-gradient(135deg, #007bff 0%, #0cc0df 100%)'
                  : 'var(--surface-2)',
                color: filterCategory === cat ? '#fff' : 'var(--t2)',
                border: `1px solid ${filterCategory === cat ? 'transparent' : 'var(--border)'}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && documents.length === 0 && (
        <EmptyState onAdd={() => setShowForm(true)} />
      )}

      {/* Filtered empty */}
      {!isLoading && documents.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--t3)' }}>
          <p className="text-sm">No documents in this category.</p>
        </div>
      )}

      {/* Document list */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              canDelete={isAdmin || doc.created_by === currentUserId}
              onDelete={() => {
                if (confirm(`Remove "${doc.title}"?`)) deleteDocument(doc.id)
              }}
            />
          ))}
        </div>
      )}

      <Modal open={showForm} title="Add Document" onClose={() => setShowForm(false)}>
        <AddDocumentForm onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  )
}
