"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  Navigation,
  Crosshair,
  CheckCircle,
  Clock,
  MapPin,
  Plus,
  ArrowLeft,
  Map as MapIcon,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { loadGoogleMaps } from "@/components/GoogleMapsView";

const TripMap = dynamic(() => import("@/components/TripMap"), { ssr: false });
const LiveTripMap = dynamic(() => import("@/components/LiveTripMap"), { ssr: false });
const GoogleMapsView = dynamic(() => import("@/components/GoogleMapsView"), { ssr: false });

// Decode Google Maps encoded polyline to array of {lat, lng}
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => window.clearTimeout(timeoutId));
}

export default function EmployeeVehiclesPage() {
  const [employee, setEmployee] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Tracking states
  const [trackingId, setTrackingId] = useState(null);
  const [trackingMessage, setTrackingMessage] = useState("");
  // Watcher indicator state
  const [watcherCount, setWatcherCount] = useState(0);
  const watcherPollRef = useRef(null);

  const router = useRouter();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [liveTrackingTrip, setLiveTrackingTrip] = useState(null); // trip being live-tracked after submit
  const [endingTrip, setEndingTrip] = useState(false);
  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);
  const [selectedMapTrip, setSelectedMapTrip] = useState(null);
  const [tripData, setTripData] = useState({
    date: new Date().toISOString().split("T")[0],
    vehicleId: "",
    startLocation: "",
    endLocation: "",
    distanceKm: "",
    reason: "",
    startCoords: null,
    endCoords: null,
    routePath: [],
  });

  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const destSearchTimeout = useRef(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [isLocatingPickup, setIsLocatingPickup] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [routeError, setRouteError] = useState("");
  const routeRequestRef = useRef(0);

  useEffect(() => {
    const empData = localStorage.getItem("employeeData");
    if (empData) {
      const parsed = JSON.parse(empData);
      setEmployee(parsed);
      fetchData(parsed.id);
    } else {
      router.push("/login");
    }
  }, [router]);

  const fetchData = async (empId) => {
    setLoading(true);
    try {
      const [vehRes, tripRes] = await Promise.all([
        fetch(`/api/vehicles?employeeId=${empId}`),
        fetch(`/api/trips?employeeId=${empId}`),
      ]);
      const vehData = await vehRes.json();
      const tripData = await tripRes.json();
      setVehicles(vehData);
      setTrips(tripData);

      const activeTrip = tripData.find((t) => t.status === "ACTIVE");
      if (activeTrip && trackingId === null) {
        setTrackingMessage(
          "Trip is stable now. Live location tracking is active. Keep this app open while travelling.",
        );
        startTracking(activeTrip.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Poll for watchers on active trip
  useEffect(() => {
    const activeTrip = trips.find((t) => t.status === "ACTIVE");
    if (watcherPollRef.current) {
      clearInterval(watcherPollRef.current);
      watcherPollRef.current = null;
    }
    if (!activeTrip) {
      setWatcherCount(0);
      return;
    }
    const poll = async () => {
      try {
        const res = await fetch(`/api/trips/${activeTrip.id}/watchers`);
        if (res.ok) {
          const data = await res.json();
          setWatcherCount(data.count ?? 0);
        } else {
          setWatcherCount(0);
        }
      } catch (e) {
        setWatcherCount(0);
      }
    };
    poll();
    watcherPollRef.current = setInterval(poll, 10_000);
    return () => {
      if (watcherPollRef.current) clearInterval(watcherPollRef.current);
    };
  }, [trips]);

  const handleStartTrip = async (tripId) => {
    if (!navigator.geolocation) {
      setTrackingMessage(
        "This phone does not support location tracking. Please use a GPS-enabled phone.",
      );
      return;
    }
    try {
      setTrackingMessage("Checking your phone location permission...");
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      const res = await fetch(`/api/trips/${tripId}/start`, { method: "PUT" });
      if (res.ok) {
        startTracking(tripId, position);
        if (window.AndroidTripTracking) {
          window.AndroidTripTracking.startTrip(
            `${window.location.origin}/api/trips/${tripId}/ping`,
          );
        }
        setTrackingMessage(
          "Trip is stable now. Live location tracking is active. Keep this app open while travelling.",
        );
        fetchData(employee.id);
      } else {
        setTrackingMessage("Trip could not start. Please try again.");
      }
    } catch (e) {
      console.error(e);
      setTrackingMessage(
        e.code === 1
          ? "Location permission was denied. Allow location access and start the trip again."
          : "GPS is unavailable. Turn on Location Services and try again.",
      );
    }
  };

  const notificationRef = React.useRef(null);

  const startTracking = (tripId, initialPosition = null) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    // Request notification permission and show persistent notification
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          notificationRef.current = new Notification("Trip Active", {
            body: "Trip is stable now. Your live location is being tracked for this trip.",
            requireInteraction: true, // keeps it on screen until dismissed or closed programmatically
            icon: "/favicon.ico",
          });
        }
      });
    }

    const sendPing = async (position) => {
      await fetch(`/api/trips/${tripId}/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });
    };

    if (initialPosition) {
      sendPing(initialPosition).catch((error) =>
        console.error("Initial location ping failed:", error),
      );
    }

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await sendPing(pos);
        } catch (e) {
          console.error("Ping failed:", e);
        }
      },
      (err) => {
        const messages = {
          1: "Location permission denied. Please allow location access in your browser settings.",
          2: "Location unavailable. Please ensure GPS is enabled.",
          3: "Location request timed out. Retrying...",
        };
        console.warn("Geolocation error:", messages[err.code] || err.message);
        setTrackingMessage(
          messages[err.code] ||
            "Location tracking is trying again. Keep GPS enabled.",
        );
        // Don't stop tracking on timeout — watchPosition will retry automatically
        if (err.code === 1) {
          alert(messages[1]);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
    setTrackingId(id);
  };

  const handleStopTrip = async (tripId) => {
    if (trackingId !== null) {
      navigator.geolocation.clearWatch(trackingId);
      setTrackingId(null);
    }
    if (window.AndroidTripTracking) window.AndroidTripTracking.stopTrip();

    // Close the notification
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }

    try {
      await fetch(`/api/trips/${tripId}/stop`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startLocation: "", endLocation: "" }),
      });
      fetchData(employee.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogTrip = async (e) => {
    e.preventDefault();
    if (!tripData.startCoords || !tripData.endCoords || tripData.routePath.length < 2) {
      alert("Please select a GPS start location and destination and wait for the route to calculate.");
      return;
    }
    if (!tripData.distanceKm || tripData.distanceKm <= 0) {
      alert(
        "A valid driving route is required before logging the trip. Please check both locations and try again.",
      );
      return;
    }

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          date: tripData.date,
          vehicleId: tripData.vehicleId,
          startLocation: tripData.startLocation,
          endLocation: tripData.endLocation,
          distanceKm: parseFloat(tripData.distanceKm),
          startCoords: tripData.startCoords,
          endCoords: tripData.endCoords,
          routePath: tripData.routePath,
          status: "ACTIVE", // Start ACTIVE — employee ends on arrival
        }),
      });

      if (!res.ok) {
        alert("Failed to log trip");
        return;
      }

      const newTrip = await res.json();
      // Start GPS tracking immediately
      startTracking(newTrip.id);
      setTrackingMessage("Trip started! Live location tracking is active. Keep this app open.");
      // Switch modal to live tracking view
      setLiveTrackingTrip({
        ...newTrip,
        startLatitude: tripData.startCoords?.lat,
        startLongitude: tripData.startCoords?.lng,
        endLatitude: tripData.endCoords?.lat,
        endLongitude: tripData.endCoords?.lng,
        routePath: tripData.routePath,
      });
      resetTripData();
      fetchData(employee.id);
    } catch (error) {
      console.error(error);
      alert("Error logging trip");
    }
  };

  const handleEndTrip = async () => {
    if (!liveTrackingTrip) return;
    setEndingTrip(true);
    try {
      // Stop GPS tracking
      if (trackingId) {
        navigator.geolocation.clearWatch(trackingId);
        setTrackingId(null);
      }
      // Mark trip as COMPLETED
      await fetch(`/api/trips/${liveTrackingTrip.id}/stop`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startLocation: liveTrackingTrip.startLocation, endLocation: liveTrackingTrip.endLocation }),
      });
      setLiveTrackingTrip(null);
      setIsModalOpen(false);
      setTrackingMessage("");
      fetchData(employee.id);
    } catch (e) {
      console.error(e);
    } finally {
      setEndingTrip(false);
    }
  };

  const resetTripData = () => {
    setTripData({
      date: new Date().toISOString().split("T")[0],
      vehicleId: "",
      startLocation: "",
      endLocation: "",
      distanceKm: "",
      reason: "",
      startCoords: null,
      endCoords: null,
      routePath: [],
    });
    setFromQuery("");
    setToQuery("");
    setLocationError("");
    setRouteError("");
  };

  const getCurrentPickupLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("GPS is not available on this device. Type the start address to calculate a route.");
      return;
    }

    setIsLocatingPickup(true);
    routeRequestRef.current += 1;
    setIsCalculatingDistance(false);
    setLocationError("");
    setRouteError("");
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20_000,
          maximumAge: 0,
        });
      });
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      const coordinateLabel = `Current location (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`;
      setTripData(prev => ({
        ...prev,
        startLocation: coordinateLabel,
        startCoords: coords,
        distanceKm: "",
        routePath: [],
      }));
      setFromQuery(coordinateLabel);
    } catch (error) {
      const message = error.code === 1
        ? "Location permission is blocked. Allow location access, then tap Use current location again."
        : error.code === 3
          ? "GPS took too long. Turn on device location and try again."
          : "Current location is unavailable. Turn on GPS/location services and try again.";
      setLocationError(message);
    } finally {
      setIsLocatingPickup(false);
    }
  };

  const calculateTripRoute = async () => {
    if (isCalculatingDistance) return;
    if (!fromQuery.trim() || !toQuery.trim()) {
      setRouteError("Enter both start location and destination before calculating the route.");
      return;
    }
    const requestId = ++routeRequestRef.current;
    setIsCalculatingDistance(true);
    setLocationError("");
    setRouteError("");
    setTripData(prev => ({ ...prev, distanceKm: "", routePath: [] }));

    try {
      // Geocoding via server-side API (avoids CORS)
      const geocodeAddress = async (address) => {
        const res = await fetch(`/api/maps?action=geocode&address=${encodeURIComponent(address.trim())}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Could not locate "${address.trim()}".`);
        return { coords: { lat: data.lat, lng: data.lng }, formattedAddress: data.formattedAddress };
      };

      const start = tripData.startCoords
        ? { coords: tripData.startCoords, formattedAddress: tripData.startLocation }
        : await geocodeAddress(fromQuery);
      const destination = await geocodeAddress(toQuery);
      if (requestId !== routeRequestRef.current) return;

      // Directions via server-side API (avoids CORS)
      const dirRes = await fetch(`/api/maps?action=directions&origin=${start.coords.lat},${start.coords.lng}&destination=${destination.coords.lat},${destination.coords.lng}`);
      const dirData = await dirRes.json();
      if (!dirRes.ok) throw new Error(dirData.error || "No driving route was found. Check the start location and destination.");

      const distanceMeters = dirData.distanceMeters;
      const routePath = decodePolyline(dirData.polyline);
      if (!(distanceMeters > 0) || routePath.length < 2) {
        throw new Error("Google Maps returned an incomplete route. Please try again.");
      }

      setTripData(prev => ({
        ...prev,
        startLocation: start.formattedAddress,
        endLocation: destination.formattedAddress,
        startCoords: start.coords,
        endCoords: destination.coords,
        distanceKm: (distanceMeters / 1000).toFixed(1),
        routePath,
      }));
      setFromQuery(start.formattedAddress);
      setToQuery(destination.formattedAddress);
    } catch (error) {
      if (requestId !== routeRequestRef.current) return;
      console.error("Google Maps route calculation failed:", error);
      setRouteError(error.message || "Could not calculate route. Check your connection and try again.");
    } finally {
      if (requestId === routeRequestRef.current) setIsCalculatingDistance(false);
    }
  };

  const handleRegularizeTrip = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          ...tripData,
          status: "PENDING_REGULARIZATION",
        }),
      });

      if (!res.ok) {
        alert("Failed to regularize trip");
        return;
      }

      setIsRegularizeModalOpen(false);
      resetTripData();
      fetchData(employee.id);
      fetchData(employee.id);
    } catch (error) {
      console.error(error);
      alert("Error regularizing trip");
    }
  };

  if (loading || !employee)
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Loading your vehicles...
      </div>
    );

  const totalDistance = trips.reduce((acc, trip) => acc + trip.distanceKm, 0);
  const pendingAmount = trips
    .filter((t) => t.status === "APPROVED" || t.status === "PENDING")
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div
      style={{
        padding: "2rem 2.5rem",
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <button
          onClick={() => router.push("/employee/dashboard")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--text-muted)",
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "800",
            color: "var(--text-primary)",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            letterSpacing: "-0.03em",
          }}
        >
          <Car size={28} color="var(--accent-color)" /> My Vehicles & Mileage
        </h1>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <button
          onClick={() => setActiveTab("dashboard")}
          className={activeTab === "dashboard" ? "btn-primary" : "btn-outline"}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={activeTab === "history" ? "btn-primary" : "btn-outline"}
        >
          Trip History
        </button>
      </div>

      {activeTab === "dashboard" && (
        <>
          {trackingMessage && (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginBottom: "1.5rem",
                padding: "1rem 1.25rem",
                borderRadius: "10px",
                background:
                  trackingMessage.includes("active") ||
                  trackingMessage.includes("stable")
                    ? "#dcfce7"
                    : "#fef3c7",
                color:
                  trackingMessage.includes("active") ||
                  trackingMessage.includes("stable")
                    ? "#166534"
                    : "#92400e",
                border: `1px solid ${trackingMessage.includes("active") || trackingMessage.includes("stable") ? "#86efac" : "#fcd34d"}`,
                fontWeight: 600,
              }}
            >
              {trackingMessage}
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            <div
              className="saas-card"
              style={{
                padding: "1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontSize: "0.75rem",
                  }}
                >
                  Total Distance Travelled
                </div>
                <div
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {totalDistance.toFixed(1)}{" "}
                  <span
                    style={{
                      fontSize: "1rem",
                      fontWeight: 500,
                      color: "var(--text-muted)",
                    }}
                  >
                    km
                  </span>
                </div>
              </div>
              <div
                style={{
                  background: "var(--accent-faint)",
                  padding: "1rem",
                  borderRadius: "var(--radius-lg)",
                  color: "var(--accent-color)",
                }}
              >
                <Navigation size={32} />
              </div>
            </div>

            <div
              className="saas-card"
              style={{
                padding: "1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontSize: "0.75rem",
                  }}
                >
                  Pending Reimbursement
                </div>
                <div
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  ₹{pendingAmount.toFixed(2)}
                </div>
              </div>
              <div
                style={{
                  background: "var(--success-light)",
                  padding: "1rem",
                  borderRadius: "var(--radius-lg)",
                  color: "var(--success)",
                }}
              >
                <CheckCircle size={32} />
              </div>
            </div>
          </div>

          {trips
            .filter((t) => t.status === "REQUESTED" || t.status === "ACTIVE")
            .map((trip) => (
              <div
                key={trip.id}
                className="saas-card"
                style={{
                  borderLeft:
                    trip.status === "ACTIVE"
                      ? "4px solid var(--accent-color)"
                      : "4px solid var(--danger)",
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        background:
                          trip.status === "ACTIVE"
                            ? "var(--accent-faint)"
                            : "var(--danger-light)",
                        padding: "0.75rem",
                        borderRadius: "var(--radius-md)",
                        color:
                          trip.status === "ACTIVE"
                            ? "var(--accent-color)"
                            : "var(--danger)",
                      }}
                    >
                      <MapPin size={24} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: "700",
                          color: "var(--text-primary)",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {trip.status === "ACTIVE"
                          ? "Live Tracking Active"
                          : "Trip Tracking Requested"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Vehicle: {trip.vehicle?.makeModel} (
                        {trip.vehicle?.plateNumber})
                      </div>
                    </div>
                  </div>
                  {trip.status === "REQUESTED" ? (
                    <button
                      onClick={() => handleStartTrip(trip.id)}
                      className="btn-primary"
                    >
                      Accept & Start Trip
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <button
                        onClick={() => setSelectedMapTrip(trip)}
                        style={{
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          border: "1px solid #bfdbfe",
                          borderRadius: "8px",
                          padding: "8px 16px",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <MapIcon size={16} /> Live Map
                      </button>
                      <button
                        onClick={() => handleStopTrip(trip.id)}
                        className="btn-danger"
                      >
                        Stop Trip & Calculate
                      </button>
                    </div>
                  )}
                </div>
                {trip.status === "ACTIVE" && watcherCount > 0 && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      background: "#fef3c7",
                      border: "1px solid #fcd34d",
                      borderRadius: "6px",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.875rem",
                      color: "#92400e",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontWeight: 600,
                    }}
                  >
                    👁 Your supervisor is watching this trip
                  </div>
                )}
              </div>
            ))}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Assigned Vehicles
            </h2>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={() => {
                  resetTripData();
                  setIsRegularizeModalOpen(true);
                }}
                className="btn-outline"
              >
                Regularize Trip
              </button>
              <button
                onClick={() => {
                  resetTripData();
                  setIsModalOpen(true);
                  void getCurrentPickupLocation();
                }}
                className="btn-primary"
              >
                <Plus size={18} /> New Ride Request
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {vehicles.map((veh) => (
              <div
                key={veh.id}
                className="saas-card"
                style={{ padding: "1.5rem" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      background: "var(--bg-primary)",
                      padding: "1rem",
                      borderRadius: "50%",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <Car size={24} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {veh.makeModel}
                    </div>
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.875rem",
                      }}
                    >
                      {veh.vehicleType}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: "1rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: 700,
                      }}
                    >
                      Vehicle No
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginTop: "0.25rem",
                      }}
                    >
                      {veh.plateNumber}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: 700,
                      }}
                    >
                      Rate
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--success)",
                        marginTop: "0.25rem",
                      }}
                    >
                      ₹{veh.ratePerKm}/km
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {vehicles.length === 0 && (
              <div
                style={{
                  background: "#f9fafb",
                  border: "1px dashed #d1d5db",
                  borderRadius: "12px",
                  padding: "2rem",
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                No vehicles assigned. Contact admin to assign a vehicle to you.
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "history" && (
        <div className="saas-card" style={{ overflow: "hidden" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              margin: 0,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--bg-primary)",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <th
                  style={{
                    padding: "1.25rem 1.5rem",
                    fontWeight: 600,
                    color: "#4b5563",
                    fontSize: "0.875rem",
                  }}
                >
                  Date & Route
                </th>
                <th
                  style={{
                    padding: "1.25rem 1.5rem",
                    fontWeight: 600,
                    color: "#4b5563",
                    fontSize: "0.875rem",
                  }}
                >
                  Vehicle
                </th>
                <th
                  style={{
                    padding: "1.25rem 1.5rem",
                    fontWeight: 600,
                    color: "#4b5563",
                    fontSize: "0.875rem",
                  }}
                >
                  Distance
                </th>
                <th
                  style={{
                    padding: "1.25rem 1.5rem",
                    fontWeight: 600,
                    color: "#4b5563",
                    fontSize: "0.875rem",
                  }}
                >
                  Amount
                </th>
                <th
                  style={{
                    padding: "1.25rem 1.5rem",
                    fontWeight: 600,
                    color: "#4b5563",
                    fontSize: "0.875rem",
                  }}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr
                  key={trip.id}
                  style={{ borderBottom: "1px solid var(--border-color)" }}
                >
                  <td style={{ padding: "1.25rem 1.5rem" }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {trip.date}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.875rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <MapPin size={14} /> {trip.startLocation} &rarr;{" "}
                      {trip.endLocation}
                    </div>
                    {(trip.status === "COMPLETED" ||
                      trip.status === "APPROVED" ||
                      trip.status === "PAID" ||
                      trip.status === "REJECTED") &&
                      (trip.pings?.length > 0 || trip.routePath || trip.startLatitude) && (
                        <button
                          onClick={() => setSelectedMapTrip(trip)}
                          style={{
                            marginTop: "0.5rem",
                            background: "#f3f4f6",
                            color: "#374151",
                            border: "1px solid #d1d5db",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontWeight: 600,
                          }}
                        >
                          <MapIcon size={12} /> View Route Map
                        </button>
                      )}
                  </td>
                  <td
                    style={{
                      padding: "1.25rem 1.5rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {trip.vehicle?.makeModel}
                  </td>
                  <td
                    style={{
                      padding: "1.25rem 1.5rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {trip.distanceKm} km
                  </td>
                  <td
                    style={{
                      padding: "1.25rem 1.5rem",
                      fontWeight: 800,
                      color: "var(--success)",
                    }}
                  >
                    ₹{trip.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: "1.25rem 1.5rem" }}>
                    <span
                      className={`badge ${trip.status === "PENDING" ? "badge-warning" : trip.status === "PENDING_REGULARIZATION" ? "badge-warning" : trip.status === "APPROVED" ? "badge-secondary" : trip.status === "PAID" ? "badge-success" : trip.status === "ACTIVE" ? "badge-secondary" : trip.status === "REQUESTED" ? "badge-secondary" : trip.status === "COMPLETED" ? "badge-secondary" : "badge-danger"}`}
                    >
                      {trip.status === "PENDING_REGULARIZATION"
                        ? "PENDING (REGULARIZATION)"
                        : trip.status}
                    </span>
                  </td>
                </tr>
              ))}
              {trips.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: "#9ca3af",
                    }}
                  >
                    No trips logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Trip / Ride Request Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            backdropFilter: "blur(8px)",
            padding: "1rem",
          }}
        >
          <div
            className="saas-card"
            style={{
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "2rem",
              background: "#ffffff",
              borderRadius: "1.5rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Live tracking view after trip starts */}
            {liveTrackingTrip ? (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
                  <div>
                    <h2 style={{ margin:0, fontSize:"1.25rem", fontWeight:800, color:"#0f172a", display:"flex", alignItems:"center", gap:"8px" }}>
                      <span style={{ width:10, height:10, borderRadius:"50%", background:"#16a34a", display:"inline-block", animation:"pulse 1.5s infinite" }} />
                      Live Tracking Active
                    </h2>
                    <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>
                      {liveTrackingTrip.startLocation} → {liveTrackingTrip.endLocation}
                    </p>
                  </div>
                  <span style={{ background:"#dcfce7", color:"#166534", padding:"4px 10px", borderRadius:999, fontSize:12, fontWeight:700 }}>ACTIVE</span>
                </div>
                {/* Ola/Uber style live map */}
                <div style={{ borderRadius:12, overflow:"hidden", marginBottom:"1rem" }}>
                  <LiveTripMap
                    tripId={liveTrackingTrip.id}
                    isActive={true}
                    startLocation={liveTrackingTrip.startLocation}
                    endLocation={liveTrackingTrip.endLocation}
                    startCoords={liveTrackingTrip.startLatitude ? { lat: liveTrackingTrip.startLatitude, lng: liveTrackingTrip.startLongitude } : null}
                    endCoords={liveTrackingTrip.endLatitude ? { lat: liveTrackingTrip.endLatitude, lng: liveTrackingTrip.endLongitude } : null}
                    plannedPath={liveTrackingTrip.routePath || []}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleEndTrip}
                  disabled={endingTrip}
                  style={{ width:"100%", padding:"1rem", background: endingTrip ? "#94a3b8" : "#16a34a", color:"#fff", border:"none", borderRadius:12, fontSize:"1rem", fontWeight:700, cursor: endingTrip ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}
                >
                  {endingTrip ? "Ending trip..." : "✅ I have Arrived — End Trip"}
                </button>
              </div>
            ) : (
              <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "2rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  margin: 0,
                  letterSpacing: "-0.03em",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Car size={28} color="var(--accent-color)" /> Request Ride
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "var(--bg-primary)",
                  border: "none",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
              >
                <XCircle size={20} />
              </button>
            </div>

            {vehicles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "#fee2e2",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem",
                  }}
                >
                  <Car size={32} />
                </div>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  No Vehicles Available
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: "1.5rem",
                    lineHeight: "1.5",
                  }}
                >
                  You don't have any vehicles assigned to your profile. Please
                  contact admin to assign a vehicle.
                </p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-primary"
                  style={{ width: "100%" }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogTrip}>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        color: "#374151",
                      }}
                    >
                      Date
                    </label>
                    <input
                      type="date"
                      value={tripData.date}
                      onChange={(e) =>
                        setTripData({ ...tripData, date: e.target.value })
                      }
                      required
                      style={{
                        width: "100%",
                        padding: "0.875rem 1rem",
                        borderRadius: "12px",
                        border: "2px solid #e5e7eb",
                        background: "#f9fafb",
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        transition: "all 0.2s",
                        outline: "none",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--accent-color)")
                      }
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        color: "#374151",
                      }}
                    >
                      Select Vehicle
                    </label>
                    <select
                      value={tripData.vehicleId}
                      onChange={(e) =>
                        setTripData({ ...tripData, vehicleId: e.target.value })
                      }
                      required
                      style={{
                        width: "100%",
                        padding: "0.875rem 1rem",
                        borderRadius: "12px",
                        border: "2px solid #e5e7eb",
                        background: "#f9fafb",
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        transition: "all 0.2s",
                        outline: "none",
                        cursor: "pointer",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--accent-color)")
                      }
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                    >
                      <option value="">Choose vehicle...</option>
                      {vehicles.map((veh) => (
                        <option key={veh.id} value={veh.id}>
                          {veh.makeModel} ({veh.plateNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    position: "relative",
                    paddingLeft: "24px",
                    borderLeft: "2px dashed #cbd5e1",
                    marginLeft: "12px",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "-9px",
                      top: "20px",
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "#fff",
                      border: "4px solid #10b981",
                    }}
                  ></div>
                  <div
                    style={{
                      position: "absolute",
                      left: "-9px",
                      bottom: "20px",
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "#fff",
                      border: "4px solid #3b82f6",
                    }}
                  ></div>

                  <div style={{ marginBottom: "1.5rem", position: "relative" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        color: "#374151",
                      }}
                    >
                      Start Location
                    </label>
                    <input
                      type="text"
                      placeholder="Getting current location..."
                      value={fromQuery}
                      onChange={(e) => {
                        routeRequestRef.current += 1;
                        setFromQuery(e.target.value);
                        setLocationError("");
                        setRouteError("");
                        setIsCalculatingDistance(false);
                        setTripData(prev => ({
                          ...prev,
                          startLocation: e.target.value,
                          startCoords: null,
                          distanceKm: "",
                          routePath: [],
                        }));
                      }}
                      disabled={isLocatingPickup}
                      style={{
                        width: "100%",
                        padding: "1rem",
                        paddingLeft: "1rem",
                        borderRadius: "12px",
                        border: "2px solid #e5e7eb",
                        background: "#ffffff",
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                        transition: "all 0.2s",
                        outline: "none",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                    />
                    <button
                      type="button"
                      onClick={() => void getCurrentPickupLocation()}
                      disabled={isLocatingPickup}
                      style={{
                        marginTop: "0.5rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        border: "none",
                        background: "transparent",
                        color: "#0284c7",
                        fontWeight: 700,
                        cursor: isLocatingPickup ? "wait" : "pointer",
                      }}
                    >
                      <Crosshair size={16} />
                      {isLocatingPickup ? "Finding start location..." : "Use current location as start"}
                    </button>
                    <div style={{ marginTop: "0.4rem", color: "#64748b", fontSize: "0.8rem" }}>
                      GPS fills this automatically; you can also type an address.
                    </div>
                  </div>

                  <div style={{ position: "relative" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        color: "#374151",
                      }}
                    >
                      Dest Location
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        placeholder="Search destination address..."
                        value={toQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          routeRequestRef.current += 1;
                          setToQuery(val);
                          setLocationError("");
                          setRouteError("");
                          setIsCalculatingDistance(false);
                          setTripData(prev => ({ ...prev, endLocation: val, endCoords: null, distanceKm: "", routePath: [] }));
                          clearTimeout(destSearchTimeout.current);
                          if (val.trim().length > 3) {
                            destSearchTimeout.current = setTimeout(async () => {
                              try {
                                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val + ", India")}&format=json&limit=5&countrycodes=in`, { headers: { "User-Agent": "CeCubeERP/1.0" } });
                                const data = await res.json();
                                setDestSuggestions(Array.isArray(data) ? data : []);
                                setShowDestSuggestions(true);
                              } catch { setDestSuggestions([]); }
                            }, 400);
                          } else {
                            setDestSuggestions([]);
                            setShowDestSuggestions(false);
                          }
                        }}
                        onFocus={(e) => { e.target.style.borderColor = "#3b82f6"; if (destSuggestions.length > 0) setShowDestSuggestions(true); }}
                        onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; setTimeout(() => setShowDestSuggestions(false), 200); }}
                        style={{ width: "100%", padding: "1rem", borderRadius: "12px", border: "2px solid #e5e7eb", background: "#ffffff", fontSize: "0.95rem", fontWeight: 500, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", transition: "all 0.2s", outline: "none", boxSizing: "border-box" }}
                      />
                      {showDestSuggestions && destSuggestions.length > 0 && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 999, maxHeight: "220px", overflowY: "auto", marginTop: "4px" }}>
                          {destSuggestions.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onMouseDown={() => {
                                const label = s.display_name;
                                setToQuery(label);
                                setTripData(prev => ({ ...prev, endLocation: label, endCoords: { lat: parseFloat(s.lat), lng: parseFloat(s.lon) }, distanceKm: "", routePath: [] }));
                                setDestSuggestions([]);
                                setShowDestSuggestions(false);
                              }}
                              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "none", borderBottom: i < destSuggestions.length - 1 ? "1px solid #f1f5f9" : "none", background: "transparent", cursor: "pointer", fontSize: "0.85rem", color: "#0f172a", lineHeight: 1.4 }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#f0f9ff"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              📍 {s.display_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: "0.4rem", color: "#64748b", fontSize: "0.8rem" }}>
                      Type to search destination — select from suggestions or type freely.
                    </div>
                  </div>
                </div>

                {locationError && (
                  <div role="alert" style={{ marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: 10, background: "#fff7ed", color: "#9a3412", fontSize: "0.875rem" }}>
                    {locationError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void calculateTripRoute()}
                  disabled={isCalculatingDistance || isLocatingPickup || !tripData.vehicleId || !fromQuery.trim() || !toQuery.trim()}
                  className="btn-outline"
                  style={{ width: "100%", marginBottom: "1rem", padding: "0.75rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
                >
                  <Navigation size={17} />
                  {isCalculatingDistance ? "Calculating route..." : "Calculate route & expense"}
                </button>
                {routeError && (
                  <div role="alert" style={{ marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", fontSize: "0.875rem" }}>
                    {routeError} If this continues, ask admin to check Google Maps JavaScript, Geocoding, and Routes API access.
                  </div>
                )}

                {tripData.routePath.length > 1 && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <GoogleMapsView
                      locations={[
                        { ...tripData.startCoords, title: `Start: ${tripData.startLocation}` },
                        { ...tripData.endCoords, title: `Destination: ${tripData.endLocation}` },
                      ]}
                      paths={[tripData.routePath]}
                      height={280}
                    />
                    <div style={{ marginTop: "0.5rem", color: "#64748b", fontSize: "0.8rem" }}>
                      Google Maps driving route · Expense is estimated from route distance × vehicle rate.
                    </div>
                  </div>
                )}

                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "1.5rem",
                    marginBottom: "2rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#64748b",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Estimated Route Distance
                    </div>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        letterSpacing: "-0.02em",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      {isCalculatingDistance ? (
                        <span
                          style={{
                            fontSize: "1rem",
                            color: "#64748b",
                            fontWeight: 500,
                          }}
                        >
                          Calculating...
                        </span>
                      ) : (
                        <>
                          {tripData.distanceKm
                            ? `${tripData.distanceKm} km`
                            : "Calculate route"}
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#64748b",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Estimated Cost
                    </div>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: "var(--success)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      ₹
                      {tripData.distanceKm && tripData.vehicleId
                        ? (
                            parseFloat(tripData.distanceKm) *
                              vehicles.find(
                                (v) => v.id === parseInt(tripData.vehicleId),
                              )?.ratePerKm || 0
                          ).toFixed(2)
                        : "—"}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    width: "100%",
                    padding: "1rem",
                    fontSize: "1.1rem",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                  disabled={
                    isCalculatingDistance ||
                    !tripData.distanceKm ||
                    !tripData.startCoords ||
                    !tripData.endCoords ||
                    tripData.routePath.length < 2 ||
                    !tripData.vehicleId
                  }
                >
                  <MapPin size={20} /> Request Ride & Log Expense
                </button>
              </form>
            )}
            </>
            )}
          </div>
        </div>
      )}

      {/* Regularize Trip Modal */}
      {isRegularizeModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="saas-card"
            style={{ width: "100%", maxWidth: "450px", padding: "2rem" }}
          >
            <h2
              style={{
                marginBottom: "1.5rem",
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Regularize a Trip
            </h2>
            {vehicles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>
                  You don't have any vehicles assigned.
                </p>
                <button
                  type="button"
                  onClick={() => setIsRegularizeModalOpen(false)}
                  className="btn-outline"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegularizeTrip}>
                <div style={{ marginBottom: "1.25rem" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    value={tripData.date}
                    onChange={(e) =>
                      setTripData({ ...tripData, date: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      background: "#f9fafb",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "1.25rem" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Vehicle
                  </label>
                  <select
                    value={tripData.vehicleId}
                    onChange={(e) =>
                      setTripData({ ...tripData, vehicleId: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      background: "#f9fafb",
                    }}
                  >
                    <option value="">Select a vehicle...</option>
                    {vehicles.map((veh) => (
                      <option key={veh.id} value={veh.id}>
                        {veh.isCompanyVehicle ? "[Company] " : ""}
                        {veh.makeModel} ({veh.plateNumber}) - ₹{veh.ratePerKm}
                        /km
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      From
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Office"
                      value={tripData.startLocation}
                      onChange={(e) =>
                        setTripData({
                          ...tripData,
                          startLocation: e.target.value,
                        })
                      }
                      required
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        background: "#f9fafb",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      To
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Client Site A"
                      value={tripData.endLocation}
                      onChange={(e) =>
                        setTripData({
                          ...tripData,
                          endLocation: e.target.value,
                        })
                      }
                      required
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        background: "#f9fafb",
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "1.25rem" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 15.5"
                    value={tripData.distanceKm}
                    onChange={(e) =>
                      setTripData({ ...tripData, distanceKm: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      background: "#f9fafb",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div style={{ marginBottom: "2rem" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    Reason for Regularization
                  </label>
                  <textarea
                    placeholder="e.g. Forgot to turn on GPS"
                    value={tripData.reason}
                    onChange={(e) =>
                      setTripData({ ...tripData, reason: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      background: "#f9fafb",
                      minHeight: "80px",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => setIsRegularizeModalOpen(false)}
                    className="btn-outline"
                    style={{ flex: 1, padding: "0.875rem" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 2, padding: "0.875rem" }}
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {selectedMapTrip && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="saas-card"
            style={{ padding: "2rem", width: "100%", maxWidth: "800px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h2
                style={{ fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}
              >
                Trip Route Map ({selectedMapTrip.date})
              </h2>
              <button
                onClick={() => setSelectedMapTrip(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                <XCircle size={24} />
              </button>
            </div>

            <div
              style={{
                marginBottom: "1rem",
                display: "flex",
                gap: "2rem",
                fontSize: "0.875rem",
              }}
            >
              <div>
                <strong>Vehicle:</strong> {selectedMapTrip.vehicle?.makeModel}
              </div>
              <div>
                <strong>Distance:</strong> {selectedMapTrip.distanceKm} km
              </div>
            </div>

            <TripMap
              pings={selectedMapTrip.pings}
              startLocation={selectedMapTrip.startLocation}
              endLocation={selectedMapTrip.endLocation}
              routePath={selectedMapTrip.routePath}
              tripId={selectedMapTrip.id}
              isActive={selectedMapTrip.status === "ACTIVE"}
              startCoords={selectedMapTrip.startLatitude ? { lat: selectedMapTrip.startLatitude, lng: selectedMapTrip.startLongitude } : null}
              endCoords={selectedMapTrip.endLatitude ? { lat: selectedMapTrip.endLatitude, lng: selectedMapTrip.endLongitude } : null}
            />
          </div>
        </div>
      )}
    </div>
  );
}
