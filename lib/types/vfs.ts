// Content types for collection items
export interface BookContent {
  title: string
  author: string
  genre: string
  format: 'Hardcover' | 'Paperback' | 'Kindle' | 'Audiobook'
  pages: number
}

export interface VinylContent {
  title: string
  artist: string
  genre: string
  format: 'LP' | '7"' | '12"' | 'EP'
  label: string
}

export interface HardwareContent {
  name: string
  type: string
  processor?: string
  memory?: string
  storage?: string
  status: 'Active' | 'Retired' | 'Storage'
}

// Text file content (user-created files)
export interface TextContent {
  text: string
}

// Discriminated union for file content
export type FileContent =
  | { type: 'book'; data: BookContent }
  | { type: 'vinyl'; data: VinylContent }
  | { type: 'hardware'; data: HardwareContent }
  | { type: 'text'; data: TextContent }
  | { type: 'empty' }

// VFS Node types
export type VFSNodeType = 'file' | 'directory'

export interface VFSNode {
  name: string
  type: VFSNodeType
  parent?: VFSNode
  children?: Record<string, VFSNode>
  content?: FileContent
}

// Directory-specific type (for type narrowing)
export interface VFSDirectory extends VFSNode {
  type: 'directory'
  children: Record<string, VFSNode>
  content?: never
}

// File-specific type
export interface VFSFile extends VFSNode {
  type: 'file'
  children?: never
  content: FileContent
}

// Type guards
export function isDirectory(node: VFSNode): node is VFSDirectory {
  return node.type === 'directory'
}

export function isFile(node: VFSNode): node is VFSFile {
  return node.type === 'file'
}

export function isBookFile(node: VFSNode): node is VFSFile & { content: { type: 'book'; data: BookContent } } {
  return isFile(node) && node.content?.type === 'book'
}

export function isVinylFile(node: VFSNode): node is VFSFile & { content: { type: 'vinyl'; data: VinylContent } } {
  return isFile(node) && node.content?.type === 'vinyl'
}

export function isHardwareFile(node: VFSNode): node is VFSFile & { content: { type: 'hardware'; data: HardwareContent } } {
  return isFile(node) && node.content?.type === 'hardware'
}

// Collection type for data loading
export type CollectionType = 'books' | 'vinyl' | 'hardware'

// Path resolution result
export type ResolveResult = VFSNode | null
