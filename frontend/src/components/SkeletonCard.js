import React from 'react';

function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <div className="skeleton skeleton-img" />
            <div className="skeleton-body">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-price" />
                <div className="skeleton skeleton-meta" />
                <div className="skeleton skeleton-meta-sm" />
            </div>
        </div>
    );
}

export default SkeletonCard;
