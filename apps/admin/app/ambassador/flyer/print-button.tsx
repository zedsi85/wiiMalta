"use client";

/** Browser-native print → paper or "Save as PDF" on every platform. */
export function PrintButton() {
  return (
    <button className="btn-admin-primary" onClick={() => window.print()}>
      🖨 Print / save as PDF
    </button>
  );
}
