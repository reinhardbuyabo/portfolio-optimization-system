# Contributing to Portfolio Optimization System

We welcome contributions to the Portfolio Optimization System! Please take a moment to review this document to understand how to contribute effectively.

## Code of Conduct

Please adhere to a professional and respectful tone in all interactions.

## How to Contribute

1.  **Fork the repository:** Start by forking the [main repository](https://github.com/your-username/portfolio-optimization-system) to your GitHub account.
2.  **Clone your fork:**
    ```bash
    git clone https://github.com/reinhard-buyabo/portfolio-optimization-system.git
    cd portfolio-optimization-system
    ```
3.  **Create a new branch:** Choose a descriptive name for your branch (e.g., `feature/add-garch-model`, `fix/sharpe-ratio-calc`).
    ```bash
    git checkout -b feature/your-feature-name
    ```
4.  **Make your changes:** Implement your feature, fix the bug, or make your improvements.
5.  **Run tests:** Before submitting, ensure all tests pass and add new tests for your changes.
    ```bash
    npm test
    ```
6.  **Run linter:** Ensure your code adheres to the project's style guidelines.
    ```bash
    npm run lint
    ```
7.  **Build the project:** Verify that the project builds without errors.
    ```bash
    npm run build
    ```
8.  **Commit your changes:** Write clear, concise, and descriptive commit messages.
    ```bash
    git add .
    git commit -m "feat: Add new feature"
    ```
9.  **Push to your fork:**
    ```bash
    git push origin feature/your-feature-name
    ```
10. **Create a Pull Request:** Open a pull request from your fork to the `main` branch of the upstream repository. Provide a detailed description of your changes.

## Development Setup

For detailed instructions on setting up your development environment, including prerequisites and installation steps, please refer to the main [README.md](README.md) file.

## Coding Style

Please follow the existing coding conventions and style within the project. The linter (`npm run lint`) will help enforce many of these. Consistency is key!

## Testing Guidelines

*   **Unit Tests:** Write unit tests for new functions, components, and utility helpers. These should be fast and isolated.
*   **Integration Tests:** For features involving multiple modules or API interactions, write integration tests.
*   **End-to-End (E2E) Tests:** For critical user flows, consider adding E2E tests using Playwright.
*   Ensure all existing tests pass before submitting your changes.

## Commit Messages

Please follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for your commit messages. This helps with automatic versioning and release notes generation.

Examples:
*   `feat: Add new dashboard widgets`
*   `fix: Correct Sharpe Ratio calculation`
*   `docs: Update README with ML integration details`
*   `chore: Update dependencies`

## Reporting Bugs

If you find a bug, please open an issue in the [issue tracker](https://github.com/your-username/portfolio-optimization-system/issues) with a clear description and steps to reproduce.

Thank you for contributing!
