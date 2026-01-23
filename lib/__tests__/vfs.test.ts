/**
 * VFS Characterization Tests
 *
 * PURPOSE: These are CHARACTERIZATION tests - they document the current behavior
 * of the VirtualFileSystem before any refactoring begins. If a test fails because
 * behavior differs from what's documented here, that's important information about
 * what changed - update the test assertion to match actual current behavior.
 *
 * COVERAGE: cd, ls, pwd, mkdir, touch, rm, resolve, serialization
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { VirtualFileSystem } from '../vfs'

describe('VirtualFileSystem - Characterization Tests', () => {
  let vfs: VirtualFileSystem

  beforeEach(() => {
    vfs = new VirtualFileSystem()
  })

  describe('Initial State', () => {
    it('starts in home directory /home/zachary', () => {
      expect(vfs.getPwd()).toBe('/home/zachary')
    })

    it('root exists and is self-referencing for parent', () => {
      expect(vfs.root).toBeDefined()
      expect(vfs.root.name).toBe('')
      expect(vfs.root.type).toBe('directory')
      expect(vfs.root.parent).toBe(vfs.root) // Root's parent is itself
    })

    it('home directory exists at /home/zachary', () => {
      const home = vfs.resolve('/home/zachary')
      expect(home).not.toBeNull()
      expect(home?.type).toBe('directory')
    })

    it('current and home point to the same node initially', () => {
      expect(vfs.current).toBe(vfs.home)
    })
  })

  describe('cd - Change Directory', () => {
    beforeEach(() => {
      // Create test directories
      vfs.mkdir('testdir')
      vfs.touch('testfile')
    })

    it('changes to existing directory and returns null', () => {
      const result = vfs.cd('testdir')
      expect(result).toBeNull()
      expect(vfs.getPwd()).toBe('/home/zachary/testdir')
    })

    it('returns error for non-existent directory', () => {
      const result = vfs.cd('nonexistent')
      expect(result).toBe('cd: nonexistent: No such file or directory')
    })

    it('returns error when trying to cd into a file', () => {
      const result = vfs.cd('testfile')
      expect(result).toBe('cd: testfile: Not a directory')
    })

    it('navigates to parent with ..', () => {
      vfs.cd('testdir')
      const result = vfs.cd('..')
      expect(result).toBeNull()
      expect(vfs.getPwd()).toBe('/home/zachary')
    })

    it('navigates to home with ~', () => {
      vfs.cd('/')
      expect(vfs.getPwd()).toBe('/')

      const result = vfs.cd('~')
      expect(result).toBeNull()
      expect(vfs.getPwd()).toBe('/home/zachary')
    })

    it('navigates with absolute paths', () => {
      const result = vfs.cd('/home')
      expect(result).toBeNull()
      expect(vfs.getPwd()).toBe('/home')
    })

    it('handles .. at root (stays at root)', () => {
      vfs.cd('/')
      const result = vfs.cd('..')
      expect(result).toBeNull()
      expect(vfs.getPwd()).toBe('/')
    })

    it('handles path with tilde prefix ~/path', () => {
      vfs.cd('/')
      const result = vfs.cd('~/testdir')
      expect(result).toBeNull()
      expect(vfs.getPwd()).toBe('/home/zachary/testdir')
    })
  })

  describe('ls - List Directory', () => {
    beforeEach(() => {
      vfs.mkdir('adir')
      vfs.mkdir('bdir')
      vfs.touch('cfile')
    })

    it('lists contents of current directory sorted alphabetically', () => {
      const contents = vfs.ls()
      expect(contents).toEqual(['adir', 'bdir', 'cfile'])
    })

    it('returns empty array for empty directory', () => {
      vfs.cd('adir')
      expect(vfs.ls()).toEqual([])
    })

    it('returns error array for non-existent path', () => {
      const result = vfs.ls('nonexistent')
      expect(result).toEqual(['ls: nonexistent: No such file or directory'])
    })

    it('returns file name as single-element array when ls on a file', () => {
      const result = vfs.ls('cfile')
      expect(result).toEqual(['cfile'])
    })

    it('lists contents of specified path', () => {
      vfs.mkdir('adir/nested')
      const result = vfs.ls('adir')
      expect(result).toEqual(['nested'])
    })
  })

  describe('pwd - Print Working Directory', () => {
    it('returns / for root', () => {
      vfs.cd('/')
      expect(vfs.getPwd()).toBe('/')
    })

    it('returns full path for nested directory', () => {
      // Note: mkdir requires parent to exist - must create parent first
      vfs.mkdir('nested')
      vfs.mkdir('nested/deep')
      vfs.cd('nested/deep')
      expect(vfs.getPwd()).toBe('/home/zachary/nested/deep')
    })
  })

  describe('mkdir - Create Directory', () => {
    it('creates directory in current location', () => {
      const result = vfs.mkdir('newdir')
      expect(result).toBeNull()
      expect(vfs.ls()).toContain('newdir')
    })

    it('returns error when directory already exists', () => {
      vfs.mkdir('existingdir')
      const result = vfs.mkdir('existingdir')
      expect(result).toBe("mkdir: cannot create directory 'existingdir': File exists")
    })

    it('creates nested directory with path', () => {
      vfs.mkdir('parent')
      const result = vfs.mkdir('parent/child')
      expect(result).toBeNull()
      expect(vfs.ls('parent')).toContain('child')
    })

    it('returns error for invalid parent path', () => {
      const result = vfs.mkdir('nonexistent/child')
      expect(result).toBe('mkdir: nonexistent: No such file or directory')
    })
  })

  describe('touch - Create File', () => {
    it('creates file in current location', () => {
      const result = vfs.touch('newfile')
      expect(result).toBeNull()
      expect(vfs.ls()).toContain('newfile')
    })

    it('returns null when touching existing file (no error)', () => {
      vfs.touch('existingfile')
      const result = vfs.touch('existingfile')
      expect(result).toBeNull() // touch on existing is a no-op
    })

    it('creates file with path', () => {
      vfs.mkdir('dir')
      const result = vfs.touch('dir/file')
      expect(result).toBeNull()
      expect(vfs.ls('dir')).toContain('file')
    })

    it('created file has empty string content', () => {
      vfs.touch('emptyfile')
      const node = vfs.resolve('emptyfile')
      expect(node?.type).toBe('file')
      expect(node?.content).toBe('')
    })
  })

  describe('rm - Remove File/Directory', () => {
    beforeEach(() => {
      vfs.mkdir('rmdir')
      vfs.touch('rmfile')
    })

    it('removes file', () => {
      const result = vfs.rm('rmfile')
      expect(result).toBeNull()
      expect(vfs.ls()).not.toContain('rmfile')
    })

    it('removes directory', () => {
      const result = vfs.rm('rmdir')
      expect(result).toBeNull()
      expect(vfs.ls()).not.toContain('rmdir')
    })

    it('returns error for non-existent path', () => {
      const result = vfs.rm('nonexistent')
      expect(result).toBe('rm: nonexistent: No such file or directory')
    })

    it('cannot remove current directory', () => {
      vfs.cd('rmdir')
      const result = vfs.rm('.')
      // resolve('.') returns current, which equals current, so should error
      expect(result).toBe('rm: cannot remove current directory')
    })

    it('cannot remove root directory', () => {
      const result = vfs.rm('/')
      expect(result).toBe('rm: cannot remove root directory')
    })
  })

  describe('resolve - Path Resolution', () => {
    beforeEach(() => {
      vfs.mkdir('resolvetest')
      vfs.touch('resolvefile')
    })

    it('returns current directory for empty string', () => {
      const result = vfs.resolve('')
      expect(result).toBe(vfs.current)
    })

    it('returns home for ~', () => {
      const result = vfs.resolve('~')
      expect(result).toBe(vfs.home)
    })

    it('resolves .. to parent', () => {
      vfs.cd('resolvetest')
      const result = vfs.resolve('..')
      expect(result?.name).toBe('zachary')
    })

    it('returns null for non-existent path', () => {
      const result = vfs.resolve('nonexistent')
      expect(result).toBeNull()
    })

    it('handles . in path (current directory)', () => {
      const result = vfs.resolve('./resolvefile')
      expect(result?.name).toBe('resolvefile')
    })

    it('resolves absolute path from anywhere', () => {
      vfs.cd('resolvetest')
      const result = vfs.resolve('/home/zachary/resolvefile')
      expect(result?.name).toBe('resolvefile')
    })

    it('resolves ~/path correctly', () => {
      vfs.cd('/')
      const result = vfs.resolve('~/resolvetest')
      expect(result?.name).toBe('resolvetest')
    })
  })

  describe('Serialization - toJSON/fromJSON', () => {
    beforeEach(() => {
      vfs.mkdir('serializedir')
      vfs.touch('serializefile')
      vfs.mkdir('serializedir/nested')
    })

    it('toJSON produces valid JSON string', () => {
      const json = vfs.toJSON()
      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('serialized JSON excludes parent references (no circular refs)', () => {
      const json = vfs.toJSON()
      const parsed = JSON.parse(json)

      // Check that parent is not serialized
      expect(parsed.parent).toBeUndefined()

      // Check nested children also don't have parent
      if (parsed.children?.home?.children?.zachary?.children?.serializedir) {
        expect(parsed.children.home.children.zachary.children.serializedir.parent).toBeUndefined()
      }
    })

    it('fromJSON restores directory structure', () => {
      const json = vfs.toJSON()

      const newVfs = new VirtualFileSystem()
      newVfs.fromJSON(json)

      // Should be in home directory after restore
      expect(newVfs.getPwd()).toBe('/home/zachary')

      // Should have our created directories
      expect(newVfs.ls()).toContain('serializedir')
      expect(newVfs.ls()).toContain('serializefile')
    })

    it('fromJSON restores parent references correctly', () => {
      const json = vfs.toJSON()

      const newVfs = new VirtualFileSystem()
      newVfs.fromJSON(json)

      // Navigate and check parent works
      newVfs.cd('serializedir')
      const result = newVfs.cd('..')
      expect(result).toBeNull()
      expect(newVfs.getPwd()).toBe('/home/zachary')
    })

    it('fromJSON restores nested structure', () => {
      const json = vfs.toJSON()

      const newVfs = new VirtualFileSystem()
      newVfs.fromJSON(json)

      expect(newVfs.ls('serializedir')).toContain('nested')
    })

    it('fromJSON creates home if missing', () => {
      // This tests the fallback behavior
      const json = '{"name":"","type":"directory","children":{}}'

      const newVfs = new VirtualFileSystem()
      newVfs.fromJSON(json)

      // Should create /home/zachary as fallback
      expect(newVfs.getPwd()).toBe('/home/zachary')
    })
  })

  describe('createDir - Directory Creation Helper', () => {
    it('creates nested path from root', () => {
      vfs.createDir('/test/nested/deep')

      const result = vfs.resolve('/test/nested/deep')
      expect(result).not.toBeNull()
      expect(result?.type).toBe('directory')
    })

    it('returns the created node', () => {
      const node = vfs.createDir('/newpath')
      expect(node.name).toBe('newpath')
      expect(node.type).toBe('directory')
    })

    it('does not error on existing path (idempotent)', () => {
      vfs.createDir('/existing/path')
      const result = vfs.createDir('/existing/path')
      expect(result.name).toBe('path')
    })
  })
})
