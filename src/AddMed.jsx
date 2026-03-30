import React, { useState, useEffect, useRef } from 'react';
import './AddMed.css';
import { authService } from './api/authService';
import { Html5Qrcode } from 'html5-qrcode';

function AddMed({ patient, onBack, storeCd, ccCd }) {
    // Unique cart key per patient
    const cartKey = patient ? `med_cart_${patient.ptnNo}` : null;

    const [searchTerm, setSearchTerm] = useState('');
    const [medicines, setMedicines] = useState(() => {
        // Load saved cart from sessionStorage on first render
        try {
            if (!patient) return [];
            const saved = sessionStorage.getItem(`med_cart_${patient.ptnNo}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                console.log(`Loaded saved cart for PTN ${patient.ptnNo}:`, parsed);
                return parsed;
            }
        } catch (e) { /* ignore */ }
        return [];
    });
    const medicinesRef = useRef(medicines);
    // Sync Ref with state
    useEffect(() => {
        medicinesRef.current = medicines;
    }, [medicines]);

    const [searchItems, setSearchItems] = useState([]);
    const [isSearchingItems, setIsSearchingItems] = useState(false);
    const [isFetchingBatch, setIsFetchingBatch] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [lastScanned, setLastScanned] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [showNoCameraModal, setShowNoCameraModal] = useState(false);
    const [voucherNo, setVoucherNo] = useState('');
    
    // Batch Selection Modal States
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [availableBatches, setAvailableBatches] = useState([]);
    const [selectedMedForBatch, setSelectedMedForBatch] = useState(null);
    const [batchSelections, setBatchSelections] = useState({}); // { batchKey: quantity }
    const [isProcessingScan, setIsProcessingScan] = useState(false);
    const [showScanStatus, setShowScanStatus] = useState({ show: false, msg: '', isError: false });
    const lastDetectedRef = useRef(null);

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
    const medSearchInputRef = useRef(null);

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

    // Scanner logic
    useEffect(() => {
        let isMounted = true;
        let html5QrCode = null;

        if (isScannerOpen) {
            const timer = setTimeout(async () => {
                try {
                    html5QrCode = new Html5Qrcode("reader");
                    html5QrCodeRef.current = html5QrCode;
                    const config = { fps: 10, qrbox: { width: 250, height: 240 } };

                    await html5QrCode.start(
                        { facingMode: "environment" }, 
                        config, 
                        (decodedText) => {
                            // Silently update the ref with the latest detection
                            lastDetectedRef.current = decodedText;
                        }, 
                        (errorMessage) => { /* quiet noise */ }
                    );
                } catch (err) {
                    console.error("Scanner Error:", err);
                    if (isMounted) {
                        setIsScannerOpen(false);
                        setShowNoCameraModal(true);
                        setScannerError('');
                    }
                }
            }, 300);

            return () => {
                isMounted = false;
                clearTimeout(timer);
                if (html5QrCodeRef.current) {
                    const stopScanner = async () => {
                        if (html5QrCodeRef.current.isScanning || html5QrCodeRef.current.getState() === 2) {
                            try {
                                await html5QrCodeRef.current.stop();
                                html5QrCodeRef.current = null;
                            } catch (e) {
                                console.error("Scanner stop fail:", e);
                            }
                        }
                    };
                    stopScanner();
                }
            };
        }
    }, [isScannerOpen]);

    // Auto-save cart to sessionStorage whenever medicines change
    useEffect(() => {
        if (!cartKey) return;
        if (medicines.length > 0) {
            sessionStorage.setItem(cartKey, JSON.stringify(medicines));
            console.log(`Cart saved for PTN ${patient.ptnNo}:`, medicines);
        } else {
            sessionStorage.removeItem(cartKey);
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
                            dose: item.stockUnitCd || item.itemCd,
                            currQty: parseFloat(item.qty !== undefined ? item.qty : item.currQty) || 0,
                            shelf: item.shelf_No || "N/A",
                            rack: item.rack_No || "N/A",
                            price: parseFloat(item.trnRate || item.trnSellPrice || item.trnMRP || 0),
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
            
            if (1 <= maxQty) {
                const next = [newItem, ...prev];
                medicinesRef.current = next; // Instant sync for rapid scanning
                return next;
            }
            return prev;
        });
        setLastScanned(med.name);
        setTimeout(() => setLastScanned(null), 2000);
        return { added: true };
    };

    const handleAddMedicine = async (med, targetBatch = null, isSilent = false) => {
        // Only prevent adding if the EXACT SAME medicine ID is already present (regardless of batch)
        const targetBatchToUse = targetBatch || (med.batch !== 'N/A' ? med.batch : null);
        
        // Sync check before doing anything
        if (!isSilent && medicinesRef.current.some(m => (m.itemCd || m.id) === med.id)) {
            showToast(`${med.name} is already in your list.`);
            return { added: false, reason: 'ALREADY_PRESENT' };
        }

        console.log(`Medicine ${isSilent ? 'scanned' : 'selected'}, fetching batches:`, med.id);
        setIsFetchingBatch(true);
        setSearchTerm('');
        setSearchItems([]);
        
        let batchModalOpened = false;
        try {
            const response = await authService.getItemBatchList(storeCd, med.id);
            console.log("Batch API full response:", response);
            
            const batches = response.data || (Array.isArray(response) ? response : []);
            if (Array.isArray(batches) && batches.length > 0) {
                // Determine which batch we are dealing with (specific or first one)
                const chosenBatch = targetBatchToUse || (batches[0].bchNo || batches[0].batchNo) || "N/A";
                
                // OUT-OF-STOCK CHECK (using Ref for latest state)
                const existingInCart = medicinesRef.current.find(m => (m.itemCd || m.id) === med.id && m.batch === chosenBatch);
                const firstBatchStock = parseFloat(batches.find(b => (b.bchNo || b.batchNo) === chosenBatch)?.qty || batches[0]?.qty || batches[0]?.currQty || 0);
                
                // If the specific batch we would add is already full, stop here.
                if (isSilent && existingInCart && parseFloat(existingInCart.quantity) >= firstBatchStock) {
                    console.log("Blocking Scan: Out of Stock", { quantity: existingInCart.quantity, stock: firstBatchStock });
                    return { added: false, reason: 'OUT_OF_STOCK' };
                }

                // SILENT BACKGROUND ADD (FOR QR SCANS)
                if (isSilent && targetBatchToUse) {
                    const foundBatch = batches.find(b => (b.bchNo || b.batchNo) === targetBatchToUse);
                    if (foundBatch) {
                        const newItem = {
                            id: Date.now() + Math.random(),
                            itemCd: med.id,
                            name: med.name,
                            batch: targetBatchToUse,
                            expiry: foundBatch.expiryDate || "N/A",
                            price: parseFloat(foundBatch.trnRate || foundBatch.trnSellPrice || med.price || 0),
                            currQty: parseFloat(foundBatch.qty || foundBatch.currQty || 0),
                            quantity: 1,
                            shelf: med.shelf || "N/A",
                            rack: foundBatch.rack_No || med.rack || "N/A",
                            stockingUnit: parseFloat(foundBatch.qty || foundBatch.currQty || 0)
                        };

                        setMedicines(prev => {
                            const existingIdx = prev.findIndex(m => m.itemCd === newItem.itemCd && m.batch === newItem.batch);
                            let next;
                            if (existingIdx !== -1) {
                                const updated = [...prev];
                                updated[existingIdx] = { 
                                    ...updated[existingIdx], 
                                    quantity: Math.min(updated[existingIdx].quantity + 1, newItem.currQty) 
                                };
                                next = updated;
                            } else {
                                next = [newItem, ...prev];
                            }
                            medicinesRef.current = next; // Instant sync
                            return next;
                        });

                        return { added: true }; // Added successfully in background
                    }
                }

                if (isSilent && batches.length > 0) {
                    // QR SCANNED (DEFAULT BATCH)
                    const b = batches[0];
                    const newItem = {
                        id: Date.now() + Math.random(),
                        itemCd: med.id,
                        name: med.name,
                        batch: b.bchNo || b.batchNo || "N/A",
                        expiry: b.expiryDate || "N/A",
                        price: parseFloat(b.trnRate || b.trnSellPrice || med.price || 0),
                        currQty: parseFloat(b.qty || b.currQty || 0),
                        quantity: 1,
                        shelf: med.shelf || "N/A",
                        rack: b.rack_No || med.rack || "N/A",
                        stockingUnit: parseFloat(b.qty || b.currQty || 0)
                    };

                    setMedicines(prev => {
                        const existingIdx = prev.findIndex(m => m.itemCd === newItem.itemCd && m.batch === newItem.batch);
                        let next;
                        if (existingIdx !== -1) {
                            const updated = [...prev];
                            updated[existingIdx] = { 
                                ...updated[existingIdx], 
                                quantity: Math.min(updated[existingIdx].quantity + 1, newItem.currQty) 
                            };
                            next = updated;
                        } else {
                            next = [newItem, ...prev];
                        }
                        medicinesRef.current = next; // Instant sync
                        return next;
                    });
                    
                    return { added: true };
                }

                // If not silent or batch not found, open the batch modal as usual
                setAvailableBatches(batches);
                setSelectedMedForBatch(med);
                
                const initialSelections = {};
                batches.forEach(b => {
                    const bchKey = b.bchNo || b.batchNo || "no-batch";
                    initialSelections[bchKey] = (targetBatch && bchKey === targetBatch) ? 1 : 0;
                });
                setBatchSelections(initialSelections);
                
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }
                setShowBatchModal(true);
                return { added: false, reason: 'MODAL_OPENED' };
            } else {
                return { added: false, reason: 'OUT_OF_STOCK' };
            }
        } catch (err) {
            console.error("Failed to load batches:", err);
            showToast("Failed to fetch medicine batches.");
            return { added: false, reason: 'ERROR' };
        } finally {
            setIsFetchingBatch(false);
            // No longer forcing focus to prevent keyboard popup on mobile after scan
        }
    };

    const handleScannerClick = async () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        
        setScannerError('');
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setShowNoCameraModal(true);
            return;
        }

        try {
            // Explicitly request permission
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            stream.getTracks().forEach(track => track.stop());
            
            setIsScannerOpen(true);
        } catch (err) {
            console.error("Camera Permission Request or Start Failed:", err);
            setShowNoCameraModal(true);
        }
    };

    const handleBarcodeScan = async (barCd) => {
        if (isProcessingScan) return;
        
        if (!barCd) {
            setShowScanStatus({ show: true, msg: "Scan QR correctly. No data Found.", isError: true });
            setTimeout(() => setShowScanStatus({ show: false, msg: '', isError: false }), 3000);
            return;
        }

        // PRE-API CHECK: If the barcode itself matches an item already in the cart and at its limit
        const existingFull = medicines.find(m => m.itemCd === barCd && m.quantity >= m.currQty);
        if (existingFull) {
            setShowScanStatus({ show: true, msg: `${barCd} is Out of Stock for this Store`, isError: true });
            setTimeout(() => setShowScanStatus({ show: false, msg: '', isError: false }), 3000);
            return;
        }
        
        setIsProcessingScan(true);
        try {
            const response = await authService.getItemByBarcode(barCd, storeCd);
            const data = response.data || (Array.isArray(response) ? response : []);
            
            if (Array.isArray(data) && data.length > 0) {
                const apiResult = data[0]; 
                const main = apiResult.mainData || {};
                const extra = (apiResult.extraData && apiResult.extraData[0]) || {};

                const itemCd = main.itemCd || extra.itemCd;
                if (!itemCd) {
                    showToast("No valid item details found for this barcode.");
                    return;
                }

                const mapped = {
                    id: itemCd,
                    name: extra.itemDescription || main.itemDescription || "Unnamed Item",
                    dose: extra.stockUnitCd || main.stockUnitCd || itemCd,
                    currQty: parseFloat(main.currQty || extra.currQty || 0),
                    shelf: main.shelf_No || extra.shelf_No || "N/A",
                    rack: main.rack_No || extra.rack_No || "N/A",
                    price: parseFloat(main.trnRate || extra.trnRate || main.trnMRP || 0),
                    expiry: main.expiryDate || extra.expiryDate || "N/A",
                    batch: main.bchNo || "N/A",
                    stockingUnit: parseFloat(main.currQty || extra.currQty || 0)
                };

                // Trigger the addition flow (silent scan if batch found)
                const result = await handleAddMedicine(mapped, main.bchNo || null, true);
                if (result.added) {
                    setShowScanStatus({ show: true, msg: `${mapped.name} Added.`, isError: false });
                    setTimeout(() => setShowScanStatus({ show: false, msg: '', isError: false }), 3000);
                } else if (result.reason === 'OUT_OF_STOCK') {
                    setShowScanStatus({ show: true, msg: `${mapped.id} is Out of Stock for this Store`, isError: true });
                    setTimeout(() => setShowScanStatus({ show: false, msg: '', isError: false }), 3000);
                }
                
                console.log("Captured Successful Barcode:", barCd);
            } else {
                const apiMsg = response.message || (response.data && response.data.message) || "No medicine found. Click QR properly.";
                setShowScanStatus({ show: true, msg: apiMsg, isError: true });
                setTimeout(() => setShowScanStatus({ show: false, msg: '', isError: false }), 3000);
            }
        } catch (err) {
            console.error("Barcode lookup failed:", err);
            setShowScanStatus({ show: true, msg: "Failed to lookup barcode. Try again.", isError: true });
            setTimeout(() => setShowScanStatus({ show: false, msg: '', isError: false }), 3000);
        } finally {
            setIsProcessingScan(false);
        }
    };

    const updateQuantity = (id, change) => {
        setMedicines(prev => {
            const next = prev.map(med => {
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
            });
            medicinesRef.current = next; // Sync Ref instantly so scanner sees it
            return next;
        });
    };

    const removeMedicine = (id) => {
        setMedicines(prev => {
            const next = prev.filter(med => med.id !== id);
            medicinesRef.current = next;
            return next;
        });
    };

    const updateBatchSelection = (batchKey, change, maxQty) => {
        setBatchSelections(prev => {
            const current = prev[batchKey] || 0;
            const newVal = current + change;
            if (newVal < 0) return prev;
            if (newVal > maxQty) {
                showToast(`Oops! 😬 Only ${maxQty} available in this batch.`);
                return prev;
            }
            return { ...prev, [batchKey]: newVal };
        });
    };

    const commitBatchesToCart = () => {
        if (!selectedMedForBatch) return;

        const newItems = [];
        availableBatches.forEach(batch => {
            const bchKey = batch.bchNo || batch.batchNo || "no-batch";
            const qty = batchSelections[bchKey] || 0;

            if (qty > 0) {
                newItems.push({
                    id: Date.now() + Math.random(), // Unique ID for cart row
                    itemCd: selectedMedForBatch.id,
                    name: selectedMedForBatch.name,
                    dose: selectedMedForBatch.dose,
                    currQty: parseFloat(batch.qty !== undefined ? batch.qty : (batch.currQty || 0)),
                    expiry: batch.expiryDate || batch.expDt || "N/A",
                    batch: bchKey,
                    price: parseFloat(batch.trnRate || batch.trnSellPrice || batch.trnMRP || 0),
                    stockingUnit: parseFloat(batch.qty !== undefined ? batch.qty : 1),
                    quantity: qty
                });
            }
        });

        if (newItems.length > 0) {
            setMedicines(prev => {
                const next = [...newItems, ...prev];
                medicinesRef.current = next; // Instant sync so scanner sees these manual additions
                return next;
            });
            setShowBatchModal(false);
            showToast(`${newItems.length} batch(es) added to cart!`);
        } else {
            showToast("Please select quantity for at least one batch.");
        }
    };

    const calculateTotal = () => {
        return medicines.reduce((total, med) => total + (med.price * med.quantity), 0);
    };

    const handleSave = () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
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
                        <span className="am-ptn-no">PTN: <span className="am-ptn-val">{patient.ptnNo}</span></span>
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
                        ref={medSearchInputRef}
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
                                    </div>
                                    <div className="res-meta">
                                        <div className="res-dose" style={{fontSize:'11px', color:'#888'}}>{med.dose}</div>
                                        <div className="res-stock" style={{fontSize:'11px', color:'#ef4444', fontWeight: 600}}>Qty: {med.currQty}</div>
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
                            <img src={`${import.meta.env.BASE_URL}Medicine.gif`} alt="Medicine Animation" className="empty-gif" />
                            <div className="empty-state-text">No medicines added yet.</div>
                        </div>
                    ) : (
                        medicines.map((med) => (
                            <div key={med.id} className="medicine-card blue-theme">
                                <div className="med-card-left">
                                    <div className="med-name">{med.name}</div>
                                    <div className="med-tags">
                                        {med.itemCd && <span className="med-tag" style={{background:'#e6f2ff', color:'#005bb7'}}>{med.itemCd}</span>}
                                    </div>
                                    <div className="med-meta" style={{marginBottom: '5px'}}>
                                        Exp: {med.expiry} &nbsp;|&nbsp; Batch: {med.batch}
                                    </div>
                                    <div className="med-rate" style={{fontSize: '11px', color: '#059669', fontWeight: 700}}>
                                        Rate: ₹{med.price.toFixed(2)}
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
                        <button className="close-scanner" onClick={() => { setIsScannerOpen(false); lastDetectedRef.current = null; }}>×</button>
                        <div className="scanner-view">
                            <h3 className="scanner-instructions">Click To Scan Medicine</h3>

                            <div className="scanner-box-container" style={{ position: 'relative', overflow: 'hidden', minHeight: '320px', display: 'flex', flexDirection: 'column', background: '#000', borderRadius: '16px', boxShadow: '0 0 0 1px rgba(255,255,255,0.1)' }}>
                                {scannerError ? (
                                    <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>{scannerError}</div>
                                ) : (
                                    <div id="reader" style={{ width: '100%', flex: 1 }}></div>
                                )}
                                <div className="scanner-crosshair" style={{
                                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                    width: '180px', height: '180px', border: '2px solid rgba(255,255,255,0.3)',
                                    borderRadius: '24px', pointerEvents: 'none', zIndex: 5
                                }}>
                                    <div style={{ position: 'absolute', top: -2, left: -2, width: 20, height: 20, borderTop: '4px solid #fff', borderLeft: '4px solid #fff', borderTopLeftRadius: 10 }}></div>
                                    <div style={{ position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderTop: '4px solid #fff', borderRight: '4px solid #fff', borderTopRightRadius: 10 }}></div>
                                    <div style={{ position: 'absolute', bottom: -2, left: -2, width: 20, height: 20, borderBottom: '4px solid #fff', borderLeft: '4px solid #fff', borderBottomLeftRadius: 10 }}></div>
                                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderBottom: '4px solid #fff', borderRight: '4px solid #fff', borderBottomRightRadius: 10 }}></div>
                                </div>
                            </div>

                            <div className="scanner-actions" style={{ padding: '24px 0 10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <button
                                    className="capture-btn"
                                    disabled={isProcessingScan}
                                    onClick={() => handleBarcodeScan(lastDetectedRef.current)}
                                    style={{
                                        width: '80px', height: '80px', borderRadius: '50%',
                                        background: '#fff', border: '8px solid #cbd5e1',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 0 20px rgba(0,0,0,0.2)', transition: 'all 0.2s',
                                        padding: 0
                                    }}
                                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <div style={{ 
                                        width: '56px', height: '56px', borderRadius: '50%', 
                                        background: isProcessingScan ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {isProcessingScan ? (
                                            <div className="search-circle-loader white" style={{ width: 20, height: 20 }}></div>
                                        ) : (
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                                <circle cx="12" cy="13" r="4"></circle>
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            </div>
                        </div>

                        {showScanStatus.show && (
                            <div className="scanner-status-hint animate-fade-in" style={{
                                position: 'absolute', bottom: '130px', left: '50%', transform: 'translateX(-50%)',
                                background: 'transparent', padding: '0', borderRadius: '0', 
                                color: '#006ce6', fontSize: '15px', fontWeight: '800', 
                                zIndex: 1001, boxShadow: 'none', textAlign: 'center',
                                display: 'block', minWidth: '300px', whiteSpace: 'nowrap'
                            }}>
                                {showScanStatus.msg}
                            </div>
                        )}
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
                            <span className="confirm-patient-ptn">PTN {patient.ptnNo}</span>
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
                                            <div className="confirm-med-dose">{med.dose} &nbsp;|&nbsp; Unit: {med.stockingUnit * med.quantity} &nbsp;|&nbsp; Rate: ₹{med.price.toFixed(2)}</div>
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
                                        userId: sessionStorage.getItem("username") || "sssl",
                                        bedNo: patient.bedNo || "1234566",
                                        ptnNo: parseInt(patient.ptnNo, 10),
                                        items: medicines.map(med => ({
                                            itemCd: med.itemCd,
                                            bchNo: med.batch,
                                            qty: med.quantity,
                                            trnDate: new Date().toISOString()
                                        }))
                                    };
                                    
                                    const response = await authService.addIssueHoldVch(payload);
                                    
                                    // Capture the Voucher Number from API response data
                                    const vch = response.data || (response.data && response.data.data) || "0000";
                                    setVoucherNo(vch);

                                    // Clear the saved cart for this patient on confirm
                                    if (cartKey) sessionStorage.removeItem(cartKey);
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
                        {/* No Icon as requested */}
                        <h3 className="success-msg-text" style={{fontSize: '15px', color: '#1e3a8a', padding: '10px 0'}}>
                            Hold Voucher No ({voucherNo}) created successfully.
                        </h3>
                        <button className="success-ok-btn" onClick={() => {
                            setShowSuccessModal(false);
                            onBack();
                        }}>OK</button>
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
                                width: '100%', padding: '14px', borderRadius: 12,
                                border: 'none', background: '#006ce6',
                                color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer'
                            }}
                        >
                            GOT IT
                        </button>
                    </div>
                </div>
            )}

            {/* Batch Selection Modal */}
            {showBatchModal && (
                <div className="batch-modal-overlay">
                    <div className="batch-modal animated-modal" onClick={e => e.stopPropagation()}>
                        {/* Unified Gradient Header */}
                        <div className="batch-header-unified">
                            <div className="batch-header-main-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span className="batch-med-name-white" style={{ fontSize: '18px', fontWeight: '800' }}>
                                    {selectedMedForBatch ? selectedMedForBatch.name : "Select Batch"}
                                </span>
                                <button className="batch-close-new" onClick={() => setShowBatchModal(false)}>✕</button>
                            </div>

                            {selectedMedForBatch && (
                                <div className="batch-med-details-white">
                                    <div className="med-info-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div className="med-dose-white">
                                            {selectedMedForBatch.dose}
                                        </div>
                                        <div className="total-units-badge-white">
                                            TOTAL UNITS: {Object.values(batchSelections).reduce((sum, q) => sum + q, 0)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="batch-list-container">
                            {availableBatches.map((batch, index) => {
                                const bchKey = batch.bchNo || batch.batchNo || "no-batch";
                                const qty = batchSelections[bchKey] || 0;
                                const maxQty = parseFloat(batch.qty !== undefined ? batch.qty : (batch.currQty || 0));
                                
                                return (
                                    <div key={index} className={`batch-item-card ${qty > 0 ? "has-qty" : ""}`}>
                                        <div className="batch-info-left">
                                            <div className="batch-data-row">
                                                <span className="batch-kw">Batch:</span>
                                                <span className="batch-val">{bchKey}</span>
                                            </div>
                                            <div className="batch-data-row">
                                                <span className="batch-kw">Expiry:</span>
                                                <span className="batch-val">{batch.expiryDate || batch.expDt || "N/A"}</span>
                                            </div>
                                            <div className="batch-data-row">
                                                <span className="batch-kw">MRP:</span>
                                                <span className="batch-val">{parseFloat(batch.trnRate || batch.trnSellPrice || 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div className="batch-info-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <div className="batch-actions-row">
                                                <div className="qty-control">
                                                    <button className="qty-btn" onClick={() => updateBatchSelection(bchKey, -1, maxQty)}>−</button>
                                                    <span className="qty-value">{qty}</span>
                                                    <button className="qty-btn" onClick={() => updateBatchSelection(bchKey, 1, maxQty)}>+</button>
                                                </div>
                                                {qty > 0 && (
                                                    <button className="delete-button" onClick={() => setBatchSelections({...batchSelections, [bchKey]: 0})}>🗑️</button>
                                                )}
                                            </div>
                                            <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: '800', marginRight: '4px' }}>
                                                Stock: {maxQty}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="batch-add-footer" style={{ padding: '8px 16px', justifyContent: 'center' }}>
                            <button 
                                className="batch-confirm-btn" 
                                style={{ height: '34px', padding: '0 40px', maxWidth: '140px', fontSize: '13px' }}
                                onClick={commitBatchesToCart} 
                                disabled={Object.values(batchSelections).reduce((sum, q) => sum + q, 0) === 0}
                            >
                                ADD
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AddMed;
