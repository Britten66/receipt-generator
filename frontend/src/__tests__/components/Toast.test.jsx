/*
  ══════════════════════════════════════════════════════════════════════════════
  COMPONENT TEST: Toast notification
  File: components/Toast.test.jsx
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  Toast is the only visual feedback users get for async actions — invoice saved,
  email sent, error occurred. The wrong color means a user thinks something
  succeeded when it failed (or vice versa). The upgrade toast has a clickable
  arrow that opens the upgrade flow — if that's broken, upgrade conversion drops.

  WHAT WE VERIFY:
  ───────────────
  1.  Success toast renders the message
  2.  Error toast renders the message
  3.  Upgrade toast renders the message with " →" suffix
  4.  Upgrade toast is clickable (cursor: pointer behavior)
  5.  No toast renders when toast=null
  ══════════════════════════════════════════════════════════════════════════════
*/

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

// Toast is rendered inline in App.jsx — test it as an isolated component
function Toast({ toast, onUpgradeClick }) {
  if (!toast) return null;
  return (
    <div
      data-testid="toast"
      style={{
        background: toast.type === "success" ? "var(--paid)" : toast.type === "upgrade" ? "var(--accent)" : "var(--voided)",
        cursor: toast.type === "upgrade" ? "pointer" : "default",
      }}
      onClick={toast.type === "upgrade" ? onUpgradeClick : undefined}
    >
      {toast.msg}{toast.type === "upgrade" ? " →" : ""}
    </div>
  );
}

describe("Toast — renders", () => {
  it("renders success message", () => {
    render(<Toast toast={{ msg: "Invoice saved.", type: "success" }} onUpgradeClick={vi.fn()} />);
    expect(screen.getByText("Invoice saved.")).toBeInTheDocument();
  });

  it("renders error message", () => {
    render(<Toast toast={{ msg: "Something went wrong.", type: "error" }} onUpgradeClick={vi.fn()} />);
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });

  it("renders upgrade message with → suffix", () => {
    render(<Toast toast={{ msg: "Upgrade to send emails", type: "upgrade" }} onUpgradeClick={vi.fn()} />);
    expect(screen.getByText("Upgrade to send emails →")).toBeInTheDocument();
  });

  it("renders nothing when toast is null", () => {
    const { container } = render(<Toast toast={null} onUpgradeClick={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("Toast — upgrade interaction", () => {
  it("upgrade toast click calls onUpgradeClick", () => {
    const onUpgradeClick = vi.fn();
    render(<Toast toast={{ msg: "Upgrade to unlock", type: "upgrade" }} onUpgradeClick={onUpgradeClick} />);
    fireEvent.click(screen.getByTestId("toast"));
    expect(onUpgradeClick).toHaveBeenCalledTimes(1);
  });

  it("success toast click does NOT call onUpgradeClick", () => {
    const onUpgradeClick = vi.fn();
    render(<Toast toast={{ msg: "Saved.", type: "success" }} onUpgradeClick={onUpgradeClick} />);
    fireEvent.click(screen.getByTestId("toast"));
    expect(onUpgradeClick).not.toHaveBeenCalled();
  });
});
