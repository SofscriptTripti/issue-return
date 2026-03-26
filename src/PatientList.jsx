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
    isPatientsLoading = false
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

    useEffect(() => {
        setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }, []);

    // Scanner logic
    useEffect(() => {
        let isMounted = true;
        if (isScannerOpen && isMobile) {
            const timer = setTimeout(() => {
                const html5QrCode = new Html5Qrcode("reader-patient");
                html5QrCodeRef.current = html5QrCode;
                const config = { fps: 10, qrbox: { width: 250, height: 250 } };

                Html5Qrcode.getCameras().then(devices => {
                    if (devices && devices.length > 0 && isMounted) {
                        html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
                            console.log("Patient Scan result: ", decodedText);
                            setSearchTerm(decodedText);
                            html5QrCode.stop().then(() => {
                                if (isMounted) setIsScannerOpen(false);
                            }).catch(console.error);
                        }, (errorMessage) => {
                        }).catch((err) => {
                            console.error("Camera start failed:", err);
                            if (isMounted) setScannerError("Camera not allowed or unavailable. Check app settings.");
                        });
                    } else if (isMounted) {
                        setScannerError("No camera found on this device.");
                    }
                }).catch(err => {
                    console.error("GetCameras failed:", err);
                    if (isMounted) setScannerError("Camera permission denied or camera unavailable.");
                });
            }, 300);
            return () => {
                isMounted = false;
                clearTimeout(timer);
            };
        }

        return () => {
            isMounted = false;
            if (html5QrCodeRef.current && (html5QrCodeRef.current.isScanning || html5QrCodeRef.current.getState() === 2)) {
                html5QrCodeRef.current.stop().catch(console.error);
            }
        };
    }, [isScannerOpen, isMobile]);

    useEffect(() => {
        if (apiPatients.length > 0) {
            console.log("Current API Patients in List:", apiPatients);
        }
    }, [apiPatients]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
                    // We don't change screen, just show error in dropdown
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

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterPtnNo, setFilterPtnNo] = useState('');
    const [filterFirst, setFilterFirst] = useState('');
    const [filterLast, setFilterLast] = useState('');
    const [filterMobile, setFilterMobile] = useState('');
    const [activeFilters, setActiveFilters] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const openScanner = () => {
        setScannerError('');
        setIsScannerOpen(true);
    };

    const handleScanQR = () => {
        console.log("QR Scan triggered");
        setIsScannerOpen(false);
    };

    const applyFilter = () => {
        setActiveFilters({ ptnNo: filterPtnNo, first: filterFirst, last: filterLast, mobile: filterMobile });
        setIsFilterOpen(false);
    };

    const clearFilter = () => {
        setFilterPtnNo(''); setFilterFirst(''); setFilterLast(''); setFilterMobile('');
        setActiveFilters(null);
    };

    const getDisplayedPatients = () => {
        let list = apiPatients.map((p, idx) => {
            const formatVal = (val) => (val && val !== "." && String(val).trim() !== "") ? val : "-";
            const fullName = [p.ptnFName, p.ptnMName, p.ptnLName]
                .filter(part => part && part.trim() !== "." && part.trim() !== "")
                .map(part => part.trim())
                .join(" ");

            return {
                id: p.ptnNo || idx,
                name: fullName || "-",
                ptnNo: formatVal(p.ptnNo),
                age: formatVal(p.age),
                gender: formatVal(p.gender),
                phone: formatVal(p.ptnMobileNo),
                doctor: formatVal(p.docName),
                mobile: formatVal(p.ptnMobileNo),
                status: 'OPD'
            };
        });

        if (activeFilters) {
            list = list.filter(p => {
                if (activeFilters.ptnNo && !String(p.ptnNo).includes(activeFilters.ptnNo)) return false;
                if (activeFilters.first && !p.name.toLowerCase().includes(activeFilters.first.toLowerCase())) return false;
                if (activeFilters.mobile && !p.phone.includes(activeFilters.mobile)) return false;
                return true;
            });
        } else if (searchTerm) {
            list = list.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(p.ptnNo).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return list;
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

                        {/* <button 
                            className={`nav-filter-btn ${hasActiveFilter ? 'filter-active' : ''}`} 
                            onClick={() => setIsFilterOpen(true)}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            <span className="nav-filter-text">Advance Search</span>
                        </button> */}
                    </div>
                </div>
            )}

            <div className="patient-list-content">
                <div className="search-container">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search by Name, PTN and Phone No"
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button className="search-scanner-btn" onClick={openScanner}>
                            {QR_ICON}
                        </button>
                    </div>
                </div>

                {hasActiveFilter && (
                    <div className="active-filter-bar">
                        <span className="active-filter-label">🔖 Filtered</span>
                        <button className="clear-filter-btn" onClick={clearFilter}>Clear ✕</button>
                    </div>
                )}

                <div className="patient-cards-list">
                    {isPatientsLoading && (
                        <div className="no-results">Loading patient details...</div>
                    )}

                    {(scannedPatients || []).filter(sp => {
                        const searchLower = searchTerm.toLowerCase();
                        const matchesSearch = !searchTerm ||
                            sp.name.toLowerCase().includes(searchLower) ||
                            sp.uhid.toLowerCase().includes(searchLower);

                        let matchesAdvance = true;
                        if (activeFilters) {
                            if (activeFilters.ptnNo && !sp.uhid.includes(activeFilters.ptnNo)) matchesAdvance = false;
                            if (activeFilters.first && !sp.name.toLowerCase().includes(activeFilters.first.toLowerCase())) matchesAdvance = false;
                        }

                        return matchesSearch && matchesAdvance;
                    }).map((scannedPatient, idx) => (
                        <div key={`scanned-${idx}`} className="patient-card scanned-patient-card"
                            onClick={() => onSelectPatient && onSelectPatient({
                                name: scannedPatient.name || "-", ptnNo: scannedPatient.uhid ? scannedPatient.uhid.replace('PTN-', '') : "-",
                                age: scannedPatient.age || "-", gender: scannedPatient.gender || "-",
                                phone: '-', doctor: scannedPatient.doctor || "-",
                                lastVisit: scannedPatient.discharge || "-", status: 'OPD'
                            })}>
                            <div className="patient-card-content">
                                <div className="patient-info-grid">
                                    <div className="grid-cell cell-left">
                                        <span className="patient-name-bold">{scannedPatient.name}</span>
                                    </div>
                                    <div className="grid-cell cell-right">
                                        <span className="status-badge opd-badge">OPD</span>
                                    </div>
                                    <div className="grid-cell cell-left">
                                        <span className="info-label-inline">Age / Gender:</span>
                                        <span className="info-value-inline text-black">{scannedPatient.age} / {scannedPatient.gender}</span>
                                    </div>
                                    <div className="grid-cell cell-right">
                                        <span className="info-label-inline">Doctor:</span>
                                        <span className="info-value-inline text-black">{scannedPatient.doctor}</span>
                                    </div>
                                    <div className="grid-cell cell-left">
                                        <span className="info-label-inline">PTN ID:</span>
                                        <span className="info-value-inline text-black">#{scannedPatient.uhid.replace('PTN-', '')}</span>
                                    </div>
                                    <div className="grid-cell cell-right">
                                        <span className="info-label-inline">Last Visit:</span>
                                        <span className="info-value-inline text-black">{scannedPatient.discharge}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {!isPatientsLoading && displayedPatients.length === 0 ? (
                        <div className="no-results">No patients found</div>
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

            {/* {isFilterOpen && (
                <div className="adv-overlay" onClick={() => setIsFilterOpen(false)}>
                    <div className="adv-modal" onClick={e => e.stopPropagation()}>
                        <div className="adv-header">
                            <span className="adv-title">Advance Search</span>
                            <button className="adv-close" onClick={() => setIsFilterOpen(false)}>✕</button>
                        </div>
                        <div className="adv-field">
                            <label className="adv-label">Patient Number</label>
                            <div className="adv-input-row">
                                <input className="adv-input" placeholder="Enter" value={filterPtnNo} onChange={e => setFilterPtnNo(e.target.value)} />
                                <button className="adv-scan-btn" onClick={() => openScanner('filter')}>{QR_ICON}</button>
                            </div>
                        </div>
                        <div className="adv-row-2">
                            <div className="adv-field">
                                <label className="adv-label">First Name</label>
                                <input className="adv-input" placeholder="Enter" value={filterFirst} onChange={e => setFilterFirst(e.target.value)} />
                            </div>
                            <div className="adv-field">
                                <label className="adv-label">Last Name</label>
                                <input className="adv-input" placeholder="Enter" value={filterLast} onChange={e => setFilterLast(e.target.value)} />
                            </div>
                        </div>
                        <div className="adv-field">
                            <label className="adv-label">Mobile Number</label>
                            <input className="adv-input" placeholder="+91" value={filterMobile} onChange={e => setFilterMobile(e.target.value)} />
                        </div>
                        <div className="adv-actions">
                            <button className="adv-btn-clear" onClick={clearFilter}>Clear</button>
                            <button className="adv-btn-apply" onClick={applyFilter}>Show Results</button>
                        </div>
                    </div>
                </div>
            )} */}

            {isScannerOpen && (
                <div className="scanner-modal-overlay">
                    <div className="scanner-modal">
                        <button className="close-scanner" onClick={() => setIsScannerOpen(false)}>×</button>
                        <div className="scanner-view">
                            <h3 className="scanner-instructions">Scan Patient ID</h3>
                            {!isMobile ? (
                                <div style={{ color: '#ef4444', marginTop: '20px', padding: '15px', background: '#fee2e2', borderRadius: '8px', textAlign: 'center', fontWeight: '500' }}>
                                    Please use a mobile or tablet device to use the camera scanning feature.
                                </div>
                            ) : (
                                <>
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
                                </>
                            )}
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

        </div>
    );
}

export default PatientList;
