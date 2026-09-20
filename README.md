# nexc

nexc is a translucent, highly customizable desktop clock application designed to blend seamlessly with the environment through a modular, profile-driven architecture.

## Tech Stack

- Tauri 2
- Rust
- React + TypeScript
- Vite
- Zustand

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Architecture

- **Desktop Surface**: The transparent, draggable React root that hosts the visual environment.
- **Layout Engine**: Manages the placement and sizing of modular widgets based on the active profile.
- **Modules**: Independent UI components (Clock, Date, Timer) with distinct configurations.
- **Profiles**: Switchable configurations that define which modules are active and how they are styled.
- **Visual System**: The Aura engine for audio-reactive backgrounds and system accent color integration.
- **Settings**: A unified overlay for configuring application behavior and aesthetics.
- **Runtime State**: Transient application state (like active timers) managed separately from persistent configuration.
