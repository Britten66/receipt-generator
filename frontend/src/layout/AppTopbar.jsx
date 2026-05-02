import { supabase } from "../lib/supabase";
import { PALETTE_ENTRIES, PALETTE_KEYS } from "../lib/themes";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export default function AppTopbar({
  darkMode, setDarkMode,
  profile, profileLoading,
  userEmail, avatarUrl,
  currentPalette, paletteExpanded, setPaletteExpanded,
  setPalette,
  setShowPlansModal, setShowProfileModal,
}) {
  return (
    <header className="topbar">

      {/* Column 1: dark mode toggle + palette picker (Pro/Voice only) */}
      <div className="topbar-left">
        <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "Light" : "Dark"}
        </button>

        {!profileLoading && profile?.tier !== "pro" && profile?.tier !== "voice" && (
          <button className="btn btn-primary btn-upgrade-pill" onClick={() => setShowPlansModal(true)}>Upgrade</button>
        )}

        {(profile?.tier === "pro" || profile?.tier === "voice") && (
          <div className="palette-picker" role="group" aria-label="Color palette">

            {(() => {
              const activeMeta = currentPalette ? PALETTE_ENTRIES.find(([k]) => k === currentPalette)?.[1] : null;
              const trigBg     = activeMeta ? (darkMode ? activeMeta.darkBg     : activeMeta.lightBg)     : null;
              const trigAccent = activeMeta ? (darkMode ? activeMeta.darkAccent : activeMeta.lightAccent) : null;
              return (
                <button
                  className={`palette-swatch palette-trigger${!activeMeta ? " palette-swatch-default" : ""}${paletteExpanded ? " palette-trigger-hidden" : ""}`}
                  style={activeMeta ? { background: `linear-gradient(135deg, ${trigBg} 50%, ${trigAccent} 50%)` } : undefined}
                  onClick={() => setPaletteExpanded(true)}
                  title="Choose color"
                  aria-label="Open color picker"
                  aria-expanded={paletteExpanded}
                />
              );
            })()}

            <div className={`palette-swatches${paletteExpanded ? " open" : ""}`}>
              <button
                className={`palette-swatch palette-swatch-default${!currentPalette ? " palette-swatch-active" : ""}`}
                onClick={() => { setPalette(null); setPaletteExpanded(false); }}
                title="Default"
                aria-pressed={!currentPalette}
                aria-label="Default palette"
              />
              {PALETTE_ENTRIES.map(([key, meta]) => {
                const bg     = darkMode ? meta.darkBg     : meta.lightBg;
                const accent = darkMode ? meta.darkAccent : meta.lightAccent;
                return (
                  <button
                    key={key}
                    className={`palette-swatch${currentPalette === key ? " palette-swatch-active" : ""}`}
                    style={{ background: `linear-gradient(135deg, ${bg} 50%, ${accent} 50%)` }}
                    onClick={() => { setPalette(key); setPaletteExpanded(false); }}
                    title={meta.label}
                    aria-pressed={currentPalette === key}
                    aria-label={`${meta.label} palette`}
                  />
                );
              })}
              <button
                className="palette-close-btn"
                onClick={() => setPaletteExpanded(false)}
                title="Close"
                aria-label="Close color picker"
              >✕</button>
            </div>
          </div>
        )}
      </div>

      {/* Column 2: date */}
      <div className="topbar-meta">
        {new Date().toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric" })}
      </div>

      {/* Column 3: avatar dropdown */}
      <div className="topbar-right">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="avatar-btn"
              aria-label="User menu"
              style={(profile?.tier === "pro" || profile?.tier === "voice") ? { border: "2px solid #D4AF37", boxShadow: "0 0 0 1px rgba(212,175,55,0.25)" } : undefined}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="" width={34} height={34} style={{ display: "block", objectFit: "cover" }} />
                : <div className="avatar-fallback">{userEmail[0] ? userEmail[0].toUpperCase() : "?"}</div>
              }
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="dropdown-content" sideOffset={8} align="end">
              <div className="dropdown-label">{userEmail}</div>
              <DropdownMenu.Separator className="dropdown-sep" />
              <DropdownMenu.Item className="dropdown-item" onSelect={() => setShowProfileModal(true)}>
                Profile &amp; Settings
              </DropdownMenu.Item>
              <DropdownMenu.Item className="dropdown-item dropdown-item-danger" onSelect={() => supabase.auth.signOut()}>
                Sign Out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

    </header>
  );
}
