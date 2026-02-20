import React, { useState } from 'react';
import './AddMed.css';

function AddMed({ patient, onBack }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [medicines, setMedicines] = useState([]);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [lastScanned, setLastScanned] = useState(null);

    // Dummy logic to simulate scanner adding item
    const MEDICINE_POOL = [
        { name: 'Otrivin Oxy', sub: 'Oxymetazoline HCl', dose: '10 ml', price: 98, expiry: 'Feb 2027', batch: 1978 },
        { name: 'Crocin Advance', sub: 'Paracetamol 500mg', dose: '500mg', price: 45, expiry: 'Mar 2026', batch: 4412 },
        { name: 'Pan 40', sub: 'Pantoprazole Sodium', dose: '40mg', price: 120, expiry: 'Jan 2027', batch: 3301 },
        { name: 'Azithral 500', sub: 'Azithromycin 500mg', dose: '500mg', price: 210, expiry: 'Jun 2026', batch: 7823 },
        { name: 'Metformin SR', sub: 'Metformin Hydrochloride', dose: '500mg', price: 60, expiry: 'Nov 2026', batch: 5590 },
        { name: 'Augmentin 625', sub: 'Amoxicillin + Clavulanate', dose: '625mg', price: 185, expiry: 'Apr 2027', batch: 2244 },
        { name: 'Allegra 120', sub: 'Fexofenadine HCl', dose: '120mg', price: 95, expiry: 'Sep 2026', batch: 6671 },
        { name: 'Rantac 150', sub: 'Ranitidine Hydrochloride', dose: '150mg', price: 38, expiry: 'Dec 2026', batch: 8830 },
    ];

    const handleScanComplete = () => {
        const med = MEDICINE_POOL[Math.floor(Math.random() * MEDICINE_POOL.length)];
        const newItem = {
            id: Date.now(),
            name: med.name,
            sub: med.sub,
            dose: med.dose,
            price: med.price,
            expiry: med.expiry,
            batch: med.batch,
            quantity: 1
        };
        setMedicines([newItem, ...medicines]);
        setLastScanned(med.name);

        // Auto clear feedback after 2s
        setTimeout(() => setLastScanned(null), 2000);
    };

    const handleScannerClick = () => {
        setIsScannerOpen(true);
    };

    const updateQuantity = (id, change) => {
        setMedicines(medicines.map(med => {
            if (med.id === id) {
                const newQty = med.quantity + change;
                return newQty > 0 ? { ...med, quantity: newQty } : med;
            }
            return med;
        }));
    };

    const removeMedicine = (id) => {
        setMedicines(medicines.filter(med => med.id !== id));
    };

    const calculateTotal = () => {
        return medicines.reduce((total, med) => total + (med.price * med.quantity), 0);
    };

    const handleSave = () => {
        setShowConfirmModal(true);
    };

    if (!patient) return null;

    return (
        <div className="add-med-container">
            {/* Header */}
            {/* Header */}
            <div className="app-header">
                <button className="back-button" onClick={onBack}>←</button>
                <h2 className="header-title">Add Medicines</h2>
            </div>

            {/* Patient Details Card */}
            <div className="patient-card">
                <div className="card-header">
                    <h3 className="patient-name">{patient.name}</h3>
                    <span className="status-badge">{patient.status || 'OPD'}</span>
                </div>
                <div className="am-patient-row">
                    <span className="am-age-gender">👤 {patient.age} Yrs • {patient.gender}</span>
                    <span className="am-ptn-no">PTN: <span className="am-ptn-val">#{patient.ptnNo}</span></span>
                </div>

            </div>

            {/* Search and Scanner */}
            <div className="section-title-row">
                <span className="section-title">Add Medicines</span>
            </div>
            <div className="search-scanner-row">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search medicines"
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="scanner-button" onClick={handleScannerClick} style={{ position: 'relative' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="5" height="5" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" />
                        <rect x="3" y="16" width="5" height="5" rx="1" />
                        <path d="M16 16h2v2h-2zM18 18h2v2h-2zM20 16h1v1h-1zM16 20h1v1h-1z" />
                        <path d="M10 3h2v2h-2zM10 8h2v2h-2zM3 10h2v2H3zM8 10h2v2H8z" />
                    </svg>
                </button>
            </div>

            {/* Summary card + Prescribed Items Header */}
            {/* {medicines.length > 0 && (
                <div className="med-summary-card">
                    <span className="med-summary-icon">🛒</span>
                    <span className="med-summary-text">Total Medicines</span>
                    <span className="med-summary-count">{medicines.reduce((sum, m) => sum + m.quantity, 0)}</span>
                </div>
            )} */}
            <div className="prescribed-header">
                <span className="prescribed-title">📄 Prescribed Items</span>
                {medicines.length > 0 && (
                    <span className="added-badge">🛒 Added: {medicines.reduce((sum, m) => sum + m.quantity, 0)}</span>
                )}
            </div>
            <div className="medicines-list">
                {medicines.length === 0 ? (
                    <div className="empty-state">No medicines added. Scan to add.</div>
                ) : (
                    medicines.map((med) => (
                        <div key={med.id} className="medicine-card">
                            <div className="med-card-left">
                                <div className="med-name">{med.name}</div>
                                <div className="med-sub">{med.sub}</div>
                                <div className="med-tags">
                                    <span className="med-tag">{med.dose}</span>
                                </div>
                                <div className="med-meta">Expiry: {med.expiry} &nbsp;|&nbsp; Batch: {med.batch}</div>
                            </div>
                            <div className="med-card-right">
                                <span className="med-price">₹{(med.price * med.quantity).toFixed(2)}</span>
                                <button className="delete-button" onClick={() => removeMedicine(med.id)}>🗑️</button>
                                <div className="qty-dropdown-wrap">
                                    <select
                                        className="qty-select"
                                        value={med.quantity}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setMedicines(medicines.map(m => m.id === med.id ? { ...m, quantity: val } : m));
                                        }}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                            <option key={n} value={n}>Qty {n}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="add-med-footer">
                <div className="footer-total">
                    <span className="total-label">Total Amount</span>
                    <span className="total-value">₹{calculateTotal().toFixed(2)}</span>
                </div>
                <button
                    className="process-button"
                    onClick={handleSave}
                    disabled={medicines.length === 0}
                >
                    Process & Save
                </button>
            </div>

            {/* Scanner Modal */}
            {isScannerOpen && (
                <div className="scanner-modal-overlay">
                    <div className="scanner-modal">
                        <button className="close-scanner" onClick={() => setIsScannerOpen(false)}>×</button>
                        <div className="scanner-view">
                            <h3 className="scanner-instructions">Tap on button to Scan</h3>

                            <div className="scanner-box-container">
                                <div className="qr-guide-box"></div>
                                <div className="qr-placeholder">
                                    <img
                                        src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"
                                        alt="Dummy QR"
                                        className="dummy-qr"
                                    />
                                </div>
                            </div>

                            <div className="scanner-actions">
                                <button className="scan-action-btn" onClick={handleScanComplete}>
                                    <div className="scan-inner"></div>
                                </button>
                                <p className="scan-btn-hint">Tap to scan</p>
                            </div>

                            {/* Feedback Toast */}
                            {lastScanned && (
                                <div className="scan-feedback">
                                    <span className="feedback-icon">✅</span>
                                    <span className="feedback-text">{lastScanned} Added</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            {showConfirmModal && (
                <div className="confirm-overlay" onClick={() => setShowConfirmModal(false)}>
                    <div className="confirm-modal" onClick={e => e.stopPropagation()}>

                        {/* Modal Header */}
                        <div className="confirm-header">
                            <span className="confirm-title">📋 Order Summary</span>
                            <button className="confirm-close" onClick={() => setShowConfirmModal(false)}>✕</button>
                        </div>

                        {/* Patient info strip */}
                        <div className="confirm-patient-strip">
                            <span className="confirm-patient-name">{patient.name}</span>
                            <span className="confirm-patient-ptn">PTN #{patient.ptnNo}</span>
                        </div>

                        {/* Medicine list — read-only */}
                        <div className="confirm-med-list">
                            {medicines.map((med, i) => (
                                <div key={med.id} className="confirm-med-row">
                                    <div className="confirm-med-left">
                                        <span className="confirm-med-num">{i + 1}.</span>
                                        <div>
                                            <div className="confirm-med-name">{med.name}</div>
                                            <div className="confirm-med-dose">{med.dose} &nbsp;|&nbsp; Qty: {med.quantity}</div>
                                        </div>
                                    </div>
                                    <span className="confirm-med-price">₹{(med.price * med.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="confirm-total-row">
                            <span className="confirm-total-label">Total Amount</span>
                            <span className="confirm-total-value">₹{calculateTotal().toFixed(2)}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="confirm-actions">
                            <button className="confirm-btn-edit" onClick={() => setShowConfirmModal(false)}>
                                EDIT
                            </button>
                            <button className="confirm-btn-confirm" onClick={() => { setShowConfirmModal(false); onBack(); }}>
                                CONFIRM
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AddMed;
