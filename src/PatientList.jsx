import React, { useState, useRef, useEffect } from 'react';
import './PatientList.css';

const DUMMY_PTNS = ['PTN-78234', 'PTN-45621', 'PTN-93104', 'PTN-11872', 'PTN-66530'];

const SCANNED_PATIENTS = {
    'PTN-78234': { uhid: 'PTN-78234', name: 'Priya Sharma', age: 34, gender: 'Female', ward: 'Cardiology', bed: 'B-12', admitDate: '10/02/2025', discharge: '18/02/2025', insurance: 'Star Health', bloodGroup: 'B+', doctor: 'Dr. Anita Desai' },
    'PTN-45621': { uhid: 'PTN-45621', name: 'Arun Mehta', age: 52, gender: 'Male', ward: 'Orthopedics', bed: 'C-4', admitDate: '05/01/2025', discharge: '20/01/2025', insurance: 'HDFC Ergo', bloodGroup: 'O+', doctor: 'Dr. Paresh' },
    'PTN-93104': { uhid: 'PTN-93104', name: 'Sunita Rao', age: 28, gender: 'Female', ward: 'Neurology', bed: 'A-7', admitDate: '14/03/2025', discharge: '22/03/2025', insurance: 'LIC HFL', bloodGroup: 'A-', doctor: 'Dr. Kavitha' },
    'PTN-11872': { uhid: 'PTN-11872', name: 'Ramesh Gupta', age: 61, gender: 'Male', ward: 'General', bed: 'G-19', admitDate: '01/04/2025', discharge: '10/04/2025', insurance: 'None', bloodGroup: 'AB+', doctor: 'Dr. Anita Desai' },
    'PTN-66530': { uhid: 'PTN-66530', name: 'Meera Nair', age: 19, gender: 'Female', ward: 'Pediatrics', bed: 'P-3', admitDate: '08/02/2025', discharge: '15/02/2025', insurance: 'Bajaj Allianz', bloodGroup: 'O-', doctor: 'Dr. Paresh' },
};

const ALL_PATIENTS = [
    { id: 1, name: 'Rathi Kumari', ptnNo: '24568', age: 16, gender: 'Female', phone: '+91 99999 99999', doctor: 'Dr. Anita Desai', lastVisit: '02/05/2025', status: 'OPD' },
    { id: 2, name: 'Kunal Shah', ptnNo: '56486', age: 25, gender: 'Male', phone: '+91 88888 88888', doctor: 'Dr. Paresh', lastVisit: '15/04/2025', status: 'OPD' },
    { id: 3, name: 'Ananya Iyer', ptnNo: '78910', age: 52, gender: 'Female', phone: '+91 77777 77777', doctor: 'Dr. Kavitha', lastVisit: '10/03/2025', status: 'IPD' },
];

const QR_ICON = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="5" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" />
        <rect x="3" y="16" width="5" height="5" rx="1" />
        <path d="M16 16h2v2h-2zM18 18h2v2h-2zM20 16h1v1h-1zM16 20h1v1h-1z" />
        <path d="M10 3h2v2h-2zM10 8h2v2h-2zM3 10h2v2H3zM8 10h2v2H8z" />
    </svg>
);

