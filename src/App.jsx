import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const currentScreenRef = useRef(currentScreen);
  useEffect(() => {
    currentScreenRef.current = currentScreen;
    if (currentScreen === "patientList" && window.location.hash !== "#active") {
      window.history.pushState({ screen: "patientList" }, "", "#active");
    }
  }, [currentScreen]);

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

    if (!window.history.state || window.history.length === 1) {
      window.history.replaceState({ screen: screen || "login" }, "", "");
      window.history.pushState({ screen: screen || "login" }, "", "");
    }

    const handlePopState = (event) => {
      // Only handle popstate if there is still a valid auth token
      const tok = sessionStorage.getItem("authToken");
      if (!tok) {
        // No token — force back to login screen and replace history
        window.history.replaceState({ screen: "login" }, "", "");
        setCurrentScreen("login");
        return;
      }

      if (currentScreenRef.current === "patientList") {
        window.history.pushState({ screen: "patientList" }, "", "#active");
        setShowLogoutConfirm(true);
        return;
      }

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
    // Use replaceState so there's no "back" entry pointing to storeSelection
    window.history.replaceState({ screen: "storeSelection" }, "", "");
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
    setShowLogoutConfirm(true);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    setSelectedPatient(null);
    setSelectedStoreName("");
    setSelectedCostCenter("");
    setSelectedStoreCd("");
    setSelectedCCCd("");
    setStores([]);
    setApiPatients([]);
    window.history.replaceState({ screen: "login" }, "", window.location.pathname);
    setCurrentScreen("login");
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    window.history.pushState({ screen: "addMed", patient }, "", "");
    setCurrentScreen("addMed");
  };

  const handleBackToPatientList = () => {
    window.history.replaceState({ screen: "patientList" }, "", "");
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
    } else if (store) {
      // Clear CC if user selected a store with no CCs or is switching
      setSelectedCostCenter("");
      setSelectedCCCd("");
      setApiPatients([]); // Clear the list
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

      {showLogoutConfirm && (
        <div className="adv-overlay" onClick={() => setShowLogoutConfirm(false)}>
            <div className="adv-modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: 340 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#005bb7', marginBottom: 8, margin: '0 0 8px 0' }}>Confirm Logout</h2>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#4a4a4a', marginBottom: 24, margin: '0 0 24px 0', lineHeight: 1.5 }}>
                    Are you sure you want to logout?
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={() => setShowLogoutConfirm(false)}
                        style={{
                            flex: 1, padding: '12px', borderRadius: 10,
                            border: '1px solid #dae8f7', background: '#f0f7ff',
                            color: '#005bb7', fontWeight: 700, fontSize: 14, cursor: 'pointer'
                        }}
                    >
                        No
                    </button>
                    <button
                        onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}
                        style={{
                            flex: 1, padding: '12px', borderRadius: 10,
                            border: 'none', background: 'linear-gradient(135deg, #006ce6, #00c7ff)',
                            color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,108,230,0.2)'
                        }}
                    >
                        Yes
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
}

export default App;

