# Set the uploaded logo as the site icon

## What changes
- The uploaded hexagon "H" logo becomes the browser tab icon (favicon) across the whole app.
- Adds an Apple touch icon, so the logo shows when someone saves the site to an iPhone/iPad home screen.
- The old Lovable icon is removed.

## Technical details
- Create `public/favicon.png` (64x64, square, padded) from the upload with `magick`.
- Create `public/apple-touch-icon.png` (180x180, dark #0f0a1e background — iOS doesn't support transparency).
- Replace `public/favicon.ico` with a multi-size ICO (16/32/48) made from the same logo, so browsers that request `/favicon.ico` directly also get the new logo.
- In `src/routes/__root.tsx` `head().links`, replace the current icon entry with:
  - `{ rel: "icon", type: "image/png", href: "/favicon.png" }`
  - `{ rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" }`
- Published sites built by users keep their own icons; this only affects the Hexa AI app.
