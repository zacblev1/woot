import type { CommandDefinition, ThemeName, FontName } from '../types'
import { success, error } from '../types'
import { GAME_NAMES } from '@/lib/terminal-config'

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

    const uptimeMs = context.uptime()
    const uptimeMin = Math.floor(uptimeMs / 60000)
    const uptimeSec = Math.floor((uptimeMs % 60000) / 1000)
    const uptime = uptimeMin > 0 ? `${uptimeMin}m ${uptimeSec}s` : `${uptimeSec}s`

    const art = [
      '  ┌──────────┐',
      '  │  ██████  │',
      '  │  █    █  │',
      '  │  █    █  │',
      '  │  ██████  │',
      '  │  ██  ██  │',
      '  │          │',
      '  └──────────┘',
    ]
    const info = [
      '   zachary@home',
      '   ──────────────',
      `   OS: CYBER_PORTFOLIO v1.0`,
      `   Shell: zach-sh`,
      `   Theme: ${themeConfig.name}`,
      `   Font: ${fontConfig.name}`,
      `   Collections: ${collections.books.length} books, ${collections.vinyl.length} vinyl, ${collections.hardware.length} hardware`,
      `   Games: ${GAME_NAMES.length} available`,
    ]
    const lines = ['']
    for (let i = 0; i < Math.max(art.length, info.length); i++) {
      lines.push((art[i] || '                ') + (info[i] || ''))
    }
    lines.push(`                 Uptime: ${uptime}`)
    lines.push('')
    return success(lines)
  }
}
