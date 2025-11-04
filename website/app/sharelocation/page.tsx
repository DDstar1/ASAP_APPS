"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LocationPageInner() {
  const params = useSearchParams();
  const lat = params.get("lat");
  const lng = params.get("lng");
  const app = params.get("app") || "customer";

  const [fallbackVisible, setFallbackVisible] = useState(false);

  useEffect(() => {
    if (!lat || !lng) return;

    // Deep link to your mobile app
    const deepLink =
      app === "rider"
        ? `asaprider://view-location?lat=${lat}&lng=${lng}`
        : `asapcustomer://view-location?lat=${lat}&lng=${lng}`;

    // Try opening the app
    window.location.href = deepLink;

    // Show fallback if app isn’t installed
    const timer = setTimeout(() => {
      setFallbackVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [lat, lng, app]);

  if (!lat || !lng) {
    return (
      <div className="flex items-center justify-center min-h-screen text-center">
        <p className="text-gray-700 text-lg">Invalid location link.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      {!fallbackVisible ? (
        <>
          <h1 className="text-2xl font-semibold mb-3">Opening the app...</h1>
          <p className="text-gray-600">Please wait a moment</p>
        </>
      ) : (
        <div className="max-w-md text-center bg-white p-6 rounded-2xl shadow-md">
          <h1 className="text-2xl font-semibold mb-4">Shared Location</h1>

          {/* 🗺️ Static map preview */}
          <iframe
            width="100%"
            height="250"
            loading="lazy"
            allowFullScreen
            className="rounded-xl mb-4"
            src={`https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
          ></iframe>

          <div className="flex flex-col space-y-3">
            {/* Open app button */}
            <a
              href={
                app === "rider"
                  ? `asaprider://view-location?lat=${lat}&lng=${lng}`
                  : `asapcustomer://view-location?lat=${lat}&lng=${lng}`
              }
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Open in App
            </a>

            {/* Google Maps fallback */}
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Google Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LocationPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <LocationPageInner />
    </Suspense>
  );
}
