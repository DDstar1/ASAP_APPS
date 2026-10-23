import SiteHeader from '@/components/SiteHeader'
import Footer from '@/components/Footer'

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-black text-[#e0e5f9]">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-6 lg:px-[7.5%] pt-10 pb-24">{children}</main>
      <Footer />
    </div>
  )
}
