import React from 'react';

const BackgroundEngine = ({ theme }) => {
    if (theme === 'grid') return <div className="bg-grid-perspective"><div className="scanlines"></div></div>;
    if (theme === 'orbs') return <div className="bg-orbs-container"><div className="orb orb-1 animate-orb-float"></div><div className="orb orb-2 animate-orb-float" style={{animationDelay:'-5s'}}></div><div className="orb orb-3 animate-pulse-fast"></div></div>;
    if (theme === 'abstract') return <div className="bg-abstract-container"><div className="floating-glyph animate-float" style={{top:'20%',left:'10%'}}>&#x214B;</div><div className="floating-glyph animate-float" style={{top:'60%',right:'15%',animationDelay:'1s'}}>&#x2207;</div><div className="floating-glyph animate-float" style={{top:'80%',left:'40%',animationDelay:'2s'}}>&#x2A02;</div></div>;
    if (theme === 'chaos') return <div className="bg-chaos-wrap"><div className="chaos-emoji" style={{animationDelay:'0s'}}>👁️</div><div className="chaos-emoji" style={{animationDelay:'-2.5s'}}>🌀</div></div>;
    if (theme === 'quantum') return <div className="bg-quantum-wrap">{[...Array(20)].map((_,i)=><div key={i} className="quantum-star" style={{'--rot':`${i*18}deg`, animationDelay:`${Math.random()}s`}}></div>)}</div>;

    return (
        <div className="stars-container">
            <div className="stars"></div>
            <div className="stars2"></div>
            <div className="shooting-star"></div>
            <div className="shooting-star" style={{top:'20%',left:'40%',animationDelay:'2.5s',width:'150px'}}></div>
        </div>
    );
};

export default BackgroundEngine;
