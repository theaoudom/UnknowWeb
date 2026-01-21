
export const ADJECTIVES = [
    'Silent', 'Hidden', 'Misty', 'Shadow', 'Unknown', 'Secret', 'Quiet', 'Dark', 'Pale', 'Wild',
    'Cosmic', 'Mystic', 'Lone', 'Rapid', 'Swift', 'Bright', 'Neon', 'Velvet', 'Cyber', 'Arctic',
    'Ancient', 'Future', 'Lost', 'Found', 'Brave', 'Calm', 'Eager', 'Fierce', 'Gentle', 'Happy'
];

export const ANIMALS = [
    'Badger', 'Fox', 'Wolf', 'Owl', 'Raven', 'Tiger', 'Lion', 'Bear', 'Eagle', 'Hawk',
    'Falcon', 'Panda', 'Koala', 'Leopard', 'Lynx', 'Cobra', 'Viper', 'Shark', 'Whale', 'Dolphin',
    'Phoenix', 'Dragon', 'Griffin', 'Ghost', 'Spirit', 'Phantom', 'Specter', 'Wraith', 'Nomad', 'Walker'
];

export const COLORS = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
    'bg-pink-500', 'bg-rose-500'
];

export function generateAnonymousName(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    return `${adj} ${animal}`;
}

export function generateAvatarColor(): string {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}
