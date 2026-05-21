"use client";

import { useState, useEffect, useRef } from "react";
import { mockUser, mockTodaysMemory, mockStats, mockRecentMemories, mockTimelineEvents, mockVaultFolders } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";
import emailjs from '@emailjs/browser';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function Home() {
  const [activeTab, setActiveTab] = useState("Home");
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
        showToast("Sikeres regisztráció! Kérlek, jelentkezz be.", 'success');
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
      showToast("Esemény törölve!", 'success');
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
    daily: "Naponta", weekly: "Hetente", biweekly: "Kéthetente", monthly: "Havonta", yearly: "Évente"
  };

  const handleDeleteAll = async () => {
    if (!session) return;
    const { error } = await supabase.from('events').delete().eq('user_id', session.user.id);
    if (error) {
      showToast("Hiba törlés közben: " + error.message, 'error');
    } else {
      setEvents([]);
      showToast("Összes esemény törölve!", 'success');
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
        showToast("Az esemény sikeresen frissítve!", 'success');
        resetForm();
        const { data } = await supabase.from('events').select('*').order('event_date', { ascending: false });
        if (data) setEvents(data);
        setActiveTab("Timeline");
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
          showToast("✅ Ismétlődő esemény létrehozva!", 'success');
          resetForm();
          fetchEvents();
          setActiveTab("Timeline");
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

          showToast("Az esemény sikeresen rögzítve!", 'success');
          resetForm();
          fetchEvents();
          setActiveTab("Timeline");
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
      <main className="phone" style={{ position: "relative", padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: showSplash ? "center" : "flex-start", alignItems: "center", minHeight: "100%", gap: "20px" }}>
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
          <div className="logo" style={{ width: showSplash ? "110px" : "92px", height: showSplash ? "110px" : "92px", margin: "0 auto 10px", background: "transparent", border: "none", boxShadow: "none", transition: "all 0.8s" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: showSplash ? "32px" : "26px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", transition: "all 0.8s" }} />
          </div>
          <h1 style={{ fontSize: showSplash ? "40px" : "36px", fontWeight: 900, letterSpacing: "1px", margin: 0, transition: "all 0.8s" }}><span className="text-life">Life</span><span className="text-sync">Sync</span></h1>
          
          <div style={{ marginTop: "10px", display: showSplash ? "block" : "none", width: "100%", padding: "0 10px" }}>
             {showSplash && (
               <p style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.75)", margin: 0, fontWeight: 500, lineHeight: "1.4" }}>
                  {"Memories that matter. Life in sync.".split(" ").map((word, idx) => (
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
              padding: "26px 20px", 
              borderRadius: "28px", 
              zIndex: 5,
              animation: "form-slide-up 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              marginBottom: "40px"
            }}
          >
            <h2 style={{ fontSize: "22px", fontWeight: 600, marginBottom: "20px", textAlign: "center" }}>
              {isLoginMode ? "Bejelentkezés" : "Regisztráció"}
            </h2>

            <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13.5px", opacity: 0.9, marginBottom: "6px", display: "block", fontWeight: 500 }}>Email cím</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@lifesync.hu" style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px 14px", borderRadius: "14px", color: "white", outline: "none", fontSize: "14px" }} />
              </div>
              
                            <div>
                <label style={{ fontSize: "13.5px", opacity: 0.9, marginBottom: "6px", display: "block", fontWeight: 500 }}>Jelszó</label>
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
                {isLoginMode ? "Belépés" : "Fiók létrehozása"}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "18px", fontSize: "13.5px" }}>
              <span style={{ opacity: 0.7 }}>{isLoginMode ? "Nincs még fiókod?" : "Már van fiókod?"}</span>{" "}
              <span onClick={() => setIsLoginMode(!isLoginMode)} style={{ color: "#ffcc80", fontWeight: 600, cursor: "pointer" }}>
                {isLoginMode ? "Regisztráció" : "Bejelentkezés"}
              </span>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="phone">
      <section className="header">
        <div>
          <div className="brand" onClick={playLogoSound} style={{ cursor: "pointer" }}>
            <div className="logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "16px" }} />
            </div>
            <h1><span className="text-life">Life</span><span className="text-sync">Sync</span></h1>
          </div>
          <div className="subtitle">Memories that matter. Life in sync.</div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className="theme-toggle" onClick={toggleTheme} style={{ cursor: "pointer" }}>
            {isDarkMode ? "☀️" : "🌙"}
          </div>
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
        <div key="Home" className="page-transition" style={{ height: "calc(100% - 140px)", overflowY: "auto", paddingBottom: "80px", scrollbarWidth: "none" }}>

          <section className="glass-card greeting" style={{ position: "relative" }}>
          {/* 1. ÜDVÖZLŐ PANEL */}
          <div style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", borderRadius: "28px", boxShadow: "0 12px 32px rgba(24,44,84,0.18)", padding: "24px", marginBottom: "12px", height: "112px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "8px", position: "relative" }}>
            <p style={{ fontSize: "14px", color: "rgba(244,247,251,0.72)", margin: 0 }}>
              {isEditingGreetingName ? (
                <form onSubmit={handleSaveGreetingName} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input autoFocus type="text" value={greetingNameInput} onChange={e => setGreetingNameInput(e.target.value)} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", padding: "4px 10px", color: "white", outline: "none", fontSize: "14px", flex: 1 }} />
                  <button type="submit" style={{ background: "linear-gradient(135deg, #ffb74d, #ff7043)", border: "none", borderRadius: "8px", color: "white", padding: "4px 10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>✓</button>
                  <button type="button" onClick={() => setIsEditingGreetingName(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", fontSize: "13px", cursor: "pointer" }}>✕</button>
                </form>
              ) : (
                <span>Hello, <span style={{ color: "#F4F7FB", fontWeight: 500 }}>{formattedName}</span>
                  <span onClick={startEditingGreetingName} style={{ marginLeft: "6px", cursor: "pointer", opacity: 0.5, fontSize: "13px" }}>✏️</span>
                </span>
              )}
            </p>
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#F4F7FB", margin: 0, lineHeight: "32px", display: "flex", alignItems: "center", gap: "10px" }}>
              {weather ? `${weather.temp}°C · ${weather.city}` : "Good morning"}
              <span style={{ fontSize: "20px" }}>{weather ? (weather.desc.includes("nap") || weather.desc.includes("clear") ? "☀️" : weather.desc.includes("felhő") || weather.desc.includes("cloud") ? "⛅" : "🌤️") : "☀️"}</span>
            </h2>
            <p style={{ fontSize: "14px", color: "rgba(244,247,251,0.72)", margin: 0 }}>
              {weather ? weather.desc : "Your memories are waiting."}
            </p>
          </div>

          {/* 2. MAI EMLÉK PANEL */}
          {events.length > 0 && (() => {
            const todayMemory = events[0];
            let imgUrl = "";
            try {
              if (todayMemory.image_url?.startsWith("[")) {
                const parsed = JSON.parse(todayMemory.image_url);
                const img = parsed.find((p: any) => p.type?.startsWith("image/"));
                if (img) imgUrl = img.url;
              } else if (todayMemory.image_url) imgUrl = todayMemory.image_url;
            } catch (e) {}
            return (
              <div onClick={() => { setScrollToEventId(todayMemory.id); setActiveTab("Timeline"); }} style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", borderRadius: "26px", boxShadow: "0 12px 32px rgba(24,44,84,0.18)", padding: "16px 20px", marginBottom: "12px", height: "136px", display: "flex", gap: "16px", cursor: "pointer" }}>
                <div style={{ width: "72px", height: "72px", borderRadius: "16px", overflow: "hidden", flexShrink: 0, alignSelf: "center", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
                  {imgUrl ? <img src={imgUrl} alt={todayMemory.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📅"}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "4px", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "rgba(244,247,251,0.72)", fontWeight: 500 }}>Today's Memory</span>
                    <span style={{ fontSize: "12px", color: "rgba(244,247,251,0.72)" }}>{todayMemory.event_date}</span>
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#F4F7FB", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{todayMemory.title}</h3>
                  <p style={{ fontSize: "12px", color: "rgba(244,247,251,0.72)", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{todayMemory.description || "Tap to view memory"}</p>
                  <span style={{ fontSize: "11px", color: "rgba(244,247,251,0.5)" }}>···</span>
                </div>
              </div>
            );
          })()}

          {/* 3. STATISZTIKA PANEL */}
          <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)", borderRadius: "28px", boxShadow: "0 12px 32px rgba(24,44,84,0.18)", padding: "16px 20px", marginBottom: "12px", height: "156px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#F4F7FB" }}>Memory Timeline</span>
              <span onClick={() => setActiveTab("Timeline")} style={{ fontSize: "13px", color: "#6AB7FF", cursor: "pointer", fontWeight: 500 }}>See all</span>
            </div>
            <div style={{ display: "flex", gap: "16px", overflowX: "auto", scrollbarWidth: "none" }}>
              {[
                { icon: "📅", value: stats.today, label: "This day", sub: `${stats.today} memory` },
                { icon: "🖼️", value: stats.month, label: "This month", sub: `${stats.month} memories` },
                { icon: "⭐", value: stats.year, label: "This year", sub: `${stats.year} memories` },
                { icon: "📊", value: stats.allTime, label: "All time", sub: `${stats.allTime} memories` },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", minWidth: "60px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: i === 0 ? "rgba(106,183,255,0.25)" : i === 1 ? "rgba(102,187,106,0.25)" : i === 2 ? "rgba(255,183,77,0.25)" : "rgba(171,71,188,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: "24px", fontWeight: 700, color: "#F4F7FB", lineHeight: 1 }}>{item.value}</span>
                  <span style={{ fontSize: "12px", color: "rgba(244,247,251,0.72)", textAlign: "center" }}>{item.label}</span>
                  <span style={{ fontSize: "11px", color: "rgba(244,247,251,0.5)", textAlign: "center" }}>{item.sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. LEGUTÓBBI EMLÉKEK PANEL */}
          <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)", borderRadius: "28px", boxShadow: "0 12px 32px rgba(24,44,84,0.18)", padding: "16px 20px", marginBottom: "12px", height: "156px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#F4F7FB" }}>Recent Memories</span>
              <span onClick={() => setActiveTab("Timeline")} style={{ fontSize: "13px", color: "#6AB7FF", cursor: "pointer", fontWeight: 500 }}>See all</span>
            </div>
            <div style={{ display: "flex", gap: "12px", overflowX: "auto", scrollbarWidth: "none" }}>
              {recentMemories.length === 0 ? (
                <p style={{ opacity: 0.5, fontSize: "13px" }}>Még nincs eseményed.</p>
              ) : recentMemories.map((mem) => {
                let parsedUrl = "";
                try {
                  if (mem.image_url?.startsWith("[")) {
                    const parsed = JSON.parse(mem.image_url);
                    const firstImg = parsed.find((p: any) => p.type?.startsWith("image/"));
                    if (firstImg) parsedUrl = firstImg.url;
                  } else if (mem.image_url) parsedUrl = mem.image_url;
                } catch (e) {}
                return (
                  <div key={mem.id} onClick={() => { setScrollToEventId(mem.id); setActiveTab("Timeline"); }} style={{ flexShrink: 0, width: "72px", cursor: "pointer" }}>
                    <div style={{ width: "72px", height: "72px", borderRadius: "16px", overflow: "hidden", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", marginBottom: "6px" }}>
                      {parsedUrl ? <img src={parsedUrl} alt={mem.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📅"}
                    </div>
                    <p style={{ fontSize: "13px", color: "rgba(244,247,251,0.72)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mem.event_date?.slice(5)}</p>
                    <p style={{ fontSize: "11px", color: "rgba(244,247,251,0.5)", margin: 0 }}>{new Date(mem.event_date).getFullYear()}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. AKTÍV PROJEKTEK */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "0 4px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#F4F7FB" }}>Aktív Projektek</span>
              <span onClick={() => setActiveTab("Vault")} style={{ fontSize: "13px", color: "#6AB7FF", cursor: "pointer", fontWeight: 500 }}>Összes →</span>
            </div>
            <div style={{ display: "flex", gap: "12px", overflowX: "auto", scrollbarWidth: "none" }}>
              {vaultFolders.length === 0 ? (
                <div style={{ padding: "10px", opacity: 0.5, fontSize: "13px" }}>Még nincsenek projektjeid.</div>
              ) : vaultFolders.map((folder) => (
                <div key={folder.id} onClick={() => { setActiveTab("Vault"); handleOpenFolder(folder); }} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", borderRadius: "20px", padding: "16px", flexShrink: 0, width: "110px", display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: `linear-gradient(135deg, ${folder.color_hex || "#ffb74d"}cc, ${folder.color_hex || "#ff7043"}cc)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                    {folder.icon || "📁"}
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#F4F7FB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
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
                <button type="button" onClick={() => setIsEditingGreetingName(false)} style={{ background: "transparent", border: "1px solid var(--card-border)", borderRadius: "10px", color: "var(--text-color)", padding: "8px 12px", fontSize: "14px", cursor: "pointer" }}>Mégse</button>
              </form>
            ) : (
              <p style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                Szia, <strong style={{ fontWeight: 700 }}>{formattedName}</strong>!
                <span onClick={startEditingGreetingName} style={{ cursor: "pointer", fontSize: "14px", opacity: 0.6, transition: "opacity 0.2s" }}>✏️</span>
              </p>
            )}
            <h2 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "6px" }}>
              {weather ? `${weather.temp}°C · ${weather.city}` : "Kellemes idő ☼"}
            </h2>
            <p style={{ opacity: 0.9, fontSize: "15px", fontWeight: 500 }}>
              {weather ? `${weather.desc} · Legyen szép napod!` : "Legyen szép napod!"}
            </p>
          </section>

          <section className="glass-card timeline">
            <div className="section-head">
              <span>Esemény Statisztikák</span>
            </div>

            <div className="stats" onScroll={handleStatsScroll}>
              <div className="stat">
                <div className="icon">📅</div>
                <div>
                  <strong>{stats.today} bejegyzés</strong>
                  <small>Események a mai napon</small>
                </div>
              </div>

              <div className="stat">
                <div className="icon">⚡</div>
                <div>
                  <strong>{stats.week} bejegyzés</strong>
                  <small>Ezen a héten összesen</small>
                </div>
              </div>

              <div className="stat">
                <div className="icon">🗓</div>
                <div>
                  <strong>{stats.month} bejegyzés</strong>
                  <small>Ebben a hónapban</small>
                </div>
              </div>

              <div className="stat">
                <div className="icon">⭐</div>
                <div>
                  <strong>{stats.year} bejegyzés</strong>
                  <small>Ebben az évben eddig</small>
                </div>
              </div>

              <div className="stat">
                <div className="icon">🗂</div>
                <div>
                  <strong>{stats.allTime} bejegyzés</strong>
                  <small>Összes rögzített emlék</small>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card recent">
            <div className="section-head">
              <span>Legutóbbi Események</span>
              <span onClick={() => setActiveTab("Timeline")} style={{ cursor: "pointer" }}>Összes →</span>
            </div>

            {recentMemories.length === 0 ? (
              <p style={{ opacity: 0.6, fontSize: "14px", padding: "10px" }}>Még nincs eseményed.</p>
            ) : (
              <div className="photos" style={{ display: "flex", overflowX: "auto", gap: "12px", paddingBottom: "10px", scrollbarWidth: "none" }}>
                {recentMemories.map((mem) => (
                  <div className="photo" key={mem.id} onClick={() => { setScrollToEventId(mem.id); setActiveTab("Timeline"); }} style={{ minWidth: "120px", width: "120px", cursor: "pointer" }}>
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
                          {mem.event_type === 'memory' ? '💭' : mem.event_type === 'utility' ? '⚡' : '📅'}
                        </div>
                      );
                    })()}
                    <strong style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", marginTop: "6px" }}>{mem.event_title || mem.title}</strong>
                    <small>{mem.event_date}</small>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginBottom: "32px", marginTop: "24px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px", padding: "0 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Aktív Projektek</span>
              <span onClick={() => setActiveTab("Vault")} style={{ fontSize: "14px", fontWeight: 600, color: "#ffb74d", cursor: "pointer" }}>Összes →</span>
            </h2>
            <div style={{ display: "flex", gap: "14px", overflowX: "auto", padding: "4px", paddingBottom: "16px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }} className="hide-scrollbar">
              {vaultFolders.length === 0 ? (
                <div style={{ padding: "10px", opacity: "0.6", fontSize: "14px" }}>
                  Még nincsenek projektjeid. Kattints a Projekt menüre egy új létrehozásához!
                </div>
              ) : (
                vaultFolders.slice(0, 5).map((folder) => (
                  <div key={folder.id} onClick={() => { setActiveTab("Vault"); }} style={{ minWidth: "140px", cursor: "pointer" }}>
                    <div style={{ width: "140px", height: "140px", borderRadius: "18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px", fontSize: "48px" }}>
                      📁
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#F4F7FB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</span>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      )}

      {activeTab === "Timeline" && (
        <div key="Timeline" className="page-transition" style={{ height: "calc(100% - 120px)", overflowY: "auto", paddingBottom: "120px", scrollbarWidth: "none", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ padding: "0 4px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <h2 style={{ fontSize: "28px", fontWeight: 650 }}>Timeline</h2>
              {events.length > 0 && (
                <button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  style={{ fontSize: "12px", padding: "6px 12px", borderRadius: "20px", border: "1px solid rgba(255,80,80,0.3)", background: "rgba(255,80,80,0.1)", color: "#ff6b6b", cursor: "pointer", fontWeight: 600 }}
                >
                  🗑️ Összes törlése
                </button>
              )}
            </div>
            <p style={{ opacity: 0.75, fontSize: "15px" }}>Az összes esemény és dokumentum egy helyen.</p>
          </div>

          <div style={{ position: "relative", paddingLeft: "8px", marginTop: "10px" }}>
             {/* Függőleges vonal */}
             <div style={{ position: "absolute", left: "20px", top: 0, bottom: "100px", width: "2px", background: "rgba(255, 255, 255, 0.15)", borderRadius: "2px" }}></div>
             
             {events.length === 0 && (
                <p style={{ opacity: 0.6, fontSize: "14px", marginLeft: "40px", marginTop: "20px" }}>Még nincs esemény. Adj hozzá egyet a + gombbal!</p>
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
                         <span style={{ fontSize: "10px", background: "rgba(255,183,77,0.2)", border: "1px solid rgba(255,183,77,0.4)", borderRadius: "10px", padding: "1px 7px", color: "#ffb74d", fontWeight: 600 }}>
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
                   
                   <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: expandedEvents[event.id] ? "6px" : "0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                     <span>{event.title}</span>
                     <span style={{ fontSize: "12px", opacity: 0.5, fontWeight: 400, marginLeft: "8px" }}>
                       {expandedEvents[event.id] ? "🔼" : "🔽"}
                     </span>
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
                                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{doc.name || "Dokumentum"}</span>
                                      <span style={{ fontSize: "12px", opacity: 0.5 }}>Megnyitás ↗</span>
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
        <div key="Add" className="page-transition" style={{ height: "calc(100% - 65px)", overflowY: "auto", paddingBottom: "300px", scrollbarWidth: "none" }}>
          <div style={{ padding: "0 4px", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 650, marginBottom: "4px" }}>{editingEventId ? "Bejegyzés módosítása" : "Új bejegyzés"}</h2>
            <p style={{ opacity: 0.75, fontSize: "15px" }}>{editingEventId ? "Módosítsd a kiválasztott emléket." : "Rögzíts egy emléket vagy számlát."}</p>
          </div>

          <div className="glass-card" style={{ padding: "20px" }}>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13.5px", opacity: 0.9, marginBottom: "6px", display: "block", fontWeight: 500 }}>Cím / Esemény neve</label>
                <input required type="text" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="Pl. Villanyóra állás, Szülinap..." style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px 14px", borderRadius: "16px", color: "white", outline: "none", fontSize: "15px" }} />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "13.5px", opacity: 0.9, marginBottom: "6px", display: "block", fontWeight: 500 }}>Dátum</label>
                  <input required type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px 14px", borderRadius: "16px", color: "white", outline: "none", fontSize: "15px", colorScheme: "dark" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "13.5px", opacity: 0.9, marginBottom: "6px", display: "block", fontWeight: 500 }}>Kategória</label>
                  <select value={newEventType} onChange={e => setNewEventType(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px 14px", borderRadius: "16px", color: "white", outline: "none", appearance: "none", fontSize: "15px" }}>
                    <option value="event" style={{color: "black"}}>Esemény 🎂</option>
                    <option value="utility" style={{color: "black"}}>Számla ⚡</option>
                    <option value="photo" style={{color: "black"}}>Emlék 🏔</option>
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
                          <label style={{ fontSize: "12px", opacity: 0.6, marginBottom: "8px", display: "block" }}>Milyen gyakran?</label>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {[{ value: "daily", label: "Naponta" }, { value: "weekly", label: "Hetente" }, { value: "biweekly", label: "Kéthetente" }, { value: "monthly", label: "Havonta" }, { value: "yearly", label: "Évente" }].map(opt => (
                              <button key={opt.value} type="button" onClick={() => setRecurringType(opt.value as any)} style={{ padding: "6px 12px", borderRadius: "20px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: recurringType === opt.value ? "linear-gradient(135deg, #ffb74d, #ff7043)" : "rgba(255,255,255,0.1)", color: "white", transition: "all 0.2s" }}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {recurringType === "weekly" && (
                          <div>
                            <label style={{ fontSize: "12px", opacity: 0.6, marginBottom: "8px", display: "block" }}>Melyik napokon? (opcionális)</label>
                            <div style={{ display: "flex", gap: "6px" }}>
                              {["H", "K", "Sz", "Cs", "P", "Szo", "V"].map((day, idx) => (
                                <button key={idx} type="button" onClick={() => setRecurringDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "none", fontSize: "11px", fontWeight: 700, cursor: "pointer", background: recurringDays.includes(idx) ? "linear-gradient(135deg, #ffb74d, #ff7043)" : "rgba(255,255,255,0.1)", color: "white", transition: "all 0.2s" }}>
                                  {day}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ fontSize: "12px", opacity: 0.6, fontStyle: "italic" }}>
                          📅 2 évre előre generálja ({recurringType === "daily" ? "~730" : recurringType === "weekly" ? recurringDays.length > 0 ? `~${recurringDays.length * 104}` : "~104" : recurringType === "biweekly" ? "~52" : recurringType === "monthly" ? "~24" : "~2"} alkalom)
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <label style={{ fontSize: "13.5px", opacity: 0.9, marginBottom: "6px", display: "block", fontWeight: 500 }}>Részletek, megjegyzés</label>
                <textarea rows={3} value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} placeholder="Mérőállás: 12345, vagy egyéb infó..." style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px 14px", borderRadius: "16px", color: "white", outline: "none", resize: "none", fontSize: "15px" }}></textarea>
              </div>

              {/* MEGLÉVŐ CSATOLMÁNYOK (ha szerkesztés van) */}
              {existingAttachments.length > 0 && (
                <div style={{ marginTop: "6px", background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "16px", border: "1px dashed rgba(255,255,255,0.15)" }}>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "8px" }}>Aktuális csatolmányok</label>
                  
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
                <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "6px" }}>Fényképek / Képek</label>
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
                  <span>📸</span> {newEventImages.length > 0 ? "További kép hozzáadása" : "Kép csatolása"}
                </button>
              </div>

                    {/* ÚJ DOKUMENTUMOK SZAKASZ */}
              <div style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "6px" }}>Dokumentumok (PDF, Word, Számlák)</label>
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
                  <span>📄</span> {newEventDocs.length > 0 ? "További dokumentum hozzáadása" : "Dokumentum csatolása"}
                </button>
              </div>

                    {/* ÚJ HANGOK SZAKASZ */}
              <div style={{ marginTop: "12px", marginBottom: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "6px" }}>Hangfelvételek / Hangjegyzetek</label>
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
                    <button type="button" onClick={stopRecording} style={{ padding: "6px 12px", background: "#ff5252", border: "none", borderRadius: "8px", color: "white", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Leállítás ⏹️</button>
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
                  <label style={{ fontSize: "11.5px", opacity: 0.8, marginBottom: "4px", display: "block" }}>Címzett email címe (ha üres, a te címedre küldjük)</label>
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
                        placeholderText="Dátum és idő kiválasztása..."
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
                  <button type="button" onClick={() => { resetForm(); setActiveTab("Timeline"); }} style={{ flex: 1, padding: "18px", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: "18px", color: "var(--text-color)", fontWeight: 600, fontSize: "17px" }}>Mégse</button>
                )}
                <button type="submit" disabled={isUploading} style={{ flex: 2, padding: "18px", background: "linear-gradient(135deg, #ffb74d, #ff7043)", border: "none", borderRadius: "18px", color: "white", fontWeight: 600, boxShadow: "0 6px 20px rgba(255, 112, 67, 0.4)", fontSize: "17px", opacity: isUploading ? 0.7 : 1 }}>
                  {isUploading ? "Feltöltés..." : (editingEventId ? "Módosítás mentése" : "Mentés")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "Profile" && (
        <div key="Profile" className="page-transition" style={{ height: "calc(100% - 65px)", overflowY: "auto", paddingBottom: "120px", scrollbarWidth: "none" }}>
          <div style={{ padding: "0 4px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 650, marginBottom: "4px" }}>Profil</h2>
            <p style={{ opacity: 0.75, fontSize: "15px" }}>Személyes beállítások és fiók.</p>
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
                <small style={{ opacity: 0.6 }}>Kattints a kép cseréjéhez</small>

                <input type="text" value={editProfileName} onChange={e => setEditProfileName(e.target.value)} placeholder="Teljes név" style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px", borderRadius: "12px", color: "white", outline: "none", marginTop: "10px" }} />
                
                <input type="password" value={editProfilePassword} onChange={e => setEditProfilePassword(e.target.value)} placeholder="Új jelszó (opcionális)" style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px", borderRadius: "12px", color: "white", outline: "none" }} />

                <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "10px" }}>
                  <button type="button" onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid var(--card-border)", borderRadius: "14px", color: "var(--text-color)", fontWeight: 600 }}>Mégse</button>
                  <button type="submit" disabled={isUpdatingProfile} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #ffb74d, #ff7043)", border: "none", borderRadius: "14px", color: "white", fontWeight: 600, opacity: isUpdatingProfile ? 0.7 : 1 }}>{isUpdatingProfile ? "Mentés..." : "Mentés"}</button>
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
            <h4 style={{ fontSize: "13px", fontWeight: 700, opacity: 0.5, marginLeft: "12px", marginTop: "8px", letterSpacing: "1px" }}>BEÁLLÍTÁSOK</h4>
            
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
                    <span style={{ fontSize: "11px", opacity: 0.5, display: "block", marginTop: "2px" }}>Kattints az engedélyezéshez</span>
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
                    <span style={{ fontSize: "15px", fontWeight: 500, display: "block" }}>Értesítési Hang</span>
                    <span style={{ fontSize: "11px", opacity: 0.5, display: "block", marginTop: "2px" }}>Hangjelzés sikeres mentéseknél</span>
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
                  <span style={{ fontSize: "15px", fontWeight: 500 }}>Sötét mód</span>
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
                    <span style={{ fontSize: "15px", fontWeight: 500, display: "block" }}>Megjegyzett bejelentkezés</span>
                    <span style={{ fontSize: "11px", opacity: 0.5, display: "block", marginTop: "2px" }}>
                      {typeof window !== "undefined" && localStorage.getItem("remembered_login_email") 
                        ? localStorage.getItem("remembered_login_email") 
                        : "Nincs mentve"}
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
                    style={{ padding: "8px 12px", background: "rgba(255, 82, 82, 0.15)", border: "1px solid rgba(255, 82, 82, 0.3)", borderRadius: "12px", color: "#ff5252", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
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
                    <span style={{ fontSize: "15px", fontWeight: 500, display: "block" }}>Megjegyzett címzett (Esemény)</span>
                    <span style={{ fontSize: "11px", opacity: 0.5, display: "block", marginTop: "2px" }}>
                      {typeof window !== "undefined" && localStorage.getItem("remembered_custom_email") 
                        ? localStorage.getItem("remembered_custom_email") 
                        : "Nincs mentve"}
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
                  <span style={{ fontSize: "15px", fontWeight: 500, color: "#ff8a80" }}>Kijelentkezés</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Vault" && (
        <div key="Vault" className="page-transition" style={{ height: "calc(100% - 140px)", overflowY: "auto", paddingBottom: "120px", scrollbarWidth: "none" }}>
          {activeVaultFolder ? (
            // FOLDER DETAIL VIEW
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <button onClick={() => setActiveVaultFolder(null)} style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", padding: "10px 16px", borderRadius: "14px", color: "var(--text-color)", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>←</span> Vissza
                </button>
                <button onClick={() => setIsEditingVaultFolder(!isEditingVaultFolder)} style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", padding: "10px 16px", borderRadius: "14px", color: "var(--text-color)", fontWeight: 600 }}>
                  {isEditingVaultFolder ? "Mégse" : "Beállítások"}
                </button>
              </div>

              {isEditingVaultFolder ? (
                <div className="glass-card" style={{ padding: "20px", borderRadius: "24px", display: "flex", flexDirection: "column", gap: "12px", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Projekt beállításai</h3>
                  <form onSubmit={handleUpdateVaultFolder} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <input autoFocus required type="text" value={editVaultFolderName} onChange={e => setEditVaultFolderName(e.target.value)} placeholder="Projekt neve" style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px", borderRadius: "12px", color: "white", outline: "none", fontSize: "15px" }} />
                    <input type="text" value={editVaultFolderDescription} onChange={e => setEditVaultFolderDescription(e.target.value)} placeholder="Projekt leírása" style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px", borderRadius: "12px", color: "white", outline: "none", fontSize: "15px" }} />
                    
                    <div style={{ display: "flex", gap: "8px", justifyContent: "space-around", alignItems: "center", background: "rgba(0,0,0,0.1)", padding: "4px", borderRadius: "14px" }}>
                       {['📁', '📄', '💼', '⚡', '🏠', '🚗', '🎂', '🔑'].map(icon => (
                         <div key={icon} onClick={() => setEditVaultFolderIcon(icon)} style={{ padding: "8px", borderRadius: "10px", background: editVaultFolderIcon === icon ? "rgba(255,255,255,0.15)" : "transparent", cursor: "pointer", fontSize: "20px", transition: "all 0.2s" }}>{icon}</div>
                       ))}
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                      <button type="button" onClick={handleDeleteVaultFolder} style={{ flex: 1, padding: "14px", background: "rgba(255,0,0,0.2)", border: "1px solid rgba(255,0,0,0.3)", borderRadius: "14px", color: "#ff8a80", fontWeight: 600, fontSize: "15px" }}>Projekt Törlése</button>
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
                    <button onClick={stopRecording} style={{ padding: "8px 16px", background: "#ff5252", border: "none", borderRadius: "12px", color: "white", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Leállítás ⏹️</button>
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
                  <h2 style={{ fontSize: "26px", fontWeight: 650, marginBottom: "4px" }}>Projektek</h2>
                  <p style={{ opacity: 0.75, fontSize: "14px" }}>Projektek, bizalmas dokumentumok és számlák.</p>
                </div>
                <div style={{ width: "42px", height: "42px", borderRadius: "14px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }}>🗂️</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                 {vaultFolders.length === 0 && (
                    <div style={{ gridColumn: "1 / span 2", padding: "10px" }}>
                      <p style={{ opacity: 0.6, fontSize: "14px" }}>Még nincs projekted. Hozz létre egyet!</p>
                    </div>
                 )}
                
                {vaultFolders.map((folder) => (
                  <div key={folder.id} onClick={() => handleOpenFolder(folder)} className="glass-card" style={{ padding: "20px", borderRadius: "24px", display: "flex", flexDirection: "column", gap: "16px", position: "relative", cursor: "pointer", transition: "transform 0.2s" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: `linear-gradient(135deg, ${folder.color_hex || '#ffb74d'}cc, ${folder.color_hex || '#ff7043'})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", boxShadow: `0 8px 20px ${folder.color_hex || '#ff7043'}50` }}>
                      {folder.icon || '📁'}
                    </div>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.3, marginBottom: "4px" }}>{folder.name}</h3>
                      <p style={{ fontSize: "13px", opacity: 0.7 }}>Megnyitás</p>
                    </div>
                  </div>
                ))}
                
                {/* Új projekt hozzáadása gomb */}
                {isCreatingFolder ? (
                  <div className="glass-card" style={{ gridColumn: "1 / span 2", padding: "20px", borderRadius: "24px", display: "flex", flexDirection: "column", gap: "12px", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Új projekt létrehozása</h3>
                    <form onSubmit={handleCreateFolder} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <input autoFocus required type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Projekt neve (pl. Autó, Házfelújítás)" style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px", borderRadius: "12px", color: "white", outline: "none", fontSize: "15px" }} />
                      <input type="text" value={newFolderDescription} onChange={e => setNewFolderDescription(e.target.value)} placeholder="Rövid leírás (pl. Biztosítások, villanyszámlák)" style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px", borderRadius: "12px", color: "white", outline: "none", fontSize: "15px" }} />
                      
                      <div style={{ display: "flex", gap: "8px", justifyContent: "space-around", alignItems: "center", background: "rgba(0,0,0,0.1)", padding: "4px", borderRadius: "14px" }}>
                         {['📁', '📄', '💼', '⚡', '🏠', '🚗', '🎂', '🔑'].map(icon => (
                           <div key={icon} onClick={() => setNewFolderIcon(icon)} style={{ padding: "8px", borderRadius: "10px", background: newFolderIcon === icon ? "rgba(255,255,255,0.15)" : "transparent", cursor: "pointer", fontSize: "20px", transition: "all 0.2s" }}>{icon}</div>
                         ))}
                      </div>

                      {/* KÉPEK SZAKASZ */}
                      <div style={{ marginTop: "4px" }}>
                        <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "6px" }}>Fényképek / Képek</label>
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
                          <span>📸</span> {newFolderImages.length > 0 ? "További kép hozzáadása" : "Kép csatolása"}
                        </button>
                      </div>

                      {/* DOKUMENTUMOK SZAKASZ */}
                      <div style={{ marginTop: "8px" }}>
                        <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "6px" }}>Dokumentumok (PDF, Word, Számlák)</label>
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
                          <span>📄</span> {newFolderDocs.length > 0 ? "További dokumentum hozzáadása" : "Dokumentum csatolása"}
                        </button>
                      </div>

                      {/* HANGOK SZAKASZ */}
                      <div style={{ marginTop: "12px", marginBottom: "4px" }}>
                        <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8, display: "block", marginBottom: "6px" }}>Hangfelvételek / Hangjegyzetek</label>
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
                            <button type="button" onClick={stopRecording} style={{ padding: "6px 12px", background: "#ff5252", border: "none", borderRadius: "8px", color: "white", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Leállítás ⏹️</button>
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
                        <button type="button" onClick={() => { setIsCreatingFolder(false); setNewFolderImages([]); setNewFolderDocs([]); setNewFolderAudios([]); }} style={{ flex: 1, padding: "14px", background: "transparent", border: "1px solid var(--card-border)", borderRadius: "14px", color: "var(--text-color)", fontWeight: 600, fontSize: "15px" }}>Mégse</button>
                        <button type="submit" style={{ flex: 1, padding: "14px", background: "linear-gradient(135deg, #ffb74d, #ff7043)", border: "none", borderRadius: "14px", color: "white", fontWeight: 600, fontSize: "15px", boxShadow: "0 4px 15px rgba(255, 112, 67, 0.3)" }}>Mentés és Megnyitás</button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="glass-card" onClick={() => setIsCreatingFolder(true)} style={{ padding: "20px", borderRadius: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: "10px", border: "1px dashed rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", cursor: "pointer", transition: "all 0.2s" }}>
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

      {/* Új Bottom Nav */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: "12px", zIndex: 50 }}>
        <div style={{ position: "relative", width: "300px" }}>
          {/* FAB gomb */}
          <button
            className="fab-btn"
            onClick={() => { resetForm(); setActiveTab("Add"); }}
            style={{
              transform: activeTab === "Add" ? "translateX(-50%) scale(1.1)" : "translateX(-50%) scale(1)",
              background: activeTab === "Add"
                ? "linear-gradient(135deg, #ff7043, #e64a19)"
                : "linear-gradient(135deg, #ffb74d, #ff7043)",
              boxShadow: activeTab === "Add"
                ? "0 6px 24px rgba(230,74,25,0.7)"
                : "0 6px 18px rgba(255,112,67,0.5)"
            }}
          >
            <i className="fa-solid fa-plus"></i>
          </button>

          {/* Három panel */}
          <div className="tab-bar-body-css">
            <div className="panel-left">
              <a className={`nav-item ${activeTab === "Home" ? "active" : ""}`} data-tab="home" onClick={() => setActiveTab("Home")}>
                <i className="fa-solid fa-house"></i>
                <span>Home</span>
              </a>
              <a className={`nav-item ${activeTab === "Timeline" ? "active" : ""}`} data-tab="timeline" onClick={() => setActiveTab("Timeline")}>
                <i className="fa-regular fa-clock"></i>
                <span>Timeline</span>
              </a>
            </div>

            <div className="panel-center">
              <div className="fillet-corner fillet-left"></div>
              <div className="fillet-corner fillet-right"></div>
            </div>

            <div className="panel-right">
              <a className={`nav-item ${activeTab === "Vault" ? "active" : ""}`} data-tab="projekt" onClick={() => setActiveTab("Vault")}>
                <i className="fa-solid fa-layer-group"></i>
                <span>Projekt</span>
              </a>
              <a className={`nav-item ${activeTab === "Profile" ? "active" : ""}`} data-tab="profil" onClick={() => setActiveTab("Profile")}>
                <i className="fa-solid fa-user"></i>
                <span>Profil</span>
              </a>
            </div>
          </div>

          {/* iOS indicator */}
          <div className="ios-indicator"></div>
        </div>
      </div>

      {/* Kereső Overlay */}
      {isSearchOpen && (
        <div className="page-transition" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: "rgba(23, 36, 54, 0.95)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", display: "flex", flexDirection: "column", padding: "40px 22px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: 650 }}>Keresés</h2>
            <button onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", width: "42px", height: "42px", borderRadius: "14px", color: "var(--text-color)", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          
          <input 
            autoFocus 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="Keresés..." 
            style={{ width: "100%", padding: "16px", borderRadius: "16px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: "16px", outline: "none", marginBottom: "24px" }} 
          />
          
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "20px", scrollbarWidth: "none" }}>
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
                          <div key={event.id} onClick={() => { setIsSearchOpen(false); setScrollToEventId(event.id); setActiveTab("Timeline"); }} className="glass-card" style={{ padding: "14px", borderRadius: "16px", cursor: "pointer" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                                {event.event_type === 'memory' ? '💭' : '📅'}
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
                <p>Írj be legalább 2 karaktert a kereséshez.</p>
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
                <p style={{ opacity: 0.8, marginBottom: "24px", fontSize: "14px", lineHeight: 1.4 }}>Ez egy ismétlődő esemény. Törölni szeretnéd?</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button onClick={() => { setDeleteMode("single"); confirmDelete(); }} style={{ padding: "14px", borderRadius: "14px", background: "#ff6b6b", border: "none", color: "white", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}>Igen, törlöm</button>
                  <button onClick={() => { setEventToDeleteId(null); setDeleteMode(null); }} style={{ padding: "12px", borderRadius: "14px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "white", cursor: "pointer", fontSize: "14px" }}>Mégsem</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
                <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>Törlés megerősítése</h3>
                <p style={{ opacity: 0.8, marginBottom: "24px", fontSize: "14px", lineHeight: 1.4 }}>Biztosan törölni szeretnéd ezt az emléket? Ez a művelet nem vonható vissza.</p>
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
            <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>Összes esemény törlése</h3>
            <p style={{ opacity: 0.8, marginBottom: "24px", fontSize: "14px", lineHeight: 1.4 }}>Biztosan törölni szeretnéd az összes eseményedet? Ez a művelet nem vonható vissza!</p>
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
    </main>
  );
}
