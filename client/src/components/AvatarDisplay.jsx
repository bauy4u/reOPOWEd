import React from 'react';

const AvatarDisplay = ({ avatar, name, className, frame }) => {
    const frameClass = frame==='frame_neon' ? 'frame-neon' : frame==='frame_inferno' ? 'frame-inferno' : frame==='frame_gold' ? 'frame-gold' : 'frame-default';
    if (avatar === 'bot_avatar') return <div className={`flex items-center justify-center text-[2em] bg-black ${className} ${frameClass}`}>🤖</div>;
    if (!avatar) return <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${name}`} className={`${className} ${frameClass}`} alt="avatar"/>;
    if (avatar.startsWith('data:image')) return <img src={avatar} className={`${className} object-cover ${frameClass}`} alt="avatar"/>;
    if (avatar.length <= 3) return <div className={`flex items-center justify-center text-[1.5em] bg-black ${className} ${frameClass}`}>{avatar}</div>;
    return <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatar}`} className={`${className} ${frameClass}`} alt="avatar"/>;
};

export default AvatarDisplay;
