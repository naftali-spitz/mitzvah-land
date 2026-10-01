import { SetupScreen } from './components/SetupScreen';
import { GameScreen } from './components/GameScreen';
import { useGameStore } from './store/gameStore';
export default function App(){const started=useGameStore(s=>s.started);return started?<GameScreen/>:<SetupScreen/>}
