import React from 'react';

const slides = [
  '/English/assets/dashboard-hero.svg',
  '/English/assets/dashboard-voca.svg',
  '/English/assets/dashboard-note.svg',
  '/English/assets/dashboard-focus.svg',
];

const HeroSlideshow: React.FC = () => {
  return (
    <div className="relative min-h-[270px] overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-2xl shadow-slate-300 sm:p-6 lg:p-8">
      {slides.map((src, index) => (
        <img
          key={src}
          src={src}
          alt="LingoSnap dashboard banner"
          className="absolute inset-0 h-full w-full object-cover opacity-0 animate-heroSlide"
          style={{ animationDelay: `${index * 4}s` }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/20" />
      <div className="absolute bottom-4 right-5 flex gap-2">
        {slides.map((src, index) => <span key={src} className="h-1.5 w-8 rounded-full bg-white/30 animate-heroDot" style={{ animationDelay: `${index * 4}s` }} />)}
      </div>
      <div className="relative max-w-2xl">
        <p className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-200">{'H\u1ecdc t\u1eeb v\u1ef1ng b\u1eb1ng \u1ea3nh'}</p>
        <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">{'Qu\u00e9t b\u00e0i t\u1eadp, l\u01b0u t\u1eeb v\u1ef1ng, \u00f4n l\u1ea1i m\u1ecdi l\u00fac.'}</h2>
        <p className="mt-5 text-base font-semibold leading-7 text-slate-300">{'Voca, Note, Pomodoro v\u00e0 Streak \u0111ang \u0111\u01b0\u1ee3c gom l\u1ea1i th\u00e0nh m\u1ed9t workspace h\u1ecdc t\u1eadp c\u00e1 nh\u00e2n.'}</p>
      </div>
    </div>
  );
};

export default HeroSlideshow;
