
"use client";

import styles from "./BottomNav.module.css";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  resetForm: () => void;
}

export default function BottomNav({ activeTab, setActiveTab, resetForm }: BottomNavProps) {
  return (
    <nav className={styles.bottomNav} aria-label="Bottom navigation">
      <svg
        className={styles.navShape}
        viewBox="0 0 358 84"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="
            M 28 0
            H 128
            C 145 0 145 18 158 27
            C 170 35 188 35 200 27
            C 213 18 213 0 230 0
            H 330
            C 346 0 358 12 358 28
            V 56
            C 358 72 346 84 330 84
            H 28
            C 12 84 0 72 0 56
            V 28
            C 0 12 12 0 28 0
            Z
          "
        />
      </svg>
      <div className={styles.innerGlow} />
      
      <a 
        href="#" 
        className={`${styles.navItem} ${styles.homeIcon} ${activeTab === "Home" ? styles.active : ""}`}
        onClick={(e) => { e.preventDefault(); setActiveTab("Home"); }}
      >
        <svg className={styles.navIcon} viewBox="0 0 24 24">
          <path d="M3 10.8L12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5.2v-6.2H9.2V21H4a1 1 0 0 1-1-1v-9.2z" />
        </svg>
        <span>Home</span>
      </a>
      
      <a 
        href="#" 
        className={`${styles.navItem} ${styles.timelineIcon} ${activeTab === "Timeline" ? styles.active : ""}`}
        onClick={(e) => { e.preventDefault(); setActiveTab("Timeline"); }}
      >
        <svg className={styles.navIcon} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="none" />
          <path d="M12 6v6l4 2" fill="none" />
        </svg>
        <span>Timeline</span>
      </a>
      
      <button 
        className={`${styles.centerButton} ${activeTab === "Add" ? styles.centerButtonActive : ""}`}
        aria-label="Add"
        onClick={() => { resetForm(); setActiveTab("Add"); }}
      >
        <span>+</span>
      </button>
      
      <a 
        href="#" 
        className={`${styles.navItem} ${styles.vaultIcon} ${activeTab === "Vault" ? styles.active : ""}`}
        onClick={(e) => { e.preventDefault(); setActiveTab("Vault"); }}
      >
        <svg className={styles.navIcon} viewBox="0 0 24 24">
          <rect x="6" y="10" width="12" height="10" rx="2" fill="none" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" />
        </svg>
        <span>Vault</span>
      </a>
      
      <a 
        href="#" 
        className={`${styles.navItem} ${styles.profileIcon} ${activeTab === "Profile" ? styles.active : ""}`}
        onClick={(e) => { e.preventDefault(); setActiveTab("Profile"); }}
      >
        <svg className={styles.navIcon} viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.6-4.2 4.4-6 8-6s6.4 1.8 8 6" />
        </svg>
        <span>Profile</span>
      </a>
    </nav>
  );
}
