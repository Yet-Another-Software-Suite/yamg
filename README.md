# FRC Mechanism Code Generator

A web-based tool for generating Java code for FRC (FIRST Robotics Competition) mechanisms like elevators, arms, and pivots.

![FRC Mechanism Code Generator Screenshot](/screenshot.png)

## Overview

This tool helps FRC teams quickly generate well-structured, command-based Java code for common robot mechanisms. It provides:

- Form-based configuration for mechanism parameters
- Real-time simulation of mechanism behavior
- Generated Java code for subsystems with proper control methods
- Support for different motor controllers (SparkMAX, SparkFlex, TalonFX, TalonFXS, ThriftyNova)
- Support for different motor types (NEO, NEO550, Minion, Krakenx44, Krakenx60)

## Features

- **Code Generation**: Create Java subsystem classes with proper control methods, telemetry, and simulation support
- **Interactive Simulation**: Test and visualize mechanism behavior with adjustable parameters
- **Multiple Mechanism Types**: Support for elevators, arms, and pivots (turrets/wrists)
- **Comprehensive Configuration**: Configure PID values, feedforward constants, soft limits, current limits, and more
- **Static Export**: The site can be built as a static site for easy deployment

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- pnpm (recommended) or npm/yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/frc-mechanism-generator.git
   cd frc-mechanism-generator
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to GitHub Pages

This project is configured for easy deployment to GitHub Pages:

1. Update the `basePath` in `next.config.mjs` to match your repository name:
   ```javascript
   basePath: '/your-repo-name',
   ```

2. Build and export the static site:
   ```bash
   pnpm build
   ```

3. Push the `out` directory to the `gh-pages` branch:
   ```bash
   git add out/ -f
   git commit -m "Deploy to GitHub Pages"
   git subtree push --prefix out origin gh-pages
   ```

   Alternatively, you can use a GitHub Action to automate deployment (see `.github/workflows/deploy.yml`).

## Project Structure

- `/app`: Next.js app router pages
- `/components`: React components for the UI
- `/lib`: Core logic for code generation and simulation
  - `/lib/motor-controllers`: Motor controller specific code
  - `/lib/simulation`: Simulation classes
- `/public`: Static assets and template files
  - `/public/templates`: Handlebars templates for code generation
  - `/public/simulation`: JavaScript simulation files

## Documentation

For more detailed information, see the documentation in the `/docs` directory:

- [Architecture Overview](docs/architecture.md)
- [Code Generation Process](docs/code-generation.md)
- [Simulation System](docs/simulation.md)
- [Simulation Development Guide](docs/simulation-development.md)
- [User Guide](docs/user-guide.md)
- [Deployment Guide](docs/deployment.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
