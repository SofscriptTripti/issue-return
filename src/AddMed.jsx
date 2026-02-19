import React, { useState } from 'react';
import './AddMed.css';

function AddMed({ patient, onBack }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [medicines, setMedicines] = useState([]);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Dummy logic to simulate scanner adding item
    const handleScanComplete = () => {
        const newItem = {
            id: Date.now(),
            name: `Otrivin Oxy ${medicines.length + 1}`,
            dose: '10 ml',
            price: 98,
            quantity: 1
        };
        setMedicines([...medicines, newItem]);
        setIsScannerOpen(false);
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
        setShowSuccessModal(true);
        setTimeout(() => {
            setShowSuccessModal(false);
        }, 2000); // Auto-hide after 2 seconds
    };

    if (!patient) return null;

    return (
        <div className="add-med-container">
            {/* Header */}
            <div className="add-med-header">
                <button className="back-button" onClick={onBack}>←</button>
                <h2 className="header-title">Add Medicines</h2>
            </div>

            {/* Patient Details Card */}
            <div className="patient-detail-card">
                <div className="detail-card-header">
                    <h3 className="patient-name">{patient.name}</h3>
                    <span className="status-badge">{patient.status || 'OPD'}</span>
                </div>
                <div className="patient-id">PTN NO - {patient.ptnNo}</div>
                <div className="detail-row">
                    <span>👤 {patient.age} Years • {patient.gender}</span>
                    <span>📞 {patient.phone}</span>
                </div>
                <div className="detail-row">
                    <span>👨‍⚕️ {patient.doctor}</span>
                    <span>📅 Last: {patient.lastVisit}</span>
                </div>
            </div>

            {/* Search and Scanner */}
            <div className="section-title">Add Medicines</div>
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
                <button className="scanner-button" onClick={handleScannerClick}>
                    📷
                </button>
            </div>

            {/* Prescribed Items List */}
            <div className="section-title">📄 Prescribed Items</div>
            <div className="medicines-list">
                {medicines.length === 0 ? (
                    <div className="empty-state">No medicines added. Scan to add.</div>
                ) : (
                    medicines.map((med) => (
                        <div key={med.id} className="medicine-card">
                            <div className="medicine-header">
                                <div>
                                    <div className="medicine-name">{med.name}</div>
                                    <div className="medicine-dose">{med.dose} • ₹{med.price}/unit</div>
                                </div>
                                <button className="delete-button" onClick={() => removeMedicine(med.id)}>🗑️</button>
                            </div>
                            <div className="medicine-actions">
                                <div className="qty-control">
                                    <button className="qty-btn" onClick={() => updateQuantity(med.id, -1)}>−</button>
                                    <span className="qty-value">{med.quantity}</span>
                                    <button className="qty-btn" onClick={() => updateQuantity(med.id, 1)}>+</button>
                                </div>
                                <div className="medicine-total">₹{(med.price * med.quantity).toFixed(2)}</div>
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
                <button className="process-button" onClick={handleSave}>
                    Process & Save
                </button>
            </div>

            {/* Scanner Modal */}
            {isScannerOpen && (
                <div className="scanner-modal-overlay">
                    <div className="scanner-modal">
                        <button className="close-scanner" onClick={() => setIsScannerOpen(false)}>×</button>
                        <div className="scanner-view">
                            <div className="qr-guide-box"></div>
                            <div className="qr-placeholder" onClick={handleScanComplete}>
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"
                                    alt="Dummy QR"
                                    className="dummy-qr"
                                />
                                <p className="qr-hint">Tap QR to Simulate Scan</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="modal-overlay">
                    <div className="modal-content success-modal">
                        <div className="success-icon">✅</div>
                        <h3 className="modal-title">Success</h3>
                        <p className="success-message">Medicine Save</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AddMed;
