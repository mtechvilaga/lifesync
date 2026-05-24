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

  // Login utáni layout stabilizálás: iOS/PWA alatt az első render néha rossz viewport-mérettel számol.
  const [appReady, setAppReady] = useState(false);
  
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
  const statsDragRef = useRef({ startX: 0, startY: 0, moved: false });
  const [selectedStatsPeriod, setSelectedStatsPeriod] = useState<"today" | "week" | "month" | "year" | "all" | null>(null);

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

  // Login keyboard-aware layout state
  const [isLoginInputFocused, setIsLoginInputFocused] = useState(false);
  const [isLoginKeyboardOpen, setIsLoginKeyboardOpen] = useState(false);
  const [loginKeyboardHeight, setLoginKeyboardHeight] = useState(0);
  const loginCardRef = useRef<HTMLDivElement | null>(null);

  // Drawer (oldalsáv) state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  // Nyelv state
  const [lang, setLang] = useState<"hu" | "en">("hu");
  const t = (key: string): string => (translations[lang] as Record<string, string>)[key] ?? (translations.hu as Record<string, string>)[key] ?? key;

  // iOS/PWA zoom fix: ha input mező 16px-nél kisebb, az iPhone belenagyít,
  // és belépés után a fő app is túl nagy maradhat. Ez stabilizálja a skálát.
  useEffect(() => {
    if (typeof window === "undefined") return;

    let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.name = "viewport";
      document.head.appendChild(viewport);
    }
    viewport.content = "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover";

    const styleId = "lifesync-ios-zoom-fix";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      html, body {
        width: 100%;
        min-width: 0;
        overflow-x: hidden;
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
      }
      input, textarea, select, button {
        -webkit-text-size-adjust: 100%;
      }
      input, textarea, select {
        font-size: 16px !important;
        max-width: 100%;
        box-sizing: border-box;
        scroll-margin-top: 110px;
        scroll-margin-bottom: 140px;
      }
      .custom-datepicker, .mobile-datetime-input {
        width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      .phone {
        width: min(100vw, 430px) !important;
        max-width: 430px !important;
        min-width: 0 !important;
        overflow-x: hidden !important;
      }
      .page-transition {
        min-width: 0 !important;
        overflow-x: hidden !important;
      }
      .login-card {
        -webkit-overflow-scrolling: touch;
        touch-action: manipulation;
        pointer-events: auto;
      }
      .login-card input, .login-card button, .login-card span {
        pointer-events: auto;
      }
    `;
  }, []);

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

  useEffect(() => {
    // Stabil app-magasság iPhone/PWA alatt.
    // Fontos: billentyűzet nyitásakor NEM használjuk a visualViewport kisebb magasságát,
    // mert attól az Add / email / időválasztó panelek teljesen felugranak.
    const applyViewportSize = () => {
      const height = window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
      document.documentElement.style.setProperty("--app-width", `${Math.min(window.innerWidth, 430)}px`);
    };

    applyViewportSize();
    window.addEventListener("resize", applyViewportSize);
    window.addEventListener("orientationchange", applyViewportSize);

    return () => {
      window.removeEventListener("resize", applyViewportSize);
      window.removeEventListener("orientationchange", applyViewportSize);
    };
  }, []);

  useEffect(() => {
    if (!session || showSplash) {
      setAppReady(false);
      return;
    }

    const applyViewportSize = () => {
      const height = window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
      document.documentElement.style.setProperty("--app-width", `${Math.min(window.innerWidth, 430)}px`);
    };

    applyViewportSize();
    const raf = window.requestAnimationFrame(() => {
      applyViewportSize();
      window.dispatchEvent(new Event("resize"));
    });

    const timer = window.setTimeout(() => {
      applyViewportSize();
      window.dispatchEvent(new Event("resize"));
      window.scrollTo(0, 0);
      setAppReady(true);
    }, 360);

    const lateTimer = window.setTimeout(() => {
      applyViewportSize();
      window.dispatchEvent(new Event("resize"));
    }, 900);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.clearTimeout(lateTimer);
    };
  }, [session, showSplash]);

  // Login képernyő stabilizálás: a panel a tényleges billentyűzet-magassághoz igazodik.
  // Nem globális scroll/fixed trükköt használunk, így nem rontja el az Add / dátum / email mezőket.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateLoginKeyboard = () => {
      if (session || showSplash) {
        setIsLoginKeyboardOpen(false);
        setLoginKeyboardHeight(0);
        document.documentElement.style.setProperty("--login-keyboard-height", "0px");
        return;
      }

      const viewport = window.visualViewport;
      const fullHeight = window.innerHeight;
      const visibleHeight = viewport?.height ?? fullHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const keyboardHeight = Math.max(0, fullHeight - visibleHeight - offsetTop);
      const keyboardOpen = isLoginInputFocused && keyboardHeight > 80;

      setIsLoginKeyboardOpen(keyboardOpen);
      setLoginKeyboardHeight(keyboardOpen ? keyboardHeight : 0);
      document.documentElement.style.setProperty("--login-keyboard-height", `${keyboardOpen ? keyboardHeight : 0}px`);
    };

    updateLoginKeyboard();
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", updateLoginKeyboard);
    viewport?.addEventListener("scroll", updateLoginKeyboard);
    window.addEventListener("resize", updateLoginKeyboard);

    return () => {
      viewport?.removeEventListener("resize", updateLoginKeyboard);
      viewport?.removeEventListener("scroll", updateLoginKeyboard);
      window.removeEventListener("resize", updateLoginKeyboard);
    };
  }, [session, showSplash, isLoginInputFocused]);

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
    let startX = 0;
    let startY = 0;
    let startXRelative = 0;
    let isHorizontal: boolean | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      const el = mainRef.current;
      if (!el) return;
      const touch = e.targetTouches[0];
      const rect = el.getBoundingClientRect();
      // Ha a touch a .phone elemen kívül indult, kihagyjuk
      if (touch.clientX < rect.left || touch.clientX > rect.right ||
          touch.clientY < rect.top  || touch.clientY > rect.bottom) {
        startX = -9999;
        return;
      }
      // Ha data-swipe-ignore elemen belül indult, kihagyjuk
      const target = e.target as HTMLElement;
      if (target.closest('[data-swipe-ignore]')) {
        startX = -9999;
        return;
      }
      startX = touch.clientX;
      startY = touch.clientY;
      startXRelative = touch.clientX - rect.left;
      isHorizontal = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startX === -9999) return;
      const dx = Math.abs(e.targetTouches[0].clientX - startX);
      const dy = Math.abs(e.targetTouches[0].clientY - startY);
      if (isHorizontal === null && (dx > 8 || dy > 8)) {
        isHorizontal = dx > dy;
      }
      if (isHorizontal) e.preventDefault();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (startX === -9999 || isHorizontal !== true) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < minSwipeDistance) return;
      if (Math.abs(dy) > Math.abs(dx) * 0.7) return;

      const isLeftSwipe = dx < 0;
      const isRightSwipe = dx > 0;

      if (isRightSwipe && startXRelative < 60 && !isDrawerOpenRef.current) {
        setIsDrawerOpen(true); return;
      }
      if (isLeftSwipe && isDrawerOpenRef.current) {
        setIsDrawerOpen(false); return;
      }
      if (isDrawerOpenRef.current) return;

      if (activeTabRef.current === "Add") {
        if (isLeftSwipe && addViewModeRef.current === "calendar") { setAddViewMode("form"); return; }
        if (isRightSwipe && addViewModeRef.current === "form") { setAddViewMode("calendar"); return; }
      }

      const tabs = ["Home", "Timeline", "Add", "Vault", "Profile"];
      const idx = tabs.indexOf(activeTabRef.current);
      if (isLeftSwipe && idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
      else if (isRightSwipe && idx > 0) setActiveTab(tabs[idx - 1]);
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
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
      const randomColors = ["#ffb74d", "#a78bfa", "#42a5f5", "#66bb6a", "#ab47bc", "#26a69a"];
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

  const getStatsPeriodEvents = (period: "today" | "week" | "month" | "year" | "all") => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayObj = new Date();
    const day = todayObj.getDay();
    const diff = todayObj.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(todayObj.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    const thisMonth = todayStr.substring(0, 7);
    const thisYear = todayStr.substring(0, 4);

    return events.filter((event) => {
      if (!event.event_date) return false;
      if (period === "all") return true;
      if (period === "today") return event.event_date === todayStr;
      if (period === "week") return new Date(event.event_date) >= startOfWeek;
      if (period === "month") return event.event_date.startsWith(thisMonth);
      if (period === "year") return event.event_date.startsWith(thisYear);
      return false;
    });
  };

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

  const handleLoginInputFocus = () => {
    // Csak a login layout állapotát váltjuk. A pozíciót a visualViewport alapján számoljuk.
    setIsLoginInputFocused(true);
  };

  const handleLoginInputBlur = () => {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (!active || !["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) {
        setIsLoginInputFocused(false);
        setIsLoginKeyboardOpen(false);
        setLoginKeyboardHeight(0);
        document.documentElement.style.setProperty("--login-keyboard-height", "0px");
      }
    }, 180);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      showToast("Add meg az email címet és a jelszót.", 'error');
      return;
    }

    if (typeof window !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }

    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        showToast("Hiba a belépésnél: " + error.message, 'error');
      } else {
        localStorage.setItem('remembered_login_email', cleanEmail);
        if (typeof window !== "undefined") {
          (document.activeElement as HTMLElement | null)?.blur?.();
          window.scrollTo(0, 0);
          const height = window.innerHeight;
          document.documentElement.style.setProperty("--app-height", `${height}px`);
          document.documentElement.style.setProperty("--app-width", `${Math.min(window.innerWidth, 430)}px`);
          window.dispatchEvent(new Event("resize"));
        }
        setShowSplash(true);
        setTimeout(() => setShowSplash(false), 4000);
      }
    } else {
      const { error } = await supabase.auth.signUp({ email: cleanEmail, password });
      if (error) showToast("Hiba a regisztrációnál: " + error.message, 'error');
      else {
        localStorage.setItem('remembered_login_email', cleanEmail);
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
        <div style="background: linear-gradient(135deg, #38bdf8, #8b5cf6); padding: 30px; text-align: center;">
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
      <main
        className="phone"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: showSplash ? "var(--app-height, 100dvh)" : "var(--app-height, 100dvh)",
          minHeight: "var(--app-height, 100dvh)",
          padding: showSplash ? "24px" : isLoginKeyboardOpen ? "calc(env(safe-area-inset-top, 0px) + 4px) 20px 18px" : "calc(env(safe-area-inset-top, 0px) + 18px) 24px 56px",
          overflowY: showSplash ? "hidden" : "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          display: "flex",
          flexDirection: "column",
          justifyContent: showSplash ? "center" : "flex-start",
          alignItems: "center",
          gap: showSplash ? "20px" : isLoginKeyboardOpen ? "8px" : "16px",
        }}
      >
        {!showSplash && (
          <div
            className="theme-toggle"
            onClick={toggleTheme}
            style={{
              position: "absolute",
              top: "calc(env(safe-area-inset-top, 0px) + 54px)",
              right: "22px",
              width: "46px",
              height: "46px",
              borderRadius: "18px",
              display: isLoginKeyboardOpen ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: "0 10px 26px rgba(0,0,0,0.18)",
              cursor: "pointer",
              zIndex: 100
            }}
          >
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
            marginTop: showSplash ? "auto" : isLoginKeyboardOpen ? "0px" : "18px",
            marginBottom: showSplash ? "auto" : isLoginKeyboardOpen ? "0px" : "4px",
            textAlign: "center", 
            zIndex: 10, 
            transition: "all 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)", 
            cursor: "pointer",
            flexShrink: 0
          }}
        >
          <div style={{ width: showSplash ? "110px" : isLoginKeyboardOpen ? "42px" : "82px", height: showSplash ? "110px" : isLoginKeyboardOpen ? "42px" : "82px", margin: isLoginKeyboardOpen ? "0 auto 2px" : "0 auto 8px", background: "transparent", border: "none", boxShadow: "none", transition: "all 0.25s ease" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lifesync-icon.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "0", boxShadow: "none", transition: "all 0.8s" }} />
          </div>
          <h1 style={{ 
            fontSize: showSplash ? "40px" : isLoginKeyboardOpen ? "24px" : "34px", 
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
            ref={loginCardRef}
            style={{ 
              width: "100%",
              maxWidth: "360px",
              maxHeight: "none",
              overflowY: "visible",
              overscrollBehavior: "contain",
              padding: isLoginKeyboardOpen ? "18px 18px" : "24px 20px", 
              borderRadius: isLoginKeyboardOpen ? "24px" : "28px", 
              position: "relative",
              zIndex: 30,
              animation: "form-slide-up 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              marginBottom: isLoginKeyboardOpen ? "0px" : "40px",
              transform: isLoginKeyboardOpen ? `translateY(-${Math.min(Math.max(loginKeyboardHeight * 0.18, 22), 82)}px)` : "translateY(0)",
              transition: "box-shadow 0.25s ease, padding 0.25s ease"
            }}
          >
            <h2 style={{ fontSize: isLoginKeyboardOpen ? "20px" : "22px", fontWeight: 700, marginBottom: isLoginKeyboardOpen ? "12px" : "18px", textAlign: "center" }}>
              {isLoginMode ? t("signIn") : t("register")}
            </h2>

            <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: isLoginKeyboardOpen ? "10px" : "12px" }}>
              <div>
                <label style={{ fontSize: "13.5px", opacity: 0.95, marginBottom: "8px", display: "block", fontWeight: 700, color: "rgba(226,232,240,0.92)" }}>{t("emailLabel")}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onFocus={handleLoginInputFocus}
                  onBlur={handleLoginInputBlur}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder={t("emailPlaceholder")}
                  style={{
                    width: "100%",
                    position: "relative",
                    zIndex: 20,
                    pointerEvents: "auto",
                    WebkitUserSelect: "text",
                    userSelect: "text",
                    touchAction: "manipulation",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    color: "white",
                    outline: "none",
                    fontSize: "16px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              
                            <div>
                <label style={{ fontSize: "13.5px", opacity: 0.95, marginBottom: "8px", display: "block", fontWeight: 700, color: "rgba(226,232,240,0.92)" }}>{t("passwordLabel")}</label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    onFocus={handleLoginInputFocus}
                    onBlur={handleLoginInputBlur}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isLoginMode ? "current-password" : "new-password"} 
                    placeholder="••••••••" 
                    style={{ 
                      width: "100%", 
                      position: "relative",
                      zIndex: 20,
                      pointerEvents: "auto",
                      WebkitUserSelect: "text",
                      userSelect: "text",
                      touchAction: "manipulation",
                      background: "rgba(255,255,255,0.08)", 
                      border: "1px solid rgba(255,255,255,0.2)", 
                      padding: "12px 42px 12px 14px", 
                      borderRadius: "14px", 
                      color: "white", 
                      outline: "none", 
                      fontSize: "16px",
                      boxSizing: "border-box"
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

              <button type="submit" style={{ marginTop: "8px", padding: "14px", background: "linear-gradient(135deg, #38bdf8, #8b5cf6)", border: "none", borderRadius: "16px", color: "white", fontWeight: 600, boxShadow: "0 12px 30px rgba(124,58,237,0.35), 0 0 22px rgba(56,189,248,0.16)", fontSize: "16px", cursor: "pointer" }}>
                {isLoginMode ? t("login") : t("createAccount")}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: isLoginKeyboardOpen ? "12px" : "18px", fontSize: "13.5px" }}>
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

  if (session && !showSplash && !appReady) {
    return (
      <main
        className="phone"
        style={{
          width: "min(100vw, 430px)",
          maxWidth: "430px",
          height: "var(--app-height, 100dvh)",
          minHeight: "100dvh",
          overflow: "hidden",
          background: "#06111f",
        }}
      />
    );
  }

  return (
    <main 
      className="phone"
      ref={mainRef}
      style={{
        width: "min(100vw, 430px)",
        maxWidth: "430px",
        height: "var(--app-height, 100dvh)",
        minHeight: "100dvh",
        maxHeight: "var(--app-height, 100dvh)",
        overflow: "hidden",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}

    >
      {/* ═══ FŐ TARTALOM ═══ */}

      <section className="header" style={{ marginTop: "12px", paddingTop: "4px" }}>
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
          <div className="brand" onClick={playLogoSound} style={{ display: "flex", alignItems: "center", gap: "9px", cursor: "pointer" }}>
            {/* Neon LifeSync logo – ugyanaz a hangulat, mint a menüpanelen */}
            <div className="logo" style={{
              width: "clamp(44px, 12vw, 56px)",
              height: "clamp(44px, 12vw, 56px)",
              borderRadius: "18px",
              background: "radial-gradient(circle, rgba(56,189,248,0.20), transparent 64%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 28px rgba(56,189,248,0.22), 0 0 34px rgba(168,85,247,0.14)",
              flexShrink: 0,
            }}>
              <img
                src="/lifesync-icon.png"
                alt="LifeSync"
                style={{ width: "clamp(40px, 11vw, 50px)", height: "clamp(40px, 11vw, 50px)", objectFit: "contain", filter: "drop-shadow(0 0 12px rgba(56,189,248,0.42))" }}
              />
            </div>

            {/* Logo szöveg */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h1 style={{
                fontFamily: "'SF Pro Display', 'Inter', 'Segoe UI', sans-serif",
                fontWeight: 750,
                fontSize: "clamp(26px, 8vw, 34px)",
                lineHeight: "clamp(28px, 8.5vw, 36px)",
                letterSpacing: "-0.03em",
                background: "linear-gradient(90deg, #B8E7FF 0%, #6AB7FF 42%, #7E7BFF 72%, #B984FF 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                margin: 0,
                textShadow: "0 0 28px rgba(96,165,250,0.18)",
              }}>
                LifeSync
              </h1>
              <div className="subtitle" style={{
                fontSize: "14px",
                color: "rgba(226,232,240,0.74)",
                marginTop: "4px",
                fontWeight: 500,
                letterSpacing: "0.01em",
              }}>
                Memories that matter.
              </div>
            </div>
          </div>
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
        <div key="Home" className="page-transition" style={{ height: "calc(var(--app-height, 100dvh) - 120px)", overflowY: "auto", paddingBottom: "20px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", paddingTop: "10px" }}>
          {/* ── GREETING KÁRTYA ── */}
          <section style={{
            position: "relative",
            borderRadius: "clamp(14px, 4vw, 26px)",
            overflow: "hidden",
            marginBottom: "clamp(10px, 2.5vw, 18px)",
            minHeight: "160px",
            boxShadow: "0 14px 35px rgba(0,0,0,0.3)",
          }}>
            {/* Háttérkép */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "url('/greeting_bg.png')",
              backgroundSize: "cover",
              backgroundPosition: "center top",
              zIndex: 0,
            }} />

            {/* Sötétítő réteg */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, rgba(10,8,30,0.45) 0%, rgba(10,8,30,0.25) 50%, rgba(10,8,30,0.7) 100%)",
              zIndex: 1,
            }} />

            {/* SVG hegycsúcsok alul */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, pointerEvents: "none", lineHeight: 0 }}>
              <svg viewBox="0 0 400 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", display: "block" }}>
                <path d="M0 60 L40 30 L80 45 L130 10 L180 40 L220 20 L270 45 L310 15 L360 38 L400 25 L400 60 Z" fill="rgba(20,14,50,0.6)" />
                <path d="M0 60 L60 40 L110 50 L160 28 L210 48 L260 32 L320 50 L370 35 L400 42 L400 60 Z" fill="rgba(15,10,40,0.5)" />
              </svg>
            </div>

            {/* Tartalom */}
            <div style={{ position: "relative", zIndex: 3, padding: "clamp(14px, 4vw, 24px)" }}>
              {isEditingGreetingName ? (
                <form onSubmit={handleSaveGreetingName} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <input
                    autoFocus
                    type="text"
                    value={greetingNameInput}
                    onChange={e => setGreetingNameInput(e.target.value)}
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "10px", padding: "6px 12px", color: "white", outline: "none", fontSize: "15px", flex: 1 }}
                  />
                  <button type="submit" style={{ background: "linear-gradient(135deg, #38bdf8, #8b5cf6)", border: "none", borderRadius: "10px", color: "white", padding: "8px 12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Mentés</button>
                  <button type="button" onClick={() => setIsEditingGreetingName(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "10px", color: "white", padding: "8px 12px", fontSize: "14px", cursor: "pointer" }}>{t("cancel")}</button>
                </form>
              ) : (
                <h2 style={{
                  fontSize: "clamp(22px, 6vw, 30px)",
                  fontWeight: 800,
                  color: "#ffffff",
                  textShadow: "0 2px 12px rgba(0,0,0,0.5)",
                  marginBottom: "8px",
                  lineHeight: 1.2,
                }}>
                  {lang === "hu" ? `Legyen szép napod, ${formattedName}!` : `Have a great day, ${formattedName}!`}
                </h2>
              )}
              <p style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "rgba(255,255,255,0.85)",
                textShadow: "0 1px 6px rgba(0,0,0,0.4)",
                display: "flex", alignItems: "center", gap: "6px",
                marginBottom: "70px",
              }}>
                {weather ? `${weather.temp}°C · ${weather.city} ${weather.desc}` : ""}
              </p>
            </div>
          </section>

          {/* ── ESEMÉNY STATISZTIKÁK – KATTINTHATÓ CAROUSEL ── */}
          <section style={{
            position: "relative",
            borderRadius: "24px",
            padding: "12px",
            marginBottom: "15px",
            overflow: "hidden",
            background: "linear-gradient(145deg, rgba(28,32,72,0.96) 0%, rgba(43,34,97,0.92) 48%, rgba(13,25,64,0.94) 100%)",
            border: "1px solid rgba(125, 211, 252, 0.58)",
            boxShadow: "0 0 34px rgba(56,189,248,0.22), 0 0 42px rgba(168,85,247,0.18), inset 0 1px 0 rgba(255,255,255,0.14)",
            backdropFilter: "blur(18px)",
          }}>
            <div style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 54% 16%, rgba(196,181,253,0.26), transparent 30%), radial-gradient(circle at 90% 12%, rgba(34,211,238,0.15), transparent 34%), radial-gradient(circle at 10% 88%, rgba(59,130,246,0.18), transparent 36%)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute",
              inset: "1px",
              borderRadius: "23px",
              background: "linear-gradient(180deg, rgba(255,255,255,0.08), transparent 44%)",
              pointerEvents: "none",
            }} />

            <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <h3 style={{
                fontSize: "18px",
                fontWeight: 900,
                letterSpacing: "0.2px",
                color: "#ffffff",
                textShadow: "0 2px 16px rgba(0,0,0,0.35)",
                margin: 0,
              }}>{t("eventStats")}</h3>

              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(139,92,246,0.16)",
                border: "1px solid rgba(167,139,250,0.34)",
                boxShadow: "0 0 20px rgba(139,92,246,0.22)",
              }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
            </div>

            <div
              data-swipe-ignore="true"
              onScroll={handleStatsScroll}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                statsDragRef.current = { startX: touch.clientX, startY: touch.clientY, moved: false };
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                const dx = Math.abs(touch.clientX - statsDragRef.current.startX);
                const dy = Math.abs(touch.clientY - statsDragRef.current.startY);
                if (dx > 8 && dx > dy) {
                  statsDragRef.current.moved = true;
                }
              }}
              onTouchEnd={() => {
                if (statsDragRef.current.moved) {
                  window.setTimeout(() => { statsDragRef.current.moved = false; }, 80);
                }
              }}
              style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                gap: "10px",
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                paddingBottom: "4px",
                marginRight: "-4px",
              }}
            >
              {[
                { period: "today" as const, icon: "🗓️", value: stats.today, title: lang === "hu" ? "Mai" : "Today", label: lang === "hu" ? "Események a mai napon" : "Events today", accent: "#38bdf8" },
                { period: "week" as const, icon: "📅", value: stats.week, title: lang === "hu" ? "Heti" : "Weekly", label: lang === "hu" ? "Események ezen a héten" : "Events this week", accent: "#60a5fa" },
                { period: "month" as const, icon: "↗️", value: stats.month, title: lang === "hu" ? "Havi" : "Monthly", label: lang === "hu" ? "Események ebben a hónapban" : "Events this month", accent: "#a78bfa" },
                { period: "year" as const, icon: "🕒", value: stats.year, title: lang === "hu" ? "Éves" : "Yearly", label: lang === "hu" ? "Események ebben az évben" : "Events this year", accent: "#3b82f6" },
                { period: "all" as const, icon: "✨", value: stats.allTime, title: lang === "hu" ? "Összes" : "All", label: lang === "hu" ? "Minden mentett esemény" : "All saved events", accent: "#c084fc" },
              ].map((card) => {
                const isActive = selectedStatsPeriod === card.period;
                return (
                  <button
                    key={card.period}
                    type="button"
                    onClick={(e) => {
                      if (statsDragRef.current.moved) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.setTimeout(() => { statsDragRef.current.moved = false; }, 80);
                        return;
                      }
                      setSelectedStatsPeriod(isActive ? null : card.period);
                    }}
                    style={{
                      position: "relative",
                      minWidth: "calc(100% - 20px)",
                      scrollSnapAlign: "start",
                      minHeight: "104px",
                      borderRadius: "18px",
                      padding: "13px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "13px",
                      overflow: "hidden",
                      textAlign: "left",
                      cursor: "pointer",
                      background: isActive
                        ? "linear-gradient(135deg, rgba(67,56,202,0.92), rgba(30,64,175,0.76))"
                        : "linear-gradient(135deg, rgba(42,48,112,0.82), rgba(16,28,78,0.72))",
                      border: isActive ? "1px solid rgba(125,211,252,0.78)" : "1px solid rgba(167,139,250,0.55)",
                      boxShadow: isActive
                        ? "0 0 28px rgba(56,189,248,0.26), inset 0 1px 0 rgba(255,255,255,0.16)"
                        : "0 0 22px rgba(147,197,253,0.14), inset 0 1px 0 rgba(255,255,255,0.12)",
                    }}
                  >
                    <div style={{
                      position: "absolute",
                      right: "-38px",
                      top: "-32px",
                      width: "136px",
                      height: "136px",
                      borderRadius: "50%",
                      background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.36), ${card.accent}77 30%, rgba(37,99,235,0.20) 64%, transparent 74%)`,
                      opacity: 0.46,
                    }} />
                    <div style={{
                      position: "absolute",
                      right: "-54px",
                      top: "46px",
                      width: "150px",
                      height: "32px",
                      borderRadius: "50%",
                      border: "1px solid rgba(96,165,250,0.36)",
                      transform: "rotate(-14deg)",
                      opacity: 0.46,
                    }} />

                    <div style={{
                      width: "54px",
                      height: "54px",
                      borderRadius: "16px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 45%, #22d3ee 100%)",
                      boxShadow: "0 0 24px rgba(99,102,241,0.48)",
                    }}>
                      <span style={{ fontSize: "24px", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.25))" }}>{card.icon}</span>
                    </div>

                    <div style={{ position: "relative", zIndex: 2, minWidth: 0 }}>
                      <div style={{ fontSize: "38px", fontWeight: 950, lineHeight: 0.9, color: "#ffffff", textShadow: "0 4px 20px rgba(0,0,0,0.28)" }}>{card.value}</div>
                      <div style={{ marginTop: "6px", fontSize: "16px", fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>{card.title}</div>
                      <div style={{ marginTop: "6px", fontSize: "11.5px", fontWeight: 500, color: "rgba(226,232,240,0.76)", lineHeight: 1.25 }}>{card.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "center", gap: "5px", margin: "6px 0 8px" }}>
              {["today", "week", "month", "year", "all"].map((period, index) => (
                <span key={period} style={{
                  width: activeStatIndex === index ? "15px" : "5px",
                  height: "5px",
                  borderRadius: "999px",
                  background: activeStatIndex === index ? "rgba(125,211,252,0.85)" : "rgba(226,232,240,0.28)",
                  transition: "all 0.2s ease",
                }} />
              ))}
            </div>

            {selectedStatsPeriod && (
              <div style={{
                position: "relative",
                zIndex: 2,
                borderRadius: "18px",
                padding: "10px",
                background: "rgba(2,6,23,0.42)",
                border: "1px solid rgba(148,163,184,0.16)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <p style={{ margin: 0, color: "#fff", fontWeight: 900, fontSize: "13px" }}>
                    {selectedStatsPeriod === "today" && (lang === "hu" ? "Mai események" : "Today events")}
                    {selectedStatsPeriod === "week" && (lang === "hu" ? "Heti események" : "Weekly events")}
                    {selectedStatsPeriod === "month" && (lang === "hu" ? "Havi események" : "Monthly events")}
                    {selectedStatsPeriod === "year" && (lang === "hu" ? "Éves események" : "Yearly events")}
                    {selectedStatsPeriod === "all" && (lang === "hu" ? "Összes esemény" : "All events")}
                  </p>
                  <button onClick={() => setSelectedStatsPeriod(null)} style={{ border: "none", background: "rgba(255,255,255,0.08)", color: "rgba(226,232,240,0.85)", borderRadius: "999px", width: "24px", height: "24px", cursor: "pointer" }}>×</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "7px", maxHeight: "150px", overflowY: "auto", paddingRight: "2px" }}>
                  {getStatsPeriodEvents(selectedStatsPeriod).length > 0 ? (
                    getStatsPeriodEvents(selectedStatsPeriod).slice(0, 12).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => { setActiveTab("Timeline"); setScrollToEventId(event.id); }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "9px",
                          width: "100%",
                          border: "1px solid rgba(148,163,184,0.14)",
                          borderRadius: "13px",
                          padding: "8px 9px",
                          background: "rgba(15,23,42,0.50)",
                          color: "white",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ width: "28px", height: "28px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(139,92,246,0.9), rgba(56,189,248,0.75))", flexShrink: 0 }}>🗓️</span>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ display: "block", fontSize: "12.5px", fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</span>
                          <span style={{ display: "block", marginTop: "2px", fontSize: "10.5px", color: "rgba(226,232,240,0.62)" }}>{event.event_date}</span>
                        </span>
                        <span style={{ color: "rgba(226,232,240,0.45)", fontSize: "16px" }}>›</span>
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: "12px 8px", borderRadius: "13px", color: "rgba(226,232,240,0.62)", fontSize: "12px", background: "rgba(15,23,42,0.36)" }}>
                      {lang === "hu" ? "Nincs esemény ebben az időszakban." : "No events in this period."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── LEGUTÓBBI ESEMÉNYEK – NEON KÁRTYA ── */}
          <section style={{
            position: "relative",
            borderRadius: "26px",
            padding: "16px",
            marginBottom: "18px",
            overflow: "hidden",
            background: "linear-gradient(145deg, rgba(15,23,42,0.88), rgba(17,24,39,0.62))",
            border: "1px solid rgba(56,189,248,0.35)",
            boxShadow: "0 0 34px rgba(56,189,248,0.13), inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(18px)",
          }}>
            <div style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 88% 15%, rgba(168,85,247,0.20), transparent 34%), radial-gradient(circle at 12% 90%, rgba(56,189,248,0.16), transparent 38%)",
              pointerEvents: "none",
            }} />

            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>{t("recentEvents")}</h3>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "rgba(226,232,240,0.58)" }}>{lang === "hu" ? "Gyors visszatekintés a legfrissebb emlékeidre." : "Quick look at your newest memories."}</p>
              </div>
              <button
                onClick={() => setActiveTab(t("timelineTitle"))}
                style={{
                  border: "1px solid rgba(139,92,246,0.38)",
                  background: "rgba(139,92,246,0.10)",
                  color: "#c4b5fd",
                  borderRadius: "999px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {t("allEvents")} →
              </button>
            </div>

            {recentMemories.length === 0 ? (
              <div style={{ position: "relative", zIndex: 1, padding: "22px", borderRadius: "20px", border: "1px dashed rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.45)", color: "rgba(226,232,240,0.72)", display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ width: "46px", height: "46px", borderRadius: "15px", display: "grid", placeItems: "center", background: "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(168,85,247,0.20))", border: "1px solid rgba(255,255,255,0.08)", fontSize: "22px" }}>📅</span>
                <div>
                  <strong style={{ display: "block", color: "#fff", fontSize: "15px" }}>{t("noEvents")}</strong>
                  <span style={{ fontSize: "13px", color: "rgba(226,232,240,0.58)" }}>{lang === "hu" ? "Adj hozzá egy eseményt, hogy itt megjelenjen." : "Add an event so it appears here."}</span>
                </div>
              </div>
            ) : (
              <div data-swipe-ignore style={{ position: "relative", zIndex: 1, display: "flex", overflowX: "auto", gap: "14px", paddingBottom: "4px", scrollbarWidth: "none" }}>
                {recentMemories.map((mem) => {
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

                  return (
                    <button
                      key={mem.id}
                      onClick={() => { setScrollToEventId(mem.id); setActiveTab(t("timelineTitle")); }}
                      style={{
                        flex: "0 0 138px",
                        minHeight: "176px",
                        borderRadius: "22px",
                        padding: "10px",
                        border: "1px solid rgba(148,163,184,0.24)",
                        background: "linear-gradient(160deg, rgba(30,41,59,0.74), rgba(15,23,42,0.48))",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                        color: "white",
                        textAlign: "left",
                        cursor: "pointer",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{
                        height: "105px",
                        borderRadius: "18px",
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "radial-gradient(circle at 50% 20%, rgba(139,92,246,0.35), rgba(15,23,42,0.82))",
                        display: "grid",
                        placeItems: "center",
                      }}>
                        {parsedUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={parsedUrl} alt={mem.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "24px", filter: "drop-shadow(0 0 14px rgba(139,92,246,0.45))" }}>
                            {mem.category === "photo" ? "🖼️" : mem.category === "utility" ? "⚡" : "📅"}
                          </span>
                        )}
                      </div>
                      <strong style={{ display: "block", marginTop: "10px", fontSize: "14px", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mem.title}</strong>
                      <small style={{ display: "block", marginTop: "4px", color: "rgba(226,232,240,0.55)", fontSize: "11px" }}>{mem.event_date}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── AKTÍV PROJEKTEK – BOLYGÓS NEON KÁRTYA ── */}
          <section style={{
            position: "relative",
            borderRadius: "26px",
            overflow: "hidden",
            minHeight: "190px",
            marginBottom: "24px",
            padding: "18px",
            border: "1px solid rgba(168,85,247,0.42)",
            background: "linear-gradient(145deg, rgba(12,18,35,0.92), rgba(24,16,57,0.78))",
            boxShadow: "0 0 38px rgba(168,85,247,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(18px)",
          }}>
            <div style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "linear-gradient(90deg, rgba(10,15,30,0.94) 0%, rgba(10,15,30,0.70) 48%, rgba(10,15,30,0.20) 100%), url('/projects_bg.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.95,
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute",
              right: "-24px",
              bottom: "-26px",
              width: "170px",
              height: "170px",
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 30%, rgba(216,180,254,0.95), rgba(124,58,237,0.70) 38%, rgba(37,99,235,0.28) 70%, transparent 72%)",
              filter: "blur(0.2px)",
              boxShadow: "0 0 45px rgba(168,85,247,0.32)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute",
              right: "-36px",
              bottom: "52px",
              width: "220px",
              height: "58px",
              border: "2px solid rgba(139,92,246,0.45)",
              borderRadius: "50%",
              transform: "rotate(-13deg)",
              pointerEvents: "none",
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>{t("activeProjects")}</h2>
                  <p style={{ margin: "5px 0 0", fontSize: "12px", color: "rgba(226,232,240,0.58)" }}>{lang === "hu" ? "A fontos dolgaid egy helyen, gyors eléréssel." : "Your important things in one place."}</p>
                </div>
                <button
                  onClick={() => setActiveTab("Vault")}
                  style={{
                    border: "1px solid rgba(56,189,248,0.34)",
                    background: "rgba(56,189,248,0.10)",
                    color: "#7dd3fc",
                    borderRadius: "999px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {t("allEvents")} →
                </button>
              </div>

              {vaultFolders.length === 0 ? (
                <div style={{ marginTop: "20px", maxWidth: "270px", color: "rgba(226,232,240,0.76)", fontSize: "15px", lineHeight: 1.55 }}>
                  <div style={{ width: "54px", height: "54px", borderRadius: "18px", border: "1px dashed rgba(196,181,253,0.48)", display: "grid", placeItems: "center", marginBottom: "12px", color: "#a78bfa", background: "rgba(139,92,246,0.10)" }}>⌁</div>
                  {t("noProjects")}
                </div>
              ) : (
                <div data-swipe-ignore style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none", maxWidth: "100%" }}>
                  {vaultFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => { setActiveTab("Vault"); handleOpenFolder(folder); }}
                      style={{
                        flex: "0 0 126px",
                        minHeight: "118px",
                        padding: "14px",
                        borderRadius: "20px",
                        background: "linear-gradient(160deg, rgba(30,41,59,0.78), rgba(15,23,42,0.52))",
                        border: "1px solid rgba(255,255,255,0.14)",
                        color: "white",
                        textAlign: "left",
                        cursor: "pointer",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
                      }}
                    >
                      <div style={{ width: "42px", height: "42px", borderRadius: "15px", background: `linear-gradient(135deg, ${folder.color_hex || '#38bdf8'}cc, #a855f7)`, display: "grid", placeItems: "center", fontSize: "22px", boxShadow: "0 0 20px rgba(139,92,246,0.22)" }}>
                        {folder.icon || "📁"}
                      </div>
                      <strong style={{ display: "block", marginTop: "12px", fontSize: "13px", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{folder.name}</strong>
                      <span style={{ display: "block", marginTop: "3px", fontSize: "11px", color: "rgba(226,232,240,0.55)" }}>{t("open")}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === "Timeline" && (
        <div key="Timeline" className="page-transition" style={{ height: "calc(var(--app-height, 100dvh) - 100px)", overflowY: "auto", overflowX: "hidden", paddingBottom: "26px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column", gap: "18px", overscrollBehavior: "contain", background: "transparent" }}>
          <div style={{ padding: "2px 4px 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <h2 style={{ fontSize: "32px", fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", textShadow: "0 0 24px rgba(96,165,250,0.26)" }}>{t("timelineTitle")}</h2>
              {events.length > 0 && (
                <button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  style={{ fontSize: "12px", padding: "8px 13px", borderRadius: "18px", border: "1px solid rgba(244,63,94,0.55)", background: "linear-gradient(145deg, rgba(244,63,94,0.16), rgba(15,23,42,0.52))", color: "#fb7185", cursor: "pointer", fontWeight: 800, boxShadow: "0 0 18px rgba(244,63,94,0.12)", backdropFilter: "blur(12px)" }}
                >
                  🗑️ Összes törlése
                </button>
              )}
            </div>
            <p style={{ opacity: 0.78, fontSize: "15px", color: "rgba(226,232,240,0.78)", lineHeight: 1.45 }}>{t("timelineSubtitle")}</p>
          </div>

          <div style={{ position: "relative", paddingLeft: "6px", marginTop: "6px" }}>
             {/* Függőleges vonal */}
             <div style={{ position: "absolute", left: "20px", top: "10px", bottom: "100px", width: "2px", background: "linear-gradient(to bottom, rgba(56,189,248,0.7), rgba(139,92,246,0.55), rgba(139,92,246,0.05))", borderRadius: "2px", boxShadow: "0 0 16px rgba(56,189,248,0.35)" }}></div>
             
             {events.length === 0 && (
                <div style={{ marginLeft: "42px", marginTop: "18px", padding: "18px", borderRadius: "22px", border: "1px solid rgba(139,92,246,0.35)", background: "linear-gradient(145deg, rgba(15,23,42,0.78), rgba(30,41,59,0.46))", color: "rgba(226,232,240,0.72)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}>{t("noTimeline")}</div>
             )}

             {events.map((event) => (
               /* eslint-disable-next-line react/no-unknown-property */
               <div key={event.id} id={`event-${event.id}`} style={{ display: "flex", gap: "14px", marginBottom: "24px", position: "relative" }}>
                 <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg, #38bdf8, #8b5cf6 55%, #c026d3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", zIndex: 2, flexShrink: 0, marginTop: "18px", boxShadow: "0 0 0 5px rgba(15,23,42,0.75), 0 0 22px rgba(56,189,248,0.45)" }}>
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
                   style={{ flex: 1, padding: "18px", borderRadius: "24px", position: "relative", cursor: "pointer", transition: "all 0.3s ease", background: expandedEvents[event.id] ? "linear-gradient(145deg, rgba(15,23,42,0.94), rgba(49,46,129,0.48))" : "linear-gradient(145deg, rgba(15,23,42,0.86), rgba(30,41,59,0.48))", border: expandedEvents[event.id] ? "1px solid rgba(139,92,246,0.68)" : "1px solid rgba(148,163,184,0.22)", boxShadow: expandedEvents[event.id] ? "0 0 0 1px rgba(56,189,248,0.15), 0 20px 42px rgba(0,0,0,0.34), 0 0 28px rgba(139,92,246,0.22)" : "0 16px 34px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)", backdropFilter: "blur(16px)" }}
                 >
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                       <span style={{ fontSize: "12px", color: "rgba(186,230,253,0.86)", fontWeight: 800, letterSpacing: "0.02em" }}>
                         {event.recurring_type ? getNextRecurringDate(event.event_date, event.recurring_type, event.recurring_days) : event.event_date}
                       </span>
                       {event.recurring_type && (
                         <span style={{ fontSize: "10px", background: "rgba(56,189,248,0.14)", border: "1px solid rgba(56,189,248,0.45)", borderRadius: "999px", padding: "3px 8px", color: "#67e8f9", fontWeight: 800, boxShadow: "0 0 12px rgba(56,189,248,0.12)" }}>
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
                       style={{ opacity: 0.88, cursor: "pointer", padding: "2px 8px", fontSize: "18px", letterSpacing: "2px", color: "rgba(226,232,240,0.8)" }}
                     >
                       •••
                     </span>
                   </div>

                   {activeMenuId === event.id && (
                     <div className="options-menu" style={{ position: "absolute", right: "16px", top: "44px", background: "rgba(2,6,23,0.94)", border: "1px solid rgba(139,92,246,0.32)", borderRadius: "16px", padding: "7px", zIndex: 10, boxShadow: "0 14px 30px rgba(0,0,0,0.45), 0 0 22px rgba(139,92,246,0.16)", backdropFilter: "blur(14px)", display: "flex", flexDirection: "column", gap: "5px" }}>
                        <button onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }} style={{ background: "transparent", border: "1px solid transparent", color: "white", fontSize: "14px", fontWeight: 500, cursor: "pointer", padding: "8px 16px", borderRadius: "8px", width: "100%", textAlign: "center", transition: "all 0.2s" }}>
                          Módosítás
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id, event.recurring_type); }} style={{ background: "rgba(255, 50, 50, 0.1)", border: "1px solid rgba(255, 50, 50, 0.2)", color: "#ff6b6b", fontSize: "14px", fontWeight: 600, cursor: "pointer", padding: "8px 16px", borderRadius: "8px", width: "100%", textAlign: "center", transition: "all 0.2s" }}>
                          Törlés
                        </button>
                     </div>
                   )}
                   
                   <h3 style={{ fontSize: "19px", fontWeight: 850, marginBottom: expandedEvents[event.id] ? "8px" : "0", color: "#fff", letterSpacing: "-0.02em", textShadow: "0 0 18px rgba(96,165,250,0.14)" }}>
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
                           <span style={{ fontSize: "11px", background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.18)", padding: "5px 9px", borderRadius: "999px", alignSelf: "flex-start", color: "rgba(186,230,253,0.9)", display: "flex", alignItems: "center", gap: "4px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                             📎 {parts.join(" • ")}
                           </span>
                         );
                       })()}
                       {event.description && (
                         <span style={{ fontSize: "13px", color: "rgba(203,213,225,0.62)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                           {event.description}
                         </span>
                       )}
                     </div>
                   )}

                   {expandedEvents[event.id] && (
                     <div style={{ marginTop: "12px", animation: "fade-in 0.2s ease-out" }} onClick={(e) => e.stopPropagation()}>
                       {event.description && (
                         <p style={{ fontSize: "14px", color: "rgba(226,232,240,0.82)", lineHeight: 1.5, marginBottom: "10px" }}>{event.description}</p>
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
                                    <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", flexShrink: 0, width: images.length === 1 ? "100%" : "120px", height: images.length === 1 ? "160px" : "100px", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(139,92,246,0.35)", boxShadow: "0 12px 24px rgba(0,0,0,0.25)" }}>
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
                                    <div key={idx} style={{ background: "rgba(15,23,42,0.7)", padding: "12px 14px", borderRadius: "16px", border: "1px solid rgba(139,92,246,0.22)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
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
                                    <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(15,23,42,0.72)", padding: "11px 14px", borderRadius: "14px", border: "1px solid rgba(139,92,246,0.24)", color: "white", textDecoration: "none", fontSize: "13px", fontWeight: 600, transition: "background 0.2s", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }} className="doc-pill">
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
        <div key="Add" className="page-transition" style={{ height: "calc(var(--app-height, 100dvh) - 65px)", overflowY: "auto", overflowX: "hidden", paddingBottom: "24px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", background: "transparent" }}>
          <div style={{ padding: "2px 4px 0", marginBottom: "18px" }}>
            <h2 style={{ fontSize: "30px", fontWeight: 850, marginBottom: "6px", letterSpacing: "-0.03em", color: "#fff", textShadow: "0 0 24px rgba(96,165,250,0.25)" }}>{editingEventId ? t("editEntry") : addViewMode === "calendar" ? t("chooseDate") : t("newEntry")}</h2>
            <p style={{ opacity: 0.75, fontSize: "15px" }}>{editingEventId ? t("editHint") : addViewMode === "calendar" ? t("tapDayHint") : t("newHint")}</p>
          </div>

          {addViewMode === "form" ? (
          <div className="glass-card" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "clamp(14px, 4vw, 22px)", borderRadius: "28px", border: "1px solid rgba(139,92,246,0.55)", background: "linear-gradient(145deg, rgba(10,18,32,0.88), rgba(15,23,42,0.74))", boxShadow: "0 0 0 1px rgba(56,189,248,0.12), 0 24px 60px rgba(0,0,0,0.42), 0 0 38px rgba(124,58,237,0.18)", backdropFilter: "blur(18px)", overflow: "hidden" }}>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "13.5px", opacity: 0.95, marginBottom: "8px", display: "block", fontWeight: 700, color: "rgba(226,232,240,0.92)" }}>{t("titleLabel")}</label>
                <input required type="text" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder={t("titlePlaceholder")} style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", display: "block", background: "rgba(8,15,28,0.72)", border: "1px solid rgba(148,163,184,0.28)", padding: "12px 14px", borderRadius: "18px", color: "white", outline: "none", fontSize: "clamp(14px, 3.6vw, 15px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)", transition: "border-color 0.2s ease, box-shadow 0.2s ease" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "13.5px", opacity: 0.95, marginBottom: "8px", display: "block", fontWeight: 700, color: "rgba(226,232,240,0.92)" }}>{t("dateLabel")}</label>
                  <input required type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", display: "block", background: "rgba(8,15,28,0.72)", border: "1px solid rgba(148,163,184,0.28)", padding: "12px 14px", borderRadius: "18px", color: "white", outline: "none", fontSize: "clamp(14px, 3.6vw, 15px)", lineHeight: 1.2, colorScheme: "dark", WebkitAppearance: "none", appearance: "none", overflow: "hidden", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }} />
                </div>
                <div>
                  <label style={{ fontSize: "13.5px", opacity: 0.95, marginBottom: "8px", display: "block", fontWeight: 700, color: "rgba(226,232,240,0.92)" }}>{t("categoryLabel")}</label>
                  <select value={newEventType} onChange={e => setNewEventType(e.target.value)} style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", display: "block", background: "rgba(8,15,28,0.72)", border: "1px solid rgba(148,163,184,0.28)", padding: "12px 14px", borderRadius: "18px", color: "white", outline: "none", appearance: "none", fontSize: "clamp(14px, 3.6vw, 15px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}>
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
                      <div onClick={() => setIsRecurring(!isRecurring)} style={{ width: "44px", height: "24px", borderRadius: "12px", background: isRecurring ? "linear-gradient(135deg, #38bdf8, #8b5cf6)" : "rgba(255,255,255,0.15)", cursor: "pointer", position: "relative", transition: "all 0.3s ease" }}>
                        <div style={{ position: "absolute", top: "3px", left: isRecurring ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 0.3s ease", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }} />
                      </div>
                    </div>
                    {isRecurring && (
                      <div style={{ background: "linear-gradient(145deg, rgba(15,23,42,0.78), rgba(30,41,59,0.42))", borderRadius: "18px", padding: "14px", border: "1px solid rgba(139,92,246,0.28)", display: "flex", flexDirection: "column", gap: "12px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                        <div>
                          <label style={{ fontSize: "12px", opacity: 0.6, marginBottom: "8px", display: "block" }}>{t("howOften")}</label>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {[{ value: "daily", label: t("daily") }, { value: "weekly", label: t("weekly") }, { value: "biweekly", label: t("biweekly") }, { value: "monthly", label: t("monthly") }, { value: "yearly", label: t("yearly") }].map(opt => (
                              <button key={opt.value} type="button" onClick={() => setRecurringType(opt.value as any)} style={{ padding: "6px 12px", borderRadius: "20px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: recurringType === opt.value ? "linear-gradient(135deg, #38bdf8, #8b5cf6)" : "rgba(255,255,255,0.1)", color: "white", transition: "all 0.2s" }}>
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
                                <button key={idx} type="button" onClick={() => setRecurringDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])} style={{ width: "30px", height: "30px", borderRadius: "50%", border: "none", fontSize: "11px", fontWeight: 700, cursor: "pointer", background: recurringDays.includes(idx) ? "linear-gradient(135deg, #38bdf8, #8b5cf6)" : "rgba(255,255,255,0.1)", color: "white", transition: "all 0.2s" }}>
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

                <label style={{ fontSize: "13.5px", opacity: 0.95, marginBottom: "8px", display: "block", fontWeight: 700, color: "rgba(226,232,240,0.92)" }}>{t("notesLabel")}</label>
                <textarea rows={3} value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} placeholder={t("notesPlaceholder")} style={{ width: "100%", background: "rgba(8,15,28,0.72)", border: "1px solid rgba(148,163,184,0.28)", padding: "14px 16px", borderRadius: "18px", color: "white", outline: "none", resize: "none", fontSize: "15px", minHeight: "92px", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}></textarea>
              </div>

              {/* MEGLÉVŐ CSATOLMÁNYOK (ha szerkesztés van) */}
              {existingAttachments.length > 0 && (
                <div style={{ marginTop: "6px", background: "rgba(8,15,28,0.58)", padding: "12px", borderRadius: "18px", border: "1px dashed rgba(139,92,246,0.32)" }}>
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
              <div style={{ marginTop: "8px", background: "linear-gradient(145deg, rgba(15,23,42,0.72), rgba(30,41,59,0.36))", borderRadius: "18px", border: "1px solid rgba(139,92,246,0.26)", overflow: "hidden", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                <button type="button" onClick={() => setShowMediaSection(!showMediaSection)} style={{ width: "100%", padding: "12px 16px", background: showMediaSection ? "rgba(139,92,246,0.18)" : "transparent", border: "none", color: showMediaSection ? "#a78bfa" : "var(--text-color)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "all 0.2s", borderRadius: "16px" }}>
                  <span style={{ fontSize: "13.5px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📎</span> Mellékletek
                    {(newEventImages.length + newEventDocs.length + newEventAudios.length) > 0 && (
                      <span style={{ background: "#a78bfa", color: "white", borderRadius: "20px", padding: "1px 8px", fontSize: "11px" }}>
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
                
                <button type="button" onClick={() => eventImageInputRef.current?.click()} style={{ width: "100%", padding: "10px", background: "rgba(15,23,42,0.78)", borderRadius: "16px", color: "rgba(226,232,240,0.96)", border: "1px dashed rgba(139,92,246,0.38)", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 500, cursor: "pointer" }}>
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
                
                <button type="button" onClick={() => eventDocInputRef.current?.click()} style={{ width: "100%", padding: "10px", background: "rgba(15,23,42,0.78)", borderRadius: "16px", color: "rgba(226,232,240,0.96)", border: "1px dashed rgba(139,92,246,0.38)", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 500, cursor: "pointer" }}>
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
                    <button type="button" onClick={() => startRecording("event")} style={{ flex: 1, padding: "10px", background: "rgba(139,92,246,0.15)", borderRadius: "12px", color: "#a78bfa", border: "1px dashed #a78bfa", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 600, cursor: "pointer" }}>
                      <span>🎙️</span> Hangjegyzet
                    </button>
                    <button type="button" onClick={() => eventAudioInputRef.current?.click()} style={{ flex: 1, padding: "10px", background: "rgba(15,23,42,0.78)", borderRadius: "16px", color: "rgba(226,232,240,0.96)", border: "1px dashed rgba(139,92,246,0.38)", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 500, cursor: "pointer" }}>
                      <span>📂</span> Hangfájl
                    </button>
                  </div>
                )}
              </div>


                  </div>
                )}
              </div>

                            {/* EMAIL SZEKCIÓ - összecsukható */}
              <div style={{ marginTop: "8px", background: "linear-gradient(145deg, rgba(15,23,42,0.72), rgba(30,41,59,0.36))", borderRadius: "18px", border: "1px solid rgba(139,92,246,0.26)", overflow: "hidden", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                <button type="button" onClick={() => setShowEmailSection(!showEmailSection)} style={{ width: "100%", padding: "12px 16px", background: showEmailSection ? "rgba(139,92,246,0.18)" : "transparent", border: "none", color: showEmailSection ? "#a78bfa" : "var(--text-color)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "all 0.2s", borderRadius: "16px" }}>
                  <span style={{ fontSize: "13.5px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📧</span> Email értesítés
                  </span>
                  <span style={{ fontSize: "12px", opacity: 0.6 }}>{showEmailSection ? "▲" : "▼"}</span>
                </button>
                {showEmailSection && (
                <div style={{ padding: "0 12px 12px" }}>
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ fontSize: "11.5px", opacity: 0.8, marginBottom: "4px", display: "block" }}>{t("recipientEmail")}</label>
                  <input type="email" value={customEmail} onChange={e => setCustomEmail(e.target.value)} placeholder={session?.user?.email || "Email cím..."} style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", padding: "10px 12px", borderRadius: "14px", color: "white", outline: "none", fontSize: "16px", backdropFilter: "blur(10px)", WebkitAppearance: "none", appearance: "none" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
                    <input type="checkbox" checked={emailNotifyNow} onChange={e => setEmailNotifyNow(e.target.checked)} style={{ accentColor: "#a78bfa", width: "18px", height: "18px" }} />
                    Azonnali értesítő email
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
                    <input type="checkbox" checked={emailNotify1Day} onChange={e => setEmailNotify1Day(e.target.checked)} style={{ accentColor: "#a78bfa", width: "18px", height: "18px" }} />
                    Emlékeztető 1 nappal előtte
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
                    <input type="checkbox" checked={emailNotifyCustom} onChange={e => setEmailNotifyCustom(e.target.checked)} style={{ accentColor: "#a78bfa", width: "18px", height: "18px" }} />
                    Dátum és idő szerint
                  </label>
                  {emailNotifyCustom && (
                    <div style={{ marginTop: "4px", paddingLeft: "0", width: "100%", boxSizing: "border-box" }}>
                      <input
                        type="datetime-local"
                        className="mobile-datetime-input"
                        value={customNotifyDateTime ? new Date(customNotifyDateTime.getTime() - customNotifyDateTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                        onChange={(e) => setCustomNotifyDateTime(e.target.value ? new Date(e.target.value) : null)}
                        style={{
                          width: "100%",
                          maxWidth: "100%",
                          boxSizing: "border-box",
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          padding: "11px 12px",
                          borderRadius: "14px",
                          color: "white",
                          outline: "none",
                          fontSize: "16px",
                          WebkitAppearance: "none",
                          appearance: "none",
                        }}
                      />
                    </div>
                  )}
                </div>
                </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
                {editingEventId && (
                  <button type="button" onClick={() => { resetForm(); setActiveTab(t("timelineTitle")); }} style={{ flex: 1, padding: "18px", background: "rgba(15,23,42,0.82)", border: "1px solid rgba(148,163,184,0.28)", borderRadius: "20px", color: "rgba(226,232,240,0.96)", fontWeight: 600, fontSize: "17px" }}>{t("cancel")}</button>
                )}
                <button type="submit" disabled={isUploading} style={{ flex: 2, padding: "18px", background: "linear-gradient(135deg, #38bdf8, #8b5cf6)", border: "none", borderRadius: "20px", color: "white", fontWeight: 800, boxShadow: "0 12px 30px rgba(124,58,237,0.35), 0 0 22px rgba(56,189,248,0.16)", fontSize: "17px", opacity: isUploading ? 0.7 : 1 }}>
                  {isUploading ? t("uploading") : (editingEventId ? t("saveChanges") : t("save"))}
                </button>
              </div>
            </form>
          </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Naptár */}
              <div
                className="glass-card"
                style={{
                  position: "relative",
                  padding: "18px",
                  overflow: "hidden",
                  width: "100%",
                  borderRadius: "26px",
                  background: "linear-gradient(145deg, rgba(8,13,33,0.94) 0%, rgba(25,23,72,0.86) 48%, rgba(5,13,30,0.96) 100%)",
                  border: "1px solid rgba(125,211,252,0.38)",
                  boxShadow: "0 0 34px rgba(56,189,248,0.16), 0 0 46px rgba(168,85,247,0.13), inset 0 1px 0 rgba(255,255,255,0.10)",
                  backdropFilter: "blur(18px)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at 88% 12%, rgba(139,92,246,0.20), transparent 32%), radial-gradient(circle at 14% 86%, rgba(34,211,238,0.12), transparent 34%), radial-gradient(circle at 88% 94%, rgba(99,102,241,0.22), transparent 22%)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: "-34px",
                    bottom: "-42px",
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle at 35% 35%, rgba(124,58,237,0.42), rgba(30,64,175,0.10) 54%, transparent 70%)",
                    filter: "blur(1px)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: "1px",
                    borderRadius: "25px",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.07), transparent 45%)",
                    pointerEvents: "none",
                  }}
                />

                {/* Naptár fejléc */}
                <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "15px",
                        background: "linear-gradient(135deg, #38bdf8 0%, #8b5cf6 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                        boxShadow: "0 0 24px rgba(56,189,248,0.32), 0 0 26px rgba(139,92,246,0.26)",
                        flexShrink: 0,
                      }}
                    >
                      📅
                    </div>
                    <h3 style={{ fontSize: "clamp(22px, 6vw, 28px)", fontWeight: 900, color: "#ffffff", margin: 0, letterSpacing: "-0.04em", textShadow: "0 0 22px rgba(255,255,255,0.10)" }}>
                      {lang === "hu" ? "Naptár" : "Calendar"}
                    </h3>
                  </div>
                  <button
                    onClick={() => setNewEventDate(new Date().toISOString().split("T")[0])}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "18px",
                      background: "rgba(17,24,39,0.38)",
                      border: "1px solid rgba(167,139,250,0.45)",
                      color: "rgba(226,232,240,0.86)",
                      fontSize: "13px",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 18px rgba(139,92,246,0.12)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <span>📅</span> {lang === "hu" ? "Mai nap" : "Today"}
                  </button>
                </div>

                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    padding: "14px 12px 16px",
                    borderRadius: "22px",
                    background: "linear-gradient(145deg, rgba(5,10,28,0.64), rgba(23,25,71,0.54))",
                    border: "1px solid rgba(167,139,250,0.25)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 24px rgba(0,0,0,0.18)",
                    overflow: "hidden",
                  }}
                >
                  <DatePicker
                    inline
                    locale={lang === "hu" ? "hu" : "en"}
                    selected={newEventDate ? new Date(newEventDate) : new Date()}
                    onChange={(date: Date | null) => {
                      if (date) {
                        setNewEventDate(date.toISOString().split("T")[0]);
                      }
                    }}
                    calendarClassName="custom-calendar lifesync-neon-calendar"
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
                </div>

                <style>{`
                  .lifesync-neon-calendar {
                    width: 100% !important;
                    max-width: 100% !important;
                    border: none !important;
                    background: transparent !important;
                    font-family: 'SF Pro Display', 'Inter', sans-serif !important;
                    overflow: hidden !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__month-container {
                    width: 100% !important;
                    max-width: 100% !important;
                    float: none !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__header {
                    position: relative !important;
                    background: rgba(15,23,42,0.34) !important;
                    border: none !important;
                    padding: 12px 8px 8px !important;
                    border-radius: 18px !important;
                    margin-bottom: 10px !important;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08) !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__current-month {
                    color: white !important;
                    font-weight: 900 !important;
                    font-size: 20px !important;
                    letter-spacing: 0.04em !important;
                    text-transform: capitalize !important;
                    padding: 0 44px !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__day-names,
                  .lifesync-neon-calendar .react-datepicker__week {
                    display: grid !important;
                    grid-template-columns: repeat(7, 1fr) !important;
                    align-items: center !important;
                    gap: 4px !important;
                    width: 100% !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__day-name {
                    color: rgba(226,232,240,0.74) !important;
                    font-weight: 800 !important;
                    width: auto !important;
                    max-width: none !important;
                    line-height: 30px !important;
                    font-size: 13px !important;
                    margin: 0 !important;
                    text-transform: capitalize !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__month {
                    margin: 0 !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__day {
                    position: relative !important;
                    color: rgba(248,250,252,0.92) !important;
                    width: auto !important;
                    max-width: none !important;
                    height: 40px !important;
                    line-height: 40px !important;
                    border-radius: 14px !important;
                    margin: 0 !important;
                    font-size: 18px !important;
                    font-weight: 750 !important;
                    transition: transform 0.16s ease, background 0.16s ease, box-shadow 0.16s ease !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__day:hover {
                    background: rgba(139,92,246,0.18) !important;
                    transform: translateY(-1px) !important;
                    box-shadow: 0 0 16px rgba(139,92,246,0.14) !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__day--selected,
                  .lifesync-neon-calendar .react-datepicker__day--keyboard-selected {
                    color: white !important;
                    background: linear-gradient(135deg, #38bdf8 0%, #2563eb 45%, #8b5cf6 100%) !important;
                    font-weight: 900 !important;
                    border: 1px solid rgba(125,211,252,0.48) !important;
                    box-shadow: 0 0 18px rgba(56,189,248,0.36), 0 0 26px rgba(139,92,246,0.32) !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__day--outside-month {
                    color: rgba(148,163,184,0.34) !important;
                  }
                  .lifesync-neon-calendar .sunday-day {
                    color: #c084fc !important;
                    font-weight: 850 !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__day--selected.sunday-day,
                  .lifesync-neon-calendar .react-datepicker__day--keyboard-selected.sunday-day {
                    color: white !important;
                  }
                  .lifesync-neon-calendar .has-event-day::after {
                    content: '' !important;
                    position: absolute !important;
                    bottom: 5px !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    width: 6px !important;
                    height: 6px !important;
                    background: #22d3ee !important;
                    border-radius: 50% !important;
                    box-shadow: 0 0 10px rgba(34,211,238,0.9) !important;
                  }
                  .lifesync-neon-calendar .sunday-day.has-event-day::after {
                    background: #c084fc !important;
                    box-shadow: 0 0 10px rgba(192,132,252,0.9) !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__navigation {
                    top: 16px !important;
                    width: 34px !important;
                    height: 34px !important;
                    border-radius: 12px !important;
                    background: rgba(99,102,241,0.18) !important;
                    border: 1px solid rgba(167,139,250,0.22) !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__navigation:hover {
                    background: rgba(139,92,246,0.25) !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__navigation--previous {
                    left: 8px !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__navigation--next {
                    right: 8px !important;
                  }
                  .lifesync-neon-calendar .react-datepicker__navigation-icon::before {
                    border-color: rgba(248,250,252,0.92) !important;
                    border-width: 2px 2px 0 0 !important;
                    height: 9px !important;
                    width: 9px !important;
                  }
                  @media (max-width: 380px) {
                    .lifesync-neon-calendar .react-datepicker__day {
                      height: 36px !important;
                      line-height: 36px !important;
                      font-size: 16px !important;
                    }
                    .lifesync-neon-calendar .react-datepicker__current-month {
                      font-size: 18px !important;
                    }
                  }
                `}</style>
              </div>

              {/* Esemény hozzáadása gomb + nap eseményei */}
              <div
                style={{
                  position: "relative",
                  marginTop: "16px",
                  padding: "14px",
                  borderRadius: "24px",
                  overflow: "hidden",
                  background: "linear-gradient(145deg, rgba(7,12,31,0.86), rgba(20,24,67,0.72))",
                  border: "1px solid rgba(96,165,250,0.22)",
                  boxShadow: "0 0 26px rgba(59,130,246,0.10), inset 0 1px 0 rgba(255,255,255,0.07)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(circle at 86% 20%, rgba(139,92,246,0.16), transparent 34%), radial-gradient(circle at 16% 90%, rgba(34,211,238,0.09), transparent 30%)",
                    pointerEvents: "none",
                  }}
                />

                {/* Kiválasztott nap jelzése */}
                <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, rgba(56,189,248,0.22), rgba(139,92,246,0.22))",
                      border: "1px solid rgba(167,139,250,0.24)",
                      boxShadow: "0 0 18px rgba(139,92,246,0.14)",
                      flexShrink: 0,
                    }}
                  >
                    📅
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: "rgba(248,250,252,0.96)", fontSize: "clamp(15px, 4vw, 18px)", fontWeight: 900, lineHeight: 1.2 }}>
                      {lang === "hu" ? "Események" : "Events"}
                    </div>
                    <div style={{ color: "rgba(203,213,225,0.68)", fontSize: "13px", lineHeight: 1.35, marginTop: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {newEventDate ? new Date(newEventDate + "T00:00:00").toLocaleDateString(lang === "hu" ? "hu-HU" : "en-US", { year: "numeric", month: "long", day: "numeric", weekday: "long" }) : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => setAddViewMode("form")}
                    style={{
                      width: "46px",
                      height: "46px",
                      borderRadius: "16px",
                      border: "1px solid rgba(125,211,252,0.28)",
                      background: "linear-gradient(135deg, #38bdf8 0%, #8b5cf6 100%)",
                      color: "#ffffff",
                      fontSize: "25px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: "0 0 22px rgba(56,189,248,0.25), 0 0 24px rgba(139,92,246,0.25)",
                      flexShrink: 0,
                    }}
                    aria-label={lang === "hu" ? "Esemény hozzáadása" : "Add event"}
                  >
                    +
                  </button>
                </div>

                {/* Nap eseményei */}
                <div style={{ position: "relative", zIndex: 1 }}>
                  {(() => {
                    const selectedDateEvents = events.filter(e => e.event_date === newEventDate);
                    if (selectedDateEvents.length === 0) return (
                      <div
                        style={{
                          padding: "14px 14px",
                          borderRadius: "18px",
                          background: "rgba(15,23,42,0.38)",
                          border: "1px solid rgba(148,163,184,0.14)",
                          color: "rgba(203,213,225,0.58)",
                          fontSize: "13px",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        {lang === "hu" ? "Nincs esemény ezen a napon" : "No events on this day"}
                      </div>
                    );
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                        <div style={{ fontSize: "12px", color: "rgba(203,213,225,0.58)", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                          {selectedDateEvents.length} {lang === "hu" ? "esemény erre a napra" : "events on this day"}
                        </div>
                        {selectedDateEvents.map(event => (
                          <div
                            key={event.id}
                            onClick={() => { setScrollToEventId(event.id); setActiveTab("Timeline"); }}
                            style={{
                              padding: "12px 13px",
                              background: "linear-gradient(135deg, rgba(30,41,59,0.58), rgba(15,23,42,0.46))",
                              borderRadius: "16px",
                              cursor: "pointer",
                              border: "1px solid rgba(125,211,252,0.18)",
                              display: "flex",
                              alignItems: "center",
                              gap: "11px",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                              transition: "transform 0.18s ease, border-color 0.18s ease",
                            }}
                          >
                            <div
                              style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                background: event.category === 'event' ? '#8b5cf6' : event.category === 'utility' ? '#f59e0b' : '#22c55e',
                                boxShadow: event.category === 'event' ? "0 0 12px rgba(139,92,246,0.75)" : event.category === 'utility' ? "0 0 12px rgba(245,158,11,0.70)" : "0 0 12px rgba(34,197,94,0.70)",
                                flexShrink: 0
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 850, fontSize: "14px", color: "rgba(248,250,252,0.95)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {event.title}
                              </div>
                              {event.description && (
                                <div style={{ fontSize: "12px", color: "rgba(203,213,225,0.56)", marginTop: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {event.description.substring(0, 70)}{event.description.length > 70 ? "..." : ""}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: "18px", color: "rgba(226,232,240,0.44)", lineHeight: 1 }}>›</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>


            </div>
          )}
        </div>
      )}

      {activeTab === "Profile" && (
        <div key="Profile" className="page-transition" style={{ height: "calc(var(--app-height, 100dvh) - 92px)", overflowY: "auto", paddingBottom: "22px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", padding: "0 2px" }}>
          <div style={{ padding: "0 6px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "10px" }}>
            <div>
              <h2 style={{ fontSize: "clamp(26px, 8vw, 32px)", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.04em", textShadow: "0 10px 35px rgba(255,255,255,0.12)" }}>{t("profileTitle")}</h2>
              <p style={{ color: "rgba(226,232,240,0.7)", fontSize: "13px", marginTop: "6px", lineHeight: 1.35 }}>{t("profileSubtitle")}</p>
            </div>
            <div style={{ width: "42px", height: "42px", borderRadius: "15px", background: "linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,41,59,0.65))", border: "1px solid rgba(148,163,184,0.22)", boxShadow: "0 0 25px rgba(139,92,246,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>👤</div>
          </div>

          <div style={{ position: "relative", padding: "16px", borderRadius: "24px", marginBottom: "22px", overflow: "hidden", background: "linear-gradient(145deg, rgba(13,22,36,0.96), rgba(12,18,34,0.86))", border: "1px solid rgba(76,169,255,0.72)", boxShadow: "0 0 0 1px rgba(168,85,247,0.35), 0 24px 70px rgba(0,0,0,0.36), inset 0 0 42px rgba(59,130,246,0.08)" }}>
            <div style={{ position: "absolute", right: "-42px", bottom: "-58px", width: "150px", height: "150px", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.16), transparent 68%)" }} />
            <div style={{ position: "absolute", right: "12px", bottom: "8px", fontSize: "130px", lineHeight: 1, color: "rgba(255,255,255,0.025)", fontWeight: 900 }}>S</div>

            {isEditingProfile ? (
              <form onSubmit={handleUpdateProfile} style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "14px", alignItems: "center", width: "100%" }}>
                <input type="file" accept="image/*" ref={profileFileInputRef} hidden onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setEditProfileFile(e.target.files[0]);
                    setEditProfilePreview(URL.createObjectURL(e.target.files[0]));
                  }
                }} />
                <div onClick={() => profileFileInputRef.current?.click()} style={{ position: "relative", width: "114px", height: "114px", borderRadius: "50%", padding: "4px", cursor: "pointer", background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #e879f9)", boxShadow: "0 0 32px rgba(99,102,241,0.45)" }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "rgba(15,23,42,0.9)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "30px" }}>
                    {editProfilePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editProfilePreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : "📷"}
                  </div>
                  <span style={{ position: "absolute", right: "0", bottom: "2px", width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #9333ea)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", boxShadow: "0 10px 24px rgba(0,0,0,0.35)" }}>✎</span>
                </div>
                <small style={{ color: "rgba(226,232,240,0.62)" }}>{t("clickToChange")}</small>
                <input type="text" value={editProfileName} onChange={e => setEditProfileName(e.target.value)} placeholder={t("fullName")} style={{ width: "100%", background: "rgba(2,6,23,0.55)", border: "1px solid rgba(148,163,184,0.32)", padding: "15px 16px", borderRadius: "16px", color: "white", outline: "none", fontSize: "15px" }} />
                <input type="password" value={editProfilePassword} onChange={e => setEditProfilePassword(e.target.value)} placeholder={t("newPassword")} style={{ width: "100%", background: "rgba(2,6,23,0.55)", border: "1px solid rgba(148,163,184,0.32)", padding: "15px 16px", borderRadius: "16px", color: "white", outline: "none", fontSize: "15px" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", width: "100%", marginTop: "4px" }}>
                  <button type="button" onClick={() => setIsEditingProfile(false)} style={{ padding: "15px", background: "rgba(15,23,42,0.65)", border: "1px solid rgba(148,163,184,0.28)", borderRadius: "17px", color: "white", fontWeight: 800, cursor: "pointer" }}>{t("cancel")}</button>
                  <button type="submit" disabled={isUpdatingProfile} style={{ padding: "15px", background: "linear-gradient(135deg, #38bdf8, #7c3aed, #c026d3)", border: "none", borderRadius: "17px", color: "white", fontWeight: 900, cursor: "pointer", boxShadow: "0 12px 32px rgba(124,58,237,0.35)", opacity: isUpdatingProfile ? 0.7 : 1 }}>{isUpdatingProfile ? "Mentés..." : t("save")}</button>
                </div>
              </form>
            ) : (
              <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "82px minmax(0, 1fr)", alignItems: "center", gap: "14px" }}>
                <div style={{ position: "relative", width: "82px", height: "82px", borderRadius: "50%", padding: "3px", background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #f8fafc)", boxShadow: "0 0 28px rgba(59,130,246,0.45)" }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: avatarUrl ? "transparent" : "linear-gradient(135deg, #facc15, #fb923c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px" }}>
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : "👤"}
                  </div>
                  <button onClick={openEditProfile} style={{ position: "absolute", right: "-5px", bottom: "-4px", width: "38px", height: "38px", borderRadius: "50%", border: "1px solid rgba(168,85,247,0.65)", background: "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(147,51,234,0.95))", color: "white", boxShadow: "0 12px 28px rgba(0,0,0,0.45)", cursor: "pointer", fontSize: "14px" }}>✎</button>
                </div>
                <div>
                  <h3 style={{ fontSize: "clamp(18px, 5.4vw, 22px)", fontWeight: 900, margin: "0 0 5px", color: "#fff", letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{formattedName}</h3>
                  <p style={{ fontSize: "12.5px", color: "rgba(226,232,240,0.66)", marginBottom: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session?.user?.email}</p>
                  <button onClick={openEditProfile} style={{ width: "100%", maxWidth: "190px", padding: "11px 12px", background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.55))", borderRadius: "15px", border: "1px solid rgba(168,85,247,0.75)", color: "#fff", fontSize: "12.5px", fontWeight: 850, cursor: "pointer", boxShadow: "0 0 24px rgba(139,92,246,0.18)", whiteSpace: "nowrap" }}>✎ Profil szerkesztése</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <h4 style={{ fontSize: "13px", fontWeight: 900, color: "rgba(148,163,184,0.78)", marginLeft: "10px", letterSpacing: "2px" }}>{lang === "hu" ? "BEÁLLÍTÁSOK" : "SETTINGS"}</h4>
            <div style={{ borderRadius: "24px", overflow: "hidden", background: "linear-gradient(145deg, rgba(13,22,36,0.96), rgba(12,18,34,0.88))", border: "1px solid rgba(76,169,255,0.62)", boxShadow: "0 0 0 1px rgba(139,92,246,0.22), inset 0 0 42px rgba(59,130,246,0.06)" }}>
              {[
                { icon: "🔔", title: "Rendszer Értesítések", sub: lang === "hu" ? "Kattints az engedélyezéshez" : "Click to enable", onClick: async () => {
                  if ("Notification" in window) {
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                      playNotificationSound(true);
                      new Notification("LifeSync", { body: "Értesítések sikeresen engedélyezve!", icon: "/icon.png" });
                    } else alert("Az értesítések blokkolva vannak. Engedélyezd őket a böngésző beállításaiban!");
                  } else alert("A böngésződ nem támogatja a push értesítéseket.");
                }, right: <div style={{ width: "44px", height: "26px", borderRadius: "999px", background: "linear-gradient(135deg, #38bdf8, #8b5cf6)", position: "relative", boxShadow: "0 0 22px rgba(99,102,241,0.5)" }}><div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "white", position: "absolute", right: "3px", top: "3px" }} /></div> },
                { icon: "🔊", title: t("soundNotify"), sub: lang === "hu" ? "Hangjelzés sikeres mentéseknél" : "Sound on successful saves", right: <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><button onClick={(e) => { e.stopPropagation(); playNotificationSound(true); }} style={{ padding: "7px 9px", background: "rgba(15,23,42,0.68)", border: "1px solid rgba(59,130,246,0.35)", borderRadius: "11px", color: "white", fontWeight: 800, cursor: "pointer", fontSize: "11.5px", whiteSpace: "nowrap" }}>Teszt ▶</button><div onClick={(e) => { e.stopPropagation(); setSoundEnabled(!soundEnabled); }} style={{ width: "44px", height: "26px", borderRadius: "999px", background: soundEnabled ? "linear-gradient(135deg, #38bdf8, #8b5cf6)" : "rgba(71,85,105,0.45)", position: "relative", cursor: "pointer" }}><div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "white", position: "absolute", left: soundEnabled ? "21px" : "3px", top: "3px", transition: "all 0.25s" }} /></div></div> },
                { icon: "🌙", title: t("darkMode"), sub: isDarkMode ? "Bekapcsolva" : "Kikapcsolva", onClick: toggleTheme, right: <div style={{ width: "44px", height: "26px", borderRadius: "999px", background: isDarkMode ? "linear-gradient(135deg, #38bdf8, #8b5cf6)" : "rgba(71,85,105,0.45)", position: "relative" }}><div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "white", position: "absolute", left: isDarkMode ? "21px" : "3px", top: "3px", transition: "all 0.25s" }} /></div> },
                { icon: "📧", title: t("savedLogin"), sub: typeof window !== "undefined" && localStorage.getItem("remembered_login_email") ? localStorage.getItem("remembered_login_email") || "" : t("notSaved"), right: typeof window !== "undefined" && localStorage.getItem("remembered_login_email") ? <button onClick={(e) => { e.stopPropagation(); localStorage.removeItem("remembered_login_email"); setEmail(""); showToast("Bejelentkezési email törölve a memóriából!", 'info'); }} style={{ padding: "8px 10px", background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.65)", borderRadius: "12px", color: "#fb7185", fontWeight: 850, cursor: "pointer", fontSize: "11.5px", whiteSpace: "nowrap" }}>Törlés 🗑</button> : <span style={{ color: "rgba(148,163,184,0.55)", fontSize: "24px" }}>›</span> },
                { icon: "✉️", title: t("savedRecipient"), sub: typeof window !== "undefined" && localStorage.getItem("remembered_custom_email") ? localStorage.getItem("remembered_custom_email") || "" : t("notSaved"), right: <span style={{ color: "rgba(148,163,184,0.55)", fontSize: "30px" }}>›</span> },
                { icon: "🚪", title: t("signOutLabel"), sub: "", onClick: () => supabase.auth.signOut(), danger: true, right: <span style={{ color: "rgba(148,163,184,0.55)", fontSize: "30px" }}>›</span> },
              ].map((item, idx) => (
                <div key={idx} onClick={item.onClick} style={{ padding: "13px 12px", display: "grid", gridTemplateColumns: "42px minmax(0, 1fr) auto", gap: "10px", alignItems: "center", borderBottom: idx === 5 ? "none" : "1px solid rgba(148,163,184,0.12)", cursor: item.onClick ? "pointer" : "default", minHeight: "72px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "13px", background: "linear-gradient(145deg, rgba(30,41,59,0.82), rgba(15,23,42,0.72))", border: "1px solid rgba(148,163,184,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px" }}>{item.icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: item.danger ? "#f43f5e" : "#fff", fontSize: "clamp(13.5px, 4vw, 15.5px)", fontWeight: 850, lineHeight: 1.18, overflowWrap: "anywhere" }}>{item.title}</div>
                    {item.sub && <div style={{ color: "rgba(226,232,240,0.58)", fontSize: "11.5px", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.sub}</div>}
                  </div>
                  {item.right}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Vault" && (
        <div key="Vault" ref={vaultScrollRef} className="page-transition" style={{ height: "calc(var(--app-height, 100dvh) - 120px)", overflowY: "auto", paddingBottom: "22px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
          {activeVaultFolder ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => setActiveVaultFolder(null)} style={{ background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.55))", border: "1px solid rgba(148,163,184,0.22)", padding: "12px 18px", borderRadius: "16px", color: "white", fontWeight: 850, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>← {lang === "hu" ? "Vissza" : "Back"}</button>
                <button onClick={() => setIsEditingVaultFolder(!isEditingVaultFolder)} style={{ background: "rgba(139,92,246,0.16)", border: "1px solid rgba(168,85,247,0.5)", padding: "12px 18px", borderRadius: "16px", color: "#d8b4fe", fontWeight: 850, cursor: "pointer", fontSize: "14px" }}>{isEditingVaultFolder ? t("cancel") : "⚙️ " + t("settings")}</button>
              </div>

              <div style={{ position: "relative", padding: "22px", borderRadius: "26px", overflow: "hidden", background: "linear-gradient(145deg, rgba(13,22,36,0.96), rgba(12,18,34,0.86))", border: "1px solid rgba(76,169,255,0.56)", boxShadow: "0 0 0 1px rgba(168,85,247,0.28), 0 20px 55px rgba(0,0,0,0.35)" }}>
                <div style={{ position: "absolute", right: "-40px", bottom: "-70px", width: "180px", height: "180px", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.18), transparent 65%)" }} />
                {isEditingVaultFolder ? (
                  <form onSubmit={handleUpdateVaultFolder} style={{ position: "relative", display: "flex", flexDirection: "column", gap: "13px" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: 900, color: "white" }}>{t("projectSettings")}</h3>
                    <input autoFocus required type="text" value={editVaultFolderName} onChange={e => setEditVaultFolderName(e.target.value)} placeholder={t("projectName")} style={{ width: "100%", background: "rgba(2,6,23,0.55)", border: "1px solid rgba(148,163,184,0.32)", padding: "15px 16px", borderRadius: "16px", color: "white", outline: "none", fontSize: "15px" }} />
                    <input type="text" value={editVaultFolderDescription} onChange={e => setEditVaultFolderDescription(e.target.value)} placeholder={t("projectDesc")} style={{ width: "100%", background: "rgba(2,6,23,0.55)", border: "1px solid rgba(148,163,184,0.32)", padding: "15px 16px", borderRadius: "16px", color: "white", outline: "none", fontSize: "15px" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                      {['📁', '📄', '💼', '⚡', '🏠', '🚗', '🎂', '🔑'].map(icon => (
                        <button key={icon} type="button" onClick={() => setEditVaultFolderIcon(icon)} style={{ height: "54px", borderRadius: "16px", background: editVaultFolderIcon === icon ? "rgba(139,92,246,0.28)" : "rgba(15,23,42,0.55)", border: editVaultFolderIcon === icon ? "1px solid rgba(168,85,247,0.75)" : "1px solid rgba(148,163,184,0.16)", cursor: "pointer", fontSize: "24px" }}>{icon}</button>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "4px" }}>
                      <button type="button" onClick={handleDeleteVaultFolder} style={{ padding: "15px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.42)", borderRadius: "17px", color: "#f87171", fontWeight: 850, cursor: "pointer" }}>{t("deleteProject")}</button>
                      <button type="submit" style={{ padding: "15px", background: "linear-gradient(135deg, #38bdf8, #7c3aed, #c026d3)", border: "none", borderRadius: "17px", color: "white", fontWeight: 900, cursor: "pointer", boxShadow: "0 12px 32px rgba(124,58,237,0.35)" }}>{t("save")}</button>
                    </div>
                  </form>
                ) : (
                  <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "18px" }}>
                    <div style={{ width: "68px", height: "68px", borderRadius: "20px", background: "linear-gradient(135deg, #38bdf8, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "33px", boxShadow: "0 0 32px rgba(99,102,241,0.42)", flexShrink: 0 }}>{activeVaultFolder.icon || '📁'}</div>
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ fontSize: "26px", fontWeight: 900, color: "white", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeVaultFolder.name}</h2>
                      {activeVaultFolder.description && <p style={{ color: "rgba(226,232,240,0.62)", fontSize: "14px", marginTop: "5px" }}>{activeVaultFolder.description}</p>}
                      <p style={{ color: "rgba(226,232,240,0.45)", fontSize: "13px", marginTop: "6px" }}>{vaultFiles.length} {lang === "hu" ? "fájl" : "files"}</p>
                    </div>
                  </div>
                )}
              </div>

              <input type="file" ref={vaultFileInputRef} hidden multiple onChange={handleUploadVaultFile} />
              {isRecording && recordingTarget === "folder" ? (
                <div style={{ display: "flex", alignItems: "center", gap: "9px", padding: "16px", background: "rgba(239,68,68,0.12)", borderRadius: "18px", border: "1px solid rgba(239,68,68,0.35)" }}><span style={{ color: "#f87171" }}>🔴</span><span style={{ fontSize: "15px", fontWeight: 800, flex: 1, color: "white" }}>Rögzítés... {formatTime(recordingSeconds)}</span><button onClick={stopRecording} style={{ padding: "9px 15px", background: "#ef4444", border: "none", borderRadius: "12px", color: "white", fontWeight: 800, cursor: "pointer" }}>{t("stopRecording")}</button></div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <button onClick={() => vaultFileInputRef.current?.click()} disabled={isUploadingVaultFile} style={{ padding: "16px", background: "rgba(59,130,246,0.1)", border: "1px dashed rgba(56,189,248,0.45)", borderRadius: "18px", color: "#93c5fd", fontWeight: 850, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: "pointer" }}>{isUploadingVaultFile ? '⏳' : '📤'} {isUploadingVaultFile ? t("uploading") : t("uploadFile")}</button>
                  <button onClick={() => startRecording("folder")} disabled={isUploadingVaultFile} style={{ padding: "16px", background: "rgba(168,85,247,0.1)", border: "1px dashed rgba(168,85,247,0.48)", borderRadius: "18px", color: "#d8b4fe", fontWeight: 850, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: "pointer" }}>🎙️ {lang === "hu" ? "Hangjegyzet" : "Voice note"}</button>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {vaultFiles.map(file => (
                  <div key={file.id} style={{ padding: "15px", borderRadius: "18px", display: "flex", alignItems: "center", gap: "14px", background: "linear-gradient(145deg, rgba(15,23,42,0.72), rgba(30,41,59,0.45))", border: "1px solid rgba(148,163,184,0.15)" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "15px", background: "rgba(139,92,246,0.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", overflow: "hidden", flexShrink: 0 }}>
                      {file.file_type?.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={file.file_url} alt="Kép" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : file.file_type?.startsWith('audio/') ? '🎙️' : '📄'}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer" style={{ color: "white", textDecoration: "none" }}><h4 style={{ fontSize: "14px", fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</h4></a>
                      <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.44)", marginTop: "3px" }}>{new Date(file.created_at).toLocaleDateString()}</p>
                      {file.file_type?.startsWith('audio/') && <audio controls src={file.file_url} style={{ width: "100%", height: "30px", marginTop: "6px" }} />}
                    </div>
                    <button onClick={() => handleDeleteVaultFile(file.id)} style={{ width: "36px", height: "36px", borderRadius: "13px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.26)", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: "0 6px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "10px" }}>
                <div>
                  <h2 style={{ fontSize: "34px", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.04em", textShadow: "0 10px 35px rgba(255,255,255,0.12)" }}>{t("vaultTitle")}</h2>
                  <p style={{ color: "rgba(226,232,240,0.7)", fontSize: "15px", marginTop: "6px", lineHeight: 1.45 }}>{t("vaultSubtitle")}</p>
                </div>
                <div style={{ width: "40px", height: "40px", borderRadius: "13px", background: "linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,41,59,0.65))", border: "1px solid rgba(148,163,184,0.22)", boxShadow: "0 0 25px rgba(139,92,246,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "23px" }}>🗂️</div>
              </div>

              {vaultFolders.length === 0 && !isCreatingFolder && (
                <div style={{ padding: "18px", borderRadius: "22px", border: "1px solid rgba(76,169,255,0.24)", background: "linear-gradient(145deg, rgba(15,23,42,0.7), rgba(30,41,59,0.42))", marginBottom: "18px", display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "54px", height: "54px", borderRadius: "50%", border: "1px dashed rgba(168,85,247,0.65)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7", fontSize: "24px", flexShrink: 0 }}>□</div>
                  <div><p style={{ color: "white", fontWeight: 850, fontSize: "16px", marginBottom: "4px" }}>{lang === "hu" ? "Még nincs projekted." : "No projects yet."}</p><p style={{ color: "rgba(226,232,240,0.55)", fontSize: "13px" }}>{lang === "hu" ? "Hozz létre egyet, hogy rendszerezd a fontos dolgaidat." : "Create one to organize your important things."}</p></div>
                </div>
              )}

              {vaultFolders.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
                  {vaultFolders.map(folder => (
                    <div key={folder.id} onClick={() => handleOpenFolder(folder)} style={{ padding: "18px", borderRadius: "22px", background: "linear-gradient(145deg, rgba(15,23,42,0.72), rgba(30,41,59,0.44))", border: "1px solid rgba(148,163,184,0.16)", display: "flex", flexDirection: "column", gap: "14px", cursor: "pointer", boxShadow: "inset 0 0 26px rgba(59,130,246,0.04)" }}>
                      <div style={{ width: "50px", height: "50px", borderRadius: "16px", background: "linear-gradient(135deg, #38bdf8, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", boxShadow: "0 0 24px rgba(99,102,241,0.32)" }}>{folder.icon || '📁'}</div>
                      <div><h3 style={{ fontSize: "15px", fontWeight: 850, color: "white", marginBottom: "4px" }}>{folder.name}</h3><p style={{ fontSize: "12px", color: "rgba(226,232,240,0.45)" }}>{t("open")}</p></div>
                    </div>
                  ))}
                </div>
              )}

              {isCreatingFolder ? (
                <section style={{ position: "relative", padding: "18px", borderRadius: "24px", overflow: "hidden", background: "linear-gradient(145deg, rgba(5,10,24,0.96), rgba(17,24,45,0.88))", border: "1px solid rgba(76,169,255,0.58)", boxShadow: "0 0 0 1px rgba(168,85,247,0.34), 0 22px 56px rgba(0,0,0,0.34), inset 0 0 38px rgba(59,130,246,0.06)" }}>
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 36%), radial-gradient(circle at bottom right, rgba(168,85,247,0.16), transparent 42%)" }} />
                  <form onSubmit={handleCreateFolder} style={{ position: "relative", display: "flex", flexDirection: "column", gap: "13px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "8px", borderBottom: "1px solid rgba(148,163,184,0.12)" }}><div style={{ width: "42px", height: "42px", borderRadius: "16px", background: "linear-gradient(135deg, #38bdf8, #9333ea)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", color: "white", boxShadow: "0 0 24px rgba(99,102,241,0.38)", flexShrink: 0 }}>+</div><h3 style={{ fontSize: "21px", fontWeight: 900, color: "white", margin: 0, letterSpacing: "-0.02em" }}>{t("newProject")}</h3></div>

                    <div style={{ position: "relative" }}><span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", opacity: 0.65 }}>▭</span><input required type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder={t("projectNamePlaceholder")} style={{ width: "100%", background: "rgba(2,6,23,0.55)", border: "1px solid rgba(148,163,184,0.32)", padding: "13px 14px 13px 46px", borderRadius: "14px", color: "white", outline: "none", fontSize: "15px", fontWeight: 600 }} /></div>
                    <div style={{ position: "relative" }}><span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", opacity: 0.65 }}>✎</span><input type="text" value={newFolderDescription} onChange={e => setNewFolderDescription(e.target.value)} placeholder={t("projectDescPlaceholder")} style={{ width: "100%", background: "rgba(2,6,23,0.55)", border: "1px solid rgba(148,163,184,0.32)", padding: "13px 14px 13px 46px", borderRadius: "14px", color: "white", outline: "none", fontSize: "15px", fontWeight: 600 }} /></div>

                    <div><p style={{ fontSize: "13px", color: "rgba(255,255,255,0.84)", marginBottom: "8px", fontWeight: 850 }}>{t("categoryLabel")}</p><div style={{ display: "flex", gap: "9px", overflowX: "auto", paddingBottom: "2px", scrollbarWidth: "none" }}>{['📁', '📄', '💼', '⚡', '🏠', '🚗', '🎂'].map(icon => (<button key={icon} type="button" onClick={() => setNewFolderIcon(icon)} style={{ width: "48px", height: "48px", minWidth: "48px", borderRadius: "15px", background: newFolderIcon === icon ? "linear-gradient(145deg, rgba(59,130,246,0.25), rgba(147,51,234,0.24))" : "rgba(15,23,42,0.58)", border: newFolderIcon === icon ? "1px solid rgba(168,85,247,0.82)" : "1px solid rgba(148,163,184,0.18)", cursor: "pointer", fontSize: "20px", boxShadow: newFolderIcon === icon ? "0 0 16px rgba(139,92,246,0.28)" : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</button>))}</div></div>

                    <div>
                      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.84)", marginBottom: "7px", fontWeight: 850 }}>{t("imagesLabel")}</p>
                      <input type="file" ref={folderImageInputRef} accept="image/*" hidden multiple onChange={(e) => { if (e.target.files) setNewFolderImages(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                      {newFolderImages.length > 0 && <div style={{ display: "flex", gap: "7px", overflowX: "auto", paddingBottom: "7px", scrollbarWidth: "none" }}>{newFolderImages.map((file, idx) => (<div key={idx} style={{ position: "relative", width: "54px", height: "54px", flexShrink: 0, borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(168,85,247,0.55)" }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={URL.createObjectURL(file)} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /><button type="button" onClick={() => setNewFolderImages(prev => prev.filter((_, i) => i !== idx))} style={{ position: "absolute", top: "3px", right: "3px", width: "19px", height: "19px", borderRadius: "50%", background: "rgba(0,0,0,0.72)", border: "none", color: "white", cursor: "pointer", fontSize: "12px" }}>×</button></div>))}</div>}
                      <label onClick={() => folderImageInputRef.current?.click()} style={{ display: "grid", gridTemplateColumns: "46px minmax(0, 1fr) 82px", alignItems: "center", gap: "10px", padding: "11px 12px", borderRadius: "16px", border: "1px dashed rgba(148,163,184,0.36)", background: "rgba(15,23,42,0.48)", cursor: "pointer", minWidth: 0 }}>
                        <span style={{ width: "42px", height: "42px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(139,92,246,0.16)", fontSize: "21px", flexShrink: 0 }}>🖼️</span>
                        <span style={{ minWidth: 0 }}><b style={{ color: "white", fontSize: "13.5px", lineHeight: 1.2, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{newFolderImages.length > 0 ? t("addMoreImages") : t("attachImage")}</b><small style={{ display: "block", color: "rgba(226,232,240,0.55)", marginTop: "3px", fontSize: "11px", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lang === "hu" ? "Húzd ide, vagy tallózz" : "Drag or browse"}</small></span>
                        <span style={{ padding: "8px 9px", borderRadius: "12px", border: "1px solid rgba(59,130,246,0.35)", background: "rgba(15,23,42,0.55)", color: "#93c5fd", fontWeight: 800, fontSize: "12px", textAlign: "center", whiteSpace: "nowrap" }}>{lang === "hu" ? "Tallózás" : "Browse"}</span>
                      </label>
                    </div>

                    <div>
                      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.84)", marginBottom: "7px", fontWeight: 850 }}>{t("docsLabel")}</p>
                      <input type="file" ref={folderDocInputRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" hidden multiple onChange={(e) => { if (e.target.files) setNewFolderDocs(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                      {newFolderDocs.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "8px" }}>{newFolderDocs.map((file, idx) => (<div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.04)", padding: "8px 10px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}><span style={{ fontSize: "12px", color: "rgba(255,255,255,0.82)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📄 {file.name}</span><button type="button" onClick={() => setNewFolderDocs(prev => prev.filter((_, i) => i !== idx))} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontWeight: 900 }}>×</button></div>))}</div>}
                      <label onClick={() => folderDocInputRef.current?.click()} style={{ display: "grid", gridTemplateColumns: "46px minmax(0, 1fr) 82px", alignItems: "center", gap: "10px", padding: "11px 12px", borderRadius: "16px", border: "1px dashed rgba(148,163,184,0.36)", background: "rgba(15,23,42,0.48)", cursor: "pointer", minWidth: 0 }}>
                        <span style={{ width: "42px", height: "42px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(139,92,246,0.16)", fontSize: "21px", flexShrink: 0 }}>📄</span>
                        <span style={{ minWidth: 0 }}><b style={{ color: "white", fontSize: "13.5px", lineHeight: 1.2, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{newFolderDocs.length > 0 ? t("addMoreDocs") : t("attachDoc")}</b><small style={{ display: "block", color: "rgba(226,232,240,0.55)", marginTop: "3px", fontSize: "11px", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lang === "hu" ? "Húzd ide, vagy tallózz" : "Drag or browse"}</small></span>
                        <span style={{ padding: "8px 9px", borderRadius: "12px", border: "1px solid rgba(59,130,246,0.35)", background: "rgba(15,23,42,0.55)", color: "#93c5fd", fontWeight: 800, fontSize: "12px", textAlign: "center", whiteSpace: "nowrap" }}>{lang === "hu" ? "Tallózás" : "Browse"}</span>
                      </label>
                    </div>

                    <div>
                      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.84)", marginBottom: "7px", fontWeight: 850 }}>{t("audioLabel")}</p>
                      <input type="file" ref={folderAudioInputRef} accept="audio/*" hidden multiple onChange={(e) => { if (e.target.files) setNewFolderAudios(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                      {newFolderAudios.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px", maxHeight: "150px", overflowY: "auto" }}>{newFolderAudios.map((file, idx) => (<div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px", background: "rgba(255,255,255,0.04)", padding: "9px 10px", borderRadius: "13px", border: "1px solid rgba(255,255,255,0.08)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: "12px", color: "rgba(255,255,255,0.82)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>🎙️ {file.name}</span><button type="button" onClick={() => setNewFolderAudios(prev => prev.filter((_, i) => i !== idx))} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontWeight: 900 }}>×</button></div><audio controls src={URL.createObjectURL(file)} style={{ width: "100%", height: "30px" }} /></div>))}</div>}
                      {isRecording && recordingTarget === "folder" ? (<div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", background: "rgba(239,68,68,0.12)", borderRadius: "14px", border: "1px solid rgba(239,68,68,0.35)" }}><span style={{ color: "#f87171" }}>🔴</span><span style={{ fontSize: "13px", fontWeight: 850, color: "white", flex: 1 }}>Rögzítés... {formatTime(recordingSeconds)}</span><button type="button" onClick={stopRecording} style={{ padding: "7px 12px", background: "#ef4444", border: "none", borderRadius: "10px", color: "white", fontWeight: 800, cursor: "pointer" }}>{t("stopRecording")}</button></div>) : (<div style={{ display: "flex", flexDirection: "column", gap: "9px" }}><button type="button" onClick={() => startRecording("folder")} style={{ width: "100%", minHeight: "48px", padding: "10px 12px", background: "linear-gradient(145deg, rgba(168,85,247,0.16), rgba(30,41,59,0.35))", borderRadius: "14px", color: "#e9d5ff", border: "1px solid rgba(168,85,247,0.52)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", fontWeight: 850, fontSize: "14px", cursor: "pointer", boxShadow: "0 0 16px rgba(168,85,247,0.10)" }}><span style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}><span style={{ width: "32px", height: "32px", minWidth: "32px", borderRadius: "11px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(168,85,247,0.16)", fontSize: "17px" }}>🎙️</span>{lang === "hu" ? "Hangjegyzet" : "Voice note"}</span><span style={{ opacity: 0.72 }}>›</span></button><button type="button" onClick={() => folderAudioInputRef.current?.click()} style={{ width: "100%", minHeight: "48px", padding: "10px 12px", background: "linear-gradient(145deg, rgba(59,130,246,0.14), rgba(15,23,42,0.42))", borderRadius: "14px", color: "#bfdbfe", border: "1px solid rgba(59,130,246,0.42)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", fontWeight: 850, fontSize: "14px", cursor: "pointer" }}><span style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}><span style={{ width: "32px", height: "32px", minWidth: "32px", borderRadius: "11px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(59,130,246,0.14)", fontSize: "17px" }}>📁</span>{lang === "hu" ? "Hangfájl" : "Audio file"}</span><span style={{ opacity: 0.72 }}>›</span></button></div>)}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginTop: "2px" }}>
                      <button type="button" onClick={() => { setIsCreatingFolder(false); setNewFolderImages([]); setNewFolderDocs([]); setNewFolderAudios([]); setTimeout(() => { if (vaultScrollRef.current) vaultScrollRef.current.scrollTop = 0; }, 50); }} style={{ width: "100%", minHeight: "48px", padding: "10px 12px", background: "rgba(15,23,42,0.78)", border: "1px solid rgba(148,163,184,0.26)", borderRadius: "14px", color: "white", fontWeight: 850, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ display: "flex", alignItems: "center", gap: "10px" }}><span style={{ width: "32px", height: "32px", minWidth: "32px", borderRadius: "11px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(148,163,184,0.10)", fontSize: "17px" }}>×</span>{t("cancel")}</span><span style={{ opacity: 0.55 }}>›</span></button>
                      <button type="submit" style={{ width: "100%", minHeight: "52px", padding: "11px 12px", background: "linear-gradient(135deg, #38bdf8, #7c3aed, #c026d3)", border: "none", borderRadius: "15px", color: "white", fontWeight: 900, fontSize: "14.5px", cursor: "pointer", boxShadow: "0 14px 34px rgba(124,58,237,0.36)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", whiteSpace: "nowrap" }}><span style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}><span style={{ width: "32px", height: "32px", minWidth: "32px", borderRadius: "11px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.15)", fontSize: "17px" }}>✦</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lang === "hu" ? "Mentés és Megnyitás" : "Save & Open"}</span></span><span style={{ opacity: 0.9 }}>›</span></button>
                    </div>
                  </form>
                </section>
              ) : (
                <button onClick={() => { setIsCreatingFolder(true); setTimeout(() => { if (vaultScrollRef.current) vaultScrollRef.current.scrollTop = 0; }, 50); }} style={{ width: "100%", padding: "19px", borderRadius: "24px", background: "linear-gradient(145deg, rgba(15,23,42,0.72), rgba(30,41,59,0.45))", border: "1px solid rgba(76,169,255,0.42)", color: "white", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", boxShadow: "0 0 28px rgba(59,130,246,0.08)" }}><div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #9333ea)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 900, color: "white", flexShrink: 0, boxShadow: "0 0 24px rgba(99,102,241,0.42)" }}>+</div><span style={{ fontSize: "17px", fontWeight: 900 }}>{t("newProject")}</span></button>
              )}
            </>
          )}
        </div>
      )}



      {/* Kereső Overlay */}
      {isSearchOpen && (
        <div className="page-transition" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: "rgba(23, 36, 54, 0.95)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", display: "flex", flexDirection: "column", padding: "40px 22px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 650 }}>{t("searchTitle")}</h2>
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
          
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "20px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
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
                              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `linear-gradient(135deg, ${folder.color_hex || '#ffb74d'}cc, ${folder.color_hex || '#a78bfa'})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
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
            background: "rgba(2,6,18,0.72)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            animation: "fadeInBackdrop 0.25s ease forwards"
          }}
        />
      )}

      {/* Drawer panel – óra alól indul, hogy ne csússzon a status bar alá */}
      <div style={{
        position: "absolute",
        top: "52px", left: 0, bottom: 0,
        width: "min(272px, 74vw)",
        zIndex: 201,
        background: `
          radial-gradient(circle at 18% 4%, rgba(56,189,248,0.26), transparent 25%),
          radial-gradient(circle at 92% 6%, rgba(168,85,247,0.30), transparent 32%),
          radial-gradient(circle at 86% 46%, rgba(124,58,237,0.20), transparent 34%),
          radial-gradient(circle at 72% 92%, rgba(14,165,233,0.22), transparent 38%),
          linear-gradient(180deg, rgba(4,8,23,0.98) 0%, rgba(5,12,31,0.99) 48%, rgba(3,8,20,1) 100%)
        `,
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        borderRadius: "0 22px 22px 0",
        borderTop: "1px solid rgba(56,189,248,0.55)",
        borderRight: "1px solid rgba(168,85,247,0.70)",
        borderBottom: "1px solid rgba(37,99,235,0.55)",
        borderLeft: "1px solid rgba(37,99,235,0.35)",
        boxShadow: isDrawerOpen ? "24px 0 80px rgba(0,0,0,0.62), 0 0 46px rgba(56,189,248,0.20), 0 0 70px rgba(168,85,247,0.18), inset -1px 0 0 rgba(168,85,247,0.32), inset 1px 0 0 rgba(56,189,248,0.18)" : "none",
        display: "flex", flexDirection: "column",
        transform: isDrawerOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.35s ease",
        overflow: "hidden",
        overflowY: "auto",
        scrollbarWidth: "none",
      }}>
        {/* Kozmikus háttértextúra + LifeSync vízjel */}
        <div style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background: `
            radial-gradient(circle at 18% 18%, rgba(125,211,252,0.16) 0 1px, transparent 1.5px),
            radial-gradient(circle at 74% 30%, rgba(196,181,253,0.16) 0 1px, transparent 1.5px),
            radial-gradient(circle at 62% 74%, rgba(96,165,250,0.12) 0 1px, transparent 1.5px)
          `,
          backgroundSize: "54px 54px, 82px 82px, 120px 120px",
          opacity: 0.55,
        }} />
        <div style={{
          position: "absolute",
          right: "34px",
          top: "360px",
          width: "210px",
          height: "210px",
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.08,
          filter: "blur(0.2px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "210px",
          fontWeight: 900,
          lineHeight: 1,
          color: "#8B5CF6",
          transform: "rotate(-14deg)",
          textShadow: "0 0 42px rgba(168,85,247,0.60)",
        }}>S</div>
        <div style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background: "linear-gradient(90deg, rgba(2,6,23,0.25) 0%, transparent 38%, rgba(168,85,247,0.10) 100%)",
        }} />

        {/* ── FEJLÉC ── */}
        <div style={{
          position: "relative", zIndex: 1,
          minHeight: "66px", flexShrink: 0,
          padding: "10px 13px 7px",
          display: "flex", alignItems: "center", justifyContent: "flex-start",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "13px",
              background: "radial-gradient(circle, rgba(56,189,248,0.20), transparent 62%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 30px rgba(56,189,248,0.22)"
            }}>
              <img src="/lifesync-icon.png" alt="Logo"
                style={{ width: "30px", height: "30px", borderRadius: "0", objectFit: "contain", background: "transparent" }} />
            </div>
            <div>
              <div style={{
                fontSize: "20px", fontWeight: 750, lineHeight: 1.05,
                background: "linear-gradient(90deg, #B8E7FF 0%, #6AB7FF 42%, #7E7BFF 72%, #9B7BFF 100%)",
                WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent"
              }}>LifeSync</div>
              <div style={{ fontSize: "10.5px", color: "rgba(226,232,240,0.72)", marginTop: "4px", letterSpacing: "0.01em" }}>
                Memories that matter.
              </div>
            </div>
          </div>
        </div>

        {/* ── MENÜ LISTA ── */}
        <nav style={{ position: "relative", zIndex: 1, padding: "6px 14px 0", display: "flex", flexDirection: "column", gap: "4px" }}>
          {([
            { tab: "Home",     label: t("home"),           active: activeTab === "Home",
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.8L12 3l9 7.8V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.2z"/><path d="M9 21V12h6v9"/></svg> },
            { tab: "Timeline", label: t("timelineTitle"), active: activeTab === "Timeline",
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg> },
            { tab: "Add",      label: t("memories"),      active: activeTab === "Add",
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
            { tab: "",         label: t("favorites"),     active: false, disabled: true,
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
            { tab: "Vault",    label: t("vault"),         active: activeTab === "Vault",
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> },
            { tab: "",         label: t("shared"),        active: false, disabled: true,
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            { tab: "Profile",  label: t("profile"),       active: activeTab === "Profile",
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
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
                height: "42px", flexShrink: 0,
                display: "flex", alignItems: "center", gap: "11px",
                padding: "0 13px",
                borderRadius: "15px",
                border: item.active ? "1px solid rgba(147,197,253,0.72)" : "1px solid transparent",
                background: item.active
                  ? "linear-gradient(90deg, rgba(139,92,246,0.56) 0%, rgba(37,99,235,0.38) 100%)"
                  : "transparent",
                boxShadow: item.active ? "0 0 34px rgba(59,130,246,0.32), 0 0 22px rgba(168,85,247,0.20), inset 0 1px 0 rgba(255,255,255,0.18)" : "none",
                color: item.active ? "#FFFFFF" : item.disabled ? "rgba(148,163,184,0.38)" : "rgba(226,232,240,0.80)",
                cursor: item.disabled ? "default" : "pointer",
                width: "100%", textAlign: "left",
                transition: "all 0.18s ease",
              }}
            >
              <span style={{
                width: "21px", height: "21px", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: item.active ? "#FFFFFF" : item.disabled ? "rgba(148,163,184,0.34)" : "rgba(191,219,254,0.86)",
                filter: item.active ? "drop-shadow(0 0 10px rgba(147,197,253,0.7))" : "drop-shadow(0 0 8px rgba(59,130,246,0.25))"
              }}>{item.icon}</span>
              <span style={{ fontSize: "14px", fontWeight: item.active ? 730 : 610, letterSpacing: "0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* ── ÚJ MEMÓRIA GOMB 52px ── */}
        <div style={{ position: "relative", zIndex: 1, padding: "10px 14px 0" }}>
          <button
            onClick={() => { setActiveTab("Add"); setIsDrawerOpen(false); }}
            style={{
              height: "44px", width: "100%",
              borderRadius: "17px", border: "1px solid rgba(147,197,253,0.45)",
              background: "linear-gradient(90deg, #38BDF8 0%, #6366F1 48%, #A855F7 100%)",
              boxShadow: "0 0 34px rgba(99,102,241,0.38), 0 14px 36px rgba(99,102,241,0.28), inset 0 1px 1px rgba(255,255,255,0.30)",
              color: "#FFFFFF", fontSize: "15px", fontWeight: 720,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              cursor: "pointer",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>{t("newMemory")}</span>
          </button>
        </div>

        {/* ── ELVÁLASZTÓ ── */}
        <div style={{ margin: "12px 26px 8px", height: "1px", background: "linear-gradient(90deg, transparent, rgba(148,163,255,0.35), transparent)", flexShrink: 0 }} />

        {/* ── BEÁLLÍTÁSOK 52px ── */}
        <div style={{ padding: "0 14px", flexShrink: 0 }}>
          <button
            onClick={() => { setActiveTab("Profile"); setIsDrawerOpen(false); }}
            style={{
              height: "44px", width: "100%",
              display: "flex", alignItems: "center", gap: "9px",
              padding: "0 14px", borderRadius: "16px",
              border: "1px solid transparent", background: "transparent",
              color: "rgba(226,232,240,0.82)",
              cursor: "pointer", textAlign: "left",
              fontSize: "14.5px", fontWeight: 620,
              transition: "background 0.18s"
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>{t("settings")}</span>
          </button>
        </div>

        {/* ── NYELV VÁLTÓ ── */}
        <div style={{ position: "relative", zIndex: 1, padding: "0 14px", flexShrink: 0 }}>
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            style={{
              height: "44px", width: "100%",
              display: "flex", alignItems: "center", gap: "9px",
              padding: "0 14px", borderRadius: "16px",
              border: isLangOpen ? "1px solid rgba(180,190,255,0.28)" : "1px solid transparent",
              background: isLangOpen ? "rgba(126,123,255,0.12)" : "transparent",
              color: "rgba(226,232,240,0.82)",
              cursor: "pointer", textAlign: "left",
              fontSize: "14.5px", fontWeight: 620,
              transition: "all 0.18s"
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  display: "flex", alignItems: "center", gap: "9px",
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
                  display: "flex", alignItems: "center", gap: "9px",
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
        <div style={{ position: "relative", zIndex: 1, margin: "14px 30px 10px", height: "1px", background: "linear-gradient(90deg, transparent, rgba(148,163,255,0.32), transparent)", flexShrink: 0 }} />

        {/* ── KIJELENTKEZÉS ── */}
        <div style={{ position: "relative", zIndex: 1, padding: "0 14px", flexShrink: 0 }}>
          <button
            onClick={() => { supabase.auth.signOut(); setIsDrawerOpen(false); }}
            style={{
              height: "44px", width: "100%",
              display: "flex", alignItems: "center", gap: "9px",
              padding: "0 14px", borderRadius: "16px",
              border: "1px solid transparent", background: "transparent",
              color: "rgba(248,113,113,0.82)",
              cursor: "pointer", textAlign: "left",
              fontSize: "14.5px", fontWeight: 620,
              transition: "background 0.18s"
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>{t("signOutLabel")}</span>
          </button>
        </div>

        {/* ── SPACER ── */}
        <div style={{ flex: 1 }} />

        {/* ── PROFIL KÁRTYA kompakt alul ── */}
        <div style={{ position: "relative", zIndex: 1, padding: "0 14px 14px", flexShrink: 0 }}>
          <div
            onClick={() => { setActiveTab("Profile"); setIsDrawerOpen(false); }}
            style={{
              height: "54px", padding: "0 10px",
              borderRadius: "17px",
              background: "linear-gradient(135deg, rgba(15,23,42,0.78), rgba(17,24,39,0.58))",
              border: "1px solid rgba(147,197,253,0.26)",
              boxShadow: "0 0 34px rgba(59,130,246,0.16), 0 0 28px rgba(168,85,247,0.12), inset 0 1px 1px rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", gap: "9px",
              cursor: "pointer",
            }}
          >
            <div style={{
              width: "30px", height: "30px", borderRadius: "50%",
              background: "linear-gradient(135deg, #7E7BFF, #9B7BFF)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "15px", fontWeight: 800, color: "white",
              boxShadow: "0 0 26px rgba(168,85,247,0.34)",
              flexShrink: 0, overflow: "hidden"
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : formattedName.charAt(0).toUpperCase()
              }
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "14.5px", fontWeight: 740, color: "#F8FAFC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {formattedName}
              </div>
              <div style={{ fontSize: "12px", color: "rgba(203,213,225,0.64)", marginTop: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {session?.user?.email}
              </div>
            </div>
            <span style={{
              width: "34px", height: "34px", borderRadius: "13px",
              background: "rgba(15,23,42,0.60)",
              border: "1px solid rgba(148,163,255,0.26)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(226,232,240,0.86)", fontSize: "22px", flexShrink: 0
            }}>›</span>
          </div>
        </div>

      </div>
      {/* ═══ DRAWER VÉGE ═══ */}
    </main>
  );
}
