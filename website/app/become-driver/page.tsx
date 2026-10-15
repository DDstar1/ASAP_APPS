import Link from 'next/link'
import { Package } from 'lucide-react'
import GetRiderApp from '@/components/GetRiderApp'

// For people who already have an ASAP login: same account, nothing to fill in
// here. proxy.ts sends signed-out visitors to /login first.
export default function BecomeDriver() {
  return (
    <div className="min-h-screen bg-[#080e1c] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="bg-linear-to-br from-[#ff923e] to-[#c46018] p-2 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-linear-to-r from-[#ff923e] to-[#c46018] bg-clip-text text-transparent">
              ASAP.
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-[#e0e5f9]">Become a Driver</h1>
          <p className="text-[#a5abbd] mt-2">Use the account you already have</p>
        </div>
        <div className="bg-[#1c2a42] rounded-3xl p-8 shadow-[0_12px_32px_rgba(8,14,28,0.5)]">
          <GetRiderApp />
          <p className="mt-6 text-center text-sm text-[#a5abbd]">
            <Link href="/home" className="text-[#ff923e] font-medium hover:underline">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
