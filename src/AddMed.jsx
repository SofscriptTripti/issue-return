import React, { useState } from 'react';
import './AddMed.css';

function AddMed({ patient, onBack }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [medicines, setMedicines] = useState([]);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastScanned, setLastScanned] = useState(null);

    // Dummy logic to simulate scanner adding item
    const MEDICINE_POOL = [
        { name: 'Otrivin Oxy', sub: 'Oxymetazoline HCl', dose: '10 ml', price: 98, expiry: 'Feb 2027', batch: 1978, stockingUnit: 10 },
        { name: 'Crocin Advance', sub: 'Paracetamol 500mg', dose: '500mg', price: 45, expiry: 'Mar 2026', batch: 4412, stockingUnit: 4 },
        { name: 'Pan 40', sub: 'Pantoprazole Sodium', dose: '40mg', price: 120, expiry: 'Jan 2027', batch: 3301, stockingUnit: 15 },
        { name: 'Azithral 500', sub: 'Azithromycin 500mg', dose: '500mg', price: 210, expiry: 'Jun 2026', batch: 7823, stockingUnit: 8 },
        { name: 'Metformin SR', sub: 'Metformin Hydrochloride', dose: '500mg', price: 60, expiry: 'Nov 2026', batch: 5590, stockingUnit: 6 },
        { name: 'Augmentin 625', sub: 'Amoxicillin + Clavulanate', dose: '625mg', price: 185, expiry: 'Apr 2027', batch: 2244, stockingUnit: 12 },
        { name: 'Allegra 120', sub: 'Fexofenadine HCl', dose: '120mg', price: 95, expiry: 'Sep 2026', batch: 6671, stockingUnit: 20 },
        { name: 'Rantac 150', sub: 'Ranitidine Hydrochloride', dose: '150mg', price: 38, expiry: 'Dec 2026', batch: 8830, stockingUnit: 10 },
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
            stockingUnit: med.stockingUnit,
            quantity: 1
        };
        setMedicines([newItem, ...medicines]);
        setLastScanned(med.name);

        // Auto clear feedback after 2s
        setTimeout(() => setLastScanned(null), 2000);
    };

    const handleAddMedicine = (med) => {
        const newItem = {
            id: Date.now(),
            name: med.name,
            sub: med.sub,
            dose: med.dose,
            price: med.price,
            expiry: med.expiry,
            batch: med.batch,
            stockingUnit: med.stockingUnit,
            quantity: 1
        };
        setMedicines([newItem, ...medicines]);
        setSearchTerm('');
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
            <div className="patient-detail-wide">
                <div className="patient-card">
                    <div className="card-header">
                        <button className="am-back-btn" onClick={onBack} title="Back to list">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7"/>
                            </svg>
                        </button>
                        <h3 className="patient-name">{patient.name}</h3>
                    </div>
                    <div className="am-patient-row">
                        <span className="am-ptn-no">PTN: <span className="am-ptn-val">#{patient.ptnNo}</span></span>
                    </div>
                </div>
            </div>

            <div className="add-med-content">

            {/* Search and Scanner */}
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

                {searchTerm && (
                    <div className="search-results-dropdown">
                        {MEDICINE_POOL.filter(m =>
                            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            m.sub.toLowerCase().includes(searchTerm.toLowerCase())
                        ).length > 0 ? (
                            MEDICINE_POOL.filter(m =>
                                m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                m.sub.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map((med, idx) => (
                                <div key={idx} className="search-result-item" onClick={() => handleAddMedicine(med)}>
                                    <div className="res-info">
                                        <div className="res-name">{med.name}</div>
                                        <div className="res-sub">{med.sub}</div>
                                    </div>
                                    <div className="res-meta">
                                        <div className="res-dose">{med.dose}</div>
                                        <div className="res-price">₹{med.price}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-res">No medicines found</div>
                        )}
                    </div>
                )}
            </div>

            {/* Prescribed Items Header */}
            <div className="prescribed-header">
                {medicines.length > 0 && (
                    <span className="added-badge">🛒 Added: {medicines.reduce((sum, m) => sum + m.quantity, 0)}</span>
                )}
            </div>
                <div className="medicines-list">
                    {medicines.length === 0 ? (
                        <div className="empty-state-container">
                            <img src="/Medicine.gif" alt="Medicine Animation" className="empty-gif" />
                            <div className="empty-state-text">No medicines added yet.</div>
                        </div>
                    ) : (
                        medicines.map((med) => (
                            <div key={med.id} className="medicine-card blue-theme">
                                <div className="med-card-left">
                                    <div className="med-name">{med.name}</div>
                                    <div className="med-sub">{med.sub}</div>
                                    <div className="med-tags">
                                        <span className="med-tag">{med.dose}</span>
                                    </div>
                                    <div className="med-meta">
                                        Expiry: {med.expiry} &nbsp;|&nbsp; Batch: {med.batch}
                                    </div>
                                </div>
                                <div className="med-card-right">
                                    <div className="med-price-row">
                                        <span className="med-price">₹{(med.price * med.quantity).toFixed(2)}</span>
                                        <button className="delete-button" onClick={() => removeMedicine(med.id)}>🗑️</button>
                                    </div>
                                    <div className="qty-control">
                                        <button className="qty-btn" onClick={() => updateQuantity(med.id, -1)}>−</button>
                                        <span className="qty-value">{med.quantity}</span>
                                        <button className="qty-btn" onClick={() => updateQuantity(med.id, 1)}>+</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
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
                                        <div className="confirm-med-content-stack">
                                            <div className="confirm-med-name-qty-row">
                                                <span className="confirm-med-name">{med.name}</span>
                                                <span className="confirm-med-qty-badge">x{med.quantity}</span>
                                            </div>
                                            <div className="confirm-med-dose">{med.dose} &nbsp;|&nbsp; Unit: {med.stockingUnit * med.quantity}</div>
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
                            <button className="confirm-btn-confirm" onClick={() => {
                                setShowConfirmModal(false);
                                setShowSuccessModal(true);
                            }}>
                                CONFIRM
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="success-overlay">
                    <div className="success-modal-small">
                        <div className="success-icon-wrap">✅</div>
                        <h3 className="success-msg-text">Medicine Confirm Successfully</h3>
                        <button className="success-ok-btn" onClick={() => {
                            setShowSuccessModal(false);
                            onBack();
                        }}>OK</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AddMed;
