import { useState, useEffect } from "react";
import Login from "./Login";
import StoreList from "./StoreList";
import PatientList from "./PatientList";
import AddMed from "./AddMed";

const STORES = [
  { id: 1, name: 'Main Pharmacy', type: 'main', color: '#4f46e5' },
  { id: 2, name: 'IPD Pharmacy', type: 'ipd', color: '#0ea5e9' },
  { id: 3, name: 'OPD Pharmacy', type: 'opd', color: '#10b981' },
  { id: 4, name: 'Emergency Store', type: 'emergency', color: '#ef4444' },
  { id: 5, name: 'ICU Sub-Store', type: 'icu', color: '#f59e0b' },
  { id: 6, name: 'OT Pharmacy', type: 'ot', color: '#8b5cf6' },
  { id: 7, name: 'General Ward Supply', type: 'ward', color: '#ec4899' },
  { id: 8, name: 'Private Wing Store', type: 'private', color: '#6366f1' },
  { id: 9, name: 'Mother & Child Wing', type: 'child', color: '#14b8a6' },
  { id: 10, name: 'Surgical Store', type: 'surgical', color: '#64748b' },
];

function App() {
  const [currentScreen, setCurrentScreen] = useState("login");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [scannedPatients, setScannedPatients] = useState([]);
  const [selectedStoreName, setSelectedStoreName] = useState("");
  const [selectedCostCenter, setSelectedCostCenter] = useState("");
  const [storeType, setStoreType] = useState("INVENTORY");

  useEffect(() => {
    // Set initial history state
    window.history.replaceState({ screen: "login" }, "", "");

    const handlePopState = (event) => {
      if (event.state && event.state.screen) {
        setCurrentScreen(event.state.screen);
        if (event.state.patient) {
          setSelectedPatient(event.state.patient);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleLogin = () => {
    // Replace 'login' history entry with 'storeList' so "Back" exits the app
    window.history.replaceState({ screen: "storeList" }, "", "");
    setCurrentScreen("storeList");
  };

  // handleBackToLogin is technically unreachable via UI now, but kept for safety/references
  const handleBackToLogin = () => {
    setScannedPatients([]); // Clear persisted scanned patients on logout
    setCurrentScreen("login");
  };

  const handleCostCenterSelect = (storeName, costCenter) => {
    setSelectedStoreName(storeName);
    setSelectedCostCenter(costCenter);
    window.history.pushState({ screen: "patientList" }, "", "");
    setCurrentScreen("patientList");
  };

  const handleBackToStoreList = () => {
    window.history.back();
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    window.history.pushState({ screen: "addMed", patient }, "", "");
    setCurrentScreen("addMed");
  };

  const handleBackToPatientList = () => {
    window.history.back();
  };

  const handleAddScannedPatient = (patient) => {
    setScannedPatients(prev => {
      // Avoid duplicate UHIDs if needed, but for now just appending
      if (prev.find(p => p.uhid === patient.uhid)) return prev;
      return [patient, ...prev];
    });
  };

  return (
    <>
      {currentScreen === "login" && (
        <Login onLogin={handleLogin} />
      )}
      {currentScreen === "storeList" && (
        <StoreList
          onBack={handleBackToLogin}
          onSelectCostCenter={handleCostCenterSelect}
          stores={STORES}
        />
      )}
      {currentScreen === "patientList" && (
        <PatientList
          onBack={handleBackToStoreList}
          onSelectPatient={handleSelectPatient}
          scannedPatients={scannedPatients}
          onAddScannedPatient={handleAddScannedPatient}
          selectedStore={selectedStoreName}
          selectedCostCenter={selectedCostCenter}
          stores={STORES}
          onStoreChange={setSelectedStoreName}
          storeType={storeType}
          onStoreTypeChange={setStoreType}
        />
      )}
      {currentScreen === "addMed" && (
        <AddMed
          patient={selectedPatient}
          onBack={handleBackToPatientList}
        />
      )}
    </>
  );
}

export default App;
