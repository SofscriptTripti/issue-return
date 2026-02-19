import React, { useState } from 'react';
import './PatientList.css';

function PatientList({ onBack, onSelectPatient }) {
    const [searchTerm, setSearchTerm] = useState('');

    const patients = [
        {
            id: 1,
            name: 'Rathi Kumari',
            ptnNo: '24568',
            age: 16,
            gender: 'Female',
            phone: '+91 99999 99999',
            doctor: 'Dr. Anita Desai',
            lastVisit: '02/05/2025',
            status: 'OPD'
        },
        {
            id: 2,
            name: 'Kunal Shah',
            ptnNo: '56486',
            age: 25,
            gender: 'Male',
            phone: '+91 99999 99999',
            doctor: 'Dr. Paresh',
            lastVisit: '15/04/2025',
            status: 'OPD'
        }
    ];

    return (
        <div className="patient-list-container">
            {/* Header */}
            {/* Header */}
            <div className="app-header">
                <button className="back-button" onClick={onBack}>←</button>
                <h2 className="header-title">Patient</h2>
            </div>

            {/* Search Bar */}
            <div className="search-container">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Name, Mobile, ID...."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="filter-button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                </button>
            </div>

            {/* Recent Views */}
            <div className="recent-views-label">
                <span className="history-icon">🕒</span> Recent views
            </div>

            {/* Patient Cards */}
            <div className="patient-cards-list">
                {patients.map((patient) => (
                    <div
                        key={patient.id}
                        className="patient-card"
                        onClick={() => onSelectPatient && onSelectPatient(patient)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="card-header">
                            <h3 className="patient-name">{patient.name}</h3>
                            <span className="status-badge">{patient.status}</span>
                        </div>
                        <div className="patient-id">PTN NO - {patient.ptnNo}</div>

                        <div className="patient-details-row">
                            <span className="detail-item">
                                👤 {patient.age} Years • {patient.gender}
                            </span>
                            <span className="detail-item">
                                📞 {patient.phone}
                            </span>
                        </div>

                        <div className="card-footer">
                            <span className="doctor-name">👨‍⚕️ {patient.doctor}</span>
                            <span className="last-visit">📅 Last: {patient.lastVisit}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PatientList;
