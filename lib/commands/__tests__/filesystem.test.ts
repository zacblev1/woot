import { describe, it, expect } from 'vitest'
import { mkdirCommand, touchCommand, rmCommand } from '../commands/filesystem'
import type { ExecuteContext } from '../types'
import type { ThemeName, FontName } from '@/lib/types/terminal'

/**
 * Create a mock ExecuteContext for testing.
 * VFS methods are mocked with vi.fn() to allow verification.
 */
function createMockContext(overrides: Partial<ExecuteContext> = {}): ExecuteContext {
  return {
    vfs: {
      pwd: vi.fn(() => '/home/zachary'),
      cd: vi.fn(() => null),
      ls: vi.fn(() => ['books', 'vinyl', 'hardware']),
      resolve: vi.fn(() => null),
      mkdir: vi.fn(() => null),
      touch: vi.fn(() => null),
      rm: vi.fn(() => null),
    },
    history: {
      add: vi.fn(),
      clear: vi.fn(),
    },
    game: {
      start: vi.fn(),
      end: vi.fn(),
      isActive: vi.fn(() => false),
    },
    theme: {
      current: 'lumon' as ThemeName,
      set: vi.fn(),
      list: vi.fn(() => ['lumon', 'dracula'] as ThemeName[]),
      config: vi.fn(() => ({ name: 'Lumon' })),
    },
    font: {
      current: 'jetbrains' as FontName,
      set: vi.fn(),
      list: vi.fn(() => ['jetbrains', 'fira'] as FontName[]),
      config: vi.fn(() => ({ name: 'JetBrains Mono' })),
    },
    currentDirectory: '~',
    setCurrentDirectory: vi.fn(),
    openUrl: vi.fn(),
    collections: {
      books: [],
      vinyl: [],
      hardware: [],
    },
    ...overrides,
  }
}

describe('mkdirCommand', () => {
  describe('validation', () => {
    it('returns error without path argument', () => {
      const context = createMockContext()

      const result = mkdirCommand.execute([], context)

      expect(result).toEqual({
        success: false,
        error: 'Usage: mkdir <directory>',
      })
    })
  })

  describe('success path', () => {
    it('returns success when vfs.mkdir returns null', () => {
      const context = createMockContext()

      const result = mkdirCommand.execute(['newdir'], context)

      expect(result).toEqual({
        success: true,
        output: '',
      })
    })

    it('calls vfs.mkdir with correct path', () => {
      const context = createMockContext()

      mkdirCommand.execute(['mydir'], context)

      expect(context.vfs.mkdir).toHaveBeenCalledWith('mydir')
    })

    it('calls vfs.mkdir with nested path', () => {
      const context = createMockContext()

      mkdirCommand.execute(['parent/child'], context)

      expect(context.vfs.mkdir).toHaveBeenCalledWith('parent/child')
    })
  })

  describe('error path', () => {
    it('returns error message when vfs.mkdir returns error string', () => {
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          mkdir: vi.fn(() => 'mkdir: parent directory does not exist'),
        },
      })

      const result = mkdirCommand.execute(['invalid/path'], context)

      expect(result).toEqual({
        success: false,
        error: 'mkdir: parent directory does not exist',
      })
    })
  })
})

describe('touchCommand', () => {
  describe('validation', () => {
    it('returns error without path argument', () => {
      const context = createMockContext()

      const result = touchCommand.execute([], context)

      expect(result).toEqual({
        success: false,
        error: 'Usage: touch <filename>',
      })
    })
  })

  describe('success path', () => {
    it('returns success when vfs.touch returns null', () => {
      const context = createMockContext()

      const result = touchCommand.execute(['newfile.txt'], context)

      expect(result).toEqual({
        success: true,
        output: '',
      })
    })

    it('calls vfs.touch with correct path', () => {
      const context = createMockContext()

      touchCommand.execute(['readme.md'], context)

      expect(context.vfs.touch).toHaveBeenCalledWith('readme.md')
    })

    it('calls vfs.touch with path in subdirectory', () => {
      const context = createMockContext()

      touchCommand.execute(['docs/notes.txt'], context)

      expect(context.vfs.touch).toHaveBeenCalledWith('docs/notes.txt')
    })
  })

  describe('error path', () => {
    it('returns error message when vfs.touch returns error string', () => {
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          touch: vi.fn(() => 'touch: cannot create file in non-existent directory'),
        },
      })

      const result = touchCommand.execute(['missing/file.txt'], context)

      expect(result).toEqual({
        success: false,
        error: 'touch: cannot create file in non-existent directory',
      })
    })
  })
})

describe('rmCommand', () => {
  describe('validation', () => {
    it('returns error without path argument', () => {
      const context = createMockContext()

      const result = rmCommand.execute([], context)

      expect(result).toEqual({
        success: false,
        error: 'Usage: rm <path>',
      })
    })
  })

  describe('success path', () => {
    it('returns success when vfs.rm returns null', () => {
      const context = createMockContext()

      const result = rmCommand.execute(['oldfile.txt'], context)

      expect(result).toEqual({
        success: true,
        output: '',
      })
    })

    it('calls vfs.rm with correct path', () => {
      const context = createMockContext()

      rmCommand.execute(['file-to-delete.txt'], context)

      expect(context.vfs.rm).toHaveBeenCalledWith('file-to-delete.txt')
    })

    it('calls vfs.rm with directory path', () => {
      const context = createMockContext()

      rmCommand.execute(['old-directory'], context)

      expect(context.vfs.rm).toHaveBeenCalledWith('old-directory')
    })
  })

  describe('error path', () => {
    it('returns error message when vfs.rm returns error string', () => {
      const context = createMockContext({
        vfs: {
          ...createMockContext().vfs,
          rm: vi.fn(() => 'rm: no such file or directory'),
        },
      })

      const result = rmCommand.execute(['nonexistent'], context)

      expect(result).toEqual({
        success: false,
        error: 'rm: no such file or directory',
      })
    })
  })
})
