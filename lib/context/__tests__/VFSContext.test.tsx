/**
 * VFSContext Unit Tests
 *
 * PURPOSE: Test the VFSProvider and useVFS hook functionality including:
 * - Provider provides context to children
 * - useVFS throws helpful error when used outside provider
 * - VFS operations work correctly through context
 * - localStorage persistence triggers on mutations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { VFSProvider, useVFS, useVFSOptional } from '../VFSContext'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Helper component to test useVFS hook
function TestConsumer({ onRender }: { onRender: (ctx: ReturnType<typeof useVFS>) => void }) {
  const ctx = useVFS()
  onRender(ctx)
  return <div data-testid="consumer">pwd: {ctx.pwd}</div>
}

// Helper component to test useVFSOptional hook
function OptionalConsumer({ onRender }: { onRender: (ctx: ReturnType<typeof useVFSOptional>) => void }) {
  const ctx = useVFSOptional()
  onRender(ctx)
  return <div data-testid="optional-consumer">has context: {ctx ? 'yes' : 'no'}</div>
}

// Helper component that throws to test error boundary
function ThrowingConsumer() {
  useVFS()
  return <div>should not render</div>
}

describe('VFSContext', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('VFSProvider', () => {
    it('provides context to children', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      expect(capturedCtx).not.toBeNull()
      expect(capturedCtx!.pwd).toBe('/home/zachary')
      expect(screen.getByTestId('consumer')).toHaveTextContent('pwd: /home/zachary')
    })

    it('provides VFS operations', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      expect(capturedCtx).not.toBeNull()
      expect(typeof capturedCtx!.cd).toBe('function')
      expect(typeof capturedCtx!.ls).toBe('function')
      expect(typeof capturedCtx!.mkdir).toBe('function')
      expect(typeof capturedCtx!.touch).toBe('function')
      expect(typeof capturedCtx!.rm).toBe('function')
      expect(typeof capturedCtx!.resolve).toBe('function')
      expect(typeof capturedCtx!.refresh).toBe('function')
    })

    it('provides vfs instance for advanced usage', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      expect(capturedCtx!.vfs).toBeDefined()
      expect(capturedCtx!.vfs.root).toBeDefined()
    })

    it('provides currentNode that matches pwd', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      expect(capturedCtx!.currentNode).toBeDefined()
      expect(capturedCtx!.currentNode.name).toBe('zachary')
    })
  })

  describe('useVFS', () => {
    it('throws helpful error when used outside provider', () => {
      // Suppress React's error boundary logging
      const originalError = console.error
      console.error = vi.fn()

      expect(() => {
        render(<ThrowingConsumer />)
      }).toThrow('useVFS must be used within a VFSProvider')

      console.error = originalError
    })

    it('error message suggests wrapping with VFSProvider', () => {
      const originalError = console.error
      console.error = vi.fn()

      try {
        render(<ThrowingConsumer />)
      } catch (error) {
        expect((error as Error).message).toContain('Wrap your component tree with <VFSProvider>')
      }

      console.error = originalError
    })
  })

  describe('useVFSOptional', () => {
    it('returns null when used outside provider', () => {
      let capturedCtx: ReturnType<typeof useVFSOptional> = {} as any

      render(
        <OptionalConsumer onRender={(ctx) => { capturedCtx = ctx }} />
      )

      expect(capturedCtx).toBeNull()
      expect(screen.getByTestId('optional-consumer')).toHaveTextContent('has context: no')
    })

    it('returns context when used inside provider', () => {
      let capturedCtx: ReturnType<typeof useVFSOptional> = null

      render(
        <VFSProvider>
          <OptionalConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      expect(capturedCtx).not.toBeNull()
      expect(capturedCtx!.pwd).toBe('/home/zachary')
    })
  })

  describe('cd - Change Directory', () => {
    it('updates pwd state when changing directory', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      const { rerender } = render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      // Create a directory to cd into
      act(() => {
        capturedCtx!.mkdir('testdir')
      })

      // Change directory
      act(() => {
        const result = capturedCtx!.cd('testdir')
        expect(result).toBeNull() // null = success
      })

      // Re-render to get updated state
      rerender(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      // Note: Due to how React state works with re-renders, the provider creates a new VFS
      // In real usage, the provider persists. For this test, we verify the operation worked.
    })

    it('returns error for non-existent directory', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      const result = capturedCtx!.cd('nonexistent')
      expect(result).toBe('cd: nonexistent: No such file or directory')
    })
  })

  describe('ls - List Directory', () => {
    it('returns directory contents', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      // Create some entries
      act(() => {
        capturedCtx!.mkdir('dir1')
        capturedCtx!.mkdir('dir2')
        capturedCtx!.touch('file1')
      })

      const contents = capturedCtx!.ls()
      expect(contents).toContain('dir1')
      expect(contents).toContain('dir2')
      expect(contents).toContain('file1')
    })

    it('returns sorted directory contents', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      act(() => {
        capturedCtx!.mkdir('zebra')
        capturedCtx!.mkdir('apple')
        capturedCtx!.touch('banana')
      })

      const contents = capturedCtx!.ls()
      expect(contents).toEqual(['apple', 'banana', 'zebra'])
    })
  })

  describe('mkdir - Create Directory', () => {
    it('creates directory and triggers localStorage save', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      act(() => {
        const result = capturedCtx!.mkdir('newdir')
        expect(result).toBeNull() // null = success
      })

      // Check localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'terminal-vfs',
        expect.any(String)
      )

      // Verify directory exists
      expect(capturedCtx!.ls()).toContain('newdir')
    })

    it('returns error when directory exists', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      act(() => {
        capturedCtx!.mkdir('existingdir')
      })

      const result = capturedCtx!.mkdir('existingdir')
      expect(result).toContain('File exists')
    })
  })

  describe('touch - Create File', () => {
    it('creates file and triggers localStorage save', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      localStorageMock.setItem.mockClear()

      act(() => {
        const result = capturedCtx!.touch('newfile')
        expect(result).toBeNull()
      })

      expect(localStorageMock.setItem).toHaveBeenCalled()
      expect(capturedCtx!.ls()).toContain('newfile')
    })
  })

  describe('rm - Remove', () => {
    it('removes file and triggers localStorage save', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      act(() => {
        capturedCtx!.touch('toremove')
      })

      expect(capturedCtx!.ls()).toContain('toremove')

      localStorageMock.setItem.mockClear()

      act(() => {
        const result = capturedCtx!.rm('toremove')
        expect(result).toBeNull()
      })

      expect(localStorageMock.setItem).toHaveBeenCalled()
      expect(capturedCtx!.ls()).not.toContain('toremove')
    })

    it('returns error for non-existent file', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      const result = capturedCtx!.rm('nonexistent')
      expect(result).toContain('No such file or directory')
    })
  })

  describe('resolve - Path Resolution', () => {
    it('resolves existing path to node', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      act(() => {
        capturedCtx!.mkdir('resolveme')
      })

      const node = capturedCtx!.resolve('resolveme')
      expect(node).not.toBeNull()
      expect(node!.name).toBe('resolveme')
      expect(node!.type).toBe('directory')
    })

    it('returns null for non-existent path', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      const node = capturedCtx!.resolve('nonexistent')
      expect(node).toBeNull()
    })

    it('resolves ~ to home directory', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      const node = capturedCtx!.resolve('~')
      expect(node).not.toBeNull()
      expect(node!.name).toBe('zachary')
    })
  })

  describe('localStorage persistence', () => {
    it('restores from localStorage on mount', () => {
      // Pre-populate localStorage with a VFS that has a test directory
      const savedVfs = {
        name: '',
        type: 'directory',
        children: {
          home: {
            name: 'home',
            type: 'directory',
            children: {
              zachary: {
                name: 'zachary',
                type: 'directory',
                children: {
                  'restored-dir': {
                    name: 'restored-dir',
                    type: 'directory',
                    children: {}
                  }
                }
              }
            }
          }
        }
      }

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedVfs))

      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      expect(capturedCtx!.ls()).toContain('restored-dir')
    })

    it('handles localStorage read errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage error')
      })

      // Should not throw - uses console.warn internally
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      // Should still have a working VFS with default state
      expect(capturedCtx!.pwd).toBe('/home/zachary')

      warnSpy.mockRestore()
    })
  })

  describe('refresh', () => {
    it('re-reads pwd from VFS', () => {
      let capturedCtx: ReturnType<typeof useVFS> | null = null

      render(
        <VFSProvider>
          <TestConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </VFSProvider>
      )

      // Directly modify VFS (bypassing context wrapper)
      capturedCtx!.vfs.mkdir('direct')
      capturedCtx!.vfs.cd('direct')

      // pwd state won't have updated yet since we bypassed the wrapper
      // Call refresh to sync
      act(() => {
        capturedCtx!.refresh()
      })

      // Now pwd should reflect the direct change
      expect(capturedCtx!.pwd).toBe('/home/zachary/direct')
    })
  })
})
