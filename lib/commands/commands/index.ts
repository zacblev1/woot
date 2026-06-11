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
  statsCommand,
} from './collection'

// Info commands
export {
  notesCommand,
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
  soundCommand,
  helpCommand,
  manCommand,
  clearCommand,
  echoCommand,
  exitCommand,
  sudoCommand,
  historyCommand,
} from './system'

// Filter commands
export {
  grepCommand,
  headCommand,
  tailCommand,
  wcCommand,
  sortCommand,
} from './filters'

// Fun commands
export { cowsayCommand } from './fun'

// Game command
export { gameCommand, VALID_GAMES } from './game'
