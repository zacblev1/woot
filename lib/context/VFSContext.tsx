'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { VirtualFileSystem, type FileSystemNode } from '@/lib/vfs'

// Storage key for VFS persistence
const VFS_STORAGE_KEY = 'terminal-vfs'

// Context value interface - what consumers receive
export interface VFSContextValue {
  // Current working directory path
  pwd: string
  // Current working directory node
  currentNode: FileSystemNode
  // VFS operations
  cd: (path: string) => string | null
  ls: (path?: string) => string[]
  mkdir: (path: string) => string | null
  touch: (path: string) => string | null
  rm: (path: string) => string | null
  resolve: (path: string) => FileSystemNode | null
  // Raw VFS instance for advanced usage
  vfs: VirtualFileSystem
  // Force refresh (e.g., after external changes)
  refresh: () => void
}

// Create context with undefined default (enforces provider usage)
const VFSContext = createContext<VFSContextValue | undefined>(undefined)

// Initialize VFS with localStorage persistence
function initializeVFS(): VirtualFileSystem {
  const vfs = new VirtualFileSystem()

  // Try to restore from localStorage (only in browser)
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(VFS_STORAGE_KEY)
      if (saved) {
        vfs.fromJSON(saved)
      }
    } catch (e) {
      console.warn('Failed to restore VFS from localStorage:', e)
    }
  }

  return vfs
}

// Save VFS to localStorage
function persistVFS(vfs: VirtualFileSystem): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(VFS_STORAGE_KEY, vfs.toJSON())
    } catch (e) {
      console.warn('Failed to persist VFS to localStorage:', e)
    }
  }
}

// Provider props
interface VFSProviderProps {
  children: ReactNode
}

/**
 * VFSProvider wraps children and provides VFS instance via context.
 * Creates VFS once on mount and persists to localStorage on changes.
 */
export function VFSProvider({ children }: VFSProviderProps) {
  // Initialize VFS once via useState initializer
  const [vfs] = useState<VirtualFileSystem>(initializeVFS)

  // Track pwd as React state for reactivity
  const [pwd, setPwd] = useState<string>(() => vfs.getPwd())

  // Wrapped cd - updates React state and persists
  const cd = useCallback((path: string): string | null => {
    const error = vfs.cd(path)
    if (!error) {
      setPwd(vfs.getPwd())
    }
    return error
  }, [vfs])

  // Wrapped ls - no state change needed
  const ls = useCallback((path?: string): string[] => {
    return vfs.ls(path)
  }, [vfs])

  // Wrapped mkdir - persists after change
  const mkdir = useCallback((path: string): string | null => {
    const error = vfs.mkdir(path)
    if (!error) {
      persistVFS(vfs)
    }
    return error
  }, [vfs])

  // Wrapped touch - persists after change
  const touch = useCallback((path: string): string | null => {
    const error = vfs.touch(path)
    if (!error) {
      persistVFS(vfs)
    }
    return error
  }, [vfs])

  // Wrapped rm - persists after change
  const rm = useCallback((path: string): string | null => {
    const error = vfs.rm(path)
    if (!error) {
      persistVFS(vfs)
    }
    return error
  }, [vfs])

  // Wrapped resolve - no state change needed
  const resolve = useCallback((path: string): FileSystemNode | null => {
    return vfs.resolve(path)
  }, [vfs])

  // Force refresh - re-read pwd from VFS
  const refresh = useCallback((): void => {
    setPwd(vfs.getPwd())
  }, [vfs])

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<VFSContextValue>(() => ({
    pwd,
    currentNode: vfs.current,
    cd,
    ls,
    mkdir,
    touch,
    rm,
    resolve,
    vfs,
    refresh,
  }), [pwd, vfs, cd, ls, mkdir, touch, rm, resolve, refresh])

  return (
    <VFSContext.Provider value={value}>
      {children}
    </VFSContext.Provider>
  )
}

/**
 * useVFS hook provides type-safe access to VFS operations.
 * Throws helpful error if used outside VFSProvider.
 */
export function useVFS(): VFSContextValue {
  const context = useContext(VFSContext)

  if (context === undefined) {
    throw new Error(
      'useVFS must be used within a VFSProvider. ' +
      'Wrap your component tree with <VFSProvider>.'
    )
  }

  return context
}

/**
 * useVFSOptional returns context or null if outside provider.
 * Use when VFS access is optional (e.g., components that work with or without VFS).
 */
export function useVFSOptional(): VFSContextValue | null {
  const context = useContext(VFSContext)
  return context ?? null
}
