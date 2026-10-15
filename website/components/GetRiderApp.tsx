import { Smartphone, Download } from 'lucide-react'
import { RIDER_APP_STORE_URL, RIDER_PLAY_STORE_URL } from '@/lib/app-links'

// Driver setup (vehicle, licence, payout) happens only in the rider app, which
// creates the back_drivers row through Rust. The website just sends people there.
export default function GetRiderApp() {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto">
        <Smartphone className="w-8 h-8 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-[#e0e5f9] mb-2">Finish in the rider app</h2>
        <p className="text-[#a5abbd] text-sm">
          Download the ASAP Rider app and sign in with your ASAP email and password. You&apos;ll add your vehicle and licence there.
        </p>
      </div>
      <div className="space-y-3">
        {RIDER_APP_STORE_URL && (
          <a href={RIDER_APP_STORE_URL} className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-black text-white rounded-2xl font-semibold hover:bg-[#111] transition">
            <Download className="w-5 h-5" />
            Download on the App Store
          </a>
        )}
        <a href={RIDER_PLAY_STORE_URL} className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-[#0f1626] border border-[#a5abbd]/15 text-[#e0e5f9] rounded-2xl font-semibold hover:bg-[#1c2a42] transition">
          <Download className="w-5 h-5" />
          Get it on Google Play
        </a>
      </div>
    </div>
  )
}