function PatientList({
    onBack,
    onSelectPatient,
    scannedPatients = [],
    onAddScannedPatient,
    selectedStore,
    selectedCostCenter,
    stores = [],
    onStoreChange
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerTarget, setScannerTarget] = useState('main'); // 'main' | 'filter'
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleStoreSelect = (name) => {
        if (onStoreChange) onStoreChange(name);
        setIsDropdownOpen(false);
    };

    // Filter modal state
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterPtnNo, setFilterPtnNo] = useState('');
    const [filterFirst, setFilterFirst] = useState('');
    const [filterLast, setFilterLast] = useState('');
    const [filterMobile, setFilterMobile] = useState('');
    const [activeFilters, setActiveFilters] = useState(null); // null = no filter applied

    const openScanner = (target) => {
        setScannerTarget(target);
        if (target === 'filter') setIsFilterOpen(false); // close filter so scanner is on top
        setIsScannerOpen(true);
    };

    const handleScanQR = () => {
        const randomPTN = DUMMY_PTNS[Math.floor(Math.random() * DUMMY_PTNS.length)];
        if (scannerTarget === 'filter') {
            setFilterPtnNo(randomPTN.replace('PTN-', ''));
            setIsScannerOpen(false);
            setIsFilterOpen(true); // reopen filter with scanned value
        } else {
            if (onAddScannedPatient) {
                onAddScannedPatient(SCANNED_PATIENTS[randomPTN]);
            }
            setIsScannerOpen(false);
        }
    };

    const applyFilter = () => {
        setActiveFilters({ ptnNo: filterPtnNo, first: filterFirst, last: filterLast, mobile: filterMobile });
        setIsFilterOpen(false);
    };

    const clearFilter = () => {
        setFilterPtnNo(''); setFilterFirst(''); setFilterLast(''); setFilterMobile('');
        setActiveFilters(null);
    };

    // Determine which patients to show
    const getDisplayedPatients = () => {
        let list = ALL_PATIENTS;
        if (activeFilters) {
            list = list.filter(p => {
                const fullName = p.name.toLowerCase();
                const [first = '', ...rest] = p.name.split(' ');
                const last = rest.join(' ');
                if (activeFilters.ptnNo && !p.ptnNo.includes(activeFilters.ptnNo)) return false;
                if (activeFilters.first && !first.toLowerCase().includes(activeFilters.first.toLowerCase())) return false;
                if (activeFilters.last && !last.toLowerCase().includes(activeFilters.last.toLowerCase())) return false;
                if (activeFilters.mobile && !p.phone.includes(activeFilters.mobile)) return false;
                return true;
            });
        } else if (searchTerm) {
            list = list.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.ptnNo.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return list;
    };

    const displayedPatients = getDisplayedPatients();
    const hasActiveFilter = activeFilters && Object.values(activeFilters).some(v => v);

    return (
        <div className="patient-list-container">
            {/* Header */}
            <div className="app-header">
                <button className="back-button" onClick={onBack}>←</button>
                <h2 className="header-title">Patient</h2>
            </div>

            {/* Selection info */}
            {(selectedStore || selectedCostCenter) && (
                <div className="selection-info-bar">
                    <span className="selection-label">📍 {selectedStore}{selectedCostCenter ? `, ${selectedCostCenter}` : ''}</span>
                    <div className="custom-store-dropdown" ref={dropdownRef}>
                        <button
                            className={`dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            title={selectedStore}
                        >
                            <span className="current-store-text">{selectedStore}</span>
                            <span className="chevron-icon">▼</span>
                        </button>

                        {isDropdownOpen && (
                            <div className="dropdown-menu-portal">
                                {stores.map(store => (
                                    <div
                                        key={store.id}
                                        className={`dropdown-item ${selectedStore === store.name ? 'selected' : ''}`}
                                        onClick={() => handleStoreSelect(store.name)}
                                    >
                                        <span className="store-indicator" style={{ background: store.color }}></span>
                                        <span className="store-option-name">{store.name}</span>
                                        {selectedStore === store.name && <span className="check-icon">✓</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="search-container">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by Name, PTN..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="search-scanner-btn" onClick={() => openScanner('main')} title="Scan PTN">
                        {QR_ICON}
                    </button>
                </div>
                <button className={`filter-button ${hasActiveFilter ? 'filter-active' : ''}`} onClick={() => setIsFilterOpen(true)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                </button>
            </div>

            {/* Active filter chips */}
            {hasActiveFilter && (
                <div className="active-filter-bar">
                    <span className="active-filter-label">🔖 Filtered</span>
                    <button className="clear-filter-btn" onClick={clearFilter}>Clear ✕</button>
                </div>
            )}

            {/* SCANNED PATIENTS — persistence */}
            {scannedPatients.map((scannedPatient, idx) => (
                <div key={`scanned-${idx}`} className="patient-card scanned-patient-card"
                    onClick={() => onSelectPatient && onSelectPatient({
                        name: scannedPatient.name, ptnNo: scannedPatient.uhid.replace('PTN-', ''),
                        age: scannedPatient.age, gender: scannedPatient.gender,
                        phone: 'N/A', doctor: scannedPatient.doctor,
                        lastVisit: scannedPatient.discharge, status: 'IPD'
                    })}>
                    <div className="card-name-row">
                        <h3 className="patient-name">{scannedPatient.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="status-badge ipd-badge">IPD</span>
                        </div>
                    </div>
                    <div className="card-detail-cols">
                        <div className="card-col-left">
                            <span className="meta-chip">👤 {scannedPatient.age}Y • {scannedPatient.gender}</span>
                            <span className="meta-chip">🏥 {scannedPatient.ward} · Bed {scannedPatient.bed}</span>
                        </div>
                        <div className="card-col-right">
                            <span className="ptn-id">
                                <span className="ptn-label">PTN: </span>
                                <span className="ptn-num">{scannedPatient.uhid}</span>
                            </span>
                        </div>
                    </div>
                    <div className="card-footer">
                        <span className="doctor-name">👨‍⚕️ {scannedPatient.doctor}</span>
                        <span className="last-visit">📅 {scannedPatient.discharge}</span>
                    </div>
                </div>
            ))}

            {/* Recent Views label */}
            <div className="recent-views-label">
                <span className="history-icon">�</span> Patients
            </div>

            {/* Patient Cards */}
            <div className="patient-cards-list">
                {displayedPatients.length === 0 ? (
                    <div className="no-results">No patients found</div>
                ) : displayedPatients.map((patient) => (
                    <div key={patient.id} className="patient-card" onClick={() => onSelectPatient && onSelectPatient(patient)}>
                        <div className="card-name-row">
                            <h3 className="patient-name">{patient.name}</h3>
                            <span className={`status-badge ${patient.status === 'IPD' ? 'ipd-badge' : ''}`}>{patient.status}</span>
                        </div>
                        <div className="card-detail-cols">
                            <div className="card-col-left">
                                <span className="meta-chip">👤 {patient.age}Y • {patient.gender}</span>
                                <span className="meta-chip">📞 {patient.phone}</span>
                            </div>
                            <div className="card-col-right">
                                <span className="ptn-id"><span className="ptn-label">PTN: </span><span className="ptn-num">#{patient.ptnNo}</span></span>
                            </div>
                        </div>
                        <div className="card-footer">
                            <span className="doctor-name">👨‍⚕️ {patient.doctor}</span>
                            <span className="last-visit">📅 {patient.lastVisit}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ====== FILTER MODAL ====== */}
            {isFilterOpen && (
                <div className="adv-overlay" onClick={() => setIsFilterOpen(false)}>
                    <div className="adv-modal" onClick={e => e.stopPropagation()}>
                        <div className="adv-header">
                            <span className="adv-title">Advance Search</span>
                            <button className="adv-close" onClick={() => setIsFilterOpen(false)}>✕</button>
                        </div>

                        {/* Patient Number */}
                        <div className="adv-field">
                            <label className="adv-label">Patient Number</label>
                            <div className="adv-input-row">
                                <input
                                    className="adv-input"
                                    placeholder="Enter"
                                    value={filterPtnNo}
                                    onChange={e => setFilterPtnNo(e.target.value)}
                                />
                                <button className="adv-scan-btn" onClick={() => openScanner('filter')} title="Scan PTN">
                                    {QR_ICON}
                                </button>
                            </div>
                        </div>

                        {/* First & Last Name */}
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

                        {/* Mobile */}
                        <div className="adv-field">
                            <label className="adv-label">Mobile Number</label>
                            <input className="adv-input" placeholder="+91" value={filterMobile} onChange={e => setFilterMobile(e.target.value)} />
                        </div>

                        {/* Buttons */}
                        <div className="adv-actions">
                            <button className="adv-btn-clear" onClick={clearFilter}>Clear</button>
                            <button className="adv-btn-apply" onClick={applyFilter}>Show Results</button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Scanner Modal */}
            {isScannerOpen && (
                <div className="scanner-modal-overlay" onClick={() => setIsScannerOpen(false)}>
                    <div className="scanner-modal" onClick={e => e.stopPropagation()}>
                        <button className="close-scanner-btn" onClick={() => setIsScannerOpen(false)}>✕</button>
                        <h3 className="scanner-title">Scan Patient PTN</h3>
                        <p className="scanner-subtitle">Tap QR to simulate scan</p>
                        <div className="qr-frame">
                            <div className="qr-corner tl" /><div className="qr-corner tr" />
                            <div className="qr-corner bl" /><div className="qr-corner br" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" alt="Dummy QR" className="dummy-qr-img" onClick={handleScanQR} />
                            <div className="scan-line" />
                        </div>
                        <p className="tap-hint">👆 Tap QR to simulate scan</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PatientList;
