import React from "react";
import Link from "next/link";
import { Package, Truck, Clock, MapPin, CheckCircle, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080e1c]">
      <main className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-20">
          <div className="flex items-center gap-2">
            <div className="bg-linear-to-br from-[#ff923e] to-[#c46018] p-2 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-linear-to-r from-[#ff923e] to-[#c46018] bg-clip-text text-transparent">
              ASAP.
            </span>
          </div>
          <div className="flex gap-4">
            <Link
              href="/vendor/login"
              className="px-5 py-2 text-[#a5abbd] hover:text-[#e0e5f9] font-medium transition-colors"
            >
              Vendor Sign In
            </Link>
            <Link
              href="/vendor/signup"
              className="px-6 py-2 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-medium hover:shadow-[0_0_20px_rgba(255,146,62,0.3)] hover:scale-105 transition-all"
            >
              Get Started
            </Link>
          </div>
        </header>

        {/* Hero Content */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-[#ff923e]/10 px-4 py-2 rounded-full mb-6">
            <Zap className="w-4 h-4 text-[#ff923e]" />
            <span className="text-sm font-medium text-[#ff923e]">
              Lightning-fast deliveries across the city
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-linear-to-r from-[#ff923e] to-[#c46018] bg-clip-text text-transparent">
              Deliver Anything,
            </span>
            <br />
            <span className="text-[#e0e5f9]">Anytime, Anywhere</span>
          </h1>

          <p className="text-xl text-[#a5abbd] max-w-2xl mx-auto mb-10">
            Same-day delivery service that connects you with reliable couriers.
            Track your packages in real-time and get doorstep delivery ASAP.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button className="group relative px-8 py-4 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-semibold text-lg hover:shadow-[0_12px_32px_rgba(255,146,62,0.25)] hover:scale-105 transition-all flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Send a Package
              <span className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity"></span>
            </button>
            <button className="px-8 py-4 border border-[#a5abbd]/25 text-[#a5abbd] rounded-full font-semibold text-lg hover:border-[#ff923e]/50 hover:text-[#e0e5f9] transition-all flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Track Package
            </button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-[#e0e5f9]">50K+</div>
              <div className="text-sm text-[#a5abbd]">Deliveries</div>
            </div>
            <div className="w-px bg-[#a5abbd]/20"></div>
            <div>
              <div className="text-3xl font-bold text-[#e0e5f9]">2 Hours</div>
              <div className="text-sm text-[#a5abbd]">Avg. Delivery</div>
            </div>
            <div className="w-px bg-[#a5abbd]/20"></div>
            <div>
              <div className="text-3xl font-bold text-[#e0e5f9]">99.8%</div>
              <div className="text-sm text-[#a5abbd]">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <div className="group p-8 bg-[#152035] rounded-3xl hover:bg-[#1c2a42] transition-all hover:-translate-y-1">
            <div className="bg-[#ff923e]/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Clock className="w-7 h-7 text-[#ff923e]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-[#e0e5f9]">
              Same-Day Delivery
            </h3>
            <p className="text-[#a5abbd]">
              Get your packages delivered within hours. Perfect for urgent
              shipments and last-minute gifts.
            </p>
          </div>

          <div className="group p-8 bg-[#152035] rounded-3xl hover:bg-[#1c2a42] transition-all hover:-translate-y-1">
            <div className="bg-[#ff923e]/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MapPin className="w-7 h-7 text-[#ff923e]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-[#e0e5f9]">
              Real-Time Tracking
            </h3>
            <p className="text-[#a5abbd]">
              Watch your package move in real-time with GPS tracking. Know
              exactly when it&apos;ll arrive.
            </p>
          </div>

          <div className="group p-8 bg-[#152035] rounded-3xl hover:bg-[#1c2a42] transition-all hover:-translate-y-1">
            <div className="bg-[#ff923e]/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CheckCircle className="w-7 h-7 text-[#ff923e]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-[#e0e5f9]">
              Secure & Insured
            </h3>
            <p className="text-[#a5abbd]">
              Every package is insured and handled with care. Your items are
              safe with our verified couriers.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-linear-to-r from-[#ff923e] to-[#c46018] rounded-3xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-4 text-white">Ready to Ship?</h2>
          <p className="text-xl mb-8 text-white/80">
            Join thousands of satisfied customers using ASAP every day
          </p>
          <button className="px-10 py-4 bg-[#080e1c] text-[#ff923e] rounded-full font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all">
            Start Your First Delivery
          </button>
        </div>
      </main>
    </div>
  );
}
