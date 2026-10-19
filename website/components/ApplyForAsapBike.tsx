'use client'

import { useState } from 'react'
import { Bike } from 'lucide-react'
import DriverApplicationSheet from '@/components/DriverApplicationSheet'

export default function ApplyForAsapBike() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#ff923e]/15 text-[#ff923e] flex items-center justify-center shrink-0">
          <Bike className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#e0e5f9]">No bike? Ride one of ours</h2>
          <p className="text-sm text-[#a5abbd] mt-1">Apply to ride an ASAP electric bike or bicycle. We&apos;ll contact you to finish in person.</p>
        </div>
      </div>
      <button onClick={() => setOpen(true)}
        className="w-full mt-5 py-3 rounded-2xl bg-linear-to-r from-[#ff923e] to-[#c46018] text-white font-semibold cursor-pointer">
        Apply to ride
      </button>
      {open && <DriverApplicationSheet onClose={() => setOpen(false)} onSubmitted={() => {}} />}
    </>
  )
}
