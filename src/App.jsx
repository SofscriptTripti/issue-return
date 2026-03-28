import { useState, useEffect, useCallback, useMemo } from "react";
import Login from "./Login";
import PatientList from "./PatientList";
import AddMed from "./AddMed";
import StoreSelection from "./StoreSelection";
import { authService } from "./api/authService";

const STORE_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#64748b'];
const SESSION_KEY = "app_session";

function App() {
  // Restore session from sessionStorage on first render
  const savedSession = (() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {}; } catch { return {}; }
  })();

  const [currentScreen, setCurrentScreen] = useState(savedSession.screen || "login");
  const [selectedPatient, setSelectedPatient] = useState(savedSession.selectedPatient || null);
  const [scannedPatients, setScannedPatients] = useState([]);
  const [selectedStoreName, setSelectedStoreName] = useState(savedSession.selectedStoreName || "");
  const [selectedStoreCd, setSelectedStoreCd] = useState(savedSession.selectedStoreCd || "");
  const [selectedCostCenter, setSelectedCostCenter] = useState(savedSession.selectedCostCenter || "");
  const [selectedCCCd, setSelectedCCCd] = useState(savedSession.selectedCCCd || "");
  const [savedPtnTypFlg, setSavedPtnTypFlg] = useState(savedSession.ptnTypFlg || "O");
  const [stores, setStores] = useState([]);
  const [storeType, setStoreType] = useState("INVENTORY");
  const [apiPatients, setApiPatients] = useState([]);
  const [isPatientsLoading, setIsPatientsLoading] = useState(false);

  // Save session to sessionStorage whenever key values change
  useEffect(() => {
    const session = {
      screen: currentScreen,
      selectedStoreName,
      selectedStoreCd,
      selectedCostCenter,
      selectedCCCd,
      ptnTypFlg: savedPtnTypFlg,
      selectedPatient,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [currentScreen, selectedStoreName, selectedStoreCd, selectedCostCenter, selectedCCCd, selectedPatient]);

  const fetchStores = async () => {
    try {
      const response = await authService.getStores();
      console.log("Stores API Response:", response);
      const storesArray = response.data || (Array.isArray(response) ? response : []);
      if (Array.isArray(storesArray)) {
        const mappedStores = storesArray.map((s, idx) => ({
          id: s.strCd || idx,
          name: s.strDescription || "Unknown Store",
          type: 'main',
          color: STORE_COLORS[idx % STORE_COLORS.length]
        }));
        setStores(mappedStores);
      } else {
        setStores([]);
      }
    } catch (err) {
      console.error("Failed to fetch stores:", err);
      setStores([]);
    }
  };

  const fetchPatients = useCallback(async (ptnTypFlg) => {
    setIsPatientsLoading(true);
    // Removed setApiPatients([]) to prevent flickering while loading
    try {
      let response;
      if (ptnTypFlg === "I") {
        console.log("Fetching IN Patients...");
        response = await authService.getInPatients();
      } else {
        console.log("Fetching OUT Patients...");
        response = await authService.getOutPatients();
      }
      console.log("API Patients fetch complete:", response);
      const data = response.data || (Array.isArray(response) ? response : []);
      setApiPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch patients:", err);
      setApiPatients([]);
    } finally {
      setIsPatientsLoading(false);
    }
  }, []);

  // On mount: restore session if token exists
  useEffect(() => {
    const token = sessionStorage.getItem("authToken");
    if (!token) {
      // No token — reset to login
      setCurrentScreen("login");
      return;
    }

    // Always fetch stores fresh (they don't change often)
    fetchStores();

    // If we were on patientList or addMed, re-fetch patients
    const screen = savedSession.screen;
    if ((screen === "patientList" || screen === "addMed") && savedSession.ptnTypFlg) {
      fetchPatients(savedSession.ptnTypFlg);
    }

    const handlePopState = (event) => {
      if (event.state && event.state.screen) {
        setCurrentScreen(event.state.screen);
        if (event.state.patient) setSelectedPatient(event.state.patient);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleLoginSuccess = () => {
    fetchStores();
    window.history.pushState({ screen: "storeSelection" }, "", "");
    setCurrentScreen("storeSelection");
  };

  const handleCostCenterSelect = (storeName, costCenter, ptnTypFlg, storeCd, ccCd) => {
    console.log("Setting selection codes in App:", { storeCd, ccCd });
    setSelectedStoreName(storeName);
    setSelectedStoreCd(storeCd);
    setSelectedCostCenter(costCenter);
    setSelectedCCCd(ccCd);
    setSavedPtnTypFlg(ptnTypFlg);
    fetchPatients(ptnTypFlg);
    window.history.pushState({ screen: "patientList" }, "", "");
    setCurrentScreen("patientList");
  };

  const handleBackToLogin = () => {
    window.history.pushState({ screen: "storeSelection" }, "", "");
    setCurrentScreen("storeSelection");
  };

  const handleLogout = () => {
    // Clear ALL localStorage to ensure no credentials or sessions persist
    sessionStorage.clear();
    localStorage.clear(); // Keep clearing localStorage too just in case old data exists

    // Force a full page reload to the root URL
    // This is the most reliable way to clear all in-memory React states
    window.location.href = "/Meditrack/";
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    window.history.pushState({ screen: "addMed", patient }, "", "");
    setCurrentScreen("addMed");
  };

  const handleBackToPatientList = () => {
    window.history.pushState({ screen: "patientList" }, "", "");
    setCurrentScreen("patientList");
  };

  const handleAddScannedPatient = (patient) => {
    setScannedPatients(prev => {
      if (prev.find(p => p.uhid === patient.uhid)) return prev;
      return [patient, ...prev];
    });
  };

  const handleStoreAndCCChange = (store, cc) => {
    if (store) {
      setSelectedStoreName(store.name);
      setSelectedStoreCd(store.id);
    }
    if (cc) {
      setSelectedCostCenter(cc.name);
      setSelectedCCCd(cc.id);
      setSavedPtnTypFlg(cc.ptnTypFlg);
      fetchPatients(cc.ptnTypFlg);
    }
  };

  const handlePatientSearch = useCallback(async (searchTerm) => {
    console.log("App.jsx handlePatientSearch called with:", searchTerm);
    if (!searchTerm || searchTerm.trim() === "") {
      console.log("Empty search term, fetching default list...");
      fetchPatients(savedPtnTypFlg);
      return;
    }

    setIsPatientsLoading(true);
    try {
      console.log(`API Searching for: "${searchTerm}"...`);
      const response = await authService.getOutPatients(searchTerm);
      console.log("Search API Result received:", response);

      const data = response.data || (Array.isArray(response) ? response : []);
      setApiPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to search patients:", err);
      setApiPatients([]);
    } finally {
      setIsPatientsLoading(false);
    }
  }, [fetchPatients, savedPtnTypFlg]);

  return (
    <>
      {(currentScreen === "login" || currentScreen === "storeSelection") && (
        <Login
          onLoginSuccess={handleLoginSuccess}
        />
      )}
      {currentScreen === "storeSelection" && (
        <StoreSelection
          stores={stores}
          onSelectCostCenter={handleCostCenterSelect}
          onLogout={handleLogout}
        />
      )}
      {currentScreen === "patientList" && (
        <PatientList
          onBack={handleBackToLogin}
          onLogout={handleLogout}
          onSelectPatient={handleSelectPatient}
          scannedPatients={scannedPatients}
          onAddScannedPatient={handleAddScannedPatient}
          selectedStore={selectedStoreName}
          selectedCostCenter={selectedCostCenter}
          stores={stores}
          onStoreAndCCChange={handleStoreAndCCChange}
          storeType={storeType}
          onStoreTypeChange={setStoreType}
          apiPatients={apiPatients}
          isPatientsLoading={isPatientsLoading}
          onSearch={handlePatientSearch}
        />
      )}
      {currentScreen === "addMed" && (
        <AddMed
          patient={selectedPatient}
          onBack={handleBackToPatientList}
          storeCd={selectedStoreCd}
          ccCd={selectedCCCd}
        />
      )}
    </>
  );
}

export default App;

