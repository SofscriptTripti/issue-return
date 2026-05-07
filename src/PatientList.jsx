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
    const [isProcessingScan, setIsProcessingScan] = useState(false);
    const [scannedPtnCode, setScannedPtnCode] = useState('');
    const [activeCode, setActiveCode] = useState('');
    const [capturedPtn, setCapturedPtn] = useState('');
    const lastDetectedRef = useRef(null);

    // Hardware scanner state & refs
    const [cameras, setCameras] = useState([
        { id: 'hardware_wedge', label: 'Scanner' },
        { id: 'camera_placeholder', label: 'Camera' }
    ]);
    const [selectedCameraId, setSelectedCameraId] = useState('hardware_wedge');
    const scannerChainRef = useRef(Promise.resolve());
    const scannerVersionRef = useRef(0);
    const isUnmountedRef = useRef(false);
    const hiddenInputRef = useRef(null);
    const timeoutIdRef = useRef(null);
    const isProcessingRef = useRef(false);

    // Race-condition prevention refs
    // const scannerVersionRef = useRef(0);
    const scannerLockRef = useRef(false);

    // Hardware-aware Camera Check
    const checkBackCamera = async () => {
        // We now always return true on mobile/tablet to allow the scanner to at least try.
        // This is to bypass browser 'Insecure Context' reports that might be false or overridden.
        const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobileOrTablet) return true;

        if (!navigator.mediaDevices) {
            console.warn("Scanner: navigator.mediaDevices NOT found.");
            return true; // Return true to let html5-qrcode attempt and give real error
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'videoinput') || isMobileOrTablet;
        } catch (e) {
            return true; // Fallback
        }
    };

    // Shared helper to fully stop and clear any previous scanner instance
    const stopAndClearScanner = async () => {
        if (!html5QrCodeRef.current) return;
        try {
            const instance = html5QrCodeRef.current;
            html5QrCodeRef.current = null; 

            if (instance.isScanning) {
                await instance.stop();
            }
            instance.clear();
            
            // Minimal delay for hardware reset
            await new Promise(r => setTimeout(r, 50));
        } catch (e) {
            console.warn("Scanner cleanup warning:", e);
        }
    };

    // Helper to fully close scanner and reset state
    const closeScanner = async () => {
        setIsScannerOpen(false);
        setSelectedCameraId(null);
    };

    // SERIAL SCANNER QUEUE: The only place that starts/stops hardware
    useEffect(() => {
        const version = ++scannerVersionRef.current;
        
        scannerChainRef.current = scannerChainRef.current.then(async () => {
            // 1. CANCELLATION CHECK: If unmounted or newer command, abort
            if (isUnmountedRef.current) return;
            if (version !== scannerVersionRef.current) return;

            try {
                // 2. Always stop any current activity
                await stopAndClearScanner();
                
                // 3. If closed or in hardware mode, stop here
                if (!isScannerOpen || selectedCameraId === 'hardware_wedge' || !selectedCameraId) return;

                // 4. WAIT FOR DOM: React might be still rendering the modal
                let container = null;
                for (let i = 0; i < 20; i++) {
                    container = document.getElementById("patient-reader");
                    if (container) break;
                    await new Promise(r => setTimeout(r, 50));
                }

                if (!container || isUnmountedRef.current || version !== scannerVersionRef.current) return;

                // 5. Start Camera Mode with Retries
                const html5QrCode = new Html5Qrcode("patient-reader");
                html5QrCodeRef.current = html5QrCode;

                const startWithRetry = async (retries = 3) => {
                    try {
                        await html5QrCode.start(
                            selectedCameraId,
                            { fps: 20, qrbox: { width: 280, height: 280 } },
                            async (decodedText) => {
                                // Check if this is still the active version
                                if (isUnmountedRef.current || version !== scannerVersionRef.current) return;
                                
                                if (decodedText !== lastDetectedRef.current) {
                                    if (navigator.vibrate) navigator.vibrate(50);
                                }
                                lastDetectedRef.current = decodedText;
                                setScannedPtnCode(decodedText);
                                handleIdentifyPatientRef.current(decodedText);
                            },
                            () => { }
                        );
                    } catch (err) {
                        if (retries > 0 && !isUnmountedRef.current && version === scannerVersionRef.current) {
                            console.warn(`Camera start failed, retrying... (${retries} left)`);
                            await new Promise(r => setTimeout(r, 300));
                            return startWithRetry(retries - 1);
                        }
                        throw err;
                    }
                };

                await startWithRetry();
            } catch (err) {
                console.warn("Scanner Queue Op Failed:", err);
                // Fallback only if we aren't unmounting or already trying something else
                if (!isUnmountedRef.current && version === scannerVersionRef.current && selectedCameraId !== 'hardware_wedge') {
                    setSelectedCameraId('hardware_wedge');
                }
            }
        });
    }, [isScannerOpen, selectedCameraId]);

    // Component unmount & Visibility cleanup
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden' && isScannerOpen) {
                closeScanner();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        
        return () => {
            isUnmountedRef.current = true; // ABORT ALL PENDING COMMANDS
            document.removeEventListener('visibilitychange', handleVisibility);
            stopAndClearScanner();
        };
    }, [isScannerOpen]);



    // Hardware Scanner focus management
    useEffect(() => {
        setScannedPtnCode('');

        if (selectedCameraId === 'hardware_wedge' && hiddenInputRef.current) {
            hiddenInputRef.current.focus();
        }
    }, [selectedCameraId, isScannerOpen]);

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
            if (onSearchRef.current) {
                onSearchRef.current(searchTerm);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
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
                    setIsDropdownOpen(false);
                }
            } catch (err) {
                setErroredStoreId(store.id);
                setIsDropdownOpen(false);
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
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setScannerError('');

        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                const validCameras = devices.filter(d => !d.label.toLowerCase().includes('front') && !d.label.toLowerCase().includes('facing front'));
                const backCam = validCameras.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment') || d.label.toLowerCase().includes('facing back')) || validCameras[0] || devices[devices.length - 1];

                const cameraOption = { id: backCam.id, label: 'Camera' };
                const hardwareOption = { id: 'hardware_wedge', label: 'Scanner' };
                
                setCameras([hardwareOption, cameraOption]);

                const configVal = window.APP_CONFIG?.defaultScanner;
                const defaultScanner = (configVal === 2 && backCam) ? backCam.id : 'hardware_wedge';
                
                if (selectedCameraId === 'camera_placeholder') {
                    setSelectedCameraId(backCam.id);
                } else if (!selectedCameraId || selectedCameraId === null) {
                    setSelectedCameraId(defaultScanner);
                }
                
                setIsScannerOpen(true);
            } else {
                setIsScannerOpen(true);
            }
        } catch (err) {
            console.error("Camera detection failed", err);
            setIsScannerOpen(true);
        }
    };

    const handleIdentifyPatient = async (barCd) => {
        setIsProcessingScan(true);
        isProcessingRef.current = true;
        setScannedPtnCode('');
        lastDetectedRef.current = null;
        try {
            setSearchTerm(barCd);
            if (onSearch) onSearch(barCd);
            closeScanner();
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => {
                setIsProcessingScan(false);
                isProcessingRef.current = false;
            }, 1000);
        }
    };

    const handleIdentifyPatientRef = useRef(handleIdentifyPatient);
    useEffect(() => {
        handleIdentifyPatientRef.current = handleIdentifyPatient;
    });

    const clearFilter = () => {
        setFilterPtnNo(''); setFilterFirst(''); setFilterLast(''); setFilterMobile('');
        setActiveFilters(null);
    };

    const getDisplayedPatients = () => {
        return apiPatients.map((p, idx) => {
            const formatVal = (val) => (val && val !== "." && String(val).trim() !== "") ? val : "-";
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
                                                <div className="store-item-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span className="store-indicator" style={{ background: store.color }}></span>
                                                    <div className="store-text-stack" style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span className="store-option-name">{store.name}</span>
                                                        {isLoadingCC && !costCenters.length && (
                                                            <span style={{ fontSize: '10px', color: '#94a3b8' }}></span>
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
                    {!selectedCostCenter && selectedStore && !isLoadingCC ? (
                        <div className="no-results" style={{ color: '#000' }}>
                            No Cost Center available for "{selectedStore}"
                        </div>
                    ) : !isPatientsLoading && displayedPatients.length === 0 ? (
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
                                            <span className="info-value-inline text-black">{patient.ptnNo}</span>
                                        </div>
                                        <div className="grid-cell cell-right">
                                            <span className="info-label-inline">Mobile No:</span>
                                            <span className="info-value-inline text-black">{patient.mobile}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Premium QR Scanner Modal for Patient List */}
            {isScannerOpen && (
                <div className="scanner-fullscreen-overlay">
                    <div className="scanner-modal animate-modal">
                        <div className="scanner-header-compact">
                            <span className="scanner-modal-title">Scan patient QR.</span>
                            <button className="scanner-close-btn" onClick={closeScanner}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <div className="scanner-viewport-container">
                            {selectedCameraId === 'hardware_wedge' ? (
                                <div
                                    style={{ height: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', background: '#0f172a', borderRadius: '16px', border: 'none', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)', cursor: 'pointer' }}
                                    onClick={() => hiddenInputRef.current?.focus()}
                                >
                                    <p style={{ color: '#f8fafc', fontSize: '16px', fontWeight: '500' }}>Press the physical scanner button</p>
                                    <input
                                        ref={hiddenInputRef}
                                        type="text"
                                        autoComplete="off"
                                        spellCheck="false"
                                        style={{ opacity: 0, position: 'absolute', zIndex: -10, width: '1px', height: '1px' }}
                                        autoFocus
                                        onFocus={(e) => {
                                            e.target.readOnly = true;
                                            setTimeout(() => {
                                                e.target.readOnly = false;
                                            }, 50);
                                        }}
                                        onBlur={(e) => {
                                            if (selectedCameraId === 'hardware_wedge') {
                                                setTimeout(() => hiddenInputRef.current?.focus(), 100);
                                            }
                                        }}
                                        onChange={(e) => {
                                            const val = e.target.value.trim();
                                            if (val.length > 0) {
                                                if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
                                                timeoutIdRef.current = setTimeout(() => {
                                                    if (!isProcessingRef.current && hiddenInputRef.current) {
                                                        isProcessingRef.current = true;
                                                        handleIdentifyPatientRef.current(hiddenInputRef.current.value.trim());
                                                        hiddenInputRef.current.value = '';
                                                    }
                                                }, 300);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = e.target.value.trim();
                                                if (val.length > 0 && !isProcessingRef.current) {
                                                    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
                                                    isProcessingRef.current = true;
                                                    handleIdentifyPatientRef.current(val);
                                                }
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div id="patient-reader" className="full-qr-reader"></div>

                                    {/* Centered QR code with Frame */}
                                    <div className="scanning-frame">
                                        <div className="corner top-left"></div>
                                        <div className="corner top-right"></div>
                                        <div className="corner bottom-left"></div>
                                        <div className="corner bottom-right"></div>
                                        <div className="scanning-laser"></div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="scanner-footer-msg" style={{ minHeight: '40px', paddingBottom: '10px' }}>
                            {isProcessingScan ? (
                                <p className="status-msg blue">Identifying Patient...</p>
                            ) : scannedPtnCode ? (
                                <div className="capture-workflow">
                                    <p className="status-msg blue">Loading data...</p>
                                </div>
                            ) : (
                                <p className="status-msg" style={{ color: '#64748b', opacity: 0.8 }}>
                                    {selectedCameraId === 'hardware_wedge' ? 'Ready for input' : 'Focus PTN barcode in frame'}
                                </p>
                            )}
                        </div>

                        {/* Toggle is now ALWAYS visible by default */}
                        <div className="slider-toggle-container">
                                <div
                                    className="slider-toggle"
                                    onClick={() => {
                                        const nextId = (selectedCameraId === 'hardware_wedge')
                                            ? (cameras.find(c => c.id !== 'hardware_wedge')?.id || cameras[0].id)
                                            : 'hardware_wedge';
                                        setSelectedCameraId(nextId);
                                    }}
                                >
                                    <div className={`slider-ball ${selectedCameraId === 'hardware_wedge' ? 'scanner' : 'camera'}`}></div>
                                    <div className={`toggle-icon-wrap ${selectedCameraId === 'hardware_wedge' ? 'active' : ''}`}>
                                        <img src={`${import.meta.env.BASE_URL}barcode1.gif`} alt="Scanner" style={{ width: '22px', height: '22px', opacity: selectedCameraId === 'hardware_wedge' ? 1 : 0.4 }} />
                                    </div>
                                    <div className={`toggle-icon-wrap ${selectedCameraId !== 'hardware_wedge' ? 'active' : ''}`}>
                                        <img src={`${import.meta.env.BASE_URL}camera1.gif`} alt="Camera" style={{ width: '22px', height: '22px', opacity: selectedCameraId !== 'hardware_wedge' ? 1 : 0.4 }} />
                                    </div>
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
                    <div className="adv-modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: 380, padding: '30px 24px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1e3a8a', marginBottom: '12px' }}>Unable to start Camera</h3>
                        <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
                            Unable to start Camera. Use Device with Back Camera.
                        </p>

                        <button
                            onClick={() => setShowNoCameraModal(false)}
                            style={{
                                width: '100%', padding: '16px', borderRadius: 14,
                                border: 'none', background: 'linear-gradient(135deg, #006ce6, #00c7ff)',
                                color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                                boxShadow: '0 8px 16px rgba(0,108,230,0.2)'
                            }}
                        >
                            GOT IT
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PatientList;
