import { motion } from 'framer-motion';
const pips:Record<number,string>={1:'⚀',2:'⚁',3:'⚂',4:'⚃',5:'⚄',6:'⚅'};
export function Dice({values,rolling,reduced}:{values:[number,number];rolling:boolean;reduced:boolean}){
 return <div className="dice-wrap" aria-label={`Dice ${values[0]} and ${values[1]}`}>
  {values.map((v,i)=><motion.div key={i} className="die" animate={rolling&&!reduced?{rotate:[0,130,280,420],y:[0,-12,2,0],scale:[1,1.08,.98,1]}:{rotate:0,y:0}} transition={{duration:.55}}>{pips[v]}</motion.div>)}
 </div>
}
