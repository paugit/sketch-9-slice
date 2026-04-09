# 9-Slice Plugin for Sketch

Apply 9-slice scaling to images in Sketch. Select an image layer, define the slice insets using a visual editor, and the plugin converts it into a resizable Symbol with correctly pinned and stretched regions.

Useful for mockuping 9-slice image based UIs before implementing them in Roblox, Unity, or any other game engine that supports 9-slice images.

## Installation

[Download the latest release](https://github.com/paugit/sketch-9-slice/releases/latest/download/sketch-9-slice.sketchplugin.zip), unzip, and double-click `sketch-9-slice.sketchplugin`.

## Usage

### Apply 9-Slice

1. Select an Image layer
2. Run **Plugins → 9-Slice → Apply 9-Slice…** (or `⌃⇧9`)
3. Drag the guide lines or enter inset values manually
4. Click **Apply 9-Slice** — the image is replaced with a Symbol

### Remove 9-Slice

Select the Symbol master or any of its instances and run **Plugins → 9-Slice → Remove 9-Slice**. This removes the master and all instances on the current page.
