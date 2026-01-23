// Navigation commands
export {
  lsCommand,
  cdCommand,
  pwdCommand,
  catCommand,
  viewCommand,
} from './navigation'

// Filesystem commands
export {
  mkdirCommand,
  touchCommand,
  rmCommand,
} from './filesystem'

// Collection commands
export {
  searchCommand,
  genreCommand,
  formatCommand,
  typeCommand,
} from './collection'

// Info commands
export {
  aboutCommand,
  contactCommand,
  projectsCommand,
  whoamiCommand,
  dateCommand,
} from './info'

// Style commands
export {
  themeCommand,
  fontCommand,
  neofetchCommand,
} from './style'

// System commands
export {
  helpCommand,
  manCommand,
  clearCommand,
  echoCommand,
  exitCommand,
  sudoCommand,
} from './system'

// Game command
export { gameCommand, VALID_GAMES } from './game'
