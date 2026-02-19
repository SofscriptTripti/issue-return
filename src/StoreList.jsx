import React, { useState } from 'react';
import './StoreList.css';

function StoreList({ onBack, onSelectCostCenter }) {
    const [selectedStore, setSelectedStore] = useState(null);

    const stores = [
        { id: 1, name: 'Main Store' },
        { id: 2, name: 'A Wing' },
        { id: 3, name: 'B Wing' },
        { id: 4, name: 'C Wing' },
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
            <div className="app-header">
                <h2 className="header-title">Select your store</h2>
            </div>

            <div className="store-card-container">
                {stores.map((store) => (
                    <button
                        key={store.id}
                        className="store-button"
                        onClick={() => handleStoreClick(store)}
                    >
                        {store.name}
                        <span className="store-icon">→</span>
                    </button>
                ))}
            </div>

            {selectedStore && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-icon" onClick={handleCloseModal}>×</button>
                        <h3 className="modal-title">Cost Center</h3>
                        <div className="modal-options">
                            {costCenters.map((option, index) => (
                                <button
                                    key={index}
                                    className="modal-option-button"
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
