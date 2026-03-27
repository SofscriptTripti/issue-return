import React, { useState, useRef, useEffect } from 'react';
import './PatientList.css';
import { authService } from './api/authService';
import { Html5Qrcode } from 'html5-qrcode';

const QR_ICON = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="5" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" />
        <rect x="3" y="16" width="5" height="5" rx="1" />
        <path d="M16 16h2v2h-2zM18 18h2v2h-2zM20 16h1v1h-1zM16 20h1v1h-1z" />
        <path d="M10 3h2v2h-2zM10 8h2v2h-2zM3 10h2v2H3zM8 10h2v2H8z" />
    </svg>
);

const LOGOUT_ICON = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
);

const CLOSE_ICON_SMALL = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

function PatientList({
    onBack,
    onLogout,
    onSelectPatient,
    scannedPatients = [],
    onAddScannedPatient,
    selectedStore,
    selectedCostCenter,
    stores = [],
    onStoreChange,
    onStoreAndCCChange,

    apiPatients = [],
    isPatientsLoading = false,
    onSearch
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerTarget, setScannerTarget] = useState('main');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const [costCenters, setCostCenters] = useState([]);
    const [isLoadingCC, setIsLoadingCC] = useState(false);
    const [erroredStoreId, setErroredStoreId] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [scannerError, setScannerError] = useState('');
    const html5QrCodeRef = useRef(null);

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterPtnNo, setFilterPtnNo] = useState('');
    const [filterFirst, setFilterFirst] = useState('');
    const [filterLast, setFilterLast] = useState('');
    const [filterMobile, setFilterMobile] = useState('');
    const [activeFilters, setActiveFilters] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showNoCameraModal, setShowNoCameraModal] = useState(false);

    // Hardware-aware Camera Check
    const checkBackCamera = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return false;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'videoinput');
        } catch (e) {
            return false;
        }
    };

    // Scanner logic
    useEffect(() => {
        let isMounted = true;
        if (isScannerOpen) {
            const timer = setTimeout(() => {
                const html5QrCode = new Html5Qrcode("reader-patient");
                html5QrCodeRef.current = html5QrCode;
                const config = { fps: 10, qrbox: { width: 250, height: 240 } };

                Html5Qrcode.getCameras().then(devices => {
                    if (devices && devices.length > 0 && isMounted) {
                        html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
                            console.log("Patient Scan result: ", decodedText);
                            setSearchTerm(decodedText);
                            if (onSearch) onSearch(decodedText);
                            html5QrCode.stop().then(() => {
                                if (isMounted) setIsScannerOpen(false);
                            }).catch(console.error);
                        }, (errorMessage) => {
                        }).catch((err) => {
                            console.error("Camera start failed:", err);
                        });
                    }
                }).catch(err => {
                    console.error("GetCameras failed:", err);
                });
            }, 300);

            return () => {
                isMounted = false;
                clearTimeout(timer);
                if (html5QrCodeRef.current && (html5QrCodeRef.current.isScanning || html5QrCodeRef.current.getState() === 2)) {
                    html5QrCodeRef.current.stop().catch(console.error);
                }
            };
        }
    }, [isScannerOpen]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const onSearchRef = useRef(onSearch);
    useEffect(() => {
        onSearchRef.current = onSearch;
    }, [onSearch]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            console.log("PatientList: Debounced search triggered for:", searchTerm);
            if (onSearchRef.current) {
                onSearchRef.current(searchTerm);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        console.log("PatientList: handleSearchSubmit triggered. Term:", searchTerm);
        if (onSearch) {
            onSearch(searchTerm);
        }
    };

    const handleStoreSelect = async (e, store) => {
        if (e) e.stopPropagation();
        if (onStoreAndCCChange) {
            setCostCenters([]);
            setErroredStoreId(null);
            setIsLoadingCC(true);
            try {
                const response = await authService.getCostCenters(store.id);
                const ccData = response.data || (Array.isArray(response) ? response : []);
                if (Array.isArray(ccData) && ccData.length > 0) {
                    const mappedCC = ccData.map(cc => ({
                        id: cc.ccCd,
                        name: cc.ccDescriprion || "Unnamed Cost Center",
                        ptnTypFlg: cc.ptnTypFlg || "O"
                    }));
                    
                    if (mappedCC.length === 1) {
                        onStoreAndCCChange(store, mappedCC[0]);
                        setIsDropdownOpen(false);
                    } else {
                        setCostCenters(mappedCC);
                        onStoreAndCCChange(store, null); 
                    }
                } else {
                    setErroredStoreId(store.id);
                    onStoreAndCCChange(store, null);
                }
            } catch (err) {
                console.error("Failed to fetch CCs in dropdown:", err);
                setErroredStoreId(store.id);
            } finally {
                setIsLoadingCC(false);
            }
        }
    };

    const handleCCSelect = (e, cc) => {
        if (e) e.stopPropagation();
        if (onStoreAndCCChange) {
            onStoreAndCCChange(null, cc);
        }
        setIsDropdownOpen(false);
        setCostCenters([]);
    };

    const openScanner = async () => {
        const hasCamera = await checkBackCamera();
        if (!hasCamera) {
            setShowNoCameraModal(true);
            return;
        }
        setScannerError('');
        setIsScannerOpen(true);
    };

    const clearFilter = () => {
        setFilterPtnNo(''); setFilterFirst(''); setFilterLast(''); setFilterMobile('');
        setActiveFilters(null);
    };

    const getDisplayedPatients = () => {
        return apiPatients.map((p, idx) => {
            const formatVal = (val) => (val && val !== "." && String(val).trim() !== "") ? val : "-";
            
            // Prefer the backend's pre-formatted Full Name if available
            const fullNameFallback = [p.ptnFName, p.ptnMName, p.ptnLName]
                .filter(part => part && part.trim() !== "." && part.trim() !== "")
                .map(part => part.trim())
                .join(" ");
            
            const displayTitle = formatVal(p.ptnFullLName) !== "-" ? p.ptnFullLName : (fullNameFallback || "-");

            return {
                id: p.ptnNo || idx,
                name: displayTitle,
                ptnNo: formatVal(p.ptnNo),
                age: formatVal(p.age),
                gender: formatVal(p.gender),
                phone: formatVal(p.ptnMobileNo),
                doctor: formatVal(p.docName),
                mobile: formatVal(p.ptnMobileNo),
                status: 'OPD'
            };
        });
    };

    const displayedPatients = getDisplayedPatients();
    const hasActiveFilter = activeFilters && Object.values(activeFilters).some(v => v);

    return (
        <div className="patient-list-container">
            {(selectedStore || selectedCostCenter) && (
                <div className="selection-info-bar">
                    <div className="selection-top-row">
                        <div className="custom-store-dropdown" ref={dropdownRef}>
                            <button
                                className={`dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <span className="current-store-text">{selectedStore || "Select Store"}</span>
                                <span className="chevron-icon">▼</span>
                            </button>
                            {isDropdownOpen && (
                                <div className="dropdown-menu-portal">
                                    {costCenters.length > 0 ? (
                                        <>
                                            <div className="dropdown-header-with-action">
                                                <span className="dropdown-header-label">Select Cost Center</span>
                                                <button className="dropdown-close-action" onClick={(e) => { e.stopPropagation(); setCostCenters([]); }} title="Back to Stores">
                                                    {CLOSE_ICON_SMALL}
                                                </button>
                                            </div>
                                            {costCenters.map(cc => (
                                                <div
                                                    key={cc.id}
                                                    className="dropdown-item cc-item"
                                                    onClick={(e) => handleCCSelect(e, cc)}
                                                >
                                                    <span className="store-option-name">{cc.name}</span>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        stores.map(store => (
                                            <div
                                                key={store.id}
                                                className={`dropdown-item ${selectedStore === store.name ? 'selected' : ''}`}
                                                onClick={(e) => handleStoreSelect(e, store)}
                                            >
                                                <div className="store-item-row" style={{display:'flex', alignItems:'center', gap:10}}>
                                                    <span className="store-indicator" style={{ background: store.color }}></span>
                                                    <div className="store-text-stack" style={{display:'flex', flexDirection:'column'}}>
                                                        <span className="store-option-name">{store.name}</span>
                                                        {erroredStoreId === store.id && (
                                                            <span style={{fontSize:'10px', color:'#ef4444', fontWeight:600}}>No Cost Center available</span>
                                                        )}
                                                        {isLoadingCC && !costCenters.length && !erroredStoreId && (
                                                            <span style={{fontSize:'10px', color:'#94a3b8'}}>Checking...</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {selectedStore === store.name && <span className="check-icon">✓</span>}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)} title="Logout">
                            {LOGOUT_ICON}
                            <span className="logout-text">Logout</span>
                        </button>
                    </div>

                    <div className="selection-bottom-row">
                        <div className="selection-left">
                            <span className="selection-label">
                                <div className="selection-details-text">
                                    <span className="store-display-name">{selectedStore}</span>
                                    <span className="cc-display-name">{selectedCostCenter}</span>
                                </div>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="patient-list-content">
                <div className="search-container">
                    <form className="search-box" onSubmit={handleSearchSubmit}>
                        <button type="submit" className="search-icon-btn" onClick={handleSearchSubmit}>🔍</button>
                        <input
                            type="text"
                            placeholder="Type Name, PTN or Phone and search..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {isPatientsLoading && (
                            <div className="search-circle-loader"></div>
                        )}
                        <button type="button" className="search-scanner-btn" onClick={openScanner}>
                            {QR_ICON}
                        </button>
                    </form>
                </div>

                {hasActiveFilter && (
                    <div className="active-filter-bar">
                        <span className="active-filter-label">🔖 Filtered</span>
                        <button className="clear-filter-btn" onClick={clearFilter}>Clear ✕</button>
                    </div>
                )}

                <div className="patient-cards-list">
                    {!isPatientsLoading && displayedPatients.length === 0 ? (
                        <div className="no-results">No patients matching your search</div>
                    ) : (
                        displayedPatients.map((patient) => (
                            <div key={patient.id} className="patient-card" onClick={() => onSelectPatient && onSelectPatient(patient)}>
                                <div className="patient-card-content">
                                    <div className="patient-info-grid">
                                        <div className="grid-cell cell-left">
                                            <span className="patient-name-bold">{patient.name}</span>
                                        </div>
                                        <div className="grid-cell cell-right">
                                            <span className={`status-badge opd-badge`}>
                                                OPD
                                            </span>
                                        </div>
                                        <div className="grid-cell cell-left">
                                            <span className="info-label-inline">Age / Gender:</span>
                                            <span className="info-value-inline text-black">{patient.age} / {patient.gender}</span>
                                        </div>
                                        <div className="grid-cell cell-right">
                                            <span className="info-label-inline">Doctor:</span>
                                            <span className="info-value-inline text-black">{patient.doctor}</span>
                                        </div>
                                        <div className="grid-cell cell-left">
                                            <span className="info-label-inline">PTN ID:</span>
                                            <span className="info-value-inline text-black">#{patient.ptnNo}</span>
                                        </div>
                                        <div className="grid-cell cell-right">
                                            <span className="info-label-inline">Patient No:</span>
                                            <span className="info-value-inline text-black">{patient.mobile}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {isScannerOpen && (
                <div className="scanner-modal-overlay">
                    <div className="scanner-modal">
                        <button className="close-scanner" onClick={() => setIsScannerOpen(false)}>×</button>
                        <div className="scanner-view">
                            <h3 className="scanner-instructions">Scan Patient ID</h3>
                            <div className="scanner-box-container" style={{ position: 'relative', overflow: 'hidden', minHeight: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000', borderRadius: '12px' }}>
                                {scannerError ? (
                                    <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>{scannerError}</div>
                                ) : (
                                    <div id="reader-patient" style={{ width: '100%', height: '100%' }}></div>
                                )}
                            </div>
                            <div className="scanner-actions">
                                <p className="scan-btn-hint">Point camera at Patient QR Code</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showLogoutConfirm && (
                <div className="adv-overlay" onClick={() => setShowLogoutConfirm(false)}>
                    <div className="adv-modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: 340 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#005bb7', marginBottom: 8 }}>Confirm Logout</h2>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#4a4a4a', marginBottom: 24, lineHeight: 1.5 }}>
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
                                onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
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
            {showNoCameraModal && (
                <div className="adv-overlay" onClick={() => setShowNoCameraModal(false)}>
                    <div className="adv-modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: 340 }}>
                        <div style={{ color: '#ef4444', marginBottom: 16 }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a8a', marginBottom: 8 }}>Camera Not Found</h2>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
                            YOU DON'T HAVE BACK CAMERA
                        </p>
                        <button
                            onClick={() => setShowNoCameraModal(false)}
                            style={{
                                width: '100%', padding: '14px', borderRadius: 12,
                                border: 'none', background: '#006ce6',
                                color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,108,230,0.2)'
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PatientList;
