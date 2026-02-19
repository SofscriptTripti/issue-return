import { useState, useEffect } from "react";
import Login from "./Login";
import StoreList from "./StoreList";
import PatientList from "./PatientList";
import AddMed from "./AddMed";

function App() {
  const [currentScreen, setCurrentScreen] = useState("login");
  const [selectedPatient, setSelectedPatient] = useState(null);

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
    setCurrentScreen("login");
  };

  const handleCostCenterSelect = () => {
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

  return (
    <>
      {currentScreen === "login" && (
        <Login onLogin={handleLogin} />
      )}
      {currentScreen === "storeList" && (
        <StoreList
          onBack={handleBackToLogin}
          onSelectCostCenter={handleCostCenterSelect}
        />
      )}
      {currentScreen === "patientList" && (
        <PatientList
          onBack={handleBackToStoreList}
          onSelectPatient={handleSelectPatient}
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
