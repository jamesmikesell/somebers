# TODO

- post to social media
- use difficulty for affirmation selection
- track last X games against par time.
- refactor board.ts to reduce complexity. esp to reduce complexity around when to save updated state / saved values.
- animation when row/col/group total has been reached, even if some cells haven't been cleared
- Another thing you could do in regards to having a completed row/column with values that need removed - make the grey cell animate somehow and when you tap it, it removes all cells that are irrelevant (do some cool animations!!)
- Positive feedback when breaking previous records 
- documentation note on cheating
- multi-player: pvp
- multi-player: co-op
- leader board
- ability to play board again and compare against previous attempts
- ability to play board again and not ruin streak history
- warn that playing board again will ruin streak history
- tutorial mode
- sounds
- current sum of selected cells in a color group, shown in top right corner perhaps
- configuration to be able to show/hide running calculated sums
- temp cell selection: optionally do math for selected cells
- stats of fail counts based on grid size, time spent per game, per size
- ability to sync game state across devices

# Done

- display warning on UI if board can't be completed using first-principals
- abacas at bottom to help with mental math
- estimate board difficulty
- button to re-do current in progress game
- bug: undoing moves after a column / color group is hidden doesn't unhide their styling
- difficulty prediction - calculate how many cells are known to be required / unusable
- look at a few thousand boards to get an idea of min / max timeSpent to convert timeSpent into a difficulty
- temp cell selection: ability to highlight cells temporarily to mark that you're using them for mental math
- show empty grid for completed games
- better contrast between cells... potentially assign contrasting colors to different parts of the board, then give group a color based on which section of the board it occupies most
- record time spent per game
- screen wake lock
- stats streak last 5 days, week, month, all time
- migrate to indexeddb
- faster animation on zoom
- small numbers no longer have a background... not a problem, but probably remove their styling
- long-press isn't working in safari
- ability to undo a move, IE un-hide a hidden number, or de-select a selected number
- show game name somewhere on app / or an app game logo
- undo move menu option in menu
- border around color groups, esp in shape mode
- ability to long press on a cell and see an expanded it for better visibility
- Green processing circle difficult to see on light theme
- button appears to change to next game after game completion
- more polished way to ensure that temp UI state (if a cell is "processing", or should be wiggling etc) aren't persisted to storage
- tack "number of correct consecutive moves".
- track "percentage correct last 1k moves".
- show winning streak
- use .map as a copy constructor in board to ensure previous ui states aren't persisted
- shapes are hard to see.. make "light" part of shape transparent. ensure shape isn't over text
- color blind accessability
- add ability to clear all saved data.... new page / component with a text box that you have to type "delete everything" and click a button.
- persistence of previously played games
  - ability to partially solve a board, and save them for later
- sort affirmations based on number of mistakes
- click and partial drag on desktop doesn't clear animation
- animate changes, show some animation on initial tap to make the lag while waiting to see if a double tap is coming seem like it's part of the game
- clear formatting rows / columns / groups when all required cells are selected, and non-required cells are cleared. Possibly remove header value once a rows/column has been solved.
- investigate possibility that tapping is selecting a character... seems to be searching for "v" which may only be part of the version number display
- make game offline capable
- make game a PWA so it can be added to home screen
- app icon
- affirmation main text doesn't look great on ios
- make starting seed so that first few games are easy and progressively harder
- visual indication of failure moves
- ensure board display correctly on both portrait and landscape oriented devices
- explain how to play game
- dark/light/auto theme mode toggle
- weed out unsolvable games
- ensure every row/col/group has at least one required cell
- visually signal when game is complete
- buttons to change game number
- current sum of selected col/rows
- change the percent of numbers that are on the board (reduced to 40%)



# Not Gonna Do

- show hints for when people get stuck (Participation Trophy Mode)... though with infinite mistakes, is this necessary?
- Create a queue of pending moves and If one of the first moves fails, prevent failure of the others
- temp cell selection: cells are highlighted in consistent color depending on when they were highlighted
