import { VENDOR_GUIDELINES } from '@/lib/vendorGuidelines'

// Shown before every store is created; the store insert is refused by RLS
// without guidelines_accepted_at
export default function VendorGuidelines({ agreed, onAgreedChange }: {
  agreed: boolean
  onAgreedChange: (agreed: boolean) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Vendor Guidelines</label>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-[#a5abbd]/15 bg-[#152035] p-4 space-y-4">
        {VENDOR_GUIDELINES.map((section, i) => (
          <div key={section.title}>
            <p className="text-xs font-semibold tracking-widest text-[#a5abbd] uppercase mb-1.5">
              <span className="text-[#ff923e] mr-2">{String(i + 1).padStart(2, '0')}</span>
              {section.title}
            </p>
            <ul className="space-y-1.5">
              {section.points.map((point) => (
                <li key={point} className="flex gap-2 text-sm text-[#e0e5f9] leading-relaxed">
                  <span className="text-[#ff923e]">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <label className="flex items-start gap-3 mt-3 cursor-pointer">
        <input type="checkbox" checked={agreed} onChange={(e) => onAgreedChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#ff923e]" />
        <span className="text-sm text-[#e0e5f9]">I have read and agree to follow these guidelines</span>
      </label>
    </div>
  )
}
