import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CityMap from "@/components/CityMap";
import SiteHeader from "@/components/SiteHeader";
import Ecosystem from "@/components/Ecosystem";
import Features from "@/components/Features";
import ZazuBanner from "@/components/ZazuBanner";
import Platform from "@/components/Platform";
import Footer from "@/components/Footer";
import AppDownload from "@/components/AppDownload";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-[#e0e5f9]">
      {/* Hero: the map fills the first screen, everything sits on it */}
      <section className="relative h-dvh min-h-[600px] overflow-hidden">
        <CityMap className="opacity-70" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.25)_60%,rgba(0,0,0,0.85)_100%)]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-black" />

        <SiteHeader className="absolute top-0 inset-x-0" />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight max-w-5xl text-white text-balance">
            Shipping packages across your city has never been easier
          </h1>
          <p className="mt-6 text-lg md:text-xl font-medium text-white/80 max-w-2xl text-balance">
            You can lean on us for last-mile shipping, payment settlements and timely deliveries, at a reasonable cost
            for you and your clients.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/invest"
              className="px-8 py-4 rounded-full bg-black border-2 border-[#ff923e] text-[#ff923e] font-semibold text-lg hover:bg-[#ff923e]/10 transition-colors">
              Asset Discovery
            </Link>
            <Link href="/vendor/dashboard"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#ff923e] text-black font-semibold text-lg hover:bg-[#ff9f55] hover:shadow-[0_12px_32px_rgba(255,146,62,0.35)] transition-all">
              Vendor <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      <main className="px-4 sm:px-6 lg:px-[7.5%] pb-16">
        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 text-center py-12 mb-12">
          <div>
            <div className="text-3xl font-bold">50K+</div>
            <div className="text-sm text-[#a5abbd]">Deliveries</div>
          </div>
          <div className="w-px bg-white/15"></div>
          <div>
            <div className="text-3xl font-bold">2 Hours</div>
            <div className="text-sm text-[#a5abbd]">Avg. Delivery</div>
          </div>
          <div className="w-px bg-white/15"></div>
          <div>
            <div className="text-3xl font-bold">99.8%</div>
            <div className="text-sm text-[#a5abbd]">Success Rate</div>
          </div>
        </div>

        <Ecosystem />

        <AppDownload />
        
        <Platform />

        <Features />

       <ZazuBanner />

      </main>

      <Footer />
    </div>
  );
}
