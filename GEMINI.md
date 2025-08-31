# GEMINI.md

## Project Overview

This project is a web-based number puzzle game called "Some Numbers," built with Angular. The game presents the user with a grid of numbers, and the player's objective is to determine which numbers are part of the solution and which are not. The game is won when the sum of the selected numbers in each row, column, and color-coded group matches the target values for each.

The application is a single-page application (SPA) that uses Angular for its frontend framework and Angular Material for its UI components. The game state is saved to the browser's local storage, allowing players to resume their progress.

## How to Play

The goal is to select the correct numbers on the grid to satisfy three conditions simultaneously:

1.  **Row Sums:** The sum of the selected numbers in each row must equal the number displayed at the far left of that row.
2.  **Column Sums:** The sum of the selected numbers in each column must equal the number displayed at the very top of that column.
3.  **Color Group Sums:** The sum of the selected numbers in each color-coded group must equal the small number in the top-left cell of that group.

### Controls

-   **Select a number:** Tap or swipe up on a cell to circle it, indicating it's part of the solution. On a desktop, click the cell.
-   **Remove a number:** Double-tap or swipe down on a cell to hide it, indicating it's not part of the solution. On a desktop, double-click or right-click the cell.

If you make a mistake (selecting a number that isn't part of the solution or removing one that is), the cell will shake, and your mistake count will increase.

## Building and Running

The project's `package.json` file contains the necessary scripts to build, run, and test the application.

-   **To run the application in a development environment:**
    ```bash
    npm start
    ```
    This will start a development server, and you can access the application at `http://localhost:4200`.

-   **To run the application for external access (e.g., on a local network):**
    ```bash
    npm run startExternal
    ```

-   **To build the application for production:**
    ```bash
    npm run build
    ```
    This will create a `dist/` directory with the production-ready files.

-   **To run the project's tests:**
    ```bash
    npm test
    ```

## Deployment

To deploy the application, use the `deploy.sh` script. This script will build the application and deploy it to GitLab Pages.

```bash
./deploy.sh
```

## Development Conventions

-   **Angular Structural Directives**: Avoid using deprecated structural directives like `*ngIf` and `*ngFor`. Instead, use the new `@if` and `@for` control flow syntax.
-   **Code Style:** The project uses [Prettier](https://prettier.io/) for code formatting.
-   **Styling:** The project uses SCSS for styling. The main stylesheet is located at `src/styles.scss`.
-   **Inline Styles:** Avoid using inline styles (`style="..."`) in HTML templates. Prefer defining styles in the corresponding SCSS files for better maintainability and separation of concerns.
-   **Components:** The application is structured into components, which can be found in the `src/app/component` directory.
-   **Services:** Services are used for shared logic and can be found in the `src/app/service` directory.
-   **Testing:** The project uses Karma and Jasmine for testing. Test files are located alongside the files they test and have a `.spec.ts` extension.
-   **Documentation:** Each time the functionality of the game is changed, user interactions are modified, or how things are displayed is updated, be sure to update the user-facing documentation.
-   **PWA/Offline Functionality:** Be cautious of changes that might break the offline Progressive Web App (PWA) functionality. The application is configured to work offline, and any changes to the service worker or caching strategy should be tested thoroughly.
-   **File Structure:** Model/utility classes should always go at the bottom of a ts file, below the component/service etc.