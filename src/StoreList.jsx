import React, { useState } from 'react';
import './StoreList.css';

function StoreList({ onBack, onSelectCostCenter }) {
    const [selectedStore, setSelectedStore] = useState(null);

    const stores = [
        { id: 1, name: 'Main Pharmacy' },
        { id: 2, name: 'IPD Pharmacy' },
        { id: 3, name: 'OPD Pharmacy' },
        { id: 4, name: 'Emergency Store' },
        { id: 5, name: 'ICU Sub-Store' },
        { id: 6, name: 'OT Pharmacy' },
        { id: 7, name: 'General Ward Supply' },
        { id: 8, name: 'Private Wing Store' },
        { id: 9, name: 'Mother & Child Wing' },
        { id: 10, name: 'Surgical Store' },
    ];

    const costCenters = [
        "Out patient Cash",
        "Out patient Credit",
        "In patient Cash",
        "OP Package patient"
    ];

    const handleStoreClick = (store) => {
        setSelectedStore(store);
    };

    const handleCloseModal = () => {
        setSelectedStore(null);
    };

    const handleCostCenterSelect = (option) => {
        // Close modal first (optional depending on UX)
        setSelectedStore(null);
        if (onSelectCostCenter) {
            onSelectCostCenter(option); // Pass selection if needed, or just navigate
        }
    };

    return (
        <div className="store-list-container">
            {/* Header */}
            <div className="store-header">
                <h2 className="header-title">Select Store</h2>
                <p className="header-subtitle">Choose a store to proceed with inventory management</p>
            </div>

            <div className="store-grid">
                {stores.map((store) => (
                    <button
                        key={store.id}
                        className="store-card"
                        onClick={() => handleStoreClick(store)}
                    >
                        <div className="store-info">
                            <span className="store-name">{store.name}</span>
                            <span className="store-arrow">&rarr;</span>
                        </div>
                    </button>
                ))}
            </div>

            {selectedStore && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Select Cost Center</h3>
                            <button className="modal-close" onClick={handleCloseModal}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {costCenters.map((option, index) => (
                                <button
                                    key={index}
                                    className="cost-center-option"
                                    onClick={() => handleCostCenterSelect(option)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StoreList;
