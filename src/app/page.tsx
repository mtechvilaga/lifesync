"use client";

import { useState, useEffect, useRef } from "react";
import { translations } from "@/lib/translations";
import { supabase } from "@/lib/supabase";
import emailjs from '@emailjs/browser';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const huLocale = require("date-fns/locale/hu");
registerLocale("hu", huLocale.hu || huLocale.default || huLocale);

export default function Home() {
  const [activeTab, setActiveTab] = useState("Home");
  
  // Swipe navigation state
  const touchStartRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const vaultScrollRef = useRef<HTMLDivElement | null>(null);
  
  const [session, setSession] = useState<any>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSplash, setShowSplash] = useState(false);
  
  // Real data state
  const [events, setEvents] = useState<any[]>([]);
  const [vaultFolders, setVaultFolders] = useState<any[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allVaultFiles, setAllVaultFiles] = useState<any[]>([]);

  // Scroll-to-event state
  const [scrollToEventId, setScrollToEventId] = useState<string | null>(null);

  // Custom Confirm state
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Greeting Inline Edit state
  const [isEditingGreetingName, setIsEditingGreetingName] = useState(false);
  const [greetingNameInput, setGreetingNameInput] = useState("");

  // Stats Carousel state
  const [activeStatIndex, setActiveStatIndex] = useState(0);

  // Status bar dynamic state
  const [currentTime, setCurrentTime] = useState("09:41");
  const [isOnline, setIsOnline] = useState(true);

  // Premium Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    if (type === 'success') {
      playNotificationSound();
    }
    setTimeout(() => setToast(null), 3000);
  };

  // Timeline Expand/Collapse State
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  // Password Visibility Toggle State
  const [showPassword, setShowPassword] = useState(false);

  // Drawer (oldalsáv) state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  // Nyelv state
  const [lang, setLang] = useState<"hu" | "en">("hu");
  const t = (key: string): string => (translations[lang] as Record<string, string>)[key] ?? (translations.hu as Record<string, string>)[key] ?? key;

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 30000); // update every 30s

    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      clearInterval(clockInterval);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Service Worker regisztráció
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("SW registered:", reg.scope);
        })
        .catch((err) => {
          console.error("SW registration failed:", err);
        });
    }
  }, []);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
      document.body.classList.add("light-mode");
    } else {
      setIsDarkMode(true);
      document.body.classList.remove("light-mode");
    }
    const savedLang = localStorage.getItem("lang");
    if (savedLang === "en") setLang("en");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLoginEmail = localStorage.getItem("remembered_login_email");
      if (savedLoginEmail) {
        setEmail(savedLoginEmail);
      }
      const savedCustomEmail = localStorage.getItem("remembered_custom_email");
      if (savedCustomEmail) {
        setCustomEmail(savedCustomEmail);
      }
    }
  }, []);

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        playLogoSound();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.body.classList.add("light-mode");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.body.classList.remove("light-mode");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };
  
  // Add Event form state
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [newEventType, setNewEventType] = useState("event");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Ismétlődő esemény state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<"daily" | "weekly" | "biweekly" | "monthly" | "yearly">("weekly");
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [eventToDeleteGroupId, setEventToDeleteGroupId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState<"single" | "all" | null>(null);

  // Összecsukható szekciók
  const [showMediaSection, setShowMediaSection] = useState(false);
  const [showEmailSection, setShowEmailSection] = useState(false);
  
  // Add tab nézet (form vagy calendar)
  const [addViewMode, setAddViewMode] = useState<"form" | "calendar">("calendar");

  // Image upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Event multiple attachments state
  const [newEventImages, setNewEventImages] = useState<File[]>([]);
  const [newEventDocs, setNewEventDocs] = useState<File[]>([]);
  const [newEventAudios, setNewEventAudios] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const eventImageInputRef = useRef<HTMLInputElement>(null);
  const eventDocInputRef = useRef<HTMLInputElement>(null);
  const eventAudioInputRef = useRef<HTMLInputElement>(null);

  // Weather state
  const [weather, setWeather] = useState<{temp: number, desc: string, city: string} | null>(null);

  // Vault state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderIcon, setNewFolderIcon] = useState("📁");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [activeVaultFolder, setActiveVaultFolder] = useState<any>(null);
  const [vaultFiles, setVaultFiles] = useState<any[]>([]);
  const [isUploadingVaultFile, setIsUploadingVaultFile] = useState(false);
  const vaultFileInputRef = useRef<HTMLInputElement>(null);
  const [newFolderImages, setNewFolderImages] = useState<File[]>([]);
  const [newFolderDocs, setNewFolderDocs] = useState<File[]>([]);
  const [newFolderAudios, setNewFolderAudios] = useState<File[]>([]);
  const folderImageInputRef = useRef<HTMLInputElement>(null);
  const folderDocInputRef = useRef<HTMLInputElement>(null);
  const folderAudioInputRef = useRef<HTMLInputElement>(null);

  // Unified voice recorder states & refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState<"folder" | "event" | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Email notification state
  const [emailNotifyNow, setEmailNotifyNow] = useState(false);
  const [emailNotify1Day, setEmailNotify1Day] = useState(false);
  const [emailNotifyCustom, setEmailNotifyCustom] = useState(false);
  const [customNotifyDateTime, setCustomNotifyDateTime] = useState<Date | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [isEditingVaultFolder, setIsEditingVaultFolder] = useState(false);
  const [editVaultFolderName, setEditVaultFolderName] = useState("");
  const [editVaultFolderIcon, setEditVaultFolderIcon] = useState("");
  const [editVaultFolderDescription, setEditVaultFolderDescription] = useState("");

  // Profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfilePassword, setEditProfilePassword] = useState("");
  const [editProfileFile, setEditProfileFile] = useState<File | null>(null);
  const [editProfilePreview, setEditProfilePreview] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async (target: "folder" | "event") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const dateStr = new Date().toISOString().split('T')[0];
        const audioFile = new File([audioBlob], `Hangfelvétel_${dateStr}_${Math.floor(Math.random() * 1000)}.wav`, { type: 'audio/wav' });
        
        if (target === "folder") {
          if (activeVaultFolder) {
            setIsUploadingVaultFile(true);
            try {
              const fileExt = "wav";
              const fileName = `vault_${activeVaultFolder.id}_${Math.random()}.${fileExt}`;
              const filePath = `${session.user.id}/${fileName}`;
              
              const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, audioFile);
              if (uploadError) throw uploadError;

              const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
              
              const { error: dbError } = await supabase.from('vault_files').insert({
                folder_id: activeVaultFolder.id,
                user_id: session.user.id,
                name: audioFile.name,
                file_url: publicUrlData.publicUrl,
                file_type: audioFile.type
              });

              if (dbError) throw dbError;
              
              const { data: files } = await supabase.from('vault_files').select('*').eq('folder_id', activeVaultFolder.id).order('created_at', { ascending: false });
              if (files) setVaultFiles(files);
              playNotificationSound();
            } catch (err: any) {
              alert("Hiba a hangfelvétel mentésekor: " + err.message);
            } finally {
              setIsUploadingVaultFile(false);
            }
          } else {
            setNewFolderAudios(prev => [...prev, audioFile]);
          }
        } else {
          setNewEventAudios(prev => [...prev, audioFile]);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingTarget(target);
      setIsRecording(true);
      setRecordingSeconds(0);
      
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      alert("Nem sikerült elérni a mikrofont: " + err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTarget(null);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const playNotificationSound = (force = false) => {
    if (!soundEnabled && !force) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // Chime 1: Warm synth note
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // A5
      
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.45);

      // Chime 2: Bright harmonic spark a bit later
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5
        osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.12); // D6
        
        gain2.gain.setValueAtTime(0.2, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.55);
      }, 100);

    } catch (e) {
      console.error("Failed to play notification sound", e);
    }
  };

  const playLogoSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const frequencies = [261.63, 329.63, 392.00, 523.25];
      const now = ctx.currentTime;
      
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        
        const delay = idx * 0.08;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.08, now + delay + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.2);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(now + delay);
        osc.stop(now + delay + 1.3);
      });
      
    } catch (e) {
      console.error("Failed to play logo sound", e);
    }
  };

  // Ref-ek az aktuális értékekhez (closure miatt kell)
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  const addViewModeRef = useRef(addViewMode);
  useEffect(() => { addViewModeRef.current = addViewMode; }, [addViewMode]);
  const isDrawerOpenRef = useRef(isDrawerOpen);
  useEffect(() => { isDrawerOpenRef.current = isDrawerOpen; }, [isDrawerOpen]);

  // Swipe navigation
  const minSwipeDistance = 50;

  useEffect(() => {
    // Rövid delay hogy a ref biztosan be legyen töltve
    const timer = setTimeout(() => {
      const el = mainRef.current;
      if (!el) return;

      let startX = 0;
      let startY = 0;
      let startXRelative = 0; // .phone elemen belüli pozíció
      let isHorizontal: boolean | null = null;

      const handleTouchStart = (e: TouchEvent) => {
        const touch = e.targetTouches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        // Relatív pozíció a .phone elemen belül
        const rect = el.getBoundingClientRect();
        startXRelative = touch.clientX - rect.left;
        // Ha a touch a .phone elemen kívül indult, ne csináljunk semmit
        if (touch.clientX < rect.left || touch.clientX > rect.right ||
            touch.clientY < rect.top  || touch.clientY > rect.bottom) {
          startX = -9999;
          return;
        }
        isHorizontal = null;
      };

      const handleTouchMove = (e: TouchEvent) => {
        const dx = Math.abs(e.targetTouches[0].clientX - startX);
        const dy = Math.abs(e.targetTouches[0].clientY - startY);

        if (isHorizontal === null && (dx > 8 || dy > 8)) {
          isHorizontal = dx > dy;
        }

        if (isHorizontal) {
          e.preventDefault();
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (isHorizontal !== true) return;

        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;

        if (Math.abs(dx) < minSwipeDistance) return;
        if (Math.abs(dy) > Math.abs(dx) * 0.7) return;

        const isLeftSwipe = dx < 0;
        const isRightSwipe = dx > 0;

        // Drawer kinyitás: bal szélről (60px) jobbra húzva
        if (isRightSwipe && startXRelative < 60 && !isDrawerOpenRef.current) {
          setIsDrawerOpen(true);
          return;
        }

        // Drawer becsukás: balra húzva ha nyitva
        if (isLeftSwipe && isDrawerOpenRef.current) {
          setIsDrawerOpen(false);
          return;
        }

        // Ha drawer nyitva van, ne váltson tab
        if (isDrawerOpenRef.current) return;

        // Add tab: naptár ↔ form váltás, ha van mit váltani
        // Ha nincs (pl. form nézetből balra), eső át a tab váltásra
        if (activeTabRef.current === "Add") {
          if (isLeftSwipe && addViewModeRef.current === "calendar") { setAddViewMode("form"); return; }
          if (isRightSwipe && addViewModeRef.current === "form") { setAddViewMode("calendar"); return; }
          // nincs mit váltani → tab váltás következik
        }

        // Tab váltás
        const tabs = ["Home", "Timeline", "Add", "Vault", "Profile"];
        const idx = tabs.indexOf(activeTabRef.current);
        if (isLeftSwipe && idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
        else if (isRightSwipe && idx > 0) setActiveTab(tabs[idx - 1]);
      };

      // document-ra tesszük hogy a child elemek ne nyeljék el
      document.addEventListener("touchstart", handleTouchStart, { passive: true });
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd, { passive: true });

      return () => {
        document.removeEventListener("touchstart", handleTouchStart);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }, 100);

    return () => clearTimeout(timer);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps



  const resetForm = () => {
    setNewEventTitle("");
    setNewEventDate(new Date().toISOString().split("T")[0]);
    setNewEventType("event");
    setNewEventDesc("");
    setEditingEventId(null);
    setUploadFile(null);
    setPreviewUrl(null);
    setNewEventImages([]);
    setNewEventDocs([]);
    setNewEventAudios([]);
    setExistingAttachments([]);
    setIsRecurring(false);
    setRecurringType("weekly");
    setRecurringDays([]);
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const data = await res.json();
          
          let city = "Helyi";
          try {
            const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=hu`);
            const geoData = await geoRes.json();
            city = geoData.city || geoData.locality || "Helyi";
          } catch(e) {}

          const w = data.current_weather;
          const codes: Record<number, string> = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 51: '🌧️', 61: '🌧️', 71: '🌨️', 95: '⛈️' };
          setWeather({ temp: Math.round(w.temperature), desc: codes[w.weathercode] || '🌡️', city });
        } catch (e) {}
      });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchEvents();
      fetchVaultFolders();
      fetchAllVaultFiles();
    }
  }, [session]);

  useEffect(() => {
    if (activeTab === "Timeline" && scrollToEventId) {
      setTimeout(() => {
        const el = document.getElementById(`event-${scrollToEventId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.style.transition = "box-shadow 0.3s";
          el.style.boxShadow = "0 0 20px rgba(255, 152, 0, 0.5)";
          setTimeout(() => { el.style.boxShadow = ""; }, 2000);
        }
        setScrollToEventId(null);
      }, 300);
    }
  }, [activeTab, scrollToEventId]);

  const fetchEvents = async () => {
    const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: false });
    if (data) setEvents(data);
  };

  const fetchVaultFolders = async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('vault_folders')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setVaultFolders(data);
    }
  };

  const fetchAllVaultFiles = async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('vault_files')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setAllVaultFiles(data);
    }
  };

  const loadVaultFiles = async (folderId: string) => {
    if (!session) return;
    const { data, error } = await supabase
      .from('vault_files')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setVaultFiles(data);
    }
  };

  const handleOpenFolder = (folder: any) => {
    setActiveVaultFolder(folder);
    setEditVaultFolderName(folder.name);
    setEditVaultFolderIcon(folder.icon || '📁');
    setEditVaultFolderDescription(folder.description || '');
    setIsEditingVaultFolder(false);
    loadVaultFiles(folder.id);
  };

  const handleUpdateVaultFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVaultFolderName.trim() || !activeVaultFolder) return;
    
    const { data: updateData, error } = await supabase.from('vault_folders').update({
      name: editVaultFolderName,
      icon: editVaultFolderIcon,
      description: editVaultFolderDescription
    }).eq('id', activeVaultFolder.id).select();

    if (error) {
      alert("Hiba a projekt módosításakor: " + error.message);
    } else if (!updateData || updateData.length === 0) {
      alert("Hiba: Nincs jogosultságod a módosításhoz (RLS korlátozás)!");
    } else {
      setIsEditingVaultFolder(false);
      setActiveVaultFolder({ ...activeVaultFolder, name: editVaultFolderName, icon: editVaultFolderIcon, description: editVaultFolderDescription });
      fetchVaultFolders();
    }
  };

  const handleUploadVaultFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeVaultFolder || !session) return;
    setIsUploadingVaultFile(true);

    try {
      const filesArray = Array.from(e.target.files);
      for (const file of filesArray) {
        const fileExt = file.name.split('.').pop();
        const fileName = `vault_${activeVaultFolder.id}_${Math.random()}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
        
        const { error: dbError } = await supabase.from('vault_files').insert({
          folder_id: activeVaultFolder.id,
          user_id: session.user.id,
          name: file.name,
          file_url: publicUrlData.publicUrl,
          file_type: file.type
        });

        if (dbError) throw dbError;
      }
      
      await loadVaultFiles(activeVaultFolder.id);
      playNotificationSound();
    } catch (err: any) {
      alert("Hiba a fájlok feltöltésekor: " + err.message);
    } finally {
      setIsUploadingVaultFile(false);
      if (vaultFileInputRef.current) vaultFileInputRef.current.value = "";
    }
  };

  const handleDeleteVaultFile = async (fileId: string) => {
    const { error } = await supabase.from('vault_files').delete().eq('id', fileId);
    if (error) {
      alert("Hiba a fájl törlésekor: " + error.message);
    } else {
      await loadVaultFiles(activeVaultFolder.id);
    }
  };

  const handleDeleteVaultFolder = async () => {
    const { error } = await supabase.from('vault_folders').delete().eq('id', activeVaultFolder.id);
    if (error) {
      alert("Hiba a projekt törlésekor: " + error.message);
    } else {
      setActiveVaultFolder(null);
      fetchVaultFolders();
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !session) return;
    
    setIsUploadingVaultFile(true);
    
    try {
      const randomColors = ["#ffb74d", "#ff7043", "#42a5f5", "#66bb6a", "#ab47bc", "#26a69a"];
      const folderColor = randomColors[Math.floor(Math.random() * randomColors.length)];

      const { data, error } = await supabase.from('vault_folders').insert({
        user_id: session.user.id,
        name: newFolderName,
        icon: newFolderIcon,
        description: newFolderDescription,
        color_hex: folderColor
      }).select();

      if (error) throw error;

      const folder = data?.[0];
      if (folder) {
        const allFilesToUpload = [...newFolderImages, ...newFolderDocs, ...newFolderAudios];
        if (allFilesToUpload.length > 0) {
          for (const file of allFilesToUpload) {
            const fileExt = file.name.split('.').pop();
            const fileName = `vault_${folder.id}_${Math.random()}.${fileExt}`;
            const filePath = `${session.user.id}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
            
            const { error: dbError } = await supabase.from('vault_files').insert({
              folder_id: folder.id,
              user_id: session.user.id,
              name: file.name,
              file_url: publicUrlData.publicUrl,
              file_type: file.type
            });

            if (dbError) throw dbError;
          }
        }

        playNotificationSound();
        setIsCreatingFolder(false);
        setTimeout(() => { if (vaultScrollRef.current) vaultScrollRef.current.scrollTop = 0; }, 50);
        setNewFolderName("");
        setNewFolderIcon("📁");
        setNewFolderDescription("");
        setNewFolderImages([]);
        setNewFolderDocs([]);
        setNewFolderAudios([]);
        fetchVaultFolders();
        handleOpenFolder(folder);
      }
    } catch (err: any) {
      alert("Hiba a projekt létrehozásakor: " + err.message);
    } finally {
      setIsUploadingVaultFile(false);
    }
  };

  const calculateStats = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Start of current week (Monday)
    const todayObj = new Date();
    const day = todayObj.getDay();
    const diff = todayObj.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(todayObj.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const thisMonth = todayStr.substring(0, 7);
    const thisYear = todayStr.substring(0, 4);
    
    let todayCount = 0, weekCount = 0, monthCount = 0, yearCount = 0;
    
    events.forEach(e => {
      if (e.event_date === todayStr) todayCount++;
      
      // Weekly check
      if (e.event_date) {
        const eventDate = new Date(e.event_date);
        if (eventDate >= startOfWeek) {
          weekCount++;
        }
      }
      
      if (e.event_date.startsWith(thisMonth)) monthCount++;
      if (e.event_date.startsWith(thisYear)) yearCount++;
    });
    
    return { today: todayCount, week: weekCount, month: monthCount, year: yearCount, allTime: events.length };
  };
  const stats = calculateStats();
  const recentMemories = events.slice(0, 8);

  const handleStatsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    if (width > 0) {
      const index = Math.round(scrollLeft / width);
      setActiveStatIndex(index);
    }
  };
  
  const userMetadata = session?.user?.user_metadata || {};
  const avatarUrl = userMetadata.avatar_url;
  const displayName = userMetadata.full_name || (session?.user?.email ? session.user.email.split('@')[0] : "Ismeretlen");
  const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  const startEditingGreetingName = () => {
    setGreetingNameInput(displayName);
    setIsEditingGreetingName(true);
  };

  const handleSaveGreetingName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: greetingNameInput,
      }
    });
    if (error) {
      alert("Hiba a név mentésekor: " + error.message);
    } else {
      setIsEditingGreetingName(false);
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    }
  };

  const openEditProfile = () => {
    setEditProfileName(formattedName);
    setEditProfilePassword("");
    setEditProfileFile(null);
    setEditProfilePreview(avatarUrl || null);
    setIsEditingProfile(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setIsUpdatingProfile(true);

    let newAvatarUrl = avatarUrl;

    if (editProfileFile) {
      const fileExt = editProfileFile.name.split('.').pop();
      const fileName = `avatar_${session.user.id}_${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, editProfileFile);
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
        newAvatarUrl = publicUrlData.publicUrl;
      }
    }

    const updates: any = {
      data: {
        full_name: editProfileName,
        avatar_url: newAvatarUrl
      }
    };

    if (editProfilePassword.trim().length > 0) {
      updates.password = editProfilePassword;
    }

    const { error } = await supabase.auth.updateUser(updates);
    
    if (error) {
      alert("Hiba a profil frissítésekor: " + error.message);
    } else {
      setIsEditingProfile(false);
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    }
    setIsUpdatingProfile(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        showToast("Hiba a belépésnél: " + error.message, 'error');
      } else {
        localStorage.setItem('remembered_login_email', email);
        setShowSplash(true);
        setTimeout(() => setShowSplash(false), 4000);
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) showToast("Hiba a regisztrációnál: " + error.message, 'error');
      else {
        localStorage.setItem('remembered_login_email', email);
        showToast(t("registeredOk"), 'success');
        setIsLoginMode(true);
        setPassword("");
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleDeleteEvent = (id: string, recurringType?: string) => {
    setEventToDeleteId(id);
    setDeleteMode(recurringType ? null : "single");
    setActiveMenuId(null);
  };

  const confirmDelete = async () => {
    if (!eventToDeleteId) return;
    const { error } = await supabase.from('events').delete().eq('id', eventToDeleteId);
    if (error) {
      showToast("Hiba törlés közben: " + error.message, 'error');
    } else {
      setEvents(events.filter(e => e.id !== eventToDeleteId));
      showToast(t("toastDeleted"), 'success');
    }
    setEventToDeleteId(null);
    setDeleteMode(null);
  };

  const getNextRecurringDate = (startDate: string, type: string, days?: string | null): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    const daysList = days ? days.split(",").map(Number) : [];

    if (type === "daily") {
      if (start >= today) return startDate;
      return today.toISOString().split("T")[0];
    } else if (type === "weekly") {
      if (daysList.length === 0) {
        const current = new Date(start);
        while (current < today) current.setDate(current.getDate() + 7);
        return current.toISOString().split("T")[0];
      } else {
        let nearest: Date | null = null;
        const check = new Date(today);
        for (let i = 0; i < 14; i++) {
          const dow = check.getDay();
          const mapped = dow === 0 ? 6 : dow - 1;
          if (daysList.includes(mapped) && check >= start) {
            if (!nearest || check < nearest) nearest = new Date(check);
          }
          check.setDate(check.getDate() + 1);
        }
        return nearest ? nearest.toISOString().split("T")[0] : startDate;
      }
    } else if (type === "biweekly") {
      const current = new Date(start);
      while (current < today) current.setDate(current.getDate() + 14);
      return current.toISOString().split("T")[0];
    } else if (type === "monthly") {
      const current = new Date(start);
      while (current < today) current.setMonth(current.getMonth() + 1);
      return current.toISOString().split("T")[0];
    } else if (type === "yearly") {
      const current = new Date(start);
      while (current < today) current.setFullYear(current.getFullYear() + 1);
      return current.toISOString().split("T")[0];
    }
    return startDate;
  };

  const recurringTypeLabel: Record<string, string> = {
    daily: t("daily"), weekly: t("weekly"), biweekly: t("biweekly"), monthly: t("monthly"), yearly: t("yearly")
  };

  const handleDeleteAll = async () => {
    if (!session) return;
    const { error } = await supabase.from('events').delete().eq('user_id', session.user.id);
    if (error) {
      showToast("Hiba törlés közben: " + error.message, 'error');
    } else {
      setEvents([]);
      showToast(t("toastAllDeleted"), 'success');
    }
    setShowDeleteAllConfirm(false);
  };

  const handleEditEvent = (event: any) => {
    setEditingEventId(event.id);
    setNewEventTitle(event.title);
    setNewEventDate(event.event_date);
    setNewEventType(event.category);
    setNewEventDesc(event.description || "");
    
    // Parse attachments from image_url
    let parsedAttachments: any[] = [];
    try {
      if (event.image_url && event.image_url.startsWith('[')) {
        parsedAttachments = JSON.parse(event.image_url);
      } else if (event.image_url) {
        parsedAttachments = [{ name: "Csatolt kép", url: event.image_url, type: "image/jpeg" }];
      }
    } catch (e) {
      if (event.image_url) {
        parsedAttachments = [{ name: "Csatolt kép", url: event.image_url, type: "image/jpeg" }];
      }
    }
    setExistingAttachments(parsedAttachments);
    setPreviewUrl(null);
    setUploadFile(null);
    setNewEventImages([]);
    setNewEventDocs([]);
    setNewEventAudios([]);
    setActiveMenuId(null);
    setActiveTab("Add");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setIsUploading(true);
    let finalAttachments = [...existingAttachments];

    try {
      const allFilesToUpload = [...newEventImages, ...newEventDocs, ...newEventAudios];
      for (const file of allFilesToUpload) {
        const fileExt = file.name.split('.').pop();
        const fileName = `event_${Math.random()}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
        finalAttachments.push({
          name: file.name,
          url: publicUrlData.publicUrl,
          type: file.type
        });
      }
    } catch (err: any) {
      alert("Hiba a fájlok feltöltésekor: " + err.message);
      setIsUploading(false);
      return;
    }
    setIsUploading(false);

    const finalImageUrl = JSON.stringify(finalAttachments);

    const emailHtml = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: #1a1a2e; color: white; border-radius: 20px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #ffb74d, #ff7043); padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">LifeSync</h1>
          <p style="margin: 5px 0 0; opacity: 0.9;">Esemény értesítő</p>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #ffb74d; margin-top: 0;">${newEventTitle}</h2>
          <p style="opacity: 0.8;">📅 Dátum: <strong>${newEventDate}</strong></p>
          ${newEventDesc ? `<p style="opacity: 0.8;">📝 ${newEventDesc}</p>` : ''}
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
          <p style="opacity: 0.5; font-size: 12px; text-align: center;">Ez egy automatikus értesítő a LifeSync alkalmazásból.</p>
        </div>
      </div>
    `;

    if (editingEventId) {
      const { data: updateData, error } = await supabase.from('events').update({
        title: newEventTitle,
        event_date: newEventDate,
        category: newEventType,
        description: newEventDesc,
        image_url: finalImageUrl
      }).eq('id', editingEventId).select();

      if (error) {
        showToast("Hiba módosítás közben: " + error.message, 'error');
      } else if (!updateData || updateData.length === 0) {
        showToast("Nincs jogosultságod a módosításhoz (RLS korlátozás)!", 'error');
      } else {
        showToast(t("toastUpdated"), 'success');
        resetForm();
        const { data } = await supabase.from('events').select('*').order('event_date', { ascending: false });
        if (data) setEvents(data);
        setActiveTab(t("timelineTitle"));
      }
    } else {
      if (isRecurring) {
        // Csak EGY sort mentünk – a Timeline kiszámolja a következő dátumot
        const recurringDaysStr = recurringDays.length > 0 ? recurringDays.join(",") : null;
        const { error } = await supabase.from('events').insert([{
          title: newEventTitle,
          event_date: newEventDate,
          category: newEventType,
          description: newEventDesc,
          user_id: session.user.id,
          image_url: finalImageUrl,
          recurring_type: recurringType,
          recurring_days: recurringDaysStr,
        }]);
        if (error) {
          showToast("Hiba mentés közben: " + error.message, 'error');
        } else {
          showToast(t("toastRecurring"), 'success');
          resetForm();
          fetchEvents();
          setActiveTab(t("timelineTitle"));
        }
      } else {
      const { error } = await supabase.from('events').insert([
          { 
              title: newEventTitle, 
              event_date: newEventDate, 
              category: newEventType, 
              description: newEventDesc,
              user_id: session.user.id,
              image_url: finalImageUrl
          }
      ]);

      if (error) {
          showToast("Hiba mentés közben: " + error.message, 'error');
      } else {
          // Email küldés EmailJS-sel
          const userEmail = customEmail.trim() || session.user.email;
          if (customEmail.trim()) {
            localStorage.setItem('remembered_custom_email', customEmail.trim());
          }
          const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
          const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '';
          const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';

          if (userEmail && SERVICE_ID) {
            try {
              const templateParams = {
                to_email: userEmail,
                event_title: newEventTitle,
                event_date: newEventDate,
                event_desc: newEventDesc || 'Nincs leírás',
                subject: `LifeSync: ${newEventTitle}`,
              };

              if (emailNotifyNow) {
                await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
              }

              // Időzített emlékeztetők mentése Supabase-be
              if (emailNotify1Day) {
                const sendAt = new Date(newEventDate);
                sendAt.setDate(sendAt.getDate() - 1);
                sendAt.setHours(8, 0, 0, 0);
                if (sendAt > new Date()) {
                  await supabase.from('scheduled_emails').insert({
                    user_id: session.user.id,
                    to_email: userEmail,
                    event_title: newEventTitle,
                    event_date: newEventDate,
                    event_desc: newEventDesc || '',
                    send_at: sendAt.toISOString(),
                    sent: false
                  });
                }
              }
              if (emailNotifyCustom && customNotifyDateTime) {
                const sendAt = customNotifyDateTime;
                if (sendAt > new Date()) {
                  await supabase.from('scheduled_emails').insert({
                    user_id: session.user.id,
                    to_email: userEmail,
                    event_title: newEventTitle,
                    event_date: newEventDate,
                    event_desc: newEventDesc || '',
                    send_at: sendAt.toISOString(),
                    sent: false
                  });
                }
              }
            } catch (emailErr) {
              console.error('Email küldési hiba:', emailErr);
            }
          }

          showToast(t("toastSaved"), 'success');
          resetForm();
          fetchEvents();
          setActiveTab(t("timelineTitle"));
      }
      } // end non-recurring else
    }
    setEmailNotifyNow(false);
    setEmailNotify1Day(false);
    setEmailNotifyCustom(false);
    setCustomNotifyDateTime(null);
    const savedCustomEmail = typeof window !== "undefined" ? localStorage.getItem("remembered_custom_email") || "" : "";
    setCustomEmail(savedCustomEmail);
  };

  if (!session || showSplash) {
    return (
      <main className="phone" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", padding: "24px", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: showSplash ? "center" : "flex-start", alignItems: "center", gap: "20px" }}>
        {!showSplash && (
          <div className="theme-toggle" onClick={toggleTheme} style={{ position: "absolute", top: "25px", right: "25px", cursor: "pointer", zIndex: 100 }}>
            {isDarkMode ? "☀️" : "🌙"}
          </div>
        )}
        
        {/* Brand Container */}
        <div 
          onClick={playLogoSound} 
          style={{ 
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginTop: showSplash ? "auto" : "16px",
            marginBottom: showSplash ? "auto" : "6px",
            textAlign: "center", 
            zIndex: 10, 
            transition: "all 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)", 
            cursor: "pointer",
            flexShrink: 0
          }}
        >
          <div style={{ width: showSplash ? "110px" : "92px", height: showSplash ? "110px" : "92px", margin: "0 auto 10px", background: "transparent", border: "none", boxShadow: "none", transition: "all 0.8s" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lifesync-icon.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "0", boxShadow: "none", transition: "all 0.8s" }} />
          </div>
          <h1 style={{ 
            fontSize: showSplash ? "40px" : "36px", 
            fontWeight: 900, 
            letterSpacing: "1px", 
            margin: 0, 
            transition: "all 0.8s",
            fontFamily: "'SF Pro Display', 'Inter', 'Segoe UI', sans-serif",
            background: "linear-gradient(90deg, #B8E7FF 0%, #6AB7FF 42%, #7E7BFF 72%, #9B7BFF 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent"
          }}>LifeSync</h1>
          
          <div style={{ marginTop: "10px", display: showSplash ? "block" : "none", width: "100%", padding: "0 10px" }}>
             {showSplash && (
               <p style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.85)", margin: 0, fontWeight: 500, lineHeight: "1.4" }}>
                  {t("slogan").split(" ").map((word, idx) => (
                     <span key={idx} className="word-fade" style={{ animationDelay: `${1.2 + idx * 0.35}s`, display: "inline-block" }}>{word}&nbsp;</span>
                  ))}
               </p>
             )}
          </div>
        </div>

        {/* Login Form */}
        {!showSplash && (
          <div 
            className="glass-card login-card" 
            style={{ 
              width: "100%",
              maxWidth: "360px",
              maxHeight: "calc(100vh - 280px)",
              overflowY: "auto",
              overscrollBehavior: "contain",
              padding: "26px 20px", 
              borderRadius: "28px", 
              zIndex: 5,
              animation: "form-slide-up 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              marginBottom: "40px"
            }}
          >
            <h2 style={{ fontSize: "22px", fontWeight: 600, marginBottom: "20px", textAlign: "center" }}>
              {isLoginMode ? t("signIn") : t("register")}
            </h2>

            <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13.5px", opacity: 0.9, marginBottom: "6px", display: "block", fontWeight: 500 }}>{t("emailLabel")}</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("emailPlaceholder")} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px 14px", borderRadius: "14px", color: "white", outline: "none", fontSize: "14px" }} />
              </div>
              
                            <div>
                <label style={{ fontSize: "13.5px", opacity: 0.9, marginBottom: "6px", display: "block", fontWeight: 500 }}>{t("passwordLabel")}</label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••" 
                    style={{ 
                      width: "100%", 
                      background: "rgba(255,255,255,0.08)", 
                      border: "1px solid rgba(255,255,255,0.2)", 
                      padding: "12px 42px 12px 14px", 
                      borderRadius: "14px", 
                      color: "white", 
                      outline: "none", 
                      fontSize: "14px" 
                    }} 
                  />
                  <span 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      position: "absolute", 
                      right: "14px", 
                      top: "50%", 
                      transform: "translateY(-50%)", 
                      cursor: "pointer", 
                      fontSize: "16px",
                      opacity: showPassword ? 0.95 : 0.4,
                      transition: "opacity 0.2s ease",
                      userSelect: "none",
                      padding: "4px"
                    }}
                  >
                    👁️
                  </span>
                </div>
              </div>

              <button type="submit" style={{ marginTop: "8px", padding: "14px", background: "linear-gradient(135deg, #ffb74d, #ff7043)", border: "none", borderRadius: "16px", color: "white", fontWeight: 600, boxShadow: "0 6px 20px rgba(255, 112, 67, 0.4)", fontSize: "15px", cursor: "pointer" }}>
                {isLoginMode ? t("login") : t("createAccount")}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "18px", fontSize: "13.5px" }}>
              <span style={{ opacity: 0.7 }}>{isLoginMode ? t("noAccount") : t("alreadyHaveAccount")}</span>{" "}
              <span onClick={() => setIsLoginMode(!isLoginMode)} style={{ color: "#ffcc80", fontWeight: 600, cursor: "pointer" }}>
                {isLoginMode ? t("register") : t("signIn")}
              </span>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main 
      className="phone"
      ref={mainRef}

    >
      {/* ═══ FŐ TARTALOM ═══ */}

      <section className="header">
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          {/* Hamburger gomb */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            style={{
              width: "42px", height: "42px", borderRadius: "14px",
              background: "var(--card-bg)", border: "1px solid var(--card-border)",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: "5px", cursor: "pointer",
              flexShrink: 0, marginTop: "4px"
            }}
          >
            <span style={{ display: "block", width: "18px", height: "2px", background: "var(--text-color)", borderRadius: "2px" }} />
            <span style={{ display: "block", width: "18px", height: "2px", background: "var(--text-color)", borderRadius: "2px" }} />
            <span style={{ display: "block", width: "18px", height: "2px", background: "var(--text-color)", borderRadius: "2px" }} />
          </button>
          <div>
          <div className="brand" onClick={playLogoSound} style={{ display: "flex", alignItems: "center", gap: "16px", cursor: "pointer" }}>
            {/* Logo ikon */}
            <div className="logo" style={{ width: "48px", height: "48px", borderRadius: "14px", background: "transparent" }}>
              <img src="/lifesync-icon.png" alt="LifeSync" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>

            {/* Logo szöveg */}
            <h1 style={{
              fontFamily: "'SF Pro Display', 'Inter', 'Segoe UI', sans-serif",
              fontWeight: 600,
              fontSize: "36px",
              lineHeight: "44px",
              letterSpacing: "-0.02em",
              background: "linear-gradient(90deg, #B8E7FF 0%, #6AB7FF 42%, #7E7BFF 72%, #9B7BFF 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              margin: 0
            }}>
              LifeSync
            </h1>
          </div>
          <div className="subtitle" style={{ 
            fontSize: "14px", 
            color: "rgba(244, 247, 251, 0.85)", 
            marginTop: "8px",
            fontWeight: 500
          }}>{t("slogan")}</div>
          </div>{/* end brand+subtitle wrapper */}
        </div>{/* end hamburger+content wrapper */}

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className="search" onClick={() => setIsSearchOpen(true)} style={{ cursor: "pointer" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>
      </section>

      {/* Main Content Area based on Tab */}
      {activeTab === "Home" && (
        <div key="Home" className="page-transition" style={{ height: "calc(100% - 120px)", overflowY: "auto", paddingBottom: "20px", scrollbarWidth: "none", overscrollBehavior: "contain", paddingTop: "10px" }}>
          <section className="glass-card greeting" style={{ position: "relative" }}>
            {isEditingGreetingName ? (
              <form onSubmit={handleSaveGreetingName} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                <input 
                  autoFocus
                  type="text" 
                  value={greetingNameInput} 
                  onChange={e => setGreetingNameInput(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", padding: "6px 12px", color: "white", outline: "none", fontSize: "15px", flex: 1 }}
                />
                <button type="submit" style={{ background: "linear-gradient(135deg, #ffb74d, #ff7043)", border: "none", borderRadius: "10px", color: "white", padding: "8px 12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Mentés</button>
                <button type="button" onClick={() => setIsEditingGreetingName(false)} style={{ background: "transparent", border: "1px solid var(--card-border)", borderRadius: "10px", color: "var(--text-color)", padding: "8px 12px", fontSize: "14px", cursor: "pointer" }}>{t("cancel")}</button>
              </form>
            ) : (
              <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>
                {lang === "hu" ? `Legyen szép napod, ${formattedName}!` : `Have a great day, ${formattedName}!`}
              </h2>
            )}
            <p style={{ opacity: 0.85, fontSize: "15px", fontWeight: 500 }}>
              {weather ? `${weather.temp}°C · ${weather.city} ${weather.desc}` : t("weatherFallback")}
            </p>
          </section>

          <section className="glass-card timeline">
            <div className="section-head">
              <span>{t("eventStats")}</span>
            </div>

            <div className="stats" onScroll={handleStatsScroll}>
              <div className="stat">
                <div className="icon">📅</div>
                <div>
                  <strong>{stats.today} bejegyzés</strong>
                  <small>{t("todayLabel")}</small>
                </div>
              </div>

              <div className="stat">
                <div className="icon">⚡</div>
                <div>
                  <strong>{stats.week} bejegyzés</strong>
                  <small>{t("weekLabel")}</small>
                </div>
              </div>

              <div className="stat">
                <div className="icon">🗓</div>
                <div>
                  <strong>{stats.month} bejegyzés</strong>
                  <small>{t("monthLabel")}</small>
                </div>
              </div>

              <div className="stat">
                <div className="icon">⭐</div>
                <div>
                  <strong>{stats.year} bejegyzés</strong>
                  <small>{t("yearLabel")}</small>
                </div>
              </div>

              <div className="stat">
                <div className="icon">🗂</div>
                <div>
                  <strong>{stats.allTime} bejegyzés</strong>
                  <small>{t("allTimeLabel")}</small>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card recent">
            <div className="section-head">
              <span>{t("recentEvents")}</span>
              <span onClick={() => setActiveTab(t("timelineTitle"))} style={{ cursor: "pointer" }}>{t("allEvents")}</span>
            </div>

            {recentMemories.length === 0 ? (
              <p style={{ opacity: 0.6, fontSize: "14px", padding: "10px" }}>{t("noEvents")}</p>
            ) : (
              <div className="photos" style={{ display: "flex", overflowX: "auto", gap: "12px", paddingBottom: "10px", scrollbarWidth: "none" }}>
                {recentMemories.map((mem) => (
                  <div className="photo" key={mem.id} onClick={() => { setScrollToEventId(mem.id); setActiveTab(t("timelineTitle")); }} style={{ minWidth: "120px", width: "120px", cursor: "pointer" }}>
                    {(() => {
                      let parsedUrl = "";
                      try {
                        if (mem.image_url && mem.image_url.startsWith("[")) {
                          const parsed = JSON.parse(mem.image_url);
                          const firstImg = parsed.find((p: any) => p.type?.startsWith("image/"));
                          if (firstImg) parsedUrl = firstImg.url;
                        } else if (mem.image_url) {
                          parsedUrl = mem.image_url;
                        }
                      } catch (e) {
                        parsedUrl = mem.image_url || "";
                      }

                      return parsedUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={parsedUrl} alt={mem.title} style={{ height: "120px", objectFit: "cover", borderRadius: "12px", width: "100%" }} />
                      ) : (
                        <div style={{ height: "120px", borderRadius: "12px", width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px" }}>
                          {mem.category === 'photo' ? '💭' : mem.category === 'utility' ? '⚡' : '📅'}
                        </div>
                      );
                    })()}
                    <strong style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", marginTop: "6px" }}>{mem.title}</strong>
                    <small>{mem.event_date}</small>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginBottom: "32px", marginTop: "24px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px", padding: "0 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{t("activeProjects")}</span>
              <span onClick={() => setActiveTab("Vault")} style={{ fontSize: "14px", fontWeight: 600, color: "white", cursor: "pointer" }}>{t("allEvents")}</span>
            </h2>
            <div style={{ display: "flex", gap: "14px", overflowX: "auto", padding: "4px", paddingBottom: "16px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }} className="hide-scrollbar">
              {vaultFolders.length === 0 ? (
                <div style={{ padding: "10px", opacity: 0.6, fontSize: "14px" }}>
                  Még nincsenek projektjeid. Kattints a Projekt menüre egy új létrehozásához!
                </div>
              ) : vaultFolders.map((folder) => (
                <div key={folder.id} onClick={() => { setActiveTab("Vault"); handleOpenFolder(folder); }} className="glass-card" style={{ flex: "0 0 110px", padding: "16px", borderRadius: "20px", display: "flex", flexDirection: "column", gap: "12px", position: "relative", cursor: "pointer" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: `linear-gradient(135deg, ${folder.color_hex || '#ffb74d'}cc, ${folder.color_hex || '#ff7043'})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", boxShadow: `0 4px 12px ${folder.color_hex || '#ff7043'}50` }}>
                    {folder.icon || '📁'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.2 }}>{folder.name}</h3>
                    <p style={{ fontSize: "11px", opacity: 0.7, marginTop: "2px" }}>{t("open")}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === "Timeline" && (
        <div key="Timeline" className="page-transition" style={{ height: "calc(100% - 100px)", overflowY: "auto", paddingBottom: "20px", scrollbarWidth: "none", display: "flex", flexDirection: "column", gap: "16px", overscrollBehavior: "contain" }}>
          <div style={{ padding: "0 4px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <h2 style={{ fontSize: "28px", fontWeight: 650 }}>{t("timelineTitle")}</h2>
              {events.length > 0 && (
                <button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  style={{ fontSize: "12px", padding: "6px 12px", borderRadius: "20px", border: "1px solid rgba(255,1,1,0.5)", background: "rgba(255,1,1,0.2)", color: "#FF0101", cursor: "pointer", fontWeight: 600 }}
                >
                  🗑️ Összes törlése
                </button>
              )}
            </div>
            <p style={{ opacity: 0.75, fontSize: "15px" }}>{t("timelineSubtitle")}</p>
          </div>

          <div style={{ position: "relative", paddingLeft: "8px", marginTop: "10px" }}>
             {/* Függőleges vonal */}
             <div style={{ position: "absolute", left: "20px", top: 0, bottom: "100px", width: "2px", background: "rgba(255, 255, 255, 0.15)", borderRadius: "2px" }}></div>
             
             {events.length === 0 && (
                <p style={{ opacity: 0.6, fontSize: "14px", marginLeft: "40px", marginTop: "20px" }}>{t("noTimeline")}</p>
             )}

             {events.map((event) => (
               /* eslint-disable-next-line react/no-unknown-property */
               <div key={event.id} id={`event-${event.id}`} style={{ display: "flex", gap: "14px", marginBottom: "24px", position: "relative" }}>
                 <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg, #ffb74d, #ff7043)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", zIndex: 2, flexShrink: 0, marginTop: "12px", boxShadow: "0 0 10px rgba(255, 112, 67, 0.4)" }}>
                   {event.category === 'event' ? '🎂' : event.category === 'utility' ? '⚡' : '🏔'}
                 </div>
                 
                 <div 
                   className="glass-card" 
                   onClick={(e) => {
                     if ((e.target as HTMLElement).closest('.menu-trigger') || (e.target as HTMLElement).closest('.options-menu')) {
                       return;
                     }
                     setExpandedEvents(prev => ({ ...prev, [event.id]: !prev[event.id] }));
                   }}
                   style={{ flex: 1, padding: "16px", borderRadius: "20px", position: "relative", cursor: "pointer", transition: "all 0.3s ease", border: expandedEvents[event.id] ? "1px solid rgba(255, 152, 0, 0.4)" : "1px solid var(--card-border)" }}
                 >
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                       <span style={{ fontSize: "12px", opacity: 0.7, fontWeight: 600 }}>
                         {event.recurring_type ? getNextRecurringDate(event.event_date, event.recurring_type, event.recurring_days) : event.event_date}
                       </span>
                       {event.recurring_type && (
                         <span style={{ fontSize: "10px", background: "rgba(0,212,255,0.2)", border: "1px solid rgba(0,212,255,0.5)", borderRadius: "10px", padding: "1px 7px", color: "#00D4FF", fontWeight: 600 }}>
                           🔁 {recurringTypeLabel[event.recurring_type] || event.recurring_type}
                         </span>
                       )}
                     </div>
                     <span 
                       className="menu-trigger"
                       onClick={(e) => {
                         e.stopPropagation();
                         setActiveMenuId(activeMenuId === event.id ? null : event.id);
                       }} 
                       style={{ opacity: 0.7, cursor: "pointer", padding: "0 8px", fontSize: "16px", letterSpacing: "1px" }}
                     >
                       •••
                     </span>
                   </div>

                   {activeMenuId === event.id && (
                     <div className="options-menu" style={{ position: "absolute", right: "16px", top: "40px", background: "rgba(30,30,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "6px", zIndex: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", backdropFilter: "blur(10px)", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <button onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }} style={{ background: "transparent", border: "1px solid transparent", color: "white", fontSize: "14px", fontWeight: 500, cursor: "pointer", padding: "8px 16px", borderRadius: "8px", width: "100%", textAlign: "center", transition: "all 0.2s" }}>
                          Módosítás
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id, event.recurring_type); }} style={{ background: "rgba(255, 50, 50, 0.1)", border: "1px solid rgba(255, 50, 50, 0.2)", color: "#ff6b6b", fontSize: "14px", fontWeight: 600, cursor: "pointer", padding: "8px 16px", borderRadius: "8px", width: "100%", textAlign: "center", transition: "all 0.2s" }}>
                          Törlés
                        </button>
                     </div>
                   )}
                   
                   <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: expandedEvents[event.id] ? "6px" : "0" }}>
                     <span>{event.title}</span>
                   </h3>

                   {!expandedEvents[event.id] && (
                     <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                       {(() => {
                         let attachments: any[] = [];
                         try {
                           if (event.image_url && event.image_url.startsWith("[")) {
                             attachments = JSON.parse(event.image_url);
                           } else if (event.image_url) {
                             attachments = [{ type: "image/jpeg" }];
                           }
                         } catch (e) {
                           if (event.image_url) {
                             attachments = [{ type: "image/jpeg" }];
                           }
                         }
                         if (attachments.length === 0) return null;
                         const images = attachments.filter(att => att.type?.startsWith("image/")).length;
                         const audios = attachments.filter(att => att.type?.startsWith("audio/")).length;
                         const docs = attachments.filter(att => !att.type?.startsWith("image/") && !att.type?.startsWith("audio/")).length;

                         const parts = [];
                         if (images > 0) parts.push(`📸 ${images} kép`);
                         if (audios > 0) parts.push(`🎙️ ${audios} hang`);
                         if (docs > 0) parts.push(`📄 ${docs} dokumentum`);
                         
                         return (
                           <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px", borderRadius: "10px", alignSelf: "flex-start", opacity: 0.8, display: "flex", alignItems: "center", gap: "4px" }}>
                             📎 {parts.join(" • ")}
                           </span>
                         );
                       })()}
                       {event.description && (
                         <span style={{ fontSize: "13px", opacity: 0.5, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                           {event.description}
                         </span>
                       )}
                     </div>
                   )}

                   {expandedEvents[event.id] && (
                     <div style={{ marginTop: "12px", animation: "fade-in 0.2s ease-out" }} onClick={(e) => e.stopPropagation()}>
                       {event.description && (
                         <p style={{ fontSize: "14px", opacity: 0.8, lineHeight: 1.4, marginBottom: "14px" }}>{event.description}</p>
                       )}

                       {(() => {
                          let attachments: any[] = [];
                          try {
                            if (event.image_url && event.image_url.startsWith("[")) {
                              attachments = JSON.parse(event.image_url);
                            } else if (event.image_url) {
                              attachments = [{ name: "Csatolt kép", url: event.image_url, type: "image/jpeg" }];
                            }
                          } catch (e) {
                            if (event.image_url) {
                              attachments = [{ name: "Csatolt kép", url: event.image_url, type: "image/jpeg" }];
                            }
                          }

                          if (attachments.length === 0) return null;

                          const images = attachments.filter(att => att.type?.startsWith("image/"));
                          const audios = attachments.filter(att => att.type?.startsWith("audio/"));
                          const docs = attachments.filter(att => !att.type?.startsWith("image/") && !att.type?.startsWith("audio/"));

                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "4px" }}>
                              {/* Képek kirajzolása */}
                              {images.length > 0 && (
                                <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none" }}>
                                  {images.map((img, idx) => (
                                    <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", flexShrink: 0, width: images.length === 1 ? "100%" : "120px", height: images.length === 1 ? "160px" : "100px", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={img.url} alt={img.name || "Kép"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </a>
                                  ))}
                                </div>
                              )}

                              {/* Hangjegyzetek lejátszása */}
                              {audios.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {audios.map((audio, idx) => (
                                    <div key={idx} style={{ background: "rgba(255,255,255,0.06)", padding: "12px 14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                        <span style={{ fontSize: "16px" }}>🎙️</span>
                                        <span style={{ fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{audio.name || "Hangfelvétel"}</span>
                                      </div>
                                      <audio controls src={audio.url} style={{ width: "100%", height: "36px", outline: "none" }} />
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Dokumentumok kirajzolása pill-ként */}
                              {docs.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  {docs.map((doc, idx) => (
                                    <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.06)", padding: "10px 14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", color: "white", textDecoration: "none", fontSize: "13px", fontWeight: 500, transition: "background 0.2s" }} className="doc-pill">
                                      <span style={{ fontSize: "16px" }}>📄</span>
                                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{doc.name || (lang === "hu" ? "Dokumentum" : "Document")}</span>
                                      <span style={{ fontSize: "12px", opacity: 0.5 }}>{t("openDoc")}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                       })()}
                     </div>
                   )}
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {activeTab === "Add" && (
        <div key="Add" className="page-transition" style={{ height: "calc(100% - 65px)", overflowY: "auto", overflowX: "hidden", paddingBottom: "20px", scrollbarWidth: "none", overscrollBehavior: "contain" }}>
          <div style={{ padding: "0 4px", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 650, marginBottom: "4px" }}>{editingEventId ? t("editEntry") : addViewMode === "calendar" ? t("chooseDate") : t("newEntry")}</h2>
            <p style={{ opacity: 0.75, fontSize: "15px" }}>{editingEventId ? t("editHint") : addViewMode === "calendar" ? t("tapDayHint") : t("newHint")}</p>
          </div>

          {addViewMode === "form" ? (
          <div className="glass-card" style={{ padding: "20px" }}>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13.5px", opacity: 0.9, marginBottom: "6px", display: "block", fontWeight: 500 }}>{t("titleLabel")}</label>
                <input required type="text" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder={t("titlePlaceholder")} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px 14px", borderRadius: "16px", color: "white", outline: "none", fontSize: "15px" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "13.5px", opacity: 0.9, marginBottom: "6px", display: "block", fontWeight: 500 }}>{t("dateLabel")}</label>
                  <input required type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px 14px", borderRadius: "16px", color: "white", outline: "none", fontSize: "15px", colorScheme: "dark" }} />
                </div>
                <div>
                  <label style={{ fontSize: "13.5px", opacity: 0.9, marginBottom: "6px", display: "block", fontWeight: 500 }}>{t("categoryLabel")}</label>
                  <select value={newEventType} onChange={e => setNewEventType(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px 14px", borderRadius: "16px", color: "white", outline: "none", appearance: "none", fontSize: "15px" }}>
                    <option value="event" style={{color: "black"}}>{t("categoryEvent")}</option>
                    <option value="utility" style={{color: "black"}}>{t("categoryUtility")}</option>
                    <option value="photo" style={{color: "black"}}>{t("categoryPhoto")}</option>
                  </select>
                </div>
              </div>

              <div>
                {/* ISMÉTLŐDÉS KAPCSOLÓ */}
                {!editingEventId && (
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <label style={{ fontSize: "13.5px", fontWeight: 600, opacity: 0.9 }}>🔁 Ismétlődő esemény</label>
                      <div onClick={() => setIsRecurring(!isRecurring)} style={{ width: "44px", height: "24px", borderRadius: "12px", background: isRecurring ? "linear-gradient(135deg, #ffb74d, #ff7043)" : "rgba(255,255,255,0.15)", cursor: "pointer", position: "relative", transition: "all 0.3s ease" }}>
                        <div style={{ position: "absolute", top: "3px", left: isRecurring ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 0.3s ease", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }} />
                      </div>
                    </div>
                    {isRecurring && (
                      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", padding: "14px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <label style={{ fontSize: "12px", opacity: 0.6, marginBottom: "8px", display: "block" }}>{t("howOften")}</label>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {[{ value: "daily", label: t("daily") }, { value: "weekly", label: t("weekly") }, { value: "biweekly", label: t("biweekly") }, { value: "monthly", label: t("monthly") }, { value: "yearly", label: t("yearly") }].map(opt => (
                              <button key={opt.value} type="button" onClick={() => setRecurringType(opt.value as any)} style={{ padding: "6px 12px", borderRadius: "20px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: recurringType === opt.value ? "linear-gradient(135deg, #ffb74d, #ff7043)" : "rgba(255,255,255,0.1)", color: "white", transition: "all 0.2s" }}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {recurringType === "weekly" && (
                          <div>
                            <label style={{ fontSize: "12px", opacity: 0.6, marginBottom: "8px", display: "block" }}>{t("whichDays")}</label>
                            <div style={{ display: "flex", gap: "6px" }}>
                              {lang === "hu" ? ["H", "K", "Sz", "Cs", "P", "Szo", "V"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day, idx) => (
                                <button key={idx} type="button" onClick={() => setRecurringDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "none", fontSize: "11px", fontWeight: 700, cursor: "pointer", background: recurringDays.includes(idx) ? "linear-gradient(135deg, #ffb74d, #ff7043)" : "rgba(255,255,255,0.1)", color: "white", transition: "all 0.2s" }}>
                                  {day}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ fontSize: "12px", opacity: 0.6, fontStyle: "italic" }}>
                          📅 A Timeline folyamatosan kiszámolja a következő időpontot – csak 1 sor kerül mentésre.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <label style={{ fontSize: "13.5px", opacity: 0.9, marginBottom: "6px", display: "block", fontWeight: 500 }}>{t("notesLabel")}</label>
                <textarea rows={3} value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} placeholder={t("notesPlaceholder")} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px 14px", borderRadius: "16px", color: "white", outline: "none", resize: "none", fontSize: "15px" }}></textarea>
              </div>

              {/* MEGLÉVŐ CSATOLMÁNYOK (ha szerkesztés van) */}
              {existingAttachments.length > 0 && (
                <div style={{ marginTop: "6px", background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "16px", border: "1px dashed rgba(255,255,255,0.15)" }}>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "8px" }}>{t("currentAttachments")}</label>
                  
                  {/* Meglévő képek */}
                  {existingAttachments.some(att => att.type?.startsWith("image/")) && (
                    <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px", marginBottom: "8px", scrollbarWidth: "none" }}>
                      {existingAttachments.filter(att => att.type?.startsWith("image/")).map((att, idx) => (
                        <div key={idx} style={{ position: "relative", width: "65px", height: "65px", flexShrink: 0, borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.2)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={att.url} alt="existing preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <button type="button" onClick={() => setExistingAttachments(prev => prev.filter(item => item.url !== att.url))} style={{ position: "absolute", top: "2px", right: "2px", width: "16px", height: "16px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "white", fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meglévő hangfelvételek */}
                  {existingAttachments.some(att => att.type?.startsWith("audio/")) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                      {existingAttachments.filter(att => att.type?.startsWith("audio/")).map((att, idx) => (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px", background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "12px", color: "white", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", fontWeight: 500 }}>🎙️ {att.name || "Hangfelvétel"}</span>
                            <button type="button" onClick={() => setExistingAttachments(prev => prev.filter(item => item.url !== att.url))} style={{ background: "transparent", border: "none", color: "#ff8a80", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                          </div>
                          <audio controls src={att.url} style={{ width: "100%", height: "30px" }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meglévő dokumentumok */}
                  {existingAttachments.some(att => !att.type?.startsWith("image/") && !att.type?.startsWith("audio/")) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {existingAttachments.filter(att => !att.type?.startsWith("image/") && !att.type?.startsWith("audio/")).map((att, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", flex: 1 }}>
                            <span style={{ fontSize: "14px" }}>📄</span>
                            <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "white", textDecoration: "none", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{att.name || "Fájl"}</a>
                          </div>
                          <button type="button" onClick={() => setExistingAttachments(prev => prev.filter(item => item.url !== att.url))} style={{ background: "transparent", border: "none", color: "#ff8a80", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MÉDIA SZEKCIÓ - összecsukható */}
              <div style={{ marginTop: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <button type="button" onClick={() => setShowMediaSection(!showMediaSection)} style={{ width: "100%", padding: "12px 16px", background: showMediaSection ? "rgba(255,112,67,0.15)" : "transparent", border: "none", color: showMediaSection ? "#ff7043" : "var(--text-color)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "all 0.2s", borderRadius: "16px" }}>
                  <span style={{ fontSize: "13.5px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📎</span> Mellékletek
                    {(newEventImages.length + newEventDocs.length + newEventAudios.length) > 0 && (
                      <span style={{ background: "#ff7043", color: "white", borderRadius: "20px", padding: "1px 8px", fontSize: "11px" }}>
                        {newEventImages.length + newEventDocs.length + newEventAudios.length}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: "12px", opacity: 0.6 }}>{showMediaSection ? "▲" : "▼"}</span>
                </button>
                {showMediaSection && (
                  <div style={{ padding: "0 12px 12px" }}>
                    {/* ÚJ KÉPEK SZAKASZ */}
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "6px" }}>{t("imagesLabel")}</label>
                <input type="file" ref={eventImageInputRef} accept="image/*" hidden multiple onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const selected = Array.from(e.target.files);
                    setNewEventImages(prev => [...prev, ...selected]);
                  }
                }} />
                
                {/* Új Képek vízszintes előnézete */}
                {newEventImages.length > 0 && (
                  <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px", marginBottom: "8px", scrollbarWidth: "none" }}>
                    {newEventImages.map((file, idx) => {
                      const imgUrl = URL.createObjectURL(file);
                      return (
                        <div key={idx} style={{ position: "relative", width: "70px", height: "70px", flexShrink: 0, borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.2)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgUrl} alt="new preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <button type="button" onClick={() => setNewEventImages(prev => prev.filter((_, i) => i !== idx))} style={{ position: "absolute", top: "2px", right: "2px", width: "18px", height: "18px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "white", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <button type="button" onClick={() => eventImageInputRef.current?.click()} style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,0.08)", borderRadius: "12px", color: "var(--text-color)", border: "1px dashed var(--input-border)", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 500, cursor: "pointer" }}>
                  <span>📸</span> {newEventImages.length > 0 ? t("addMoreImages") : t("attachImage")}
                </button>
              </div>

                    {/* ÚJ DOKUMENTUMOK SZAKASZ */}
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "6px" }}>{t("docsLabel")}</label>
                <input type="file" ref={eventDocInputRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" hidden multiple onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const selected = Array.from(e.target.files);
                    setNewEventDocs(prev => [...prev, ...selected]);
                  }
                }} />

                {/* Új Dokumentumok függőleges listája */}
                {newEventDocs.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px", maxHeight: "100px", overflowY: "auto", paddingRight: "2px" }}>
                    {newEventDocs.map((file, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", flex: 1 }}>
                          <span style={{ fontSize: "16px" }}>📄</span>
                          <span style={{ fontSize: "12px", opacity: 0.9, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{file.name}</span>
                        </div>
                        <button type="button" onClick={() => setNewEventDocs(prev => prev.filter((_, i) => i !== idx))} style={{ background: "transparent", border: "none", color: "#ff8a80", fontSize: "12px", cursor: "pointer", paddingLeft: "10px", fontWeight: "bold" }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                
                <button type="button" onClick={() => eventDocInputRef.current?.click()} style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,0.08)", borderRadius: "12px", color: "var(--text-color)", border: "1px dashed var(--input-border)", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 500, cursor: "pointer" }}>
                  <span>📄</span> {newEventDocs.length > 0 ? t("addMoreDocs") : t("attachDoc")}
                </button>
              </div>

                    {/* ÚJ HANGOK SZAKASZ */}
              <div style={{ marginTop: "12px", marginBottom: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "6px" }}>{t("audioLabel")}</label>
                <input type="file" ref={eventAudioInputRef} accept="audio/*" hidden multiple onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const selected = Array.from(e.target.files);
                    setNewEventAudios(prev => [...prev, ...selected]);
                  }
                }} />

                {/* Új Hangjegyzetek függőleges listája lejátszóval */}
                {newEventAudios.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px", maxHeight: "150px", overflowY: "auto" }}>
                    {newEventAudios.map((file, idx) => {
                      const audioUrl = URL.createObjectURL(file);
                      return (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px", background: "rgba(255,255,255,0.05)", padding: "10px 12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "12px", opacity: 0.9, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", fontWeight: 500 }}>🎙️ {file.name}</span>
                            <button type="button" onClick={() => setNewEventAudios(prev => prev.filter((_, i) => i !== idx))} style={{ background: "transparent", border: "none", color: "#ff8a80", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                          </div>
                          <audio controls src={audioUrl} style={{ width: "100%", height: "30px" }} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Felvétel állapota */}
                {isRecording && recordingTarget === "event" && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "12px", background: "rgba(255, 82, 82, 0.15)", borderRadius: "14px", border: "1px solid rgba(255, 82, 82, 0.3)", marginBottom: "8px" }}>
                    <span style={{ color: "#ff5252", fontSize: "18px" }}>🔴</span>
                    <span style={{ fontSize: "14px", fontWeight: 600 }}>Hang rögzítése... {formatTime(recordingSeconds)}</span>
                    <button type="button" onClick={stopRecording} style={{ padding: "6px 12px", background: "#ff5252", border: "none", borderRadius: "8px", color: "white", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>{t("stopRecording")}</button>
                  </div>
                )}

                {!isRecording && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" onClick={() => startRecording("event")} style={{ flex: 1, padding: "10px", background: "rgba(255, 112, 67, 0.15)", borderRadius: "12px", color: "#ff7043", border: "1px dashed #ff7043", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 600, cursor: "pointer" }}>
                      <span>🎙️</span> Hangjegyzet
                    </button>
                    <button type="button" onClick={() => eventAudioInputRef.current?.click()} style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.08)", borderRadius: "12px", color: "var(--text-color)", border: "1px dashed var(--input-border)", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 500, cursor: "pointer" }}>
                      <span>📂</span> Hangfájl
                    </button>
                  </div>
                )}
              </div>


                  </div>
                )}
              </div>

                            {/* EMAIL SZEKCIÓ - összecsukható */}
              <div style={{ marginTop: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <button type="button" onClick={() => setShowEmailSection(!showEmailSection)} style={{ width: "100%", padding: "12px 16px", background: showEmailSection ? "rgba(255,112,67,0.15)" : "transparent", border: "none", color: showEmailSection ? "#ff7043" : "var(--text-color)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "all 0.2s", borderRadius: "16px" }}>
                  <span style={{ fontSize: "13.5px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📧</span> Email értesítés
                  </span>
                  <span style={{ fontSize: "12px", opacity: 0.6 }}>{showEmailSection ? "▲" : "▼"}</span>
                </button>
                {showEmailSection && (
                <div style={{ padding: "0 12px 12px" }}>
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ fontSize: "11.5px", opacity: 0.8, marginBottom: "4px", display: "block" }}>{t("recipientEmail")}</label>
                  <input type="email" value={customEmail} onChange={e => setCustomEmail(e.target.value)} placeholder={session?.user?.email || "Email cím..."} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", padding: "10px 12px", borderRadius: "14px", color: "white", outline: "none", fontSize: "14px", backdropFilter: "blur(10px)" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
                    <input type="checkbox" checked={emailNotifyNow} onChange={e => setEmailNotifyNow(e.target.checked)} style={{ accentColor: "#ff7043", width: "18px", height: "18px" }} />
                    Azonnali értesítő email
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
                    <input type="checkbox" checked={emailNotify1Day} onChange={e => setEmailNotify1Day(e.target.checked)} style={{ accentColor: "#ff7043", width: "18px", height: "18px" }} />
                    Emlékeztető 1 nappal előtte
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
                    <input type="checkbox" checked={emailNotifyCustom} onChange={e => setEmailNotifyCustom(e.target.checked)} style={{ accentColor: "#ff7043", width: "18px", height: "18px" }} />
                    Dátum és idő szerint
                  </label>
                  {emailNotifyCustom && (
                    <div style={{ marginTop: "4px", paddingLeft: "28px", width: "100%" }}>
                      <DatePicker
                        selected={customNotifyDateTime}
                        onChange={(date: Date | null) => setCustomNotifyDateTime(date)}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="yyyy. MM. dd. HH:mm"
                        placeholderText={t("dateTimePlaceholder")}
                        className="custom-datepicker"
                        fixedHeight
                      />
                    </div>
                  )}
                </div>
                </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
                {editingEventId && (
                  <button type="button" onClick={() => { resetForm(); setActiveTab(t("timelineTitle")); }} style={{ flex: 1, padding: "18px", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: "18px", color: "var(--text-color)", fontWeight: 600, fontSize: "17px" }}>{t("cancel")}</button>
                )}
                <button type="submit" disabled={isUploading} style={{ flex: 2, padding: "18px", background: "linear-gradient(135deg, #ffb74d, #ff7043)", border: "none", borderRadius: "18px", color: "white", fontWeight: 600, boxShadow: "0 6px 20px rgba(255, 112, 67, 0.4)", fontSize: "17px", opacity: isUploading ? 0.7 : 1 }}>
                  {isUploading ? t("uploading") : (editingEventId ? t("saveChanges") : t("save"))}
                </button>
              </div>
            </form>
          </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Naptár */}
              <div className="glass-card" style={{ padding: "20px", overflow: "hidden", width: "100%" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", textAlign: "center" }}>
                  📅 Események naptárban
                </h3>
                <DatePicker
                  inline
                  locale={lang === "hu" ? "hu" : "en"}
                  selected={newEventDate ? new Date(newEventDate) : new Date()}
                  onChange={(date: Date | null) => {
                    if (date) {
                      setNewEventDate(date.toISOString().split("T")[0]);
                      setAddViewMode("form"); // Vált form-ra
                    }
                  }}
                  calendarClassName="custom-calendar"
                  dayClassName={(date: Date) => {
                    const dateStr = date.toISOString().split("T")[0];
                    const hasEvent = events.some(e => e.event_date === dateStr);
                    const isSunday = date.getDay() === 0;
                    if (isSunday && hasEvent) return "has-event-day sunday-day";
                    if (isSunday) return "sunday-day";
                    if (hasEvent) return "has-event-day";
                    return "";
                  }}
                />
                <style>{`
                  .custom-calendar {
                    width: 100% !important;
                    max-width: 100% !important;
                    border: none !important;
                    background: transparent !important;
                    font-family: 'SF Pro Display', 'Inter', sans-serif !important;
                    overflow: hidden !important;
                  }
                  .react-datepicker__month-container {
                    width: 100% !important;
                    max-width: 100% !important;
                    float: none !important;
                  }
                  .react-datepicker__day-names,
                  .react-datepicker__week {
                    display: flex !important;
                    justify-content: space-between !important;
                    width: 100% !important;
                  }
                  .react-datepicker__header {
                    background: rgba(255,255,255,0.05) !important;
                    border: none !important;
                    padding: 12px !important;
                    border-radius: 12px !important;
                  }
                  .react-datepicker__current-month {
                    color: white !important;
                    font-weight: 700 !important;
                    font-size: 16px !important;
                    text-transform: capitalize !important;
                  }
                  .react-datepicker__day-name {
                    color: #ffffff !important;
                    font-weight: 700 !important;
                    width: calc((100% - 14px) / 7) !important;
                    max-width: 2.2rem !important;
                    line-height: 2rem !important;
                    font-size: 14px !important;
                    margin: 1px !important;
                  }
                  .react-datepicker__day {
                    color: #ffffff !important;
                    width: calc((100% - 14px) / 7) !important;
                    max-width: 2.2rem !important;
                    line-height: 2rem !important;
                    border-radius: 8px !important;
                    margin: 1px !important;
                    font-size: 14px !important;
                    font-weight: 500 !important;
                  }
                  .react-datepicker__week {
                    display: flex !important;
                    justify-content: space-between !important;
                  }
                  .react-datepicker__day:hover {
                    background: rgba(255,255,255,0.15) !important;
                  }
                  .react-datepicker__day--selected {
                    background: transparent !important;
                    font-weight: 500 !important;
                    border: none !important;
                  }
                  .react-datepicker__day--keyboard-selected {
                    background: transparent !important;
                  }
                  .react-datepicker__day--outside-month {
                    color: rgba(255,255,255,0.3) !important;
                  }
                  .has-event-day {
                    position: relative !important;
                  }
                  .has-event-day::after {
                    content: '' !important;
                    position: absolute !important;
                    bottom: 4px !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    width: 5px !important;
                    height: 5px !important;
                    background: #00BBFF !important;
                    border-radius: 50% !important;
                  }
                  .sunday-day {
                    color: #ff4444 !important;
                    font-weight: 600 !important;
                  }
                  .sunday-day.has-event-day {
                    color: #ff4444 !important;
                  }
                  .sunday-day.has-event-day::after {
                    background: #ff4444 !important;
                  }

                  .react-datepicker__navigation {
                    top: 12px !important;
                  }
                  .react-datepicker__navigation-icon::before {
                    border-color: white !important;
                  }
                `}</style>
              </div>

              {/* Események az adott napon */}
              {(() => {
                const selectedDateEvents = events.filter(e => e.event_date === newEventDate);
                if (selectedDateEvents.length === 0) return null;
                
                return (
                  <div className="glass-card" style={{ padding: "20px" }}>
                    <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
                      Események ezen a napon ({newEventDate})
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {selectedDateEvents.map(event => (
                        <div
                          key={event.id}
                          onClick={() => {
                            setScrollToEventId(event.id);
                            setActiveTab(t("timelineTitle"));
                          }}
                          style={{
                            padding: "12px",
                            background: "rgba(255,255,255,0.08)",
                            borderRadius: "12px",
                            cursor: "pointer",
                            border: "1px solid rgba(255,255,255,0.1)",
                            transition: "all 0.2s"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "20px" }}>
                              {event.category === 'event' ? '🎂' : event.category === 'utility' ? '⚡' : '🏔'}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: "14px" }}>{event.title}</div>
                              {event.description && (
                                <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "2px" }}>
                                  {event.description.substring(0, 50)}{event.description.length > 50 ? '...' : ''}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: "12px", opacity: 0.5 }}>→</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}


            </div>
          )}
        </div>
      )}

      {activeTab === "Profile" && (
        <div key="Profile" className="page-transition" style={{ height: "calc(100% - 65px)", overflowY: "auto", paddingBottom: "20px", scrollbarWidth: "none", overscrollBehavior: "contain" }}>
          <div style={{ padding: "0 4px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 650, marginBottom: "4px" }}>{t("profileTitle")}</h2>
            <p style={{ opacity: 0.75, fontSize: "15px" }}>{t("profileSubtitle")}</p>
          </div>

          <div className="glass-card" style={{ padding: "24px", borderRadius: "24px", display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
            {isEditingProfile ? (
              <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", width: "100%" }}>
                <input type="file" accept="image/*" ref={profileFileInputRef} hidden onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setEditProfileFile(e.target.files[0]);
                    setEditProfilePreview(URL.createObjectURL(e.target.files[0]));
                  }
                }} />
                
                <div onClick={() => profileFileInputRef.current?.click()} style={{ width: "80px", height: "80px", borderRadius: "50%", background: editProfilePreview ? "transparent" : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", cursor: "pointer", border: "2px dashed rgba(255,255,255,0.4)", overflow: "hidden" }}>
                  {editProfilePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editProfilePreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : "📷"}
                </div>
                <small style={{ opacity: 0.6 }}>{t("clickToChange")}</small>

                <input type="text" value={editProfileName} onChange={e => setEditProfileName(e.target.value)} placeholder={t("fullName")} style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px", borderRadius: "12px", color: "white", outline: "none", marginTop: "10px" }} />
                
                <input type="password" value={editProfilePassword} onChange={e => setEditProfilePassword(e.target.value)} placeholder={t("newPassword")} style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px", borderRadius: "12px", color: "white", outline: "none" }} />

                <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "10px" }}>
                  <button type="button" onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid var(--card-border)", borderRadius: "14px", color: "var(--text-color)", fontWeight: 600 }}>{t("cancel")}</button>
                  <button type="submit" disabled={isUpdatingProfile} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #ffb74d, #ff7043)", border: "none", borderRadius: "14px", color: "white", fontWeight: 600, opacity: isUpdatingProfile ? 0.7 : 1 }}>{isUpdatingProfile ? "Mentés..." : t("save")}</button>
                </div>
              </form>
            ) : (
              <>
                <div style={{ margin: "0 auto 16px", width: "80px", height: "80px", borderRadius: "50%", background: avatarUrl ? "transparent" : "linear-gradient(135deg, #ffb74d, #ff7043)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", boxShadow: "0 8px 24px rgba(255, 112, 67, 0.4)", overflow: "hidden" }}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : "👤"}
                </div>
                <h3 style={{ fontSize: "22px", fontWeight: 600, marginBottom: "4px" }}>{formattedName}</h3>
                <p style={{ fontSize: "14px", opacity: 0.7 }}>{session?.user?.email}</p>
                
                <button onClick={openEditProfile} style={{ marginTop: "18px", padding: "12px 24px", background: "var(--input-bg)", borderRadius: "16px", border: "1px solid var(--input-border)", color: "var(--text-color)", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                  Profil szerkesztése
                </button>
              </>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ fontSize: "13px", fontWeight: 700, opacity: 0.5, marginLeft: "12px", marginTop: "8px", letterSpacing: "1px" }}>{lang === "hu" ? "BEÁLLÍTÁSOK" : "SETTINGS"}</h4>
            
            <div className="glass-card" style={{ borderRadius: "24px", overflow: "hidden" }}>
              <div 
                onClick={async () => {
                  if ("Notification" in window) {
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                      playNotificationSound(true);
                      new Notification("LifeSync", {
                        body: "Értesítések sikeresen engedélyezve!",
                        icon: "/icon.png"
                      });
                    } else {
                      alert("Az értesítések blokkolva vannak. Engedélyezd őket a böngésző beállításaiban!");
                    }
                  } else {
                    alert("A böngésződ nem támogatja a push értesítéseket.");
                  }
                }} 
                style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>🔔</span>
                  <div style={{ textAlign: "left" }}>
                    <span style={{ fontSize: "15px", fontWeight: 500, display: "block" }}>Rendszer Értesítések</span>
                    <span style={{ fontSize: "11px", opacity: 0.5, display: "block", marginTop: "2px" }}>{lang === "hu" ? "Kattints az engedélyezéshez" : "Click to enable"}</span>
                  </div>
                </div>
                <div style={{ width: "40px", height: "24px", borderRadius: "12px", background: typeof window !== "undefined" && (window as any).Notification?.permission === "granted" ? "#66bb6a" : "#ff9800", position: "relative" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "white", position: "absolute", right: "2px", top: "2px" }}></div>
                </div>
              </div>

              <div 
                style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                  <span style={{ fontSize: "20px" }}>🔊</span>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <span style={{ fontSize: "15px", fontWeight: 500, display: "block" }}>{t("soundNotify")}</span>
                    <span style={{ fontSize: "11px", opacity: 0.5, display: "block", marginTop: "2px" }}>{lang === "hu" ? "Hangjelzés sikeres mentéseknél" : "Sound on successful saves"}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      playNotificationSound(true);
                    }} 
                    style={{ padding: "6px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "white", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Teszt ▶️
                  </button>
                  <div 
                    onClick={() => setSoundEnabled(!soundEnabled)} 
                    style={{ width: "40px", height: "24px", borderRadius: "12px", background: soundEnabled ? "#ff9800" : "rgba(120,120,120,0.3)", position: "relative", transition: "all 0.3s", cursor: "pointer" }}
                  >
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "white", position: "absolute", left: soundEnabled ? "auto" : "2px", right: soundEnabled ? "2px" : "auto", top: "2px", transition: "all 0.3s" }}></div>
                  </div>
                </div>
              </div>
              <div onClick={toggleTheme} style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>🌙</span>
                  <span style={{ fontSize: "15px", fontWeight: 500 }}>{t("darkMode")}</span>
                </div>
                <div style={{ width: "40px", height: "24px", borderRadius: "12px", background: isDarkMode ? "#ff9800" : "rgba(120,120,120,0.3)", position: "relative", transition: "all 0.3s" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "white", position: "absolute", left: isDarkMode ? "auto" : "2px", right: isDarkMode ? "2px" : "auto", top: "2px", transition: "all 0.3s" }}></div>
                </div>
              </div>

              
              <div 
                style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
                  <span style={{ fontSize: "20px" }}>📧</span>
                  <div>
                    <span style={{ fontSize: "15px", fontWeight: 500, display: "block" }}>{t("savedLogin")}</span>
                    <span style={{ fontSize: "11px", opacity: 0.5, display: "block", marginTop: "2px" }}>
                      {typeof window !== "undefined" && localStorage.getItem("remembered_login_email") 
                        ? localStorage.getItem("remembered_login_email") 
                        : t("notSaved")}
                    </span>
                  </div>
                </div>
                {typeof window !== "undefined" && localStorage.getItem("remembered_login_email") && (
                  <button 
                    onClick={() => {
                      localStorage.removeItem("remembered_login_email");
                      setEmail("");
                      showToast("Bejelentkezési email törölve a memóriából!", 'info');
                    }} 
                    style={{ padding: "8px 12px", background: "rgba(255, 1, 1, 0.2)", border: "1px solid rgba(255, 1, 1, 0.5)", borderRadius: "12px", color: "#FF0101", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Törlés 🗑️
                  </button>
                )}
              </div>

              <div 
                style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
                  <span style={{ fontSize: "20px" }}>✉️</span>
                  <div>
                    <span style={{ fontSize: "15px", fontWeight: 500, display: "block" }}>{t("savedRecipient")}</span>
                    <span style={{ fontSize: "11px", opacity: 0.5, display: "block", marginTop: "2px" }}>
                      {typeof window !== "undefined" && localStorage.getItem("remembered_custom_email") 
                        ? localStorage.getItem("remembered_custom_email") 
                        : t("notSaved")}
                    </span>
                  </div>
                </div>
                {typeof window !== "undefined" && localStorage.getItem("remembered_custom_email") && (
                  <button 
                    onClick={() => {
                      localStorage.removeItem("remembered_custom_email");
                      setCustomEmail("");
                      showToast("Címzett email törölve a memóriából!", 'info');
                    }} 
                    style={{ padding: "8px 12px", background: "rgba(255, 82, 82, 0.15)", border: "1px solid rgba(255, 82, 82, 0.3)", borderRadius: "12px", color: "#ff5252", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Törlés 🗑️
                  </button>
                )}
              </div>

              <div onClick={() => supabase.auth.signOut()} style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>🚪</span>
                  <span style={{ fontSize: "15px", fontWeight: 500, color: "#BA00FF" }}>{t("signOutLabel")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Vault" && (
        <div key="Vault" ref={vaultScrollRef} className="page-transition" style={{ height: "calc(100% - 120px)", overflowY: "auto", paddingBottom: "20px", scrollbarWidth: "none", overscrollBehavior: "contain" }}>
          {activeVaultFolder ? (
            // FOLDER DETAIL VIEW
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <button onClick={() => setActiveVaultFolder(null)} style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", padding: "10px 16px", borderRadius: "14px", color: "var(--text-color)", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>←</span> Vissza
                </button>
                <button onClick={() => setIsEditingVaultFolder(!isEditingVaultFolder)} style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", padding: "10px 16px", borderRadius: "14px", color: "var(--text-color)", fontWeight: 600 }}>
                  {isEditingVaultFolder ? t("cancel") : "Beállítások"}
                </button>
              </div>

              {isEditingVaultFolder ? (
                <div className="glass-card" style={{ padding: "20px", borderRadius: "24px", display: "flex", flexDirection: "column", gap: "12px", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 600 }}>{t("projectSettings")}</h3>
                  <form onSubmit={handleUpdateVaultFolder} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <input autoFocus required type="text" value={editVaultFolderName} onChange={e => setEditVaultFolderName(e.target.value)} placeholder={t("projectName")} style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px", borderRadius: "12px", color: "white", outline: "none", fontSize: "15px" }} />
                    <input type="text" value={editVaultFolderDescription} onChange={e => setEditVaultFolderDescription(e.target.value)} placeholder={t("projectDesc")} style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px", borderRadius: "12px", color: "white", outline: "none", fontSize: "15px" }} />
                    
                    <div style={{ display: "flex", gap: "8px", justifyContent: "space-around", alignItems: "center", background: "rgba(0,0,0,0.1)", padding: "4px", borderRadius: "14px", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                       {['📁', '📄', '💼', '⚡', '🏠', '🚗', '🎂', '🔑'].map(icon => (
                         <div key={icon} onClick={() => setEditVaultFolderIcon(icon)} style={{ padding: "8px", borderRadius: "10px", background: editVaultFolderIcon === icon ? "rgba(255,255,255,0.15)" : "transparent", cursor: "pointer", fontSize: "20px", transition: "all 0.2s", flexShrink: 0 }}>{icon}</div>
                       ))}
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                      <button type="button" onClick={handleDeleteVaultFolder} style={{ flex: 1, padding: "14px", background: "rgba(255,1,1,0.2)", border: "1px solid rgba(255,1,1,0.5)", borderRadius: "14px", color: "#FF0101", fontWeight: 600, fontSize: "15px" }}>{t("deleteProject")}</button>
                      <button type="submit" style={{ flex: 1, padding: "14px", background: "linear-gradient(135deg, #ffb74d, #ff7043)", border: "none", borderRadius: "14px", color: "white", fontWeight: 600, fontSize: "15px", boxShadow: "0 4px 15px rgba(255, 112, 67, 0.3)" }}>Mentés</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="glass-card" style={{ padding: "24px", borderRadius: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: `linear-gradient(135deg, ${activeVaultFolder.color_hex || '#ffb74d'}cc, ${activeVaultFolder.color_hex || '#ff7043'})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", boxShadow: `0 8px 20px ${activeVaultFolder.color_hex || '#ff7043'}50` }}>
                    {activeVaultFolder.icon || '📁'}
                  </div>
                  <div>
                    <h2 style={{ fontSize: "24px", fontWeight: 700 }}>{activeVaultFolder.name}</h2>
                    {activeVaultFolder.description && (
                      <p style={{ opacity: 0.8, fontSize: "13px", marginTop: "3px", fontStyle: "italic" }}>{activeVaultFolder.description}</p>
                    )}
                    <p style={{ opacity: 0.7, fontSize: "13px", marginTop: "4px" }}>{vaultFiles.length} fájl</p>
                  </div>
                </div>
              )}

              <div style={{ marginTop: "10px" }}>
                <input type="file" ref={vaultFileInputRef} hidden multiple onChange={handleUploadVaultFile} />
                
                {isRecording && recordingTarget === "folder" ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "14px 16px", background: "rgba(255, 82, 82, 0.15)", borderRadius: "18px", border: "1px solid rgba(255, 82, 82, 0.3)" }}>
                    <span style={{ color: "#ff5252", fontSize: "18px" }}>🔴</span>
                    <span style={{ fontSize: "15px", fontWeight: 600, flex: 1 }}>Rögzítés... {formatTime(recordingSeconds)}</span>
                    <button onClick={stopRecording} style={{ padding: "8px 16px", background: "#ff5252", border: "none", borderRadius: "12px", color: "white", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>{t("stopRecording")}</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => vaultFileInputRef.current?.click()} disabled={isUploadingVaultFile} style={{ flex: 1, padding: "14px", background: "var(--input-bg)", border: "2px dashed var(--input-border)", borderRadius: "18px", color: "var(--text-color)", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", fontSize: "14px", opacity: isUploadingVaultFile ? 0.6 : 1, cursor: "pointer" }}>
                      <span style={{ fontSize: "18px" }}>{isUploadingVaultFile ? '⏳' : '📤'}</span> 
                      {isUploadingVaultFile ? 'Feltöltés...' : 'Fájl feltöltése'}
                    </button>
                    <button onClick={() => startRecording("folder")} disabled={isUploadingVaultFile} style={{ flex: 1, padding: "14px", background: "rgba(255, 112, 67, 0.15)", border: "1px dashed #ff7043", borderRadius: "18px", color: "#ff7043", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
                      <span style={{ fontSize: "18px" }}>🎙️</span> Hangjegyzet
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                {vaultFiles.map(file => (
                  <div key={file.id} className="glass-card" style={{ padding: "16px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", overflow: "hidden", flexShrink: 0 }}>
                      {file.file_type?.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={file.file_url} alt="Kép" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : file.file_type?.startsWith('audio/') ? (
                        '🎙️'
                      ) : (
                        '📄'
                      )}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-color)", textDecoration: "none" }}>
                        <h4 style={{ fontSize: "15px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</h4>
                      </a>
                      <p style={{ fontSize: "12px", opacity: 0.5, marginBottom: file.file_type?.startsWith('audio/') ? "6px" : "0" }}>{new Date(file.created_at).toLocaleDateString()}</p>
                      {file.file_type?.startsWith('audio/') && (
                        <audio controls src={file.file_url} style={{ width: "100%", height: "32px", outline: "none" }} />
                      )}
                    </div>
                    <button onClick={() => handleDeleteVaultFile(file.id)} style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,0,0,0.1)", border: "none", color: "#ff8a80", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // FOLDER LIST VIEW
            <>
              <div style={{ padding: "0 4px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "26px", fontWeight: 650, marginBottom: "4px" }}>{t("vaultTitle")}</h2>
                  <p style={{ opacity: 0.75, fontSize: "14px" }}>{t("vaultSubtitle")}</p>
                </div>
                <div style={{ width: "42px", height: "42px", borderRadius: "14px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }}>🗂️</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                 {vaultFolders.length === 0 && (
                    <div style={{ gridColumn: "1 / span 2", padding: "10px" }}>
                      <p style={{ opacity: 0.6, fontSize: "14px" }}>{t("noFolders")}</p>
                    </div>
                 )}
                
                {vaultFolders.map((folder) => (
                  <div key={folder.id} onClick={() => handleOpenFolder(folder)} className="glass-card" style={{ padding: "20px", borderRadius: "24px", display: "flex", flexDirection: "column", gap: "16px", position: "relative", cursor: "pointer", transition: "transform 0.2s" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: `linear-gradient(135deg, ${folder.color_hex || '#ffb74d'}cc, ${folder.color_hex || '#ff7043'})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", boxShadow: `0 8px 20px ${folder.color_hex || '#ff7043'}50` }}>
                      {folder.icon || '📁'}
                    </div>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.3, marginBottom: "4px" }}>{folder.name}</h3>
                      <p style={{ fontSize: "13px", opacity: 0.7 }}>{t("open")}</p>
                    </div>
                  </div>
                ))}
                
                {/* Új projekt hozzáadása gomb */}
                {isCreatingFolder ? (
                  <div className="glass-card" style={{ gridColumn: "1 / span 2", padding: "20px", borderRadius: "24px", display: "flex", flexDirection: "column", gap: "12px", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600 }}>{t("newProject")}</h3>
                    <form onSubmit={handleCreateFolder} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <input required type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder={t("projectNamePlaceholder")} style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px", borderRadius: "12px", color: "white", outline: "none", fontSize: "15px" }} />
                      <input type="text" value={newFolderDescription} onChange={e => setNewFolderDescription(e.target.value)} placeholder={t("projectDescPlaceholder")} style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px", borderRadius: "12px", color: "white", outline: "none", fontSize: "15px" }} />
                      
                      <div style={{ display: "flex", gap: "8px", justifyContent: "space-around", alignItems: "center", background: "rgba(0,0,0,0.1)", padding: "4px", borderRadius: "14px", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                         {['📁', '📄', '💼', '⚡', '🏠', '🚗', '🎂', '🔑'].map(icon => (
                           <div key={icon} onClick={() => setNewFolderIcon(icon)} style={{ padding: "8px", borderRadius: "10px", background: newFolderIcon === icon ? "rgba(255,255,255,0.15)" : "transparent", cursor: "pointer", fontSize: "20px", transition: "all 0.2s", flexShrink: 0 }}>{icon}</div>
                         ))}
                      </div>

                      {/* KÉPEK SZAKASZ */}
                      <div style={{ marginTop: "4px" }}>
                        <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "6px" }}>{t("imagesLabel")}</label>
                        <input type="file" ref={folderImageInputRef} accept="image/*" hidden multiple onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const selected = Array.from(e.target.files);
                            setNewFolderImages(prev => [...prev, ...selected]);
                          }
                        }} />
                        
                        {/* Képek vízszintes görgethető előnézete */}
                        {newFolderImages.length > 0 && (
                          <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px", marginBottom: "8px", scrollbarWidth: "none" }}>
                            {newFolderImages.map((file, idx) => {
                              const imgUrl = URL.createObjectURL(file);
                              return (
                                <div key={idx} style={{ position: "relative", width: "70px", height: "70px", flexShrink: 0, borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.2)" }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={imgUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  <button type="button" onClick={() => setNewFolderImages(prev => prev.filter((_, i) => i !== idx))} style={{ position: "absolute", top: "2px", right: "2px", width: "18px", height: "18px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "white", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        <button type="button" onClick={() => folderImageInputRef.current?.click()} style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,0.08)", borderRadius: "12px", color: "var(--text-color)", border: "1px dashed var(--input-border)", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 500, cursor: "pointer" }}>
                          <span>📸</span> {newFolderImages.length > 0 ? t("addMoreImages") : t("attachImage")}
                        </button>
                      </div>

                      {/* DOKUMENTUMOK SZAKASZ */}
                      <div style={{ marginTop: "8px" }}>
                        <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "6px" }}>{t("docsLabel")}</label>
                        <input type="file" ref={folderDocInputRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" hidden multiple onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const selected = Array.from(e.target.files);
                            setNewFolderDocs(prev => [...prev, ...selected]);
                          }
                        }} />

                        {/* Dokumentumok függőleges listája */}
                        {newFolderDocs.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px", maxHeight: "100px", overflowY: "auto", paddingRight: "2px" }}>
                            {newFolderDocs.map((file, idx) => (
                              <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", flex: 1 }}>
                                  <span style={{ fontSize: "16px" }}>📄</span>
                                  <span style={{ fontSize: "12px", opacity: 0.9, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{file.name}</span>
                                </div>
                                <button type="button" onClick={() => setNewFolderDocs(prev => prev.filter((_, i) => i !== idx))} style={{ background: "transparent", border: "none", color: "#ff8a80", fontSize: "12px", cursor: "pointer", paddingLeft: "10px", fontWeight: "bold" }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <button type="button" onClick={() => folderDocInputRef.current?.click()} style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,0.08)", borderRadius: "12px", color: "var(--text-color)", border: "1px dashed var(--input-border)", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 500, cursor: "pointer" }}>
                          <span>📄</span> {newFolderDocs.length > 0 ? t("addMoreDocs") : t("attachDoc")}
                        </button>
                      </div>

                      {/* HANGOK SZAKASZ */}
                      <div style={{ marginTop: "12px", marginBottom: "4px" }}>
                        <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "6px" }}>{t("audioLabel")}</label>
                        <input type="file" ref={folderAudioInputRef} accept="audio/*" hidden multiple onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const selected = Array.from(e.target.files);
                            setNewFolderAudios(prev => [...prev, ...selected]);
                          }
                        }} />

                        {/* Új Hangjegyzetek listája */}
                        {newFolderAudios.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px", maxHeight: "150px", overflowY: "auto" }}>
                            {newFolderAudios.map((file, idx) => {
                              const audioUrl = URL.createObjectURL(file);
                              return (
                                <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px", background: "rgba(255,255,255,0.05)", padding: "10px 12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: "12px", opacity: 0.9, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", fontWeight: 500 }}>🎙️ {file.name}</span>
                                    <button type="button" onClick={() => setNewFolderAudios(prev => prev.filter((_, i) => i !== idx))} style={{ background: "transparent", border: "none", color: "#ff8a80", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                                  </div>
                                  <audio controls src={audioUrl} style={{ width: "100%", height: "30px" }} />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Hangfelvétel állapota */}
                        {isRecording && recordingTarget === "folder" && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "12px", background: "rgba(255, 82, 82, 0.15)", borderRadius: "14px", border: "1px solid rgba(255, 82, 82, 0.3)", marginBottom: "8px" }}>
                            <span style={{ color: "#ff5252", fontSize: "18px" }}>🔴</span>
                            <span style={{ fontSize: "14px", fontWeight: 600 }}>Hang rögzítése... {formatTime(recordingSeconds)}</span>
                            <button type="button" onClick={stopRecording} style={{ padding: "6px 12px", background: "#ff5252", border: "none", borderRadius: "8px", color: "white", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>{t("stopRecording")}</button>
                          </div>
                        )}

                        {!isRecording && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button type="button" onClick={() => startRecording("folder")} style={{ flex: 1, padding: "10px", background: "rgba(255, 112, 67, 0.15)", borderRadius: "12px", color: "#ff7043", border: "1px dashed #ff7043", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 600, cursor: "pointer" }}>
                              <span>🎙️</span> Hangjegyzet
                            </button>
                            <button type="button" onClick={() => folderAudioInputRef.current?.click()} style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.08)", borderRadius: "12px", color: "var(--text-color)", border: "1px dashed var(--input-border)", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 500, cursor: "pointer" }}>
                              <span>📂</span> Hangfájl
                            </button>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                        <button type="button" onClick={() => { setIsCreatingFolder(false); setNewFolderImages([]); setNewFolderDocs([]); setNewFolderAudios([]); setTimeout(() => { if (vaultScrollRef.current) vaultScrollRef.current.scrollTop = 0; }, 50); }} style={{ flex: 1, padding: "14px", background: "transparent", border: "1px solid var(--card-border)", borderRadius: "14px", color: "var(--text-color)", fontWeight: 600, fontSize: "15px" }}>{t("cancel")}</button>
                        <button type="submit" style={{ flex: 1, padding: "14px", background: "linear-gradient(135deg, #ffb74d, #ff7043)", border: "none", borderRadius: "14px", color: "white", fontWeight: 600, fontSize: "15px", boxShadow: "0 4px 15px rgba(255, 112, 67, 0.3)" }}>Mentés és Megnyitás</button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="glass-card" onClick={() => { setIsCreatingFolder(true); setTimeout(() => { if (vaultScrollRef.current) vaultScrollRef.current.scrollTop = 0; }, 50); }} style={{ padding: "20px", borderRadius: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: "10px", border: "1px dashed rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", cursor: "pointer", transition: "all 0.2s" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                        +
                      </div>
                      <h3 style={{ fontSize: "14px", fontWeight: 500, opacity: 0.8 }}>Új projekt</h3>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}



      {/* Kereső Overlay */}
      {isSearchOpen && (
        <div className="page-transition" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: "rgba(23, 36, 54, 0.95)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", display: "flex", flexDirection: "column", padding: "40px 22px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 650 }}>{t("searchTitle")}</h2>
            <button onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", width: "42px", height: "42px", borderRadius: "14px", color: "var(--text-color)", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          
          <input 
            autoFocus 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder={t("searchPlaceholder")}
            style={{ width: "100%", padding: "16px", borderRadius: "16px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: "16px", outline: "none", marginBottom: "24px" }} 
          />
          
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "20px", scrollbarWidth: "none", overscrollBehavior: "contain" }}>
            {searchQuery.length >= 2 ? (
              <>
                {/* Timeline Eredmények */}
                {(() => {
                  const filteredEvents = events.filter(e => (e.title?.toLowerCase().includes(searchQuery.toLowerCase())) || (e.description?.toLowerCase().includes(searchQuery.toLowerCase())));
                  return filteredEvents.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: "13px", fontWeight: 700, opacity: 0.5, marginBottom: "12px", letterSpacing: "1px" }}>ESEMÉNYEK ({filteredEvents.length})</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {filteredEvents.map(event => (
                          <div key={event.id} onClick={() => { setIsSearchOpen(false); setScrollToEventId(event.id); setActiveTab(t("timelineTitle")); }} className="glass-card" style={{ padding: "14px", borderRadius: "16px", cursor: "pointer" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                                {event.category === 'photo' ? '💭' : event.category === 'utility' ? '⚡' : '📅'}
                              </div>
                              <div>
                                <h5 style={{ fontSize: "15px", fontWeight: 600 }}>{event.title}</h5>
                                <p style={{ fontSize: "12px", opacity: 0.6 }}>{new Date(event.event_date).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Vault Mappák Eredmények */}
                {(() => {
                  const filteredFolders = vaultFolders.filter(f => f.name?.toLowerCase().includes(searchQuery.toLowerCase()));
                  return filteredFolders.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: "13px", fontWeight: 700, opacity: 0.5, marginBottom: "12px", letterSpacing: "1px" }}>PROJEKTEK ({filteredFolders.length})</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {filteredFolders.map(folder => (
                          <div key={folder.id} onClick={() => { setIsSearchOpen(false); setActiveTab("Vault"); handleOpenFolder(folder); }} className="glass-card" style={{ padding: "14px", borderRadius: "16px", cursor: "pointer" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `linear-gradient(135deg, ${folder.color_hex || '#ffb74d'}cc, ${folder.color_hex || '#ff7043'})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                                {folder.icon || '📁'}
                              </div>
                              <h5 style={{ fontSize: "15px", fontWeight: 600 }}>{folder.name}</h5>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Vault Fájlok Eredmények */}
                {(() => {
                  const filteredFiles = allVaultFiles.filter(f => f.name?.toLowerCase().includes(searchQuery.toLowerCase()));
                  return filteredFiles.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: "13px", fontWeight: 700, opacity: 0.5, marginBottom: "12px", letterSpacing: "1px" }}>PROJEKT FÁJLOK ({filteredFiles.length})</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {filteredFiles.map(file => {
                          const parentFolder = vaultFolders.find(f => f.id === file.folder_id);
                          return (
                            <a key={file.id} href={file.file_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "var(--text-color)" }}>
                              <div className="glass-card" style={{ padding: "14px", borderRadius: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                                  {file.file_type?.startsWith('image/') ? '🖼️' : '📄'}
                                </div>
                                <div style={{ overflow: "hidden" }}>
                                  <h5 style={{ fontSize: "15px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</h5>
                                  <p style={{ fontSize: "12px", opacity: 0.6 }}>{parentFolder ? `${parentFolder.icon} ${parentFolder.name}` : 'Ismeretlen projekt'}</p>
                                </div>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Nincs találat */}
                {events.filter(e => (e.title?.toLowerCase().includes(searchQuery.toLowerCase())) || (e.description?.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 &&
                 vaultFolders.filter(f => f.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 &&
                 allVaultFiles.filter(f => f.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div style={{ textAlign: "center", marginTop: "40px", opacity: 0.6 }}>
                    <div style={{ fontSize: "40px", marginBottom: "10px" }}>🔍</div>
                    <p>Nincs találat erre: &quot;{searchQuery}&quot;</p>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", marginTop: "40px", opacity: 0.5 }}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>⌨️</div>
                <p>{t("searchMin")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Törlés Megerősítése Modal */}
      {eventToDeleteId && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="glass-card" style={{ padding: "24px", borderRadius: "20px", textAlign: "center", maxWidth: "320px", width: "100%", animation: "fade-in 0.2s ease-out" }}>
            {events.find(e => e.id === eventToDeleteId)?.recurring_type && !deleteMode ? (
              <>
                <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔁</div>
                <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>Ismétlődő esemény</h3>
                <p style={{ opacity: 0.8, marginBottom: "24px", fontSize: "14px", lineHeight: 1.4 }}>{t("recurringDeleteText")}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button onClick={() => { setDeleteMode("single"); confirmDelete(); }} style={{ padding: "14px", borderRadius: "14px", background: "#ff6b6b", border: "none", color: "white", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>{t("yesDelete")}</button>
                  <button onClick={() => { setEventToDeleteId(null); setDeleteMode(null); }} style={{ padding: "12px", borderRadius: "14px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "white", cursor: "pointer", fontSize: "14px" }}>Mégsem</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
                <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>{t("deleteConfirm")}</h3>
                <p style={{ opacity: 0.8, marginBottom: "24px", fontSize: "14px", lineHeight: 1.4 }}>{t("deleteConfirmText")}</p>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => { setEventToDeleteId(null); setDeleteMode(null); }} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "rgba(255,255,255,0.1)", border: "none", color: "white", fontWeight: 600, cursor: "pointer" }}>Mégsem</button>
                  <button onClick={confirmDelete} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "#ff6b6b", border: "none", color: "white", fontWeight: 600, cursor: "pointer" }}>Törlés</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Összes törlése megerősítés */}
      {showDeleteAllConfirm && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="glass-card" style={{ padding: "24px", borderRadius: "20px", textAlign: "center", maxWidth: "320px", width: "100%" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🗑️</div>
            <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>{t("deleteAllConfirm")}</h3>
            <p style={{ opacity: 0.8, marginBottom: "24px", fontSize: "14px", lineHeight: 1.4 }}>{t("deleteAllText")}</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowDeleteAllConfirm(false)} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "rgba(255,255,255,0.1)", border: "none", color: "white", fontWeight: 600, cursor: "pointer" }}>Mégsem</button>
              <button onClick={handleDeleteAll} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "#ff6b6b", border: "none", color: "white", fontWeight: 600, cursor: "pointer" }}>Törlés</button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "32px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 24px",
          borderRadius: "20px",
          background: toast.type === 'success' ? "rgba(16, 185, 129, 0.2)" : toast.type === 'error' ? "rgba(244, 63, 94, 0.2)" : "rgba(245, 158, 11, 0.2)",
          color: toast.type === 'success' ? "#a7f3d0" : toast.type === 'error' ? "#fecdd3" : "#fef3c7",
          border: toast.type === 'success' ? "1px solid rgba(16, 185, 129, 0.3)" : toast.type === 'error' ? "1px solid rgba(244, 63, 94, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          fontSize: "15px",
          fontWeight: 600,
          whiteSpace: "nowrap",
          animation: "slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          pointerEvents: "none"
        }}>
          <span style={{ fontSize: "18px" }}>{toast.type === 'success' ? "✨" : toast.type === 'error' ? "⚠️" : "ℹ️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ═══ DRAWER OLDALSÁV ═══ */}

      {/* Backdrop */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          style={{
            position: "absolute", inset: 0, zIndex: 200,
            background: "rgba(10,16,32,0.45)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            animation: "fadeInBackdrop 0.25s ease forwards"
          }}
        />
      )}

      {/* Drawer panel – 280px, 100vh, border-radius 0 24px 24px 0 */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, bottom: 0,
        width: "280px",
        zIndex: 201,
        background: "rgba(72,84,110,0.52)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderRadius: "0 24px 24px 0",
        border: "1px solid rgba(255,255,255,0.13)",
        boxShadow: isDrawerOpen ? "18px 0 45px rgba(0,0,0,0.3), inset -1px 0 1px rgba(255,255,255,0.08)" : "none",
        display: "flex", flexDirection: "column",
        transform: isDrawerOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.35s ease",
        overflow: "hidden",
        overflowY: "auto",
        scrollbarWidth: "none",
      }}>

        {/* ── FEJLÉC 72px ── */}
        <div style={{
          height: "72px", flexShrink: 0,
          padding: "0 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src="/lifesync-icon.png" alt="Logo"
              style={{ width: "42px", height: "42px", borderRadius: "0", objectFit: "contain", background: "transparent" }} />
            <div>
              <div style={{
                fontSize: "24px", fontWeight: 700, lineHeight: 1.1,
                background: "linear-gradient(90deg, #B8E7FF 0%, #6AB7FF 42%, #7E7BFF 72%, #9B7BFF 100%)",
                WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent"
              }}>LifeSync</div>
              <div style={{ fontSize: "11px", color: "rgba(244,247,251,0.55)", marginTop: "2px" }}>
                Memories that matter.
              </div>
            </div>
          </div>
          <button onClick={() => setIsDrawerOpen(false)} style={{
            width: "32px", height: "32px", borderRadius: "10px",
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
            color: "#F4F7FB", fontSize: "15px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>✕</button>
        </div>

        {/* ── MENÜ LISTA ── */}
        <nav style={{ padding: "4px 12px 0", display: "flex", flexDirection: "column", gap: "2px" }}>
          {([
            { tab: "Home",     label: t("home"),           active: activeTab === "Home",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.8L12 3l9 7.8V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.2z"/><path d="M9 21V12h6v9"/></svg> },
            { tab: "Timeline", label: t("timelineTitle"), active: activeTab === "Timeline",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg> },
            { tab: "Add",      label: t("memories"),      active: activeTab === "Add",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
            { tab: "",         label: t("favorites"),     active: false, disabled: true,
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
            { tab: "Vault",    label: t("vault"),         active: activeTab === "Vault",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> },
            { tab: "",         label: t("shared"),        active: false, disabled: true,
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            { tab: "Profile",  label: t("profile"),       active: activeTab === "Profile",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
          ] as Array<{tab:string,label:string,active:boolean,disabled?:boolean,icon:React.ReactNode}>).map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (!item.disabled && item.tab) {
                  setActiveTab(item.tab);
                  setIsDrawerOpen(false);
                }
              }}
              style={{
                height: "52px", flexShrink: 0,
                display: "flex", alignItems: "center", gap: "14px",
                padding: "0 18px",
                borderRadius: "16px",
                border: item.active ? "1px solid rgba(180,190,255,0.28)" : "1px solid transparent",
                background: item.active
                  ? "linear-gradient(90deg, rgba(142,139,255,0.42) 0%, rgba(106,120,255,0.24) 100%)"
                  : "transparent",
                color: item.active ? "#FFFFFF" : item.disabled ? "rgba(244,247,251,0.35)" : "rgba(244,247,251,0.72)",
                cursor: item.disabled ? "default" : "pointer",
                width: "100%", textAlign: "left",
                transition: "all 0.18s ease",
              }}
            >
              <span style={{
                width: "22px", height: "22px", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: item.active ? "#FFFFFF" : item.disabled ? "rgba(244,247,251,0.3)" : "rgba(244,247,251,0.72)"
              }}>{item.icon}</span>
              <span style={{ fontSize: "16px", fontWeight: item.active ? 600 : 500 }}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* ── ÚJ MEMÓRIA GOMB 52px ── */}
        <div style={{ padding: "14px 12px 0" }}>
          <button
            onClick={() => { setActiveTab("Add"); setIsDrawerOpen(false); }}
            style={{
              height: "52px", width: "100%",
              borderRadius: "18px", border: "none",
              background: "linear-gradient(90deg, #9B87FF 0%, #6B78FF 100%)",
              boxShadow: "0 10px 28px rgba(106,120,255,0.34), inset 0 1px 1px rgba(255,255,255,0.28)",
              color: "#FFFFFF", fontSize: "16px", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              cursor: "pointer",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>{t("newMemory")}</span>
          </button>
        </div>

        {/* ── ELVÁLASZTÓ ── */}
        <div style={{ margin: "12px 20px", height: "1px", background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />

        {/* ── BEÁLLÍTÁSOK 52px ── */}
        <div style={{ padding: "0 12px", flexShrink: 0 }}>
          <button
            onClick={() => { setActiveTab("Profile"); setIsDrawerOpen(false); }}
            style={{
              height: "52px", width: "100%",
              display: "flex", alignItems: "center", gap: "14px",
              padding: "0 18px", borderRadius: "16px",
              border: "1px solid transparent", background: "transparent",
              color: "rgba(244,247,251,0.72)",
              cursor: "pointer", textAlign: "left",
              fontSize: "16px", fontWeight: 500,
              transition: "background 0.18s"
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>{t("settings")}</span>
          </button>
        </div>

        {/* ── NYELV VÁLTÓ ── */}
        <div style={{ padding: "0 12px", flexShrink: 0 }}>
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            style={{
              height: "52px", width: "100%",
              display: "flex", alignItems: "center", gap: "14px",
              padding: "0 18px", borderRadius: "16px",
              border: isLangOpen ? "1px solid rgba(180,190,255,0.28)" : "1px solid transparent",
              background: isLangOpen ? "rgba(126,123,255,0.12)" : "transparent",
              color: "rgba(244,247,251,0.72)",
              cursor: "pointer", textAlign: "left",
              fontSize: "16px", fontWeight: 500,
              transition: "all 0.18s"
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span style={{ flex: 1 }}>{t("language")}</span>
            <span style={{
              fontSize: "12px", opacity: 0.6,
              transform: isLangOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s"
            }}>▼</span>
          </button>

          {/* Dropdown */}
          {isLangOpen && (
            <div style={{
              margin: "4px 8px 0",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              overflow: "hidden",
            }}>
              {/* Magyar */}
              <button
                onClick={() => { setLang("hu"); localStorage.setItem("lang", "hu"); setIsLangOpen(false); }}
                style={{
                  width: "100%", height: "48px",
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "0 16px",
                  background: lang === "hu" ? "rgba(126,123,255,0.18)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  color: lang === "hu" ? "#a9a6ff" : "rgba(244,247,251,0.65)",
                  fontSize: "15px", fontWeight: lang === "hu" ? 600 : 400,
                  cursor: "pointer", textAlign: "left", transition: "background 0.15s"
                }}
              >
                <span style={{ flex: 1 }}>{lang === "hu" ? "Magyar" : "Hungarian"}</span>
                {/* Magyar zászló SVG */}
                <svg width="28" height="20" viewBox="0 0 28 20" style={{ borderRadius: "4px", flexShrink: 0 }}>
                  <rect width="28" height="7" y="0" fill="#CE2939"/>
                  <rect width="28" height="6" y="7" fill="#FFFFFF"/>
                  <rect width="28" height="7" y="13" fill="#477050"/>
                </svg>
                {lang === "hu" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: "4px" }}><polyline points="20 6 9 17 4 12"/></svg>}
              </button>

              {/* Angol */}
              <button
                onClick={() => { setLang("en"); localStorage.setItem("lang", "en"); setIsLangOpen(false); }}
                style={{
                  width: "100%", height: "48px",
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "0 16px",
                  background: lang === "en" ? "rgba(126,123,255,0.18)" : "transparent",
                  border: "none", borderBottom: "none",
                  color: lang === "en" ? "#a9a6ff" : "rgba(244,247,251,0.65)",
                  fontSize: "15px", fontWeight: lang === "en" ? 600 : 400,
                  cursor: "pointer", textAlign: "left", transition: "background 0.15s"
                }}
              >
                <span style={{ flex: 1 }}>{lang === "hu" ? "Angol" : "English"}</span>
                {/* USA zászló SVG */}
                <svg width="28" height="20" viewBox="0 0 28 20" style={{ borderRadius: "4px", flexShrink: 0 }}>
                  <rect width="28" height="20" fill="#B22234"/>
                  <rect width="28" height="1.54" y="1.54" fill="#FFFFFF"/>
                  <rect width="28" height="1.54" y="4.62" fill="#FFFFFF"/>
                  <rect width="28" height="1.54" y="7.69" fill="#FFFFFF"/>
                  <rect width="28" height="1.54" y="10.77" fill="#FFFFFF"/>
                  <rect width="28" height="1.54" y="13.85" fill="#FFFFFF"/>
                  <rect width="28" height="1.54" y="16.92" fill="#FFFFFF"/>
                  <rect width="12" height="10" fill="#3C3B6E"/>
                  <g fill="#FFFFFF">
                    <circle cx="2" cy="1.5" r="0.7"/>
                    <circle cx="4" cy="1.5" r="0.7"/>
                    <circle cx="6" cy="1.5" r="0.7"/>
                    <circle cx="8" cy="1.5" r="0.7"/>
                    <circle cx="10" cy="1.5" r="0.7"/>
                    <circle cx="3" cy="3" r="0.7"/>
                    <circle cx="5" cy="3" r="0.7"/>
                    <circle cx="7" cy="3" r="0.7"/>
                    <circle cx="9" cy="3" r="0.7"/>
                    <circle cx="2" cy="4.5" r="0.7"/>
                    <circle cx="4" cy="4.5" r="0.7"/>
                    <circle cx="6" cy="4.5" r="0.7"/>
                    <circle cx="8" cy="4.5" r="0.7"/>
                    <circle cx="10" cy="4.5" r="0.7"/>
                    <circle cx="3" cy="6" r="0.7"/>
                    <circle cx="5" cy="6" r="0.7"/>
                    <circle cx="7" cy="6" r="0.7"/>
                    <circle cx="9" cy="6" r="0.7"/>
                    <circle cx="2" cy="7.5" r="0.7"/>
                    <circle cx="4" cy="7.5" r="0.7"/>
                    <circle cx="6" cy="7.5" r="0.7"/>
                    <circle cx="8" cy="7.5" r="0.7"/>
                    <circle cx="10" cy="7.5" r="0.7"/>
                  </g>
                </svg>
                {lang === "en" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: "4px" }}><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            </div>
          )}
        </div>

        {/* ── ELVÁLASZTÓ ── */}
        <div style={{ margin: "8px 20px", height: "1px", background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />

        {/* ── KIJELENTKEZÉS ── */}
        <div style={{ padding: "0 12px", flexShrink: 0 }}>
          <button
            onClick={() => { supabase.auth.signOut(); setIsDrawerOpen(false); }}
            style={{
              height: "52px", width: "100%",
              display: "flex", alignItems: "center", gap: "14px",
              padding: "0 18px", borderRadius: "16px",
              border: "1px solid transparent", background: "transparent",
              color: "rgba(244,247,251,0.65)",
              cursor: "pointer", textAlign: "left",
              fontSize: "16px", fontWeight: 500,
              transition: "background 0.18s"
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>{t("signOutLabel")}</span>
          </button>
        </div>

        {/* ── SPACER ── */}
        <div style={{ flex: 1 }} />

        {/* ── PROFIL KÁRTYA 72px alul ── */}
        <div style={{ padding: "0 12px 24px", flexShrink: 0 }}>
          <div
            onClick={() => { setActiveTab("Profile"); setIsDrawerOpen(false); }}
            style={{
              height: "72px", padding: "0 14px",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", gap: "12px",
              cursor: "pointer",
            }}
          >
            <div style={{
              width: "42px", height: "42px", borderRadius: "50%",
              background: "linear-gradient(135deg, #7E7BFF, #9B7BFF)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "17px", fontWeight: 700, color: "white",
              flexShrink: 0, overflow: "hidden"
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : formattedName.charAt(0).toUpperCase()
              }
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#F4F7FB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {formattedName}
              </div>
              <div style={{ fontSize: "12px", color: "rgba(244,247,251,0.55)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {session?.user?.email}
              </div>
            </div>
            <span style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.16)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(244,247,251,0.72)", fontSize: "14px", flexShrink: 0
            }}>›</span>
          </div>
        </div>

      </div>
      {/* ═══ DRAWER VÉGE ═══ */}
    </main>
  );
}
