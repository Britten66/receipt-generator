# April 2 Changes

## Logo panel in Create Invoice form
- Panel slides out at bottom of form, Pro only
- Upload logo or change it directly from the form
- Single tile cycles through 4 corners (top-left → top-right → bottom-right → bottom-left) on click
- Logo and corner saved to the receipt on submit
- Auto-populates from your profile logo when you open the form

## PDF logo placement
- Logo renders in all 4 corners based on what you picked
- Receipt number swaps sides when logo is top-right to avoid overlap
- Bottom corner logos placed just above footer so they never overlap content
- Logo URL and corner now saved to the receipts table (were being dropped before — root cause of top-left always showing)

## Upload bugs fixed
- Fixed: uploading a different file type (png vs jpg) created a duplicate — now always saves to a fixed path with no extension
- Fixed: browser caching old image — cache-busted with ?v=timestamp
- Fixed: uploads only updated local state, not persisted until "Save Profile" — now auto-saves immediately on upload

## Avatar vs logo separated
- Profile picture (topbar) → avatar_url → stored at {email}/avatar
- Business logo (PDF) → logo_url → stored at {email}/logo
- ProfileModal has two separate upload sections
- Topbar falls back to logo_url if no avatar yet

## remove.bg background removal
- Wired into logo upload path only (not avatar)
- Falls back silently to original if API key not set or call fails
- Set VITE_REMOVEBG_API_KEY in .env and Cloudflare to activate

## Rename receipt → invoice
- All user-facing text updated: buttons, toasts, labels, nav, toolbar count, detail panel, PDF filename, landing page
- Auto-increment placeholder changed to INV-000001
- Free tier changed from 3 receipts limit to unlimited with watermark

## Sign in fix
- Sign In button on landing page now drops straight into the app after auth — was leaving modal open

## Style pass
- Added --accent (warm copper) and --accent-dim to CSS variables — was used but never defined, now powers selected card border, active sidebar indicator, field focus ring, and logo panel highlight
- Modal backdrop darkened and gets a fade-in; modal itself slides up on open
- Auth page background orbs changed from green/blue to match warm earth tone palette
- Landing page CTA and plan buttons now match app button shadow style
- index.css conflicting .field class removed
- Active sidebar item uses --accent instead of plain text color
