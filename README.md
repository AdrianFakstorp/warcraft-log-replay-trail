# Warcraft Logs Movement Trails

A Chrome extension that visualizes player movement trails in Warcraft Logs replays.

## Features
- Visualize player movement trails during raid encounters
- Track multiple players simultaneously with different colors
- See where players stood still for extended periods
- Analyze movement patterns for better raid preparation
- Draggable interface that can be minimized when not in use

## Installation (Developer Mode)

Since this extension is not yet available on the Chrome Web Store, you can install it in developer mode by following these steps:

1. **Download the Extension**
   - Download this repository as a ZIP file and extract it to a folder, or clone the repository

2. **Open Chrome Extensions Page**
   - Open Chrome and navigate to `chrome://extensions/`
   - Alternatively, you can access this page by clicking the three dots menu → Extensions → Manage Extensions

3. **Enable Developer Mode**
   - Toggle on "Developer mode" in the top-right corner of the extensions page

4. **Load the Extension**
   - Click "Load unpacked"
   - Browse to the folder where you extracted/cloned the extension
   - Select the folder and click "Open"

5. **Verify Installation**
   - The extension should now appear in your list of extensions
   - You should see the Warcraft Logs Movement Trails icon in your Chrome toolbar

## How to Use

1. **Navigate to a Warcraft Logs Replay**
   - Go to any Warcraft Logs page that has a replay view (URL will contain `view=replay`)

2. **Select Players to Track**
   - A control panel will appear on the right side of the screen
   - Check the checkboxes next to player names to show their movement trails
   - Each player's trail will appear in a different color

3. **Analyze Movement**
   - The trail shows the complete path of each selected player
   - Larger circles indicate areas where players stood still for longer periods
   - The player's name appears at the start of their trail

4. **Interface Controls**
   - **Show Trails**: Toggle all trails on/off without affecting your player selection
   - **Clear All Trails**: Remove all trails and uncheck all players
   - **Minimize**: Collapse the panel to save screen space (click again to expand)
   - **Drag**: You can reposition the panel by dragging the header

## Troubleshooting

- **Panel is cut off**: If the control panel appears cut off, you can drag it to a better position by clicking and dragging the header
- **No players appear**: Make sure you're on a valid Warcraft Logs replay page with the replay view active
- **Extension doesn't load**: Try refreshing the page or restarting Chrome

## Contributing

Feel free to submit issues or pull requests to improve the extension.

## License

This project is licensed under the MIT License - see the LICENSE file for details.