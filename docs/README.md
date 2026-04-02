# Documentation Assets

This folder contains visual assets (images, GIFs, diagrams) for the Gcore WebRTC SDK documentation.

## Current Status

⚠️ **Note**: The Gcore official documentation currently only provides static PNG images, not animated GIFs. The image URLs are protected with signature tokens and cannot be directly downloaded.

## Recommended GIF Assets

To enhance the documentation with animated demonstrations, consider adding these GIF files:

### 1. Quick Start Demo (`quick-start-demo.gif`)
**Shows**: Complete workflow from opening page → clicking "Go Live" → streaming
- User opens demo page
- Allows camera/mic permissions
- Clicks start button
- Stream goes live
- Status indicator shows "🔴 Live"

### 2. Device Selection (`device-selection-demo.gif`)
**Shows**: Switching between cameras and microphones
- User opens device dropdowns
- Selects different camera
- Video preview updates
- Selects different microphone
- All while streaming continues

### 3. Quality Monitoring (`quality-monitoring-demo.gif`)
**Shows**: Quality indicator responding to network changes
- Stream starts at 720p (green indicator)
- Network degrades
- Quality drops to 480p (yellow indicator)
- Network recovers
- Quality restored (green indicator)

### 4. Error Handling (`error-handling-demo.gif`)
**Shows**: Permission denied → friendly error message
- User clicks start
- Browser shows permission prompt
- User clicks "Block"
- App shows user-friendly error: "Camera access required"
- Retry button appears

### 5. Auto Device Switching (`auto-device-switch-demo.gif`)
**Shows**: Seamless device switching when device disconnects
- Stream active with webcam
- User unplugs webcam
- App automatically switches to built-in camera
- Notification: "Switched to Built-in Camera"
- Stream continues without interruption

### 6. Multi-Resolution Preview (`resolution-demo.gif`)
**Shows**: Changing resolution in real-time
- Stream at 480p
- User selects 1080p from dropdown
- Video preview updates to higher quality
- Bitrate indicator increases
- Stream continues seamlessly

### 7. Reconnection Flow (`reconnection-demo.gif`)
**Shows**: Automatic reconnection after network interruption
- Stream shows "🔴 Live"
- Network disconnects (WiFi icon crossed out)
- Status changes to "Reconnecting..."
- Network restores
- Status returns to "🔴 Live"

## Creating GIFs

### Recommended Tools

**For Screen Recording → GIF**:
- [Kap](https://getkap.co/) (macOS) - Free, open-source
- [ScreenToGif](https://www.screentogif.com/) (Windows) - Free
- [Peek](https://github.com/phw/peek) (Linux) - Free

**For Video → GIF Conversion**:
```bash
# Using FFmpeg
ffmpeg -i input.mp4 -vf "fps=15,scale=800:-1:flags=lanczos" -c:v gif output.gif

# Optimize file size
gifsicle -O3 --colors 256 output.gif -o optimized.gif
```

### GIF Guidelines

**Technical Specs**:
- **Resolution**: 800-1200px width (responsive)
- **Frame Rate**: 10-15 fps (smooth but small file size)
- **Duration**: 5-15 seconds (loop seamlessly)
- **File Size**: <5 MB per GIF
- **Format**: GIF or animated WebP

**Quality Tips**:
- Use screen recording at 1920x1080, scale down for web
- Crop tightly to relevant UI area
- Add subtle borders/shadows for context
- Optimize colors (256 colors max for GIF)
- Test on dark/light backgrounds

## Using Assets in Documentation

### In Markdown Files

```markdown
![Quick Start Demo](docs/images/quick-start-demo.gif)
```

### In HTML

```html
<img src="docs/images/quick-start-demo.gif"
     alt="Quick Start Demo"
     width="800"
     loading="lazy">
```

### With Captions

```markdown
**Quick Start Demo**

![Browser → Go Live → Streaming in 30 seconds](docs/images/quick-start-demo.gif)

*From zero to streaming in under 30 seconds - no software installation required*
```

## Alternative: Static Image Fallbacks

If GIFs are too large, consider static images with descriptive text:

```
docs/images/
  ├── 01-permission-prompt.png
  ├── 02-device-selection.png
  ├── 03-preview-screen.png
  ├── 04-streaming-live.png
  └── 05-quality-indicator.png
```

## External Assets

### Gcore Official Documentation Images

The following images are available from Gcore docs (protected URLs):
- Protocol conversion diagrams
- Transcoding configuration
- Demo interface screenshots
- WebRTC internals graphs

**Access**: These are hosted on `mintcdn.com` with signed URLs. Reference them directly in documentation via the full URLs with query parameters included.

## Contributing Assets

To add new visual assets:

1. **Create/Record GIF** following guidelines above
2. **Optimize** file size (<5 MB)
3. **Name** descriptively (`feature-name-demo.gif`)
4. **Place** in `docs/images/`
5. **Update** this README with description
6. **Reference** in relevant documentation files

## License

All visual assets should be:
- Original content created by Gcore team
- Licensed under same terms as SDK (MIT)
- Free to use/modify by SDK users

---

**Need help?** See [AI_DEVELOPMENT_GUIDE.md](../AI_DEVELOPMENT_GUIDE.md) for tips on using AI to enhance documentation.
