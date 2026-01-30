import { IMAGES } from "@/assets/assetsData";

const RIDERS = [
  { id: 1, name: "John Doe", rating: 4.8, deliveries: "1,250+", eta: "5 min" },
  {
    id: 2,
    name: "Sarah Johnson",
    rating: 4.9,
    deliveries: "980+",
    eta: "7 min",
  },
  {
    id: 3,
    name: "Michael Smith",
    rating: 4.7,
    deliveries: "1,540+",
    eta: "6 min",
  },
  { id: 4, name: "Emily Davis", rating: 4.6, deliveries: "800+", eta: "8 min" },
  {
    id: 5,
    name: "James Wilson",
    rating: 4.8,
    deliveries: "1,120+",
    eta: "4 min",
  },
  {
    id: 6,
    name: "Sophia Brown",
    rating: 4.9,
    deliveries: "1,300+",
    eta: "9 min",
  },
  { id: 7, name: "Daniel Lee", rating: 4.5, deliveries: "700+", eta: "10 min" },
  {
    id: 8,
    name: "Olivia Martinez",
    rating: 4.7,
    deliveries: "1,050+",
    eta: "6 min",
  },
  {
    id: 9,
    name: "William Anderson",
    rating: 4.6,
    deliveries: "950+",
    eta: "5 min",
  },
  {
    id: 10,
    name: "Ava Thompson",
    rating: 4.8,
    deliveries: "1,400+",
    eta: "7 min",
  },
];

// Group orders by month
const orderSections = [
  {
    title: "May 2025",
    data: [
      {
        id: "TRK-1A9X-74KD",
        date: "23-05-2025",
        time: "9:28pm",
        location: "Sapele Rd Benin",
        category: "Food",
        distance: "17km",
        direction: "right",
      },
      {
        id: "TRK-2B8K-53QL",
        date: "23-05-2025",
        time: "10:45am",
        location: "Lekki Phase 1",
        category: "Gadgets",
        distance: "8km",
        direction: "left",
      },
      {
        id: "TRK-3C7M-62VR",
        date: "23-05-2025",
        time: "3:15pm",
        location: "Abuja Garki",
        category: "Fabric",
        distance: "24km",
        direction: "right",
      },
      {
        id: "TRK-4D6P-81ZW",
        date: "24-05-2025",
        time: "7:00pm",
        location: "Yaba Lagos",
        category: "Documents",
        distance: "5km",
        direction: "left",
      },
    ],
  },
  {
    title: "April 2025",
    data: [
      {
        id: "TRK-5E3N-92PQ",
        date: "15-04-2025",
        time: "2:30pm",
        location: "Victoria Island",
        category: "Electronics",
        distance: "12km",
        direction: "right",
      },
      {
        id: "TRK-3C7M-62VR",
        date: "23-05-2025",
        time: "3:15pm",
        location: "Abuja Garki",
        category: "Fabric",
        distance: "24km",
        direction: "right",
      },
      {
        id: "TRK-4D6P-81ZW",
        date: "24-05-2025",
        time: "7:00pm",
        location: "Yaba Lagos",
        category: "Documents",
        distance: "5km",
        direction: "left",
      },
      {
        id: "TRK-3C7M-62VR",
        date: "23-05-2025",
        time: "3:15pm",
        location: "Abuja Garki",
        category: "Fabric",
        distance: "24km",
        direction: "right",
      },
      {
        id: "TRK-4D6P-81ZW",
        date: "24-05-2025",
        time: "7:00pm",
        location: "Yaba Lagos",
        category: "Documents",
        distance: "5km",
        direction: "left",
      },
    ],
  },
];

const currentTrackings = [
  {
    id: "TRK-9F2X-7A6B",
    location: "Sapele Rd Benin",
    status: "In Transit",
    statusColor: "#22c55e",
    map: IMAGES.dummy_map,
  },
];
export { currentTrackings, orderSections, RIDERS };
