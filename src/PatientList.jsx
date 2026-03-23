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
    { id: 3, name: 'Ananya Iyer', ptnNo: '78910', age: 52, gender: 'Female', phone: '+91 77777 77777', doctor: 'Dr. Kavitha', lastVisit: '10/03/2025', status: 'OPD' },
    { id: 4, name: 'Vikram Singh', ptnNo: '90123', age: 38, gender: 'Male', phone: '+91 91234 56789', doctor: 'Dr. Anita Desai', lastVisit: '12/05/2025', status: 'OPD' },
    { id: 5, name: 'Sanya Malhotra', ptnNo: '34567', age: 29, gender: 'Female', phone: '+91 98765 43210', doctor: 'Dr. Paresh', lastVisit: '08/04/2025', status: 'OPD' },
    { id: 6, name: 'Aditya Reddy', ptnNo: '56789', age: 45, gender: 'Male', phone: '+91 99887 76655', doctor: 'Dr. Kavitha', lastVisit: '22/03/2025', status: 'OPD' },
    { id: 7, name: 'Deepa Patel', ptnNo: '12345', age: 62, gender: 'Female', phone: '+91 88776 65544', doctor: 'Dr. Anita Desai', lastVisit: '05/05/2025', status: 'OPD' },
    { id: 8, name: 'Rohan Verma', ptnNo: '67890', age: 19, gender: 'Male', phone: '+91 77665 54433', doctor: 'Dr. Paresh', lastVisit: '18/04/2025', status: 'OPD' },
    { id: 9, name: 'Nisha Kumari', ptnNo: '89012', age: 31, gender: 'Female', phone: '+91 66554 43322', doctor: 'Dr. Kavitha', lastVisit: '28/03/2025', status: 'OPD' },
];

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

function PatientList({
    onBack,
    onLogout,
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
    const [scannerTarget, setScannerTarget] = useState('main'); 
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

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

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterPtnNo, setFilterPtnNo] = useState('');
    const [filterFirst, setFilterFirst] = useState('');
    const [filterLast, setFilterLast] = useState('');
    const [filterMobile, setFilterMobile] = useState('');
    const [activeFilters, setActiveFilters] = useState(null);

    const openScanner = (target) => {
        setScannerTarget(target);
        if (target === 'filter') setIsFilterOpen(false);
        setIsScannerOpen(true);
    };

    const handleScanQR = () => {
        const randomPTN = DUMMY_PTNS[Math.floor(Math.random() * DUMMY_PTNS.length)];
        if (scannerTarget === 'filter') {
            setFilterPtnNo(randomPTN.replace('PTN-', ''));
            setIsScannerOpen(false);
            setIsFilterOpen(true);
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
            {/* Selection info (Higher wide bar) */}
            {(selectedStore || selectedCostCenter) && (
                <div className="selection-info-bar">
                    {/* TOP ROW: Filter and Logout */}
                    {/* ROW 1: Store & Logout */}
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

                        <button className="logout-btn" onClick={onLogout} title="Logout">
                            {LOGOUT_ICON}
                            <span className="logout-text">Logout</span>
                        </button>
                    </div>

                    {/* ROW 2: Filters & Location */}
                    <div className="selection-bottom-row">
                        <div className="selection-left">
                            <span className="selection-label">
                                <div className="selection-details-text">
                                    <span className="store-display-name">{selectedStore}</span>
                                    <span className="cc-display-name">{selectedCostCenter}</span>
                                </div>
                            </span>
                        </div>

                        <button 
                            className={`nav-filter-btn ${hasActiveFilter ? 'filter-active' : ''}`} 
                            onClick={() => setIsFilterOpen(true)}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            <span className="nav-filter-text">Advance Search</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="patient-list-content">
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
                        <button className="search-scanner-btn" onClick={() => openScanner('main')}>
                            {QR_ICON}
                        </button>
                    </div>
                    {/* Filter button moved to header */}
                </div>

                {/* Active filter chips */}
                {hasActiveFilter && (
                    <div className="active-filter-bar">
                        <span className="active-filter-label">🔖 Filtered</span>
                        <button className="clear-filter-btn" onClick={clearFilter}>Clear ✕</button>
                    </div>
                )}

                {/* Scrollable Patient List Container */}
                <div className="patient-cards-list">
                    {/* 1. SCANNED PATIENTS FIRST - FILTERED BY SEARCH */}
                    {(scannedPatients || []).filter(sp => {
                        const searchLower = searchTerm.toLowerCase();
                        const matchesSearch = !searchTerm || 
                            sp.name.toLowerCase().includes(searchLower) || 
                            sp.uhid.toLowerCase().includes(searchLower);
                        
                        // Also apply advance filters if present
                        let matchesAdvance = true;
                        if (activeFilters) {
                            if (activeFilters.ptnNo && !sp.uhid.includes(activeFilters.ptnNo)) matchesAdvance = false;
                            if (activeFilters.first && !sp.name.toLowerCase().includes(activeFilters.first.toLowerCase())) matchesAdvance = false;
                            // Add other filters as needed
                        }

                        return matchesSearch && matchesAdvance;
                    }).map((scannedPatient, idx) => (
                        <div key={`scanned-${idx}`} className="patient-card scanned-patient-card"
                            onClick={() => onSelectPatient && onSelectPatient({
                                name: scannedPatient.name, ptnNo: scannedPatient.uhid.replace('PTN-', ''),
                                age: scannedPatient.age, gender: scannedPatient.gender,
                                phone: 'N/A', doctor: scannedPatient.doctor,
                                lastVisit: scannedPatient.discharge, status: 'OPD'
                            })}>
                            <div className="patient-card-content">
                                <div className="patient-avatar">
                                    <img src={scannedPatient.avatar || "https://thumbs.dreamstime.com/b/happy-black-teen-boy-outside-african-american-smiles-sitting-bench-192130399.jpg"} alt={scannedPatient.name} />
                                </div>

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

                    {/* 2. REGULAR PATIENTS */}
                    {displayedPatients.length === 0 ? (
                        <div className="no-results">No patients found</div>
                    ) : (
                        displayedPatients.map((patient) => (
                            <div key={patient.id} className="patient-card" onClick={() => onSelectPatient && onSelectPatient(patient)}>
                                <div className="patient-card-content">
                                    <div className="patient-avatar">
                                        <img src={patient.avatar || "https://thumbs.dreamstime.com/b/happy-black-teen-boy-outside-african-american-smiles-sitting-bench-192130399.jpg"} alt={patient.name} />
                                    </div>

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
                                            <span className="info-label-inline">Last Visit:</span>
                                            <span className="info-value-inline text-black">{patient.lastVisit}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Advance Search Modal */}
            {isFilterOpen && (
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
            )}

            {/* Scanner Modal */}
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
