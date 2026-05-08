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

const PENCIL_ICON = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
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
    onEditLocation,

    apiPatients = [],
    isPatientsLoading = false,
    onSearch,
    ptnTypFlg = "O"
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

    // Modal Selection States
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [tempStore, setTempStore] = useState(null);
    const [tempCC, setTempCC] = useState(null);
    const [modalCCs, setModalCCs] = useState([]);
    const [isModalLoadingCC, setIsModalLoadingCC] = useState(false);
    const [storeSearch, setStoreSearch] = useState('');

    // Helper to fetch centers for a store
    const fetchCentersForStore = async (storeId) => {
        setIsModalLoadingCC(true);
        try {
            const response = await authService.getCostCenters(storeId);
            console.log("Modal: Raw Cost Center API Response for Store " + storeId + ":", response);
            const rawData = response.data || (Array.isArray(response) ? response : []);
            if (Array.isArray(rawData)) {
                return rawData.map(cc => ({
                    id: cc.trnModeId,
                    name: cc.ccDescriprion || cc.ccDescription || "Unnamed Cost Center",
                    ptnTypFlg: cc.ptnTypFlg || "O"
                }));
            }
        } catch (err) {
            console.error("Modal CC fetch failed:", err);
        } finally {
            setIsModalLoadingCC(false);
        }
        return [];
    };

    // Initial setup for modal when opened
    const handleOpenModal = async () => {
        const currentStore = stores.find(s => s.name === selectedStore) || stores[0];
        setTempStore(currentStore);
        setShowLocationModal(true);

        if (currentStore) {
            let ccs = currentStore.costCenters || [];
            if (ccs.length === 0) {
                ccs = await fetchCentersForStore(currentStore.id);
            }
            setModalCCs(ccs);
            const currentCC = ccs.find(c => c.name === selectedCostCenter) || (ccs.length === 1 ? ccs[0] : null);
            setTempCC(currentCC);
        }
    };

    const handleModalStoreSelect = async (store) => {
        setTempStore(store);
        setTempCC(null);
        setModalCCs([]); // Clear while loading

        let ccs = store.costCenters || [];
        if (ccs.length === 0) {
            ccs = await fetchCentersForStore(store.id);
        }
        setModalCCs(ccs);
        if (ccs.length === 1) setTempCC(ccs[0]);
    };

    const handleConfirmSelection = () => {
        if (onStoreAndCCChange && tempStore && tempCC) {
            onStoreAndCCChange(tempStore, tempCC);
            setShowLocationModal(false);
        }
    };

    // Hardware scanner state & refs
    const [cameras, setCameras] = useState([
        { id: 'hardware_wedge', label: 'Scanner' },
        { id: 'camera_placeholder', label: 'Camera' }
    ]);
    const [selectedCameraId, setSelectedCameraId] = useState('hardware_wedge');
    const scannerVersionRef = useRef(0);
    const hiddenInputRef = useRef(null);
    const timeoutIdRef = useRef(null);
    const isProcessingRef = useRef(false);

    const scannerLockRef = useRef(false);

    const stopAndClearScanner = async () => {
        if (!html5QrCodeRef.current) return;
        try {
            const instance = html5QrCodeRef.current;
            html5QrCodeRef.current = null;

            if (instance.isScanning) {
                await Promise.race([
                    instance.stop().catch(() => { }),
                    new Promise(r => setTimeout(r, 1500))
                ]);
            }
            try { instance.clear(); } catch (e) { }
        } catch (e) {
            console.warn("Scanner cleanup warning:", e);
        }
    };

    const closeScanner = async () => {
        setIsScannerOpen(false);
        scannerLockRef.current = false;
        await stopAndClearScanner();
        setSelectedCameraId(null);
    };

    const switchScannerMode = async (targetId) => {
        let finalId = targetId;
        if (finalId === 'camera_placeholder') {
            const realCam = cameras.find(c => c.id !== 'hardware_wedge' && c.id !== 'camera_placeholder');
            if (realCam) finalId = realCam.id;
            else return;
        }

        if (!finalId) return;
        if (scannerLockRef.current) return;
        scannerLockRef.current = true;

        const currentVersion = ++scannerVersionRef.current;
        setSelectedCameraId(finalId);

        try {
            await stopAndClearScanner();

            if (finalId === 'hardware_wedge') {
                scannerLockRef.current = false;
                return;
            }

            let container = null;
            for (let i = 0; i < 20; i++) {
                container = document.getElementById("patient-reader");
                if (container) break;
                await new Promise(r => setTimeout(r, 50));
            }

            if (!container || currentVersion !== scannerVersionRef.current) {
                scannerLockRef.current = false;
                return;
            }

            const html5QrCode = new Html5Qrcode("patient-reader");
            html5QrCodeRef.current = html5QrCode;

            await html5QrCode.start(
                finalId,
                { fps: 20, qrbox: { width: 280, height: 280 } },
                async (decodedText) => {
                    if (currentVersion !== scannerVersionRef.current) return;

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
            console.warn("Scanner switch failed:", err);
            if (finalId !== 'hardware_wedge' && currentVersion === scannerVersionRef.current) {
                setSelectedCameraId('hardware_wedge');
            }
        } finally {
            scannerLockRef.current = false;
        }
    };

    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden' && isScannerOpen) {
                closeScanner();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            scannerLockRef.current = false;
            document.removeEventListener('visibilitychange', handleVisibility);
            stopAndClearScanner();
        };
    }, [isScannerOpen]);

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

            let ccData = store.costCenters || [];

            if (ccData.length === 0) {
                setIsLoadingCC(true);
                try {
                    const response = await authService.getCostCenters(store.id);
                    console.log("Dropdown: Raw Cost Center API Response for Store " + store.id + ":", response);
                    const rawData = response.data || (Array.isArray(response) ? response : []);
                    if (Array.isArray(rawData)) {
                        ccData = rawData.map(cc => ({
                            id: cc.trnModeId || cc.ccCd,
                            name: cc.ccDescriprion || cc.ccDescription || "Unnamed Cost Center",
                            ptnTypFlg: cc.ptnTypFlg || "O"
                        }));
                    }
                } catch (err) {
                    console.error("Cost Center fallback failed:", err);
                } finally {
                    setIsLoadingCC(false);
                }
            }

            if (ccData.length > 0) {
                if (ccData.length === 1) {
                    onStoreAndCCChange(store, ccData[0]);
                    setIsDropdownOpen(false);
                } else {
                    setCostCenters(ccData);
                    onStoreAndCCChange(store, null);
                }
            } else {
                setErroredStoreId(store.id);
                onStoreAndCCChange(store, null);
                setIsDropdownOpen(false);
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
        scannerLockRef.current = false;

        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setScannerError('');

        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                const validCameras = devices.filter(d => !d.label.toLowerCase().includes('front') && !d.label.toLowerCase().includes('facing front'));
                const backCam = validCameras.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment') || d.label.toLowerCase().includes('facing back')) || validCameras[0] || devices[devices.length - 1];

                const cameraOption = { id: backCam?.id || 'camera', label: 'Camera' };
                const hardwareOption = { id: 'hardware_wedge', label: 'Scanner' };
                setCameras([hardwareOption, cameraOption]);

                const configVal = window.APP_CONFIG?.defaultScanner;
                const defaultScanner = (configVal === 2 && backCam) ? backCam.id : 'hardware_wedge';

                setIsScannerOpen(true);
                setTimeout(() => switchScannerMode(defaultScanner), 50);
            } else {
                setIsScannerOpen(true);
                setSelectedCameraId('hardware_wedge');
            }
        } catch (err) {
            console.error("Camera detection failed", err);
            setIsScannerOpen(true);
            setSelectedCameraId('hardware_wedge');
        }
    };

    const handleIdentifyPatient = async (rawBarCd) => {
        if (isProcessingRef.current) return;
        const barCd = rawBarCd?.trim().replace(/^\*|\*$/g, '');
        if (!barCd) return;

        isProcessingRef.current = true;
        setIsProcessingScan(true);
        setScannedPtnCode(barCd);
        lastDetectedRef.current = null;
        try {
            setSearchTerm(barCd);
            if (onSearch) {
                await onSearch(barCd);
            }
            await closeScanner();
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
                ipNo: formatVal(p.ipNo),
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
                <div className="selection-info-bar unified-header-row">
                    <div className="location-badge">
                        <div className="location-info">
                            <div className="store-row">
                                <span className="location-pin">📍</span>
                                <span className="store-name">{selectedStore}</span>
                                <button className="location-edit-btn" onClick={handleOpenModal} title="Change Location">
                                    {PENCIL_ICON}
                                </button>
                            </div>
                            <span className="cc-name" style={{ paddingLeft: '24px' }}>{selectedCostCenter}</span>
                        </div>
                    </div>

                    <button className="logout-btn-minimal" onClick={() => setShowLogoutConfirm(true)}>
                        {LOGOUT_ICON}
                        <span className="logout-text">Logout</span>
                    </button>
                </div>
            )}

            <div className="patient-list-content">
                <div className="search-container">
                    <form className="search-box" onSubmit={handleSearchSubmit}>
                        <button type="submit" className="search-icon-btn" onClick={handleSearchSubmit}>🔍</button>
                        <input
                            type="text"
                            placeholder={`Type Name, ${ptnTypFlg === 'I' ? 'IPN' : 'PTN'} or Phone and search...`}
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
                                        {ptnTypFlg === 'I' && (
                                            <div className="grid-cell cell-left">
                                                <span className="info-label-inline">IP NO:</span>
                                                <span className="info-value-inline text-black">{patient.ipNo}</span>
                                            </div>
                                        )}
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

                        <div className="scanner-viewport-container" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            {selectedCameraId === 'hardware_wedge' ? (
                                <div
                                    style={{ width: '280px', margin: '0 auto', height: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', background: '#0f172a', borderRadius: '16px', border: 'none', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)', cursor: 'pointer' }}
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
                                        onChange={async (e) => {
                                            const val = e.target.value.trim();
                                            if (val.length > 0) {
                                                if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
                                                timeoutIdRef.current = setTimeout(async () => {
                                                    if (!isProcessingRef.current && hiddenInputRef.current) {
                                                        setScannedPtnCode(val);
                                                        await handleIdentifyPatientRef.current(val);
                                                        hiddenInputRef.current.value = '';
                                                    }
                                                }, 300);
                                            }
                                        }}
                                        onKeyDown={async (e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = e.target.value.trim();
                                                if (val.length > 0 && !isProcessingRef.current) {
                                                    setScannedPtnCode(val); // UI Feedback
                                                    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
                                                    await handleIdentifyPatientRef.current(val);
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

                        {/* Clean Dual-Button UI - No 'back box' background */}
                        <div className="scanner-mode-tabs">
                            <button
                                className={`mode-tab ${selectedCameraId === 'hardware_wedge' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectedCameraId !== 'hardware_wedge') {
                                        switchScannerMode('hardware_wedge');
                                    }
                                }}
                            >
                                <img src={`${import.meta.env.BASE_URL}barcode1.gif`} alt="Scanner" style={{ width: '20px', height: '20px' }} />
                                <span>SCANNER</span>
                            </button>
                            <button
                                className={`mode-tab ${selectedCameraId !== 'hardware_wedge' ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectedCameraId === 'hardware_wedge') {
                                        const camId = cameras.find(c => c.id !== 'hardware_wedge')?.id || 'camera';
                                        switchScannerMode(camId);
                                    }
                                }}
                            >
                                <img src={`${import.meta.env.BASE_URL}camera1.gif`} alt="Camera" style={{ width: '20px', height: '20px' }} />
                                <span>CAMERA</span>
                            </button>
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
            {/* Location Selection Modal */}
            {showLocationModal && (
                <div className="location-modal-overlay" onClick={() => setShowLocationModal(false)}>
                    <div className="location-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="location-modal-header">
                            <h3>Select Store/Cost Center</h3>
                            <button className="modal-close-btn" onClick={() => setShowLocationModal(false)} title="Close">
                                {CLOSE_ICON_SMALL}
                            </button>
                        </div>

                        <div className="location-modal-content">
                            <div className="modal-scroll-section">
                                <div className="modal-section-title">Select Store</div>
                                <div className="modal-search-container">
                                    <input 
                                        type="text" 
                                        placeholder="Search store..." 
                                        value={storeSearch}
                                        onChange={(e) => setStoreSearch(e.target.value)}
                                        className="modal-search-input"
                                        onClick={e => e.stopPropagation()}
                                    />
                                    {storeSearch && (
                                        <button className="modal-search-clear" onClick={() => setStoreSearch('')}>✕</button>
                                    )}
                                </div>
                                <div className="modal-list">
                                    {stores
                                        .filter(s => s.name.toLowerCase().includes(storeSearch.toLowerCase()))
                                        .map(store => (
                                        <div
                                            key={store.id}
                                            className={`modal-item ${tempStore?.id === store.id ? 'selected' : ''}`}
                                            onClick={() => handleModalStoreSelect(store)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span className="modal-item-name">{store.name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="modal-scroll-section">
                                <div className="modal-section-title">
                                    Select Cost Center {isModalLoadingCC && <span className="search-circle-loader" style={{ width: 12, height: 12, borderWeight: 2, display: 'inline-block', marginLeft: 8 }}></span>}
                                </div>
                                <div className="modal-list">
                                    {modalCCs.length > 0 ? (
                                        modalCCs.map(cc => (
                                            <div 
                                                key={cc.id} 
                                                className={`modal-item ${tempCC?.id === cc.id ? 'selected' : ''}`}
                                                onClick={() => setTempCC(cc)}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <span className="modal-item-name">{cc.name}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                                            {tempStore ? "No cost centers available" : "Please select a store first"}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            className="modal-fab-confirm"
                            onClick={handleConfirmSelection}
                            disabled={!tempStore || !tempCC}
                            title="Confirm Selection"
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
