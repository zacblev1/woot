import type { CommandDefinition, ThemeName, FontName } from '../types'
import { success, error } from '../types'

export const themeCommand: CommandDefinition = {
  name: 'theme',
  description: 'Change terminal color theme',
  usage: 'theme [name]',
  execute: (args, context) => {
    const themeName = args[0]?.toLowerCase() as ThemeName | undefined

    if (!themeName) {
      const themes = context.theme.list()
      const themeList = themes.map(key => {
        const config = context.theme.config(key)
        return `  ${key === context.theme.current ? '* ' : '  '}${key.padEnd(12)} ${config.name}`
      })
      return success(['', 'Available themes:', '', ...themeList, '', 'Usage: theme <name>', ''])
    }

    const validThemes = context.theme.list()
    if (!validThemes.includes(themeName)) {
      return error(`Unknown theme: ${themeName}. Type 'theme' to see available themes.`)
    }

    context.theme.set(themeName)
    const config = context.theme.config(themeName)
    return success(`Theme set to ${config.name}`)
  }
}

export const fontCommand: CommandDefinition = {
  name: 'font',
  description: 'Change terminal font',
  usage: 'font [name]',
  execute: (args, context) => {
    const fontName = args[0]?.toLowerCase() as FontName | undefined

    if (!fontName) {
      const fonts = context.font.list()
      const fontList = fonts.map(key => {
        const config = context.font.config(key)
        return `  ${key === context.font.current ? '* ' : '  '}${key.padEnd(12)} ${config.name}`
      })
      return success(['', 'Available fonts:', '', ...fontList, '', 'Usage: font <name>', ''])
    }

    const validFonts = context.font.list()
    if (!validFonts.includes(fontName)) {
      return error(`Unknown font: ${fontName}. Type 'font' to see available fonts.`)
    }

    context.font.set(fontName)
    const config = context.font.config(fontName)
    return success(`Font set to ${config.name}`)
  }
}

export const neofetchCommand: CommandDefinition = {
  name: 'neofetch',
  description: 'Display system information',
  usage: 'neofetch',
  execute: (args, context) => {
    const themeConfig = context.theme.config(context.theme.current)
    const fontConfig = context.font.config(context.font.current)
    const { collections } = context

    return success([
      '',
      '  zachary@home',
      '  ------------',
      `  Theme: ${themeConfig.name}`,
      `  Font: ${fontConfig.name}`,
      '  Shell: web/1.0',
      '  Terminal: browser',
      `  Books: ${collections.books.length}`,
      `  Vinyl: ${collections.vinyl.length}`,
      `  Hardware: ${collections.hardware.length}`,
      '',
    ])
  }
}
