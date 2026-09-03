export const LEGAL_DISCLAIMER = "Nautical Compass provides legal information, document organization, and administrative navigation tools. Nautical Compass is not a law firm and does not provide legal advice or legal representation. Use of this service does not create an attorney-client relationship. Information may be incomplete, outdated, or inapplicable to a particular situation and is not a substitute for advice from a licensed attorney. Users remain responsible for verifying information, protecting deadlines, and deciding whether to obtain professional counsel. No result or outcome is guaranteed.";

export default function LegalDisclaimer({ compact = false }) {
  return (
    <aside className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" aria-label="Legal information disclaimer">
      {compact ? "Legal information only — not legal advice or representation. No attorney-client relationship is created and no outcome is guaranteed." : LEGAL_DISCLAIMER}
    </aside>
  );
}
