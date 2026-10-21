# FRC Mechanism Code Generator

A web-based tool for generating WPILib 2027 Java code for FRC (FIRST Robotics Competition) mechanisms like elevators, arms, pivots and flywheels.

## Overview

This tool helps FRC teams quickly generate well-structured, command-based Java code for common robot mechanisms. It provides:

- Form-based configuration for mechanism parameters
- Real-time simulation of mechanism behavior
- Generated Java code for a Commands v2 subsystem or a Commands v3 mechanism
- Plain code that uses WPILib and the vendor library, or code that uses [YAMS](https://yams.yassrobotics.com)
- Support for different motor controllers (SparkMAX, SparkFlex, TalonFX, TalonFXS, ThriftyNova)
- Support for different motor types (NEO, NEO550, NEO Vortex, Minion, Thrifty Pulsar, Krakenx44, Krakenx60)

## Features

- **Code Generation**: Create Java subsystem classes with proper control methods, telemetry, and simulation support
- **Interactive Simulation**: Test and visualize mechanism behavior with adjustable parameters
- **Multiple Mechanism Types**: Support for elevators, arms, pivots (turrets/wrists) and flywheels
- **Comprehensive Configuration**: Configure PID values, feedforward constants, soft limits, current limits, and more
- **Static Export**: The site can be built as a static site for easy deployment

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- pnpm (recommended) or npm/yarn

### Installation

1. Clone the repository:
   ```bash
   gh repo clone Yet-Another-Software-Suite/yamg
   cd yamg
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

## Seasons

[yamg.yassrobotics.com](https://yamg.yassrobotics.com) serves the 2027 YAMG from `main`, and
[yamg.yassrobotics.com/2026](https://yamg.yassrobotics.com/2026/) serves the 2026 YAMG from the `2026`
branch. The `YAMG Deploy` workflow builds both after `main` passes its tests. After pushing to `2026`, run
it by hand from the Actions tab. To build the 2026 site for its path locally, set
`NEXT_PUBLIC_BASE_PATH=/2026`.

For a new season, add its path in `.github/workflows/deploy.yml` and `components/season-switch.tsx`.

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

## SystemCore Package

YAMG can be installed on SystemCore as a package (`yamg`), so it is served from the robot itself at `http://<systemcore>:5814/`. Install it by dragging the `.ipk` onto the SystemCore web interface at http://robot.local, then open the `yamg` tile. The package holds the 2027 site; its WPILib 2026 link goes to the hosted 2026 site.

- `systemcore/` holds the package: the control scripts, the socket activated systemd units, the small Python web server, and the tile image.
- `.github/workflows/build-ipk.yml` builds the site with `NEXT_PUBLIC_SYSTEMCORE=1` and packages it with opkg-build. It runs on every push and pull request.
- The deploy builds the package too and serves it beside the site, so the **Download for SystemCore** button at the bottom of the page gets the package built from the same commit. The version shown beside it links to that commit.
- `.github/workflows/release.yml` (run by hand from the **Actions** tab) builds a package with a release version and attaches it to a GitHub release.

## Project Structure

- `/app`: Next.js app router pages
- `/components`: React components for the UI
- `/lib`: Core logic for code generation and simulation
  - `/lib/simulation`: Simulation classes
- `/public`: Static assets and template files
  - `/public/templates`: Handlebars templates for code generation, one per output (`vendor` or `yams`),
    command framework (`v2` or `v3`) and mechanism, plus each motor controller's partials in `controllers`
  - `/public/simulation`: JavaScript simulation files

## Documentation

For more detailed information, see the documentation in the `/docs` directory:

- [Hardware Configuration Guide](docs/hardware-configuration.md)
- [Simulation Development Guide](docs/simulation-development.md)
- [User Guide](docs/user-guide.md)
- [Deployment Guide](docs/deployment.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the GPL-3.0 License - see the LICENSE file for details.
