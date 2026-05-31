# Video Asset Attribution

## sportico-training-bg.mp4

**Status**: Placeholder — video asset not yet added.

**Instructions for adding a video**:

1. Download a royalty-free sports/training video from a source such as:
   - Pexels (https://www.pexels.com/videos/) — free, commercial use allowed, attribution optional
   - Pixabay (https://pixabay.com/videos/) — free, commercial use allowed, no attribution required
   - Mixkit (https://mixkit.co/) — free, commercial use license

2. Choose a clip that is:
   - Short (5–15 seconds, loopable)
   - Sports/training/movement themed — badminton, general athletics, or abstract motion
   - Compressed: target < 5 MB (use HandBrake or ffmpeg with H.264 + CRF 28)
   - Safe: no identifiable athletes, no copyrighted jerseys or logos

3. Rename the file to `sportico-training-bg.mp4` and place it here.

4. Add attribution details below if required by the source license.

## ffmpeg compression command

```bash
ffmpeg -i input.mp4 -vcodec libx264 -crf 28 -preset slow -vf "scale=1920:-2" -an sportico-training-bg.mp4
```

---

**Do not commit copyrighted or licensed-without-permission video files.**
