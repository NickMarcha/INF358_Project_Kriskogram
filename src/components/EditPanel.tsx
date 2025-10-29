import { useState, useEffect, useCallback, useRef } from 'react'
import type { StoredDataset } from '../lib/storage'
import { detectDatasetProperties } from '../lib/storage'
import TableView from './views/TableView'

interface EditPanelProps {
  dataset: StoredDataset
  onClose: () => void
  onSave: (dataset: StoredDataset) => Promise<void>
  onDelete: () => Promise<void>
  onDuplicate: () => Promise<void>
}

export default function EditPanel({
  dataset,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
}: EditPanelProps) {
  const [name, setName] = useState(dataset.name)
  const [notes, setNotes] = useState(dataset.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'data'>('info')
  const [editedData, setEditedData] = useState<StoredDataset | null>(null)

  // Work with the first snapshot for editing
  const currentSnapshot = dataset.snapshots[0] || { timestamp: dataset.timeRange.start, nodes: [], edges: [] }

  useEffect(() => {
    setName(dataset.name)
    setNotes(dataset.notes || '')
    setEditedData(null)
  }, [dataset])

  async function handleSave() {
    setIsSaving(true)
    try {
      const updated: StoredDataset = {
        ...dataset,
        name: name.trim(),
        notes: notes.trim() || undefined,
      }
      
      // If data was edited, update metadata
      if (editedData) {
        updated.snapshots = editedData.snapshots
        const snapshot = updated.snapshots[0] || currentSnapshot
        updated.metadata = detectDatasetProperties(snapshot)
      }
      
      await onSave(updated)
      onClose()
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save dataset: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete dataset: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  function handleDataUpdate(nodes: any[], edges: any[]) {
    const updatedSnapshot = {
      ...currentSnapshot,
      nodes,
      edges,
    }
    
    setEditedData({
      ...dataset,
      snapshots: [updatedSnapshot],
    })
  }

  const hasChanges = name !== dataset.name || notes !== (dataset.notes || '') || editedData !== null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">Edit Dataset</h2>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer transition-colors"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b flex">
          <button
            onClick={() => setActiveTab('info')}
            type="button"
            className={`px-6 py-3 font-medium cursor-pointer transition-colors ${
              activeTab === 'info'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Information
          </button>
          <button
            onClick={() => setActiveTab('data')}
            type="button"
            className={`px-6 py-3 font-medium cursor-pointer transition-colors ${
              activeTab === 'data'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Data ({currentSnapshot.nodes.length} nodes, {currentSnapshot.edges.length} edges)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' ? (
            <div className="space-y-6 max-w-2xl">
              {/* Dataset Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dataset Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter a name for this dataset"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes about this dataset..."
                />
              </div>

              {/* Metadata */}
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium text-gray-700 mb-2">Dataset Information</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><span className="font-medium">Type:</span> {dataset.type.toUpperCase()}</div>
                  <div><span className="font-medium">Time Range:</span> {dataset.timeRange.start}{dataset.timeRange.end !== dataset.timeRange.start ? ` – ${dataset.timeRange.end}` : ''}</div>
                  <div><span className="font-medium">Snapshots:</span> {dataset.snapshots.length}</div>
                  {dataset.filename && (
                    <div><span className="font-medium">Original File:</span> {dataset.filename}</div>
                  )}
                  <div><span className="font-medium">Created:</span> {new Date(dataset.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t pt-4 space-y-3">
                <button
                  onClick={onDuplicate}
                  type="button"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  Duplicate Dataset
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  type="button"
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer transition-colors"
                >
                  Delete Dataset
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full">
              <DataEditor
                nodes={currentSnapshot.nodes}
                edges={currentSnapshot.edges}
                onUpdate={handleDataUpdate}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            type="button"
            disabled={isSaving || isDeleting}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            type="button"
            disabled={isSaving || isDeleting || (!hasChanges && activeTab === 'info') || !name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {isSaving ? 'Saving...' : editedData ? 'Save All Changes' : 'Save Changes'}
          </button>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-bold mb-2">Delete Dataset?</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete "{dataset.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                type="button"
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                type="button"
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 cursor-pointer transition-colors"
              >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface DataEditorProps {
  nodes: any[]
  edges: any[]
  onUpdate: (nodes: any[], edges: any[]) => void
}

function DataEditor({ nodes, edges, onUpdate }: DataEditorProps) {
  const [editedNodes, setEditedNodes] = useState(nodes)
  const [editedEdges, setEditedEdges] = useState(edges)

  // Only reset when the source data changes (not on every edit)
  useEffect(() => {
    setEditedNodes([...nodes])
    setEditedEdges([...edges])
  }, [nodes, edges])

  // Track latest values with ref to avoid stale closure
  const editedNodesRef = useRef(editedNodes)
  const editedEdgesRef = useRef(editedEdges)
  
  useEffect(() => {
    editedNodesRef.current = editedNodes
    editedEdgesRef.current = editedEdges
  }, [editedNodes, editedEdges])

  // Only update parent on blur (when field is exited), not on every keystroke
  const handleNodesChange = useCallback((newNodes: any[]) => {
    setEditedNodes(newNodes)
    editedNodesRef.current = newNodes
  }, [])

  const handleEdgesChange = useCallback((newEdges: any[]) => {
    setEditedEdges(newEdges)
    editedEdgesRef.current = newEdges
  }, [])

  // Use a ref to track if we need to save on blur
  const pendingUpdateRef = useRef(false)
  
  const handleBlur = useCallback(() => {
    if (pendingUpdateRef.current) {
      onUpdate(editedNodesRef.current, editedEdgesRef.current)
      pendingUpdateRef.current = false
    }
  }, [onUpdate])

  return (
    <div className="h-full">
      <TableView
        nodes={editedNodes}
        edges={editedEdges}
        onNodesChange={(newNodes) => {
          handleNodesChange(newNodes)
          pendingUpdateRef.current = true
        }}
        onEdgesChange={(newEdges) => {
          handleEdgesChange(newEdges)
          pendingUpdateRef.current = true
        }}
        onBlur={handleBlur}
        editable={true}
      />
    </div>
  )
}
