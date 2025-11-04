import React from "react";
import { Package, Truck, Clock, MapPin, CheckCircle, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-black dark:to-purple-950">
      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-20">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ASAP.
            </span>
          </div>
          <div className="flex gap-4">
            <button className="px-5 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
              Sign In
            </button>
            <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all">
              Get Started
            </button>
          </div>
        </header>

        {/* Hero Content */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full mb-6">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Lightning-fast deliveries across the city
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Deliver Anything,
            </span>
            <br />
            <span className="text-gray-900 dark:text-white">
              Anytime, Anywhere
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10">
            Same-day delivery service that connects you with reliable couriers.
            Track your packages in real-time and get doorstep delivery ASAP.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Send a Package
              <span className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></span>
            </button>
            <button className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full font-semibold text-lg hover:border-blue-600 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Track Package
            </button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                50K+
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Deliveries
              </div>
            </div>
            <div className="w-px bg-gray-300 dark:bg-gray-700"></div>
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                2 Hours
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Avg. Delivery
              </div>
            </div>
            <div className="w-px bg-gray-300 dark:bg-gray-700"></div>
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                99.8%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Success Rate
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="group p-8 bg-white dark:bg-gray-800/50 rounded-3xl hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-200 dark:border-gray-700">
            <div className="bg-blue-100 dark:bg-blue-900/30 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Clock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
              Same-Day Delivery
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get your packages delivered within hours. Perfect for urgent
              shipments and last-minute gifts.
            </p>
          </div>

          <div className="group p-8 bg-white dark:bg-gray-800/50 rounded-3xl hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-200 dark:border-gray-700">
            <div className="bg-purple-100 dark:bg-purple-900/30 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MapPin className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
              Real-Time Tracking
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Watch your package move in real-time with GPS tracking. Know
              exactly when it'll arrive.
            </p>
          </div>

          <div className="group p-8 bg-white dark:bg-gray-800/50 rounded-3xl hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-200 dark:border-gray-700">
            <div className="bg-green-100 dark:bg-green-900/30 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
              Secure & Insured
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Every package is insured and handled with care. Your items are
              safe with our verified couriers.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Ship?</h2>
          <p className="text-xl mb-8 text-blue-50">
            Join thousands of satisfied customers using SwiftDeliver every day
          </p>
          <button className="px-10 py-4 bg-white text-blue-600 rounded-full font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all">
            Start Your First Delivery
          </button>
        </div>
      </main>
    </div>
  );
}
