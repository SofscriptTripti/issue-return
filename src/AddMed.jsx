import React, { useState, useEffect, useRef } from 'react';
import './AddMed.css';
import { authService } from './api/authService';
import { Html5Qrcode } from 'html5-qrcode';

function AddMed({ patient, onBack, storeCd, ccCd }) {
    // Unique cart key per patient
    const cartKey = patient ? `med_cart_${patient.ptnNo}` : null;

    const [searchTerm, setSearchTerm] = useState('');
    const [medicines, setMedicines] = useState(() => {
        // Load saved cart from localStorage on first render
        try {
            if (!patient) return [];
            const saved = localStorage.getItem(`med_cart_${patient.ptnNo}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                console.log(`Loaded saved cart for PTN ${patient.ptnNo}:`, parsed);
                return parsed;
            }
        } catch (e) { /* ignore */ }
        return [];
    });
    const [searchItems, setSearchItems] = useState([]);
    const [isSearchingItems, setIsSearchingItems] = useState(false);
    const [isFetchingBatch, setIsFetchingBatch] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [lastScanned, setLastScanned] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [isMobile, setIsMobile] = useState(false);

    const showToast = (message) => {
        setToasts(prev => {
            // Prevent duplicate toasts of the same message
            if (prev.some(t => t.message === message)) {
                return prev;
            }
            const id = Date.now();
            setTimeout(() => {
                setToasts(current => current.filter(t => t.id !== id));
            }, 3000);
            return [...prev, { id, message }];
        });
    };
    const [scannerError, setScannerError] = useState('');
    const html5QrCodeRef = useRef(null);

    useEffect(() => {
        setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }, []);

    // Scanner logic
    useEffect(() => {
        if (isScannerOpen && isMobile) {
            // delay to ensure DOM is ready
            setTimeout(() => {
                const html5QrCode = new Html5Qrcode("reader");
                html5QrCodeRef.current = html5QrCode;
                const config = { fps: 10, qrbox: { width: 250, height: 250 } };
                
                html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
                    // Success callback
                    console.log("Scan result: ", decodedText);
                    setSearchTerm(decodedText);
                    setLastScanned(decodedText);
                    html5QrCode.stop().then(() => {
                        setIsScannerOpen(false);
                    }).catch(console.error);
                }, (errorMessage) => {
                    // Ignore normal decode errors (happens when no QR found in frame)
                }).catch((err) => {
                    console.error("Camera start failed:", err);
                    setScannerError("Camera not allowed or unavailable.");
                });
            }, 300);
        }

        return () => {
            if (html5QrCodeRef.current && (html5QrCodeRef.current.isScanning || html5QrCodeRef.current.getState() === 2)) {
                html5QrCodeRef.current.stop().catch(console.error);
            }
        };
    }, [isScannerOpen, isMobile]);

    // Auto-save cart to localStorage whenever medicines change
    useEffect(() => {
        if (!cartKey) return;
        if (medicines.length > 0) {
            localStorage.setItem(cartKey, JSON.stringify(medicines));
            console.log(`Cart saved for PTN ${patient.ptnNo}:`, medicines);
        } else {
            localStorage.removeItem(cartKey);
        }
    }, [medicines]);

    // Fetch medicines as user types
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length > 2) {
                setIsSearchingItems(true);
                try {
                    const response = await authService.getSearchItems(storeCd, searchTerm, ccCd);
                    console.log("Medicine Search Results:", response);
                    const items = response.data || (Array.isArray(response) ? response : []);
                    if (Array.isArray(items)) {
                        setSearchItems(items.map((item) => ({
                            id: item.itemCd,
                            name: item.itemDescription || "Unnamed Item",
                            sub: item.gen_nm ? item.gen_nm.trim() : "N/A",
                            dose: item.stockUnitCd || item.itemCd,
                            currQty: parseFloat(item.qty !== undefined ? item.qty : item.currQty) || 0,
                            shelf: item.shelf_No || "N/A",
                            rack: item.rack_No || "N/A",
                            price: parseFloat(item.trnSellPrice || item.trnMRP || 0),
                            expiry: item.expiryDate || "N/A",
                            batch: item.bchNo || item.itemCd,
                            stockingUnit: parseFloat(item.qty !== undefined ? item.qty : item.currQty) || 0
                        })));
                    }
                } catch (err) {
                    console.error("Failed to search medicines:", err);
                    setSearchItems([]);
                } finally {
                    setIsSearchingItems(false);
                }
            } else {
                setSearchItems([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, storeCd, ccCd]);


    const handleScanComplete = () => {
        if (searchItems.length === 0) return;
        const med = searchItems[0];
        const newItem = {
            id: Date.now(),
            ...med,
            itemCd: med.id,
            quantity: 1
        };
        setMedicines(prev => {
            const maxQty = newItem.currQty !== undefined && newItem.currQty !== null ? newItem.currQty : (newItem.stockingUnit || 999999);
            const existingIndex = prev.findIndex(m => m.itemCd === newItem.itemCd && m.batch === newItem.batch && m.expiry === newItem.expiry);
            
            if (existingIndex !== -1) {
                const updated = [...prev];
                const currentMed = updated[existingIndex];
                if (currentMed.quantity + 1 <= maxQty) {
                    updated[existingIndex] = { ...currentMed, quantity: currentMed.quantity + 1 };
                } else {
                    showToast(`Oops! 😬 Item out of stock (${maxQty})`);
                }
                return updated;
            }
            
            if (1 <= maxQty) {
                return [newItem, ...prev];
            } else {
                showToast(`Oops! 😬 Item out of stock (${maxQty})`);
                return prev;
            }
        });
        setLastScanned(med.name);
        setTimeout(() => setLastScanned(null), 2000);
    };

    const handleAddMedicine = async (med) => {
        console.log("Selected Medicine from Search:", med);
        setIsFetchingBatch(true);
        setSearchTerm('');
        setSearchItems([]);
        try {
            // Fetch batch details for this specific item
            const batchResponse = await authService.getItemBatchList(storeCd, med.id);
            const batches = batchResponse.data || (Array.isArray(batchResponse) ? batchResponse : []);
            const firstBatch = Array.isArray(batches) && batches.length > 0 ? batches[0] : null;

            console.log("Batch details for", med.id, ":", batches);

            const newItem = {
                id: Date.now(),
                itemCd: med.id,
                name: med.name,
                sub: med.sub,
                dose: med.dose,
                currQty: firstBatch ? parseFloat(firstBatch.qty !== undefined ? firstBatch.qty : (firstBatch.currQty || firstBatch.batchQty || 0)) : med.currQty,
                expiry: firstBatch ? (firstBatch.expiryDate || firstBatch.expDt || med.expiry) : med.expiry,
                batch: firstBatch ? (firstBatch.bchNo || firstBatch.batchNo || firstBatch.batch || med.batch) : med.batch,
                price: firstBatch ? parseFloat(firstBatch.trnSellPrice || firstBatch.trnMRP || firstBatch.mrp || firstBatch.rate || med.price) : med.price,
                stockingUnit: firstBatch ? parseFloat(firstBatch.qty !== undefined ? firstBatch.qty : (firstBatch.currQty || firstBatch.batchQty || 1)) : med.stockingUnit,
                quantity: 1
            };
            setMedicines(prev => {
                const maxQty = newItem.currQty !== undefined && newItem.currQty !== null ? newItem.currQty : (newItem.stockingUnit || 999999);
                const existingIndex = prev.findIndex(m => m.itemCd === newItem.itemCd && m.batch === newItem.batch && m.expiry === newItem.expiry);
                
                if (existingIndex !== -1) {
                    const updated = [...prev];
                    const currentMed = updated[existingIndex];
                    if (currentMed.quantity + 1 <= maxQty) {
                        updated[existingIndex] = { ...currentMed, quantity: currentMed.quantity + 1 };
                    } else {
                        showToast(`Oops! 😬 Item out of stock (${maxQty})`);
                    }
                    return updated;
                }
                
                if (1 <= maxQty) {
                    return [newItem, ...prev];
                } else {
                    showToast(`Oops! 😬 Item out of stock (${maxQty})`);
                    return prev;
                }
            });
        } catch (err) {
            console.error("Failed to fetch batch details:", err);
            // Add medicine without batch details as fallback
            const fallbackItem = { id: Date.now(), ...med, itemCd: med.id, quantity: 1 };
            setMedicines(prev => {
                const maxQty = fallbackItem.currQty !== undefined && fallbackItem.currQty !== null ? fallbackItem.currQty : (fallbackItem.stockingUnit || 999999);
                const existingIndex = prev.findIndex(m => m.itemCd === fallbackItem.itemCd && m.batch === fallbackItem.batch && m.expiry === fallbackItem.expiry);
                
                if (existingIndex !== -1) {
                    const updated = [...prev];
                    const currentMed = updated[existingIndex];
                    if (currentMed.quantity + 1 <= maxQty) {
                        updated[existingIndex] = { ...currentMed, quantity: currentMed.quantity + 1 };
                    } else {
                        showToast(`Oops! 😬 Item out of stock (${maxQty})`);
                    }
                    return updated;
                }
                
                if (1 <= maxQty) {
                    return [fallbackItem, ...prev];
                } else {
                        showToast(`Oops! 😬 Item out of stock (${maxQty})`);
                    return prev;
                }
            });
        } finally {
            setIsFetchingBatch(false);
        }
    };
    const handleScannerClick = () => {
        setScannerError('');
        setIsScannerOpen(true);
    };

    const updateQuantity = (id, change) => {
        setMedicines(medicines.map(med => {
            if (med.id === id) {
                const newQty = med.quantity + change;
                const maxQty = med.currQty !== undefined && med.currQty !== null 
                                ? med.currQty 
                                : (med.stockingUnit || 999999);
                
                if (newQty > 0 && newQty <= maxQty) {
                    return { ...med, quantity: newQty };
                } else if (newQty > maxQty) {
                    showToast(`Oops! 😬 Item out of stock (${maxQty})`);
                    return med;
                }
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

            {/* Batch fetch loading toast */}
            {isFetchingBatch && (
                <div style={{
                    position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #005bb7, #006ce6)',
                    color: '#fff', padding: '10px 24px', borderRadius: 100,
                    fontSize: 13, fontWeight: 700, zIndex: 9999,
                    boxShadow: '0 4px 16px rgba(0,80,200,0.3)',
                    display: 'flex', alignItems: 'center', gap: 8
                }}>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                    Fetching batch details...
                </div>
            )}

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
                        {isSearchingItems ? (
                            <div className="no-res">Searching medicines...</div>
                        ) : searchItems.length > 0 ? (
                            searchItems.map((med, idx) => (
                                <div key={idx} className="search-result-item" onClick={() => handleAddMedicine(med)}>
                                    <div className="res-info">
                                        <div className="res-name">{med.name}</div>
                                        <div className="res-sub">{med.sub}</div>
                                    </div>
                                    <div className="res-meta">
                                        <div className="res-dose" style={{fontSize:'11px', color:'#888'}}>{med.dose}</div>
                                        <div className="res-price" style={{fontSize:'12px', fontWeight:700, color:'#006ce6'}}>Qty: {med.currQty}</div>
                                    </div>
                                </div>
                            ))
                        ) : searchTerm.length > 2 ? (
                            <div className="no-res">No medicines found</div>
                        ) : (
                            <div className="no-res">Type more characters...</div>
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
                                        {med.itemCd && <span className="med-tag" style={{background:'#e6f2ff', color:'#005bb7'}}>{med.itemCd}</span>}
                                    </div>
                                    <div className="med-meta">
                                        Exp: {med.expiry} &nbsp;|&nbsp; Batch: {med.batch}
                                    </div>
                                </div>
                                <div className="med-card-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <div className="med-price-row">
                                        <span className="med-price">₹{(med.price * med.quantity).toFixed(2)}</span>
                                        <button className="delete-button" onClick={() => removeMedicine(med.id)}>🗑️</button>
                                    </div>
                                    <div className="qty-control">
                                        <button className="qty-btn" onClick={() => updateQuantity(med.id, -1)}>−</button>
                                        <span className="qty-value">{med.quantity}</span>
                                        <button className="qty-btn" onClick={() => updateQuantity(med.id, 1)}>+</button>
                                    </div>
                                    <div style={{ marginTop: '5px', fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>
                                        Stock Qty: {med.currQty !== undefined && med.currQty !== null ? med.currQty : (med.stockingUnit || '0')}
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
                
                <div className="footer-right-col">
                    <button
                        className="process-button"
                        onClick={handleSave}
                        disabled={medicines.length === 0}
                    >
                        Process & Save
                    </button>
                </div>
            </div>

            {/* Scanner Modal */}
            {isScannerOpen && (
                <div className="scanner-modal-overlay">
                    <div className="scanner-modal">
                        <button className="close-scanner" onClick={() => setIsScannerOpen(false)}>×</button>
                        <div className="scanner-view">
                            <h3 className="scanner-instructions">Tap on button to Scan</h3>

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
                                            <div id="reader" style={{ width: '100%', height: '100%' }}></div>
                                        )}
                                    </div>
                                    <div className="scanner-actions">
                                        <p className="scan-btn-hint">Point camera at 2D Barcode</p>
                                    </div>
                                </>
                            )}

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
                            <button className="confirm-btn-confirm" disabled={isConfirming} onClick={async () => {
                                setIsConfirming(true);
                                try {
                                    const payload = {
                                        strcd: parseInt(storeCd, 10),
                                        cstCntrTyp: 34,
                                        ccCd: parseInt(ccCd, 10),
                                        userId: localStorage.getItem("username") || "sssl",
                                        bedNo: patient.bedNo || "1234566",
                                        ptnNo: parseInt(patient.ptnNo, 10),
                                        items: medicines.map(med => ({
                                            itemCd: med.itemCd,
                                            bchNo: med.batch,
                                            qty: med.quantity,
                                            trnDate: new Date().toISOString()
                                        }))
                                    };
                                    
                                    await authService.addIssueHoldVch(payload);

                                    // Clear the saved cart for this patient on confirm
                                    if (cartKey) localStorage.removeItem(cartKey);
                                    console.log(`Cart confirmed & cleared for PTN ${patient.ptnNo}`);
                                    setShowConfirmModal(false);
                                    setMedicines([]); // Clear current medicines from state
                                    setShowSuccessModal(true);
                                } catch (error) {
                                    console.error("Confirm error:", error);
                                    showToast("Failed to confirm: " + (error.message || "Unknown error"));
                                } finally {
                                    setIsConfirming(false);
                                }
                            }}>
                                {isConfirming ? "CONFIRMING..." : "CONFIRM"}
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

            {/* Toasts Container */}
            <div className="toasts-container">
                {toasts.map(toast => (
                    <div key={toast.id} className="toast-notification">
                        <span className="toast-message">{toast.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AddMed;
