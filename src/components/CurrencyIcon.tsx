export function CurrencyIcon({size=18}:{size?:number}){
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className="currency-icon">
    <path d="M32 8 50 15v15c0 13-8.2 22-18 27-9.8-5-18-14-18-27V15L32 8Z" fill="currentColor" opacity=".16"/>
    <path d="M32 8 50 15v15c0 13-8.2 22-18 27-9.8-5-18-14-18-27V15L32 8Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M22 21h20L22 42h20" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
}
