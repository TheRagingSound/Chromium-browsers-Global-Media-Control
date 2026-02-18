<img width="372" height="578" alt="V1 1 0" src="https://github.com/user-attachments/assets/e201f8d4-be63-4b26-b5b8-82a125daa8a6" />
# Global Media Control

A Chromium (Chrome, Edge, Vivaldi) extension that adds a global media control popup—similar to Chrome’s built-in media control—with stacked cards for each tab playing audio or video. Control play/pause, previous/next, seek, and picture-in-picture from one place. Card backgrounds use the current media’s thumbnail or cover art.

## Features

- **Stacked media cards** – One card per tab with active `<audio>` or `<video>`
- **Cover art backgrounds** – Thumbnail/cover from the media (YouTube, Bandcamp, og:image, Media Session API, etc.)
- **Per-card controls** – Play/Pause, Previous, Next, seek bar, Picture-in-Picture (for video)
- **Latest played first** – Currently playing at top, then sorted by last active
- **Click card to focus tab** – Opens the tab and closes the popup
- **YouTube** – Thumbnail stays in sync when switching videos (derived from URL)
- **Bandcamp** – Cover art and Prev/Next on album and feed pages

## Requirements

- Chromium-based browser (Chrome, Edge, Vivaldi, etc.)
- Manifest V3

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions` (or your browser’s equivalent).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extension folder (the one containing `manifest.json`).

## Usage

1. Play audio or video in any tab (YouTube, Bandcamp, Spotify web, etc.).
2. Click the extension icon in the toolbar.
3. Use the cards to play/pause, seek, go previous/next, or open Picture-in-Picture. Click a card to switch to that tab.

## Project structure

```
├── manifest.json   # Extension manifest (Manifest V3)
├── popup.html      # Popup markup
├── popup.css       # Popup styles
├── popup.js        # Logic: media detection, UI, controls
├── LICENSE         # Apache License 2.0
└── README.md       # This file
```

## License

Copyright 2025 Global Media Control contributors.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

