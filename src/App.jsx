import { useState } from "react";
import Login from "./Login";
import StoreList from "./StoreList";
import PatientList from "./PatientList";
import AddMed from "./AddMed";

function App() {
  const [currentScreen, setCurrentScreen] = useState("login");
  const [selectedPatient, setSelectedPatient] = useState(null);

  const handleLogin = () => {
    setCurrentScreen("storeList");
  };

  const handleBackToLogin = () => {
    setCurrentScreen("login");
  };

  const handleCostCenterSelect = () => {
    setCurrentScreen("patientList");
  };

  const handleBackToStoreList = () => {
    setCurrentScreen("storeList");
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setCurrentScreen("addMed");
  };

  const handleBackToPatientList = () => {
    setCurrentScreen("patientList");
    // Optionally clear selectedPatient here if needed, but keeping it is fine
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
