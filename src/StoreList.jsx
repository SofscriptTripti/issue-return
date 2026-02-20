import React, { useState } from 'react';
import './StoreList.css';



// Simple Icon Component (Simulating a library)
const StoreIcon = ({ type }) => {
    // Map types to SVG paths or shapes
    const icons = {
        'main': <path d="M3 3h18v2H3V3m0 4h18v2H3V7m0 4h18v2H3v-2m0 4h18v2H3v-2" />, // Shelves
        'ipd': <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3m5 11H7v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1" />, // ID Card/Person
        'opd': <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-1 15h-2v-2h2v2m0-4h-2V7h2v6" />, // Info/Check
        'emergency': <path d="M12 2L2 22h20L12 2m0 4l6 12H6l6-12" />, // Triangle/Alert
        'icu': <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-8 12H9v-2h2v2m0-4H9V7h2v4m4 4h-2v-2h2v2m0-4h-2V7h2v4" />, // Monitor
        'ot': <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4" />, // Kit/Tray
        'ward': <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3m12-6h-8v7H3V7H1v10h22V7h-2" />, // Bed
        'private': <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4m0 6c1.4 0 2.8 1.1 2.8 2.5V11c.6 0 1.2.6 1.2 1.2v3.5c0 .7-.6 1.3-1.2 1.3H9.2c-.6 0-1.2-.6-1.2-1.2v-3.5c0-.6.6-1.2 1.2-1.2V9.5C9.2 8.1 10.6 7 12 7m0 1c-.8 0-1.5.7-1.5 1.5V11h3V9.5c0-.8-.7-1.5-1.5-1.5" />, // Shield/Lock
        'child': <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3m0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22" />, // Face
        'surgical': <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2m-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3m3 10H9v-2h6v2" />, // Kit
    };

    return (
        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            {icons[type] || icons['main']}
        </svg>
    );
};

function StoreList({ onBack, onSelectCostCenter, stores }) {
    const [selectedStore, setSelectedStore] = useState(null);

    const costCenters = [
        "Out patient Cash",
        // "Out patient Credit",
        // "In patient Cash",
        // "OP Package patient"
    ];

    const handleStoreClick = (store) => {
        setSelectedStore(store);
    };

    const handleCloseModal = () => {
        setSelectedStore(null);
    };

    const handleCostCenterSelect = (option) => {
        const storeName = selectedStore?.name || "";
        setSelectedStore(null);
        if (onSelectCostCenter) {
            onSelectCostCenter(storeName, option);
        }
    };

    return (
        <div className="store-list-container">
            <button className="logout-button" onClick={onBack} title="Logout">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Logout</span>
            </button>

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
                        style={{ '--accent-color': store.color }}
                    >
                        <div className="icon-wrapper" style={{ backgroundColor: `${store.color}15`, color: store.color }}>
                            <StoreIcon type={store.type} />
                        </div>
                        <div className="store-info">
                            <span className="store-name">{store.name}</span>
                            <span className="store-type-label">Inventory</span>
                        </div>
                        <div className="store-arrow">
                            &rarr;
                        </div>
                    </button>
                ))}
            </div>

            {selectedStore && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-body" style={{ padding: '30px' }}>
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
