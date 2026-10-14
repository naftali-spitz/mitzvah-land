import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { Lang, Player } from '../types/game';
import { CurrencyIcon } from './CurrencyIcon';

const tokens = ['🍞', '🍷', '🍎', '🫒', '🚌', '🎒', '🥾', '🏠', '✡', '📚'];
const colors = ['#c64c48', '#3575b6', '#4f9a66', '#d39d34', '#8c5bb5', '#df6b9b'];
type SeatType = 'human' | 'computer';
type Difficulty = NonNullable<Player['aiDifficulty']>;

export function SetupScreen() {
  const { lang, setupLang, newGame } = useGameStore();
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(['נפתלי', 'מיכל', 'דוד', 'שרה', '', '']);
  const [chosen, setChosen] = useState(tokens.slice(0, 6));
  const [seatTypes, setSeatTypes] = useState<SeatType[]>(Array(6).fill('human'));
  const [difficulties, setDifficulties] = useState<Difficulty[]>(Array(6).fill('medium'));
  const [freeParking, setFreeParking] = useState(false);
  const [fast, setFast] = useState(false);
  const label = (he: string, en: string) => lang === 'he' ? he : lang === 'en' ? en : he + ' · ' + en;
  const setName = (i: number, value: string) => setNames(values => values.map((v, n) => n === i ? value : v));
  const setSeatType = (i: number, type: SeatType) => {
    setSeatTypes(values => values.map((v, n) => n === i ? type : v));
    setNames(values => values.map((value, n) => n === i
      ? (type === 'computer' ? (lang === 'en' ? 'Computer ' : 'מחשב ') : (lang === 'en' ? 'Player ' : 'שחקן ')) + (i + 1)
      : value));
  };
  const cycleToken = (i: number) => setChosen(values => values.map((v, n) => n === i ? tokens[(tokens.indexOf(v) + 1) % tokens.length] : v));
  const players = useMemo(() => Array.from({ length: count }, (_, i) => ({
    name: names[i].trim() || (seatTypes[i] === 'computer' ? 'Computer ' : 'Player ') + (i + 1),
    token: chosen[i],
    color: colors[i],
    isComputer: seatTypes[i] === 'computer',
    aiDifficulty: seatTypes[i] === 'computer' ? difficulties[i] : undefined,
  })), [count, names, chosen, seatTypes, difficulties]);
  const computerCount = players.filter(p => p.isComputer).length;

  return <main className="home-screen" dir={lang === 'he' ? 'rtl' : 'ltr'}>
    <div className="home-sky"><span className="sun"/><span className="mountain m1"/><span className="mountain m2"/></div>
    <motion.section className="setup-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="logo-lockup"><div className="logo-badge"><CurrencyIcon size={62}/></div><div><h1>ארץ המצוות</h1><h2>MITZVAH LAND</h2></div></div>
      <p className="tagline">{label('מסע משפחתי ברחבי הארץ', 'A family adventure across Israel')}</p>
      <div className="section-title">{label('שפה', 'Language')}</div>
      <div className="segmented">
        {([['he', 'עברית'], ['en', 'English'], ['bi', 'דו־לשוני · Bilingual']] as [Lang, string][]).map(([v, t]) =>
          <button key={v} className={lang === v ? 'selected' : ''} onClick={() => setupLang(v)}>{t}</button>)}
      </div>
      <div className="setup-row"><div><div className="section-title">{label('מספר שחקנים', 'Total players')}</div>
        <div className="count-picker">{[2, 3, 4, 5, 6].map(n => <button key={n} className={count === n ? 'selected' : ''} onClick={() => setCount(n)}>{n}</button>)}</div>
      </div><div><div className="section-title">{label('חוקים', 'Rules')}</div>
        <label className="check"><input type="checkbox" checked={freeParking} onChange={e => setFreeParking(e.target.checked)}/>{label('קופת חניה חופשית', 'Free Parking jackpot')}</label>
        <label className="check"><input type="checkbox" checked={fast} onChange={e => setFast(e.target.checked)}/>{label('מצב מהיר', 'Fast mode')}</label>
      </div></div>
      <div className="section-title">{label('הרכב השחקנים', 'Player lineup')} · {count - computerCount} {label('אנושיים', 'human')} · {computerCount} {label('מחשבים', 'computer')}</div>
      <div className="players-setup">
        {Array.from({ length: count }, (_, i) => <div className={'player-setup ' + (seatTypes[i] === 'computer' ? 'computer-seat' : '')} key={i} style={{ borderColor: colors[i] }}>
          <button className="setup-token" onClick={() => cycleToken(i)} title={label('החלפת כלי', 'Change token')}>{chosen[i]}</button>
          <div className="player-setup-fields">
            <input value={names[i]} onChange={e => setName(i, e.target.value)} aria-label={label('שם שחקן', 'Player name') + ' ' + (i + 1)} placeholder={label('שחקן', 'Player') + ' ' + (i + 1)}/>
            <div className="seat-options">
              <select aria-label={label('סוג שחקן', 'Player type') + ' ' + (i + 1)} value={seatTypes[i]} onChange={e => setSeatType(i, e.target.value as SeatType)}>
                <option value="human">{label('👤 אדם', '👤 Human')}</option>
                <option value="computer">{label('🤖 מחשב', '🤖 Computer')}</option>
              </select>
              {seatTypes[i] === 'computer' && <select aria-label={label('רמת קושי', 'Difficulty') + ' ' + (i + 1)} value={difficulties[i]} onChange={e => setDifficulties(values => values.map((v, n) => n === i ? e.target.value as Difficulty : v))}>
                <option value="easy">{label('קל', 'Easy')}</option>
                <option value="medium">{label('בינוני', 'Medium')}</option>
                <option value="hard">{label('קשה', 'Hard')}</option>
              </select>}
            </div>
          </div>
        </div>)}
      </div>
      <button className="primary huge" onClick={() => newGame(players, { freeParkingJackpot: freeParking, fastMode: fast })}>{label('מתחילים לשחק', 'START GAME')} <span>➜</span></button>
      <div className="setup-foot"><CurrencyIcon size={18}/> <b>זוזים · ZUZIM</b><span>•</span>{label('רץ מקומית · ללא חשבון', 'Runs locally · no account')}</div>
    </motion.section>
  </main>;
}
