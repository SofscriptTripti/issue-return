import React, { useState } from 'react';
import './StoreSelection.css';
import { authService } from './api/authService';

const CROSS_ICON = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

function StoreSelection({ stores, onSelectCostCenter }) {
    const [selectedStore, setSelectedStore] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [costCenters, setCostCenters] = useState([]);
    const [isLoadingCC, setIsLoadingCC] = useState(false);
    const [ccError, setCcError] = useState('');

    const filteredStores = stores.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleStoreClick = async (store) => {
        setSelectedStore(store);
        setIsLoadingCC(true);
        setCostCenters([]); // Reset list
        
        try {
            const response = await authService.getCostCenters(store.id);
            console.log("Cost Centers API Response:", response);
            
            const ccData = response.data || (Array.isArray(response) ? response : []);
            
            if (Array.isArray(ccData)) {
                // Map API fields (ccCd/ccDescriprion)
                const mappedCC = ccData.map(cc => ({
                    id: cc.ccCd,
                    name: cc.ccDescriprion || "Unnamed Cost Center",
                    ptnTypFlg: cc.ptnTypFlg || "O" // Default to Out if missing
                }));
                
                // Always set cost centers and let user see/confirm them, even if there's only one
                setCostCenters(mappedCC);
            }
        } catch (err) {
            console.error("Failed to fetch cost centers:", err);
        } finally {
            setIsLoadingCC(false);
        }
    };

    const handleCostCenterClick = (cc) => {
        console.log("Selected Cost Center Object:", cc);
        if (onSelectCostCenter) {
            onSelectCostCenter(selectedStore.name, cc.name, cc.ptnTypFlg, selectedStore.id, cc.id);
        }
    };

    return (
        <div className="selection-page-wrapper">
            <div className="selection-card-container">
                <div className="selection-card-header">
                    <div className="header-content-flex">
                        <div className="title-group">
                            <h2 className="header-title">
                                {selectedStore ? "Select Cost Center" : "Store Selection"}
                            </h2>
                            {selectedStore && (
                                <div className="selected-breadcrumb">
                                    Store: <span>{selectedStore.name}</span>
                                </div>
                            )}
                        </div>
                        {selectedStore && (
                            <button className="header-close-btn" onClick={() => setSelectedStore(null)}>
                                {CROSS_ICON}
                            </button>
                        )}
                    </div>
                </div>

                {!selectedStore ? (
                    <div className="selection-card-body">
                        <div className="search-field">
                            <input
                                type="text"
                                placeholder="Search stores..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="modal-style-input"
                            />
                        </div>

                        <div className="selection-list-viewport">
                            {filteredStores.length > 0 ? (
                                filteredStores.map((store) => (
                                    <div 
                                        key={store.id} 
                                        className="modal-style-item"
                                        onClick={() => handleStoreClick(store)}
                                    >
                                        <div className="item-name-group">
                                            <span className="dot-indicator" style={{ backgroundColor: store.color }}></span>
                                            <span className="item-name">{store.name}</span>
                                        </div>
                                        <span className="item-arrow">→</span>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">No matching stores found.</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="selection-card-body" style={{ padding: '20px 0 30px 0' }}>
                        <div className="selection-list-viewport">
                                {isLoadingCC ? (
                                    <div className="empty-state">Loading cost centers...</div>
                                ) : ccError ? (
                                    <div className="empty-state" style={{ color: '#ef4444', fontWeight: 600 }}>
                                        ⚠️ {ccError}
                                    </div>
                                ) : costCenters.length > 0 ? (
                                    costCenters.map((cc) => (
                                        <button
                                            key={cc.id}
                                            className="modal-style-action-btn"
                                            onClick={() => handleCostCenterClick(cc)}
                                        >
                                            {cc.name}
                                        </button>
                                    ))
                                ) : (
                                    <div className="empty-state">No cost centers found for this store.</div>
                                )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StoreSelection;
