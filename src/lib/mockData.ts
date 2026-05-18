export const mockUser = {
  name: "Michael",
  greeting: "Good morning",
};

export const mockStats = {
  today: 1,
  month: 12,
  year: 45,
  allTime: 312,
};

export const mockTodaysMemory = {
  title: "A perfect day in the mountains",
  date: "May 15, 2024",
  originalDate: "May 15, 2023",
  timeAgo: "1 year ago",
  description: "Clear skies, fresh air, and unforgettable moments.",
  imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
};

export const mockRecentMemories = [
  {
    id: 1,
    dateStr: "May 10",
    year: "2024",
    imgUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 2,
    dateStr: "May 5",
    year: "2024",
    imgUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 3,
    dateStr: "Apr 28",
    year: "2024",
    imgUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 4,
    dateStr: "Apr 20",
    year: "2024",
    imgUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80",
  },
];

export const mockTimelineEvents = [
  {
    id: 1,
    title: "A perfect day in the mountains",
    date: "May 15, 2024",
    type: "photo",
    description: "Clear skies, fresh air, and unforgettable moments.",
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
    icon: "🏔"
  },
  {
    id: 2,
    title: "Villanyóra diktálás",
    date: "May 10, 2024",
    type: "utility",
    description: "A havi óraállás sikeresen rögzítve: 45 210 kWh",
    imageUrl: null,
    icon: "⚡"
  },
  {
    id: 3,
    title: "Anya Születésnapja",
    date: "May 5, 2024",
    type: "event",
    description: "Családi vacsora az olasz étteremben.",
    imageUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80",
    icon: "🎂"
  },
  {
    id: 4,
    title: "Tengerparti Nyaralás",
    date: "April 28, 2024",
    type: "photo",
    description: "Kora esti séta a parton naplementekor.",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
    icon: "🌊"
  }
];

export const mockVaultFolders = [
  { id: 1, name: "Személyes Okmányok", icon: "🪪", count: 4, color: "#ff8c8c" },
  { id: 2, name: "Közüzemi Számlák", icon: "🧾", count: 12, color: "#82aaff" },
  { id: 3, name: "Garancialevelek", icon: "🛡", count: 7, color: "#ffd166" },
  { id: 4, name: "Egészségügyi papírok", icon: "🏥", count: 3, color: "#06d6a0" },
  { id: 5, name: "Biztosítások", icon: "📑", count: 2, color: "#118ab2" },
];
